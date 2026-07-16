// Use relative path - Nginx proxy will forward /api to backend
const API_URL = import.meta.env.VITE_API_URL || '/api';

import Swal from 'sweetalert2';

const showSessionExpired = async () => {
    await Swal.fire({
        icon: 'warning',
        title: '登入已過期',
        text: '請重新登入以繼續使用。',
        confirmButtonText: '前往登入',
        allowOutsideClick: false,
        allowEscapeKey: false,
    });
    window.location.href = '/login';
};

// Common fetch options with credentials for cookies
const fetchOptions = {
    credentials: 'include' // include cookies in requests
};

const getHeaders = () => ({
    'Content-Type': 'application/json'
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

const onTokenRefreshed = () => {
    refreshSubscribers.forEach(callback => callback());
    refreshSubscribers = [];
};

// Wrapper for fetch with automatic token refresh
const fetchWithAuth = async (url, options = {}) => {
    // Don't set Content-Type for FormData - browser will set it automatically with boundary
    const isFormData = options.body instanceof FormData;
    const headers = isFormData
        ? { ...options.headers }
        : { ...getHeaders(), ...options.headers };

    const response = await fetch(url, {
        ...options,
        ...fetchOptions,
        headers
    });

    // If unauthorized, try to refresh token
    if (response.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;

            try {
                const refreshResponse = await fetch(`${API_URL}/auth/refresh`, {
                    method: 'POST',
                    ...fetchOptions
                });

                if (refreshResponse.ok) {
                    isRefreshing = false;
                    onTokenRefreshed();

                    // Retry original request
                    return fetch(url, {
                        ...options,
                        ...fetchOptions,
                        headers
                    });
                } else {
                    isRefreshing = false;
                    // Redirect to login
                    showSessionExpired();
                    throw new Error('Session expired');
                }
            } catch (error) {
                isRefreshing = false;
                if (error.message !== 'Session expired') {
                    showSessionExpired();
                }
                throw error;
            }
        } else {
            // Wait for token refresh
            return new Promise((resolve) => {
                subscribeTokenRefresh(() => {
                    resolve(fetch(url, {
                        ...options,
                        ...fetchOptions,
                        headers
                    }));
                });
            });
        }
    }

    return response;
};

export const api = {
    auth: {
        login: async (username, password) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                ...fetchOptions,
                body: JSON.stringify({ username, password })
            });
            if (!res.ok) return false;
            const data = await res.json();
            return data.success ? data.user : false;
        },
        logout: async () => {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                ...fetchOptions
            });
        },
        refresh: async () => {
            const res = await fetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                ...fetchOptions
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.success ? data.user : null;
        },
        me: async () => {
            const res = await fetch(`${API_URL}/auth/me`, {
                ...fetchOptions
            });
            if (!res.ok) return null;
            return res.json();
        },
        impersonate: async (userId) => {
            const res = await fetchWithAuth(`${API_URL}/auth/impersonate/${userId}`, { method: 'POST' });
            return res.json();
        },
        stopImpersonate: async () => {
            const res = await fetchWithAuth(`${API_URL}/auth/stop-impersonate`, { method: 'POST' });
            return res.json();
        }
    },
    templates: {
        list: async () => (await fetchWithAuth(`${API_URL}/templates`)).json(),
        create: async (data) => fetchWithAuth(`${API_URL}/templates`, { method: 'POST', body: JSON.stringify(data) }),
        update: async (id, data) => fetchWithAuth(`${API_URL}/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: async (id) => fetchWithAuth(`${API_URL}/templates/${id}`, { method: 'DELETE' })
    },
    customers: {
        list: async (search = '') => (await fetchWithAuth(`${API_URL}/customers?search=${search}`)).json(),
        save: async (data) => fetchWithAuth(`${API_URL}/customers`, { method: 'POST', body: JSON.stringify(data) }),
        delete: async (id) => fetchWithAuth(`${API_URL}/customers/${id}`, { method: 'DELETE' })
    },
    notifications: {
        send: async (data) => (await fetchWithAuth(`${API_URL}/notifications/send`, { method: 'POST', body: JSON.stringify(data) })).json(),
        importPreview: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetchWithAuth(`${API_URL}/notifications/import-preview`, {
                method: 'POST',
                headers: {}, // Don't set Content-Type for FormData
                body: formData
            });
            return res.json();
        },
        downloadNotFound: async (headers, notFoundNames) => {
            const res = await fetchWithAuth(`${API_URL}/notifications/download-not-found`, {
                method: 'POST',
                body: JSON.stringify({ headers, not_found: notFoundNames })
            });

            if (!res.ok) {
                throw new Error('下載失敗');
            }

            // Get filename from Content-Disposition header
            const contentDisposition = res.headers.get('Content-Disposition');
            let filename = '未匹配客戶.xlsx';
            if (contentDisposition) {
                // Support both filename= and filename*=UTF-8'' format
                const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
                    || contentDisposition.match(/filename="?([^";]+)"?/i);
                if (filenameMatch) {
                    // filenameMatch[1] contains the actual filename, maybe URL encoded
                    try {
                        filename = decodeURIComponent(filenameMatch[1]);
                    } catch (e) {
                        filename = filenameMatch[1];
                    }
                }
            }

            // Download the file
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    },
    settings: {
        get: async () => (await fetchWithAuth(`${API_URL}/settings`)).json(),
        update: async (data) => fetchWithAuth(`${API_URL}/settings`, { method: 'POST', body: JSON.stringify(data) })
    },
    messages: {
        list: async () => (await fetchWithAuth(`${API_URL}/messages`)).json()
    },
    line: {
        getUsers: async () => (await fetchWithAuth(`${API_URL}/line/users`)).json(),
        getWebhookLogs: async (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return (await fetchWithAuth(`${API_URL}/line/webhook-logs/database${query ? '?' + query : ''}`)).json();
        },
        getWebhookStats: async () => (await fetchWithAuth(`${API_URL}/line/webhook-logs/stats`)).json(),
        testWebhook: async (userId) => (await fetchWithAuth(`${API_URL}/line/webhook/test/${userId}`, { method: 'POST' })).json()
    },
    stats: {
        get: async () => (await fetchWithAuth(`${API_URL}/stats`)).json(),
        adminDashboard: async () => (await fetchWithAuth(`${API_URL}/admin/dashboard`)).json(),
        adminDuplicateLogs: async (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return (await fetchWithAuth(`${API_URL}/admin/duplicate-send-logs${query ? '?' + query : ''}`)).json();
        }
    },
    users: {
        list: async () => (await fetchWithAuth(`${API_URL}/users`)).json(),
        me: async () => (await fetchWithAuth(`${API_URL}/users/me`)).json(),
        updateProfile: async (data) => fetchWithAuth(`${API_URL}/users/me`, { method: 'PUT', body: JSON.stringify(data) }),
        create: async (data) => fetchWithAuth(`${API_URL}/users`, { method: 'POST', body: JSON.stringify(data) }),
        update: async (id, data) => fetchWithAuth(`${API_URL}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: async (id) => fetchWithAuth(`${API_URL}/users/${id}`, { method: 'DELETE' }),
        regenerateWebhook: async (id) => (await fetchWithAuth(`${API_URL}/users/${id}/regenerate-webhook`, { method: 'POST' })).json(),
        details: async (id, type = 'customers', page = 1, limit = 10) => {
            const params = new URLSearchParams({ type, page, limit }).toString();
            return (await fetchWithAuth(`${API_URL}/users/${id}/details?${params}`)).json();
        },
        testLineConfig: async (id) => (await fetchWithAuth(`${API_URL}/users/${id}/test-line-config`)).json(),
        setSuspend: async (id, isSuspended, suspendNotice = '') => {
            const res = await fetchWithAuth(`${API_URL}/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_suspended: isSuspended, suspend_notice: suspendNotice })
            });
            return res.json();
        },
        setExpiry: async (id, expiresAt) => {
            const res = await fetchWithAuth(`${API_URL}/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ expires_at: expiresAt || null })
            });
            return res.json();
        },
        adminSendStats: async (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return (await fetchWithAuth(`${API_URL}/admin/user-send-stats${query ? '?' + query : ''}`)).json();
        },
        adminUserSendDetail: async (userId, params = {}) => {
            const query = new URLSearchParams(params).toString();
            return (await fetchWithAuth(`${API_URL}/admin/user-send-detail/${userId}${query ? '?' + query : ''}`)).json();
        }
    },
    activityLogs: {
        list: async (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return (await fetchWithAuth(`${API_URL}/activity-logs${query ? '?' + query : ''}`)).json();
        },
        show: async (id) => (await fetchWithAuth(`${API_URL}/activity-logs/${id}`)).json(),
        stats: async () => (await fetchWithAuth(`${API_URL}/activity-logs/stats`)).json(),
        clear: async (days = 30) => fetchWithAuth(`${API_URL}/activity-logs?days=${days}`, { method: 'DELETE' })
    },
    applications: {
        // Public - no auth required (with invite code)
        apply: async (data) => {
            const res = await fetch(`${API_URL}/applications/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return res.json();
        },
        // Logged-in users can invite
        inviteUsers: async (users) => (await fetchWithAuth(`${API_URL}/applications/invite`, { method: 'POST', body: JSON.stringify({ users }) })).json(),
        // Admin only
        list: async (status = '') => (await fetchWithAuth(`${API_URL}/applications${status ? '?status=' + status : ''}`)).json(),
        pendingCount: async () => (await fetchWithAuth(`${API_URL}/applications/pending-count`)).json(),
        approve: async (id) => (await fetchWithAuth(`${API_URL}/applications/${id}/approve`, { method: 'POST' })).json(),
        reject: async (id, reason = '') => (await fetchWithAuth(`${API_URL}/applications/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })).json(),
        getInviteCode: async () => (await fetchWithAuth(`${API_URL}/applications/invite-code`)).json(),
        updateInviteCode: async (code) => (await fetchWithAuth(`${API_URL}/applications/invite-code`, { method: 'PUT', body: JSON.stringify({ invite_code: code }) })).json()
    }
};

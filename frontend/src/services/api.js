// Use relative path - Nginx proxy will forward /api to backend
const API_URL = import.meta.env.VITE_API_URL || '/api';

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
    const response = await fetch(url, {
        ...options,
        ...fetchOptions,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
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
                        headers: {
                            ...getHeaders(),
                            ...options.headers
                        }
                    });
                } else {
                    isRefreshing = false;
                    // Redirect to login
                    window.location.href = '/login';
                    throw new Error('Session expired');
                }
            } catch (error) {
                isRefreshing = false;
                window.location.href = '/login';
                throw error;
            }
        } else {
            // Wait for token refresh
            return new Promise((resolve) => {
                subscribeTokenRefresh(() => {
                    resolve(fetch(url, {
                        ...options,
                        ...fetchOptions,
                        headers: {
                            ...getHeaders(),
                            ...options.headers
                        }
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
        getUsers: async () => (await fetchWithAuth(`${API_URL}/line/users`)).json()
    },
    stats: {
        get: async () => (await fetchWithAuth(`${API_URL}/stats`)).json()
    },
    users: {
        list: async () => (await fetchWithAuth(`${API_URL}/users`)).json(),
        me: async () => (await fetchWithAuth(`${API_URL}/users/me`)).json(),
        updateProfile: async (data) => fetchWithAuth(`${API_URL}/users/me`, { method: 'PUT', body: JSON.stringify(data) }),
        create: async (data) => fetchWithAuth(`${API_URL}/users`, { method: 'POST', body: JSON.stringify(data) }),
        update: async (id, data) => fetchWithAuth(`${API_URL}/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: async (id) => fetchWithAuth(`${API_URL}/users/${id}`, { method: 'DELETE' }),
        regenerateWebhook: async (id) => (await fetchWithAuth(`${API_URL}/users/${id}/regenerate-webhook`, { method: 'POST' })).json()
    },
    activityLogs: {
        list: async (params = {}) => {
            const query = new URLSearchParams(params).toString();
            return (await fetchWithAuth(`${API_URL}/activity-logs${query ? '?' + query : ''}`)).json();
        },
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

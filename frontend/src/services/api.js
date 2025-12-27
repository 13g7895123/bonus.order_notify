const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
        'Content-Type': 'application/json',
        'Authorization': user.token ? `Bearer ${user.token}` : ''
    };
};

export const api = {
    auth: {
        login: async (username, password) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!res.ok) return false;
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify({ ...data.user, token: data.token }));
            return true;
        },
        logout: async () => {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: getHeaders()
            });
            localStorage.removeItem('user');
        }
    },
    templates: {
        list: async () => (await fetch(`${API_URL}/templates`, { headers: getHeaders() })).json(),
        create: async (data) => fetch(`${API_URL}/templates`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),
        update: async (id, data) => fetch(`${API_URL}/templates/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }),
        delete: async (id) => fetch(`${API_URL}/templates/${id}`, { method: 'DELETE', headers: getHeaders() })
    },
    customers: {
        list: async (search = '') => (await fetch(`${API_URL}/customers?search=${search}`, { headers: getHeaders() })).json(),
        save: async (data) => fetch(`${API_URL}/customers`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) }),
        delete: async (id) => fetch(`${API_URL}/customers/${id}`, { method: 'DELETE', headers: getHeaders() })
    },
    notifications: {
        send: async (data) => (await fetch(`${API_URL}/notifications/send`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })).json(),
        importPreview: async (file) => {
            const formData = new FormData();
            formData.append('file', file);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch(`${API_URL}/notifications/import-preview`, {
                method: 'POST',
                headers: {
                    'Authorization': user.token ? `Bearer ${user.token}` : ''
                },
                body: formData
            });
            return res.json();
        }
    },
    settings: {
        get: async () => (await fetch(`${API_URL}/settings`, { headers: getHeaders() })).json(),
        update: async (data) => fetch(`${API_URL}/settings`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) })
    },
    messages: {
        list: async () => (await fetch(`${API_URL}/messages`, { headers: getHeaders() })).json()
    },
    line: {
        getUsers: async () => (await fetch(`${API_URL}/line/users`, { headers: getHeaders() })).json()
    }
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check authentication status on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Try to get user info from cookie-authenticated session
            const userData = await api.auth.me();
            if (userData) {
                setUser(userData);
            }
        } catch (e) {
            console.log('Not authenticated');
            setUser(null);
        }
        setLoading(false);
    };

    const login = async (username, password) => {
        const userData = await api.auth.login(username, password);
        if (userData) {
            setUser(userData);
            return true;
        }
        return false;
    };

    const logout = async () => {
        await api.auth.logout();
        setUser(null);
    };

    // Function to refresh user data (e.g., after profile update)
    const refreshUser = async () => {
        try {
            const userData = await api.auth.me();
            if (userData) {
                setUser(userData);
            }
        } catch (e) {
            console.error('Failed to refresh user data', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

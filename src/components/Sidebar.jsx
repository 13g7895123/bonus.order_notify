import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Send, Settings } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { path: '/', icon: <LayoutDashboard size={20} />, label: '儀表板' },
        { path: '/templates', icon: <FileText size={20} />, label: '通知範本' },
        { path: '/customers', icon: <Users size={20} />, label: '客戶名單' },
        { path: '/send', icon: <Send size={20} />, label: '發送通知' },
        { path: '/settings', icon: <Settings size={20} />, label: '系統設定' },
    ];

    return (
        <div style={{
            width: '250px',
            height: '100vh',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={24} />
                NotifyHub
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            color: isActive ? 'white' : 'var(--text-secondary)',
                            backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        })}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Send, Settings, LogOut, MessageCircle, Shield, Activity, UserPlus, UserX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const Sidebar = () => {
    const { logout, user, setUser } = useAuth();
    const [isStoppingImpersonate, setIsStoppingImpersonate] = useState(false);

    const navItems = [
        { path: '/', icon: <LayoutDashboard size={20} />, label: '儀表板' },
        { path: '/templates', icon: <FileText size={20} />, label: '通知範本' },
        { path: '/customers', icon: <Users size={20} />, label: '客戶名單' },
        { path: '/send', icon: <Send size={20} />, label: '發送通知' },
        { path: '/line-users', icon: <MessageCircle size={20} />, label: 'LINE 使用者' },
        // 建立使用者：只給有權限的一般使用者看（管理員需開通）
        ...(user?.can_create_users && user?.role !== 'admin' ? [
            { path: '/invite', icon: <UserPlus size={20} />, label: '建立使用者' }
        ] : []),
        { path: '/settings', icon: <Settings size={20} />, label: '個人設定' },
        // 管理員專用功能（不在模擬狀態時才顯示）
        ...(user?.role === 'admin' && !user?.impersonating ? [
            { path: '/users', icon: <Shield size={20} />, label: '使用者管理' },
            { path: '/activity-logs', icon: <Activity size={20} />, label: '操作紀錄' }
        ] : []),
    ];

    const handleStopImpersonate = async () => {
        setIsStoppingImpersonate(true);
        try {
            const result = await api.auth.stopImpersonate();
            if (result.success) {
                setUser(result.user);
                window.location.href = '/users';
            } else {
                alert(result.messages?.error || '恢復身份失敗');
            }
        } catch (e) {
            console.error('Stop impersonate failed', e);
            alert('恢復身份失敗');
        }
        setIsStoppingImpersonate(false);
    };

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

            {/* Impersonation Warning Banner */}
            {user?.impersonating && (
                <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '1rem',
                    fontSize: '0.85rem'
                }}>
                    <div style={{ color: '#f59e0b', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <UserX size={16} />
                        模擬登入中
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        您目前正以其他使用者的身份操作。
                    </div>
                    <button
                        onClick={handleStopImpersonate}
                        disabled={isStoppingImpersonate}
                        style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isStoppingImpersonate ? 'wait' : 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}
                    >
                        {isStoppingImpersonate ? '恢復中...' : '恢復管理員身份'}
                    </button>
                </div>
            )}

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
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                {/* User Info */}
                {user && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        marginBottom: '0.5rem',
                        backgroundColor: user.impersonating ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        border: user.impersonating ? '1px solid rgba(245, 158, 11, 0.3)' : 'none'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: user.impersonating ? '#f59e0b' : 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}>
                            {user.name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {user.name || user.username}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                @{user.username}
                            </div>
                            <div style={{
                                fontSize: '0.7rem',
                                color: user.impersonating ? '#f59e0b' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '2px'
                            }}>
                                {user.impersonating ? (
                                    <><UserX size={10} /> 模擬中</>
                                ) : user.role === 'admin' ? (
                                    <><Shield size={10} /> 管理員</>
                                ) : (
                                    '一般使用者'
                                )}
                            </div>
                        </div>
                    </div>
                )}
                <button
                    onClick={logout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        width: '100%',
                        borderRadius: '8px',
                        color: 'var(--danger)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        textAlign: 'left',
                        backgroundColor: 'transparent', // Ensure default background is transparent
                        border: 'none' // Remove default button border
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <LogOut size={20} />
                    <span>登出</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

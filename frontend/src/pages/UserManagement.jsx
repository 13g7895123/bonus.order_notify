import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2, Users, Key, Copy, Check, RefreshCw, Shield, User, MessageSquare, FileText, UserCheck, Eye, X, ChevronLeft, ChevronRight, Activity, LogIn } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState({
        id: null,
        username: '',
        password: '',
        name: '',
        role: 'user',
        line_channel_secret: '',
        line_channel_access_token: '',
        message_quota: 200,
        is_active: true,
        can_create_users: false
    });
    const [copiedKey, setCopiedKey] = useState(null);
    const [saved, setSaved] = useState(false);

    // Details modal states
    const [showDetails, setShowDetails] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [detailsType, setDetailsType] = useState('customers');
    const [detailsData, setDetailsData] = useState([]);
    const [detailsStats, setDetailsStats] = useState({});
    const [detailsPage, setDetailsPage] = useState(1);
    const [detailsTotal, setDetailsTotal] = useState(0);
    const [detailsLimit] = useState(10);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.users.list();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load users', e);
        }
        setLoading(false);
    };

    const handleEdit = (user) => {
        setCurrentUser({
            id: user.id,
            username: user.username || '',
            password: '', // Don't show password
            name: user.name || '',
            role: user.role || 'user',
            line_channel_secret: '', // Don't show secret
            line_channel_access_token: '', // Don't show token
            message_quota: user.message_quota || 200,
            is_active: user.is_active == 1,
            can_create_users: user.can_create_users == 1
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (confirm('確定要刪除此使用者嗎？此操作將同時刪除該使用者的所有客戶、範本與訊息記錄。')) {
            await api.users.delete(id);
            loadUsers();
        }
    };

    const handleSave = async () => {
        if (!currentUser.username) {
            alert('請輸入使用者名稱');
            return;
        }
        if (!currentUser.id && !currentUser.password) {
            alert('新使用者必須設定密碼');
            return;
        }

        const data = {
            username: currentUser.username,
            name: currentUser.name,
            role: currentUser.role,
            message_quota: currentUser.message_quota,
            is_active: currentUser.is_active,
            can_create_users: currentUser.can_create_users
        };

        if (currentUser.password) {
            data.password = currentUser.password;
        }
        if (currentUser.line_channel_secret) {
            data.line_channel_secret = currentUser.line_channel_secret;
        }
        if (currentUser.line_channel_access_token) {
            data.line_channel_access_token = currentUser.line_channel_access_token;
        }

        if (currentUser.id) {
            await api.users.update(currentUser.id, data);
        } else {
            await api.users.create(data);
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        loadUsers();
        setIsEditing(false);
        resetForm();
    };

    const resetForm = () => {
        setCurrentUser({
            id: null,
            username: '',
            password: '',
            name: '',
            role: 'user',
            line_channel_secret: '',
            line_channel_access_token: '',
            message_quota: 200,
            is_active: true,
            can_create_users: false
        });
    };

    const copyWebhookUrl = async (webhookKey) => {
        const baseUrl = window.location.origin.replace(':8080', ':8081');
        const url = `${baseUrl}/api/line/webhook?key=${webhookKey}`;
        await navigator.clipboard.writeText(url);
        setCopiedKey(webhookKey);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const regenerateWebhook = async (userId) => {
        if (confirm('確定要重新產生 Webhook Key 嗎？舊的 Key 將立即失效。')) {
            await api.users.regenerateWebhook(userId);
            loadUsers();
        }
    };

    const handleViewDetails = async (user) => {
        setSelectedUser(user);
        setShowDetails(true);
        setDetailsType('customers');
        setDetailsPage(1);
        await loadUserDetails(user.id, 'customers', 1);
    };

    const loadUserDetails = async (userId, type, page) => {
        setLoadingDetails(true);
        try {
            const data = await api.users.details(userId, type, page, detailsLimit);
            setDetailsData(data.data || []);
            setDetailsStats(data.stats || {});
            setDetailsTotal(data.total || 0);
        } catch (e) {
            console.error('Failed to load user details', e);
        }
        setLoadingDetails(false);
    };

    const handleDetailsTypeChange = async (type) => {
        setDetailsType(type);
        setDetailsPage(1);
        await loadUserDetails(selectedUser.id, type, 1);
    };

    const handleDetailsPageChange = async (newPage) => {
        setDetailsPage(newPage);
        await loadUserDetails(selectedUser.id, detailsType, newPage);
    };

    const handleImpersonate = async (user) => {
        if (!confirm(`確定要以「${user.name || user.username}」的身份登入嗎？\n\n您可以從右上角選單恢復管理員身份。`)) {
            return;
        }
        try {
            const result = await api.auth.impersonate(user.id);
            if (result.success) {
                alert(`已切換至「${user.name || user.username}」的身份`);
                // Refresh the page to reload user context
                window.location.href = '/';
            } else {
                alert(result.messages?.error || '模擬登入失敗');
            }
        } catch (e) {
            console.error('Impersonate failed', e);
            alert('模擬登入失敗');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>載入中...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>使用者管理</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>管理平台使用者，每位使用者可設定獨立的 LINE Bot。</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => { resetForm(); setIsEditing(true); }}>
                        <Plus size={18} /> 新增使用者
                    </Button>
                )}
            </div>

            {isEditing ? (
                <Card title={currentUser.id ? '編輯使用者' : '新增使用者'}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <Input
                            label="使用者名稱"
                            value={currentUser.username}
                            onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })}
                            placeholder="登入用帳號"
                            disabled={!!currentUser.id}
                        />
                        <Input
                            label={currentUser.id ? '新密碼（留空不變更）' : '密碼'}
                            type="password"
                            value={currentUser.password}
                            onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
                            placeholder="••••••••"
                        />
                        <Input
                            label="顯示名稱"
                            value={currentUser.name}
                            onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                            placeholder="使用者姓名"
                        />
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                角色
                            </label>
                            <select
                                value={currentUser.role}
                                onChange={e => setCurrentUser({ ...currentUser, role: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            >
                                <option value="user">一般使用者</option>
                                <option value="admin">管理員</option>
                            </select>
                        </div>
                        <Input
                            label="每月訊息配額"
                            type="number"
                            value={currentUser.message_quota}
                            onChange={e => setCurrentUser({ ...currentUser, message_quota: parseInt(e.target.value) || 200 })}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={currentUser.is_active}
                                onChange={e => setCurrentUser({ ...currentUser, is_active: e.target.checked })}
                            />
                            <label htmlFor="is_active" style={{ cursor: 'pointer' }}>啟用帳號</label>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
                            <input
                                type="checkbox"
                                id="can_create_users"
                                checked={currentUser.can_create_users}
                                onChange={e => setCurrentUser({ ...currentUser, can_create_users: e.target.checked })}
                            />
                            <label htmlFor="can_create_users" style={{ cursor: 'pointer' }}>允許建立使用者</label>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Key size={18} /> LINE Bot 設定
                        </h4>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <Input
                                label="Channel Secret"
                                type="password"
                                value={currentUser.line_channel_secret}
                                onChange={e => setCurrentUser({ ...currentUser, line_channel_secret: e.target.value })}
                                placeholder={currentUser.id ? '（留空不變更）' : '請輸入 Channel Secret'}
                            />
                            <Input
                                label="Channel Access Token"
                                type="password"
                                value={currentUser.line_channel_access_token}
                                onChange={e => setCurrentUser({ ...currentUser, line_channel_access_token: e.target.value })}
                                placeholder={currentUser.id ? '（留空不變更）' : '請輸入 Channel Access Token'}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
                        {saved && <span style={{ color: 'var(--success)', alignSelf: 'center' }}>已儲存！</span>}
                        <Button variant="secondary" onClick={() => { setIsEditing(false); resetForm(); }}>取消</Button>
                        <Button onClick={handleSave}>儲存</Button>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {users.map(user => (
                        <Card key={user.id} style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        backgroundColor: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: user.role === 'admin' ? 'var(--danger)' : 'var(--accent-primary)'
                                    }}>
                                        {user.role === 'admin' ? <Shield size={24} /> : <User size={24} />}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>{user.name || user.username}</h3>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: user.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                color: user.role === 'admin' ? 'var(--danger)' : 'var(--accent-primary)'
                                            }}>
                                                {user.role === 'admin' ? '管理員' : '使用者'}
                                            </span>
                                            {!user.is_active && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    已停用
                                                </span>
                                            )}
                                            {user.can_create_users == 1 && user.role !== 'admin' && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                                    color: 'var(--success)'
                                                }}>
                                                    可建立帳號
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            @{user.username}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleViewDetails(user)} style={{ color: 'var(--accent-primary)', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }} title="查看詳細資料">
                                        <Eye size={18} />
                                    </button>
                                    {user.role !== 'admin' && (
                                        <button onClick={() => handleImpersonate(user)} style={{ color: '#f59e0b', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }} title="以此使用者身份登入">
                                            <LogIn size={18} />
                                        </button>
                                    )}
                                    <button onClick={() => handleEdit(user)} style={{ color: 'var(--accent-primary)', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }} title="編輯">
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }} title="刪除">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Statistics */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '1rem',
                                marginTop: '1.5rem',
                                padding: '1rem',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <UserCheck size={16} /> 客戶
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{user.stats?.customers || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <FileText size={16} /> 範本
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{user.stats?.templates || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <MessageSquare size={16} /> 本月發送
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{user.stats?.messages_this_month || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <Users size={16} /> LINE 使用者
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{user.stats?.line_users || 0}</div>
                                </div>
                            </div>

                            {/* Webhook URL */}
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: user.has_line_config ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                border: `1px solid ${user.has_line_config ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Key size={14} /> Webhook URL
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => copyWebhookUrl(user.webhook_key)}
                                            style={{
                                                fontSize: '0.8rem',
                                                padding: '4px 12px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '4px',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {copiedKey === user.webhook_key ? <><Check size={14} /> 已複製</> : <><Copy size={14} /> 複製</>}
                                        </button>
                                        <button
                                            onClick={() => regenerateWebhook(user.id)}
                                            style={{
                                                fontSize: '0.8rem',
                                                padding: '4px 12px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '4px',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <RefreshCw size={14} /> 重新產生
                                        </button>
                                    </div>
                                </div>
                                <code style={{
                                    display: 'block',
                                    padding: '8px 12px',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    wordBreak: 'break-all',
                                    color: 'var(--text-primary)'
                                }}>
                                    {window.location.origin.replace(':8080', ':8081')}/api/line/webhook?key={user.webhook_key}
                                </code>
                                {!user.has_line_config && (
                                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--danger)' }}>
                                        ⚠️ 尚未設定 LINE Bot 憑證，請點擊編輯進行設定。
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}

                    {users.length === 0 && (
                        <Card style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            尚無使用者資料。
                        </Card>
                    )}
                </div>
            )}

            {/* Details Modal */}
            {showDetails && selectedUser && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '1200px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            backgroundColor: 'var(--bg-primary)',
                            zIndex: 1
                        }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {selectedUser.name || selectedUser.username} 的詳細資料
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    @{selectedUser.username}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetails(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '8px'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Stats Overview */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: 'rgba(255,255,255,0.02)'
                        }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '1rem'
                            }}>
                                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>客戶</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{detailsStats.customers || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>範本</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>{detailsStats.templates || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>本月訊息</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f59e0b' }}>{detailsStats.messages_this_month || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>LINE 使用者</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#8b5cf6' }}>{detailsStats.line_users || 0}</div>
                                </div>
                                <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'rgba(236, 72, 153, 0.1)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>活動日誌</div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ec4899' }}>{detailsStats.activity_logs || 0}</div>
                                </div>
                            </div>
                        </div>

                        {/* Type Selector */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            gap: '0.5rem',
                            overflowX: 'auto'
                        }}>
                            {[
                                { key: 'customers', label: '客戶', icon: UserCheck },
                                { key: 'templates', label: '範本', icon: FileText },
                                { key: 'messages', label: '訊息記錄', icon: MessageSquare },
                                { key: 'line_users', label: 'LINE 使用者', icon: Users },
                                { key: 'activity_logs', label: '活動日誌', icon: Activity }
                            ].map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => handleDetailsTypeChange(key)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        border: 'none',
                                        borderRadius: '6px',
                                        backgroundColor: detailsType === key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: detailsType === key ? 'white' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <Icon size={16} />
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Data Content */}
                        <div style={{ padding: '1.5rem', minHeight: '300px' }}>
                            {loadingDetails ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    載入中...
                                </div>
                            ) : detailsData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    暫無資料
                                </div>
                            ) : (
                                <>
                                    {detailsType === 'customers' && (
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {detailsData.map(customer => (
                                                <div key={customer.id} style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{customer.custom_name || '未命名'}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                            LINE UID: {customer.line_uid}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(customer.created_at).toLocaleString('zh-TW')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {detailsType === 'templates' && (
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {detailsData.map(template => (
                                                <div key={template.id} style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{template.name}</div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                        {template.content}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        建立時間: {new Date(template.created_at).toLocaleString('zh-TW')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {detailsType === 'messages' && (
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {detailsData.map(message => (
                                                <div key={message.id} style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <div style={{ fontWeight: '600' }}>
                                                            {message.custom_name || message.line_uid || '未知客戶'}
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: message.sender === 'system' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                            color: message.sender === 'system' ? 'var(--accent-primary)' : 'var(--success)'
                                                        }}>
                                                            {message.sender === 'system' ? '系統' : '使用者'}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                        {message.content}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(message.created_at).toLocaleString('zh-TW')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {detailsType === 'line_users' && (
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {detailsData.map(lineUser => (
                                                <div key={lineUser.id} style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: '600' }}>{lineUser.display_name || '未命名'}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                            LINE UID: {lineUser.line_uid}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(lineUser.created_at).toLocaleString('zh-TW')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {detailsType === 'activity_logs' && (
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {detailsData.map(log => (
                                                <div key={log.id} style={{
                                                    padding: '1rem',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                                                color: 'var(--accent-primary)',
                                                                fontWeight: '600'
                                                            }}>
                                                                {log.method}
                                                            </span>
                                                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{log.endpoint}</span>
                                                        </div>
                                                        <div style={{
                                                            fontSize: '0.75rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: log.response_code >= 200 && log.response_code < 300 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                            color: log.response_code >= 200 && log.response_code < 300 ? 'var(--success)' : 'var(--danger)'
                                                        }}>
                                                            {log.response_code}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        IP: {log.ip_address} | {new Date(log.created_at).toLocaleString('zh-TW')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Pagination */}
                        {!loadingDetails && detailsTotal > detailsLimit && (
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                position: 'sticky',
                                bottom: 0,
                                backgroundColor: 'var(--bg-primary)'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    顯示 {((detailsPage - 1) * detailsLimit) + 1} - {Math.min(detailsPage * detailsLimit, detailsTotal)} / 共 {detailsTotal} 筆
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleDetailsPageChange(detailsPage - 1)}
                                        disabled={detailsPage === 1}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            cursor: detailsPage === 1 ? 'not-allowed' : 'pointer',
                                            opacity: detailsPage === 1 ? 0.5 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                        上一頁
                                    </button>
                                    <button
                                        onClick={() => handleDetailsPageChange(detailsPage + 1)}
                                        disabled={detailsPage >= Math.ceil(detailsTotal / detailsLimit)}
                                        style={{
                                            padding: '0.5rem 1rem',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            cursor: detailsPage >= Math.ceil(detailsTotal / detailsLimit) ? 'not-allowed' : 'pointer',
                                            opacity: detailsPage >= Math.ceil(detailsTotal / detailsLimit) ? 0.5 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        下一頁
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

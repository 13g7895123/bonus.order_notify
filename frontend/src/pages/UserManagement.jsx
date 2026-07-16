import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2, Users, Key, Copy, Check, RefreshCw, Shield, User, MessageSquare, FileText, UserCheck, Eye, X, ChevronLeft, ChevronRight, Activity, LogIn, Zap, AlertCircle, CheckCircle, Info, AlertTriangle, Clock, CalendarClock, Save } from 'lucide-react';

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

    // LINE config test modal states
    const [showLineTest, setShowLineTest] = useState(false);
    const [lineTestResult, setLineTestResult] = useState(null);
    const [lineTestLoading, setLineTestLoading] = useState(false);

    // Expiry management modal states
    const [showExpiry, setShowExpiry] = useState(false);
    const [expiryDrafts, setExpiryDrafts] = useState({});
    const [expirySavingId, setExpirySavingId] = useState(null);
    const [defaultNotice, setDefaultNotice] = useState('');
    const [defaultNoticeSaving, setDefaultNoticeSaving] = useState(false);
    const [defaultNoticeSaved, setDefaultNoticeSaved] = useState(false);

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

    const handleTestLineConfig = async (user) => {
        setShowLineTest(true);
        setLineTestLoading(true);
        setLineTestResult(null);
        try {
            const result = await api.users.testLineConfig(user.id);
            setLineTestResult(result);
        } catch (e) {
            console.error('Test LINE config failed', e);
            setLineTestResult({
                overall_status: 'error',
                user: { username: user.username, name: user.name },
                checks: {
                    connection: {
                        name: '連線測試',
                        status: 'error',
                        message: '無法連線到伺服器: ' + e.message
                    }
                }
            });
        }
        setLineTestLoading(false);
    };

    // Convert a datetime string (from DB, 'YYYY-MM-DD HH:mm:ss') to the value
    // expected by <input type="datetime-local">
    const toDatetimeLocal = (value) => {
        if (!value) return '';
        const d = new Date(value.replace(' ', 'T'));
        if (isNaN(d.getTime())) return '';
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const handleOpenExpiry = async () => {
        setShowExpiry(true);
        const drafts = {};
        users.forEach(u => {
            drafts[u.id] = toDatetimeLocal(u.expires_at);
        });
        setExpiryDrafts(drafts);
        try {
            const settings = await api.settings.get();
            setDefaultNotice(settings.expiry_default_notice || '');
        } catch (e) {
            console.error('Failed to load default notice', e);
        }
    };

    const handleSaveExpiry = async (userId) => {
        setExpirySavingId(userId);
        try {
            const value = expiryDrafts[userId];
            await api.users.setExpiry(userId, value ? value.replace('T', ' ') + ':00' : null);
            await loadUsers();
        } catch (e) {
            console.error('Failed to save expiry', e);
            alert('儲存到期時間失敗');
        }
        setExpirySavingId(null);
    };

    const handleClearExpiry = async (userId) => {
        setExpirySavingId(userId);
        try {
            await api.users.setExpiry(userId, null);
            setExpiryDrafts(prev => ({ ...prev, [userId]: '' }));
            await loadUsers();
        } catch (e) {
            console.error('Failed to clear expiry', e);
            alert('清除到期時間失敗');
        }
        setExpirySavingId(null);
    };

    const handleSaveDefaultNotice = async () => {
        setDefaultNoticeSaving(true);
        try {
            await api.settings.update({ expiry_default_notice: defaultNotice });
            setDefaultNoticeSaved(true);
            setTimeout(() => setDefaultNoticeSaved(false), 2000);
        } catch (e) {
            console.error('Failed to save default notice', e);
            alert('儲存預設提示訊息失敗');
        }
        setDefaultNoticeSaving(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={18} style={{ color: 'var(--success)' }} />;
            case 'error':
                return <AlertCircle size={18} style={{ color: 'var(--danger)' }} />;
            case 'warning':
                return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
            case 'info':
            case 'skipped':
            default:
                return <Info size={18} style={{ color: 'var(--text-secondary)' }} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success': return 'var(--success)';
            case 'error': return 'var(--danger)';
            case 'warning': return '#f59e0b';
            default: return 'var(--text-secondary)';
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
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleOpenExpiry}>
                            <CalendarClock size={18} /> 使用期限管理
                        </Button>
                        <Button onClick={() => { resetForm(); setIsEditing(true); }}>
                            <Plus size={18} /> 新增使用者
                        </Button>
                    </div>
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                                            {user.is_online ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                                    color: 'var(--success)', fontWeight: '500'
                                                }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                                                    登入中
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                                    fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px',
                                                    backgroundColor: 'rgba(107, 114, 128, 0.15)',
                                                    color: 'var(--text-secondary)'
                                                }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#6b7280', display: 'inline-block' }} />
                                                    離線
                                                </span>
                                            )}
                                            {user.last_login_at ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    <Clock size={12} /> 最後登入：{new Date(user.last_login_at).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>尚未登入過</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleTestLineConfig(user)} style={{ color: '#10b981', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }} title="測試 LINE 設定">
                                        <Zap size={18} />
                                    </button>
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

            {/* LINE Config Test Modal */}
            {showLineTest && (
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
                        maxWidth: '600px',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Zap size={24} style={{ color: '#10b981' }} />
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                        LINE 設定診斷
                                    </h2>
                                    {lineTestResult && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                            {lineTestResult.user?.name || lineTestResult.user?.username}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLineTest(false)}
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

                        {/* Content */}
                        <div style={{ padding: '1.5rem' }}>
                            {lineTestLoading ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
                                    </div>
                                    正在測試 LINE 設定...
                                </div>
                            ) : lineTestResult ? (
                                <>
                                    {/* Overall Status */}
                                    <div style={{
                                        padding: '1rem',
                                        marginBottom: '1.5rem',
                                        borderRadius: '8px',
                                        backgroundColor: lineTestResult.overall_status === 'success' 
                                            ? 'rgba(16, 185, 129, 0.1)' 
                                            : lineTestResult.overall_status === 'warning'
                                            ? 'rgba(245, 158, 11, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${
                                            lineTestResult.overall_status === 'success' 
                                                ? 'rgba(16, 185, 129, 0.3)' 
                                                : lineTestResult.overall_status === 'warning'
                                                ? 'rgba(245, 158, 11, 0.3)'
                                                : 'rgba(239, 68, 68, 0.3)'
                                        }`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem'
                                    }}>
                                        {getStatusIcon(lineTestResult.overall_status)}
                                        <div>
                                            <div style={{ fontWeight: '600', color: getStatusColor(lineTestResult.overall_status) }}>
                                                {lineTestResult.overall_status === 'success' 
                                                    ? '所有檢查通過' 
                                                    : lineTestResult.overall_status === 'warning'
                                                    ? '部分項目需要注意'
                                                    : '發現問題'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {lineTestResult.overall_status === 'success' 
                                                    ? 'LINE Bot 設定正確，可以正常接收和發送訊息'
                                                    : '請檢查下方詳細資訊'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Check Results */}
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {lineTestResult.checks && Object.entries(lineTestResult.checks).map(([key, check]) => (
                                            <div key={key} style={{
                                                padding: '1rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '0.75rem'
                                            }}>
                                                {getStatusIcon(check.status)}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                        {check.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                        {check.message}
                                                    </div>
                                                    {/* Bot Info if available */}
                                                    {check.bot_info && (
                                                        <div style={{
                                                            marginTop: '0.75rem',
                                                            padding: '0.75rem',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem'
                                                        }}>
                                                            {check.bot_info.pictureUrl && (
                                                                <img 
                                                                    src={check.bot_info.pictureUrl} 
                                                                    alt="Bot" 
                                                                    style={{ 
                                                                        width: '40px', 
                                                                        height: '40px', 
                                                                        borderRadius: '50%' 
                                                                    }} 
                                                                />
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                                                                    {check.bot_info.displayName}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                    ID: {check.bot_info.userId}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Webhook URL */}
                                    {lineTestResult.webhook_url && (
                                        <div style={{
                                            marginTop: '1.5rem',
                                            padding: '1rem',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: '8px'
                                        }}>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--text-secondary)',
                                                marginBottom: '0.5rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <Key size={14} />
                                                Webhook URL（設定到 LINE Developers Console）
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
                                                {window.location.origin.replace(':8080', ':8081')}{lineTestResult.webhook_url}
                                            </code>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    無法取得測試結果
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <Button onClick={() => setShowLineTest(false)}>
                                關閉
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expiry Management Modal */}
            {showExpiry && (
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
                        maxWidth: '900px',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <CalendarClock size={24} style={{ color: 'var(--accent-primary)' }} />
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>使用期限管理</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                        設定使用者的到期時間，時間到後帳號將自動被停用（不含管理員）。
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExpiry(false)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Default notice setting */}
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                預設到期提示訊息（帳號到期自動停用時顯示給使用者）
                            </label>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <textarea
                                    value={defaultNotice}
                                    onChange={e => setDefaultNotice(e.target.value)}
                                    rows={2}
                                    placeholder="例如：您的帳號使用期限已到期，請聯絡管理員續期。"
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <Button onClick={handleSaveDefaultNotice} disabled={defaultNoticeSaving} style={{ whiteSpace: 'nowrap' }}>
                                    <Save size={16} /> {defaultNoticeSaving ? '儲存中...' : '儲存'}
                                </Button>
                            </div>
                            {defaultNoticeSaved && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--success)' }}>已儲存！</div>
                            )}
                        </div>

                        {/* User list with expiry pickers */}
                        <div style={{ padding: '1.5rem' }}>
                            {users.filter(u => u.role !== 'admin').length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    尚無非管理員使用者。
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '0.75rem' }}>
                                    {users.filter(u => u.role !== 'admin').map(u => {
                                        const isExpired = u.expires_at && new Date(u.expires_at.replace(' ', 'T')).getTime() <= Date.now();
                                        return (
                                            <div key={u.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem',
                                                padding: '1rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                flexWrap: 'wrap'
                                            }}>
                                                <div style={{ minWidth: '160px', flex: '1 1 160px' }}>
                                                    <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {u.name || u.username}
                                                        {u.is_suspended == 1 && (
                                                            <span style={{
                                                                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
                                                                backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)'
                                                            }}>
                                                                已停用
                                                            </span>
                                                        )}
                                                        {!u.is_suspended && isExpired && (
                                                            <span style={{
                                                                fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px',
                                                                backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b'
                                                            }}>
                                                                即將停用
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{u.username}</div>
                                                </div>

                                                <input
                                                    type="datetime-local"
                                                    value={expiryDrafts[u.id] || ''}
                                                    onChange={e => setExpiryDrafts(prev => ({ ...prev, [u.id]: e.target.value }))}
                                                    style={{
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: 'var(--bg-primary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '0.9rem'
                                                    }}
                                                />

                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSaveExpiry(u.id)}
                                                    disabled={expirySavingId === u.id}
                                                >
                                                    <Save size={14} /> {expirySavingId === u.id ? '儲存中...' : '儲存'}
                                                </Button>

                                                {u.expires_at && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleClearExpiry(u.id)}
                                                        disabled={expirySavingId === u.id}
                                                    >
                                                        清除期限
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <Button onClick={() => setShowExpiry(false)}>關閉</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

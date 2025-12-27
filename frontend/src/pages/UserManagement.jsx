import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2, Users, Key, Copy, Check, RefreshCw, Shield, User, MessageSquare, FileText, UserCheck } from 'lucide-react';

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
        is_active: true
    });
    const [copiedKey, setCopiedKey] = useState(null);
    const [saved, setSaved] = useState(false);

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
            is_active: user.is_active == 1
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
            is_active: currentUser.is_active
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
            is_active: true
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
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            @{user.username}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(user)} style={{ color: 'var(--accent-primary)', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }}>
                                        <Edit2 size={18} />
                                    </button>
                                    <button onClick={() => handleDelete(user.id)} style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none', padding: '8px' }}>
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
        </div>
    );
};

export default UserManagement;

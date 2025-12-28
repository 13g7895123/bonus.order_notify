import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Save, MessageSquare, Key, User, Copy, Check, ExternalLink, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [editName, setEditName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [channelSecret, setChannelSecret] = useState('');
    const [channelAccessToken, setChannelAccessToken] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [editQuota, setEditQuota] = useState('');
    const [isEditingQuota, setIsEditingQuota] = useState(false);
    const [saved, setSaved] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [nameSaved, setNameSaved] = useState(false);
    const [quotaSaved, setQuotaSaved] = useState(false);
    const [inviteCodeSaved, setInviteCodeSaved] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadProfile();
        if (user?.role === 'admin') {
            loadInviteCode();
        }
    }, [user]);

    const loadProfile = async () => {
        try {
            const data = await api.users.me();
            setProfile(data);
            setEditName(data.name || '');
            setEditQuota(data.message_quota || 200);
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    };

    const loadInviteCode = async () => {
        try {
            const data = await api.applications.getInviteCode();
            setInviteCode(data.invite_code || '');
        } catch (e) {
            console.error('Failed to load invite code', e);
        }
    };

    const handleSaveName = async () => {
        setError('');
        try {
            const res = await api.users.updateProfile({ name: editName });
            if (res.ok) {
                setNameSaved(true);
                setTimeout(() => setNameSaved(false), 2000);
                setIsEditingName(false);
                loadProfile();
            } else {
                const result = await res.json();
                setError(result.messages?.error || '儲存失敗');
            }
        } catch (e) {
            setError('儲存失敗');
        }
    };

    const handleSaveLineSettings = async () => {
        setError('');
        try {
            const data = {};
            if (channelSecret) data.line_channel_secret = channelSecret;
            if (channelAccessToken) data.line_channel_access_token = channelAccessToken;

            const res = await api.users.updateProfile(data);
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                setChannelSecret('');
                setChannelAccessToken('');
                loadProfile();
            } else {
                const result = await res.json();
                setError(result.messages?.error || '儲存失敗');
            }
        } catch (e) {
            setError('儲存失敗');
        }
    };

    const handleChangePassword = async () => {
        setError('');
        if (newPassword !== confirmPassword) {
            setError('新密碼與確認密碼不一致');
            return;
        }
        if (newPassword.length < 4) {
            setError('新密碼至少需要 4 個字元');
            return;
        }

        try {
            const res = await api.users.updateProfile({
                current_password: currentPassword,
                password: newPassword
            });
            if (res.ok) {
                setPasswordSaved(true);
                setTimeout(() => setPasswordSaved(false), 2000);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                const result = await res.json();
                setError(result.messages?.error || '密碼更新失敗');
            }
        } catch (e) {
            setError('密碼更新失敗');
        }
    };

    const handleSaveInviteCode = async () => {
        setError('');
        try {
            const result = await api.applications.updateInviteCode(inviteCode);
            if (result.success) {
                setInviteCodeSaved(true);
                setTimeout(() => setInviteCodeSaved(false), 2000);
            } else {
                setError(result.message || '儲存失敗');
            }
        } catch (e) {
            setError('儲存失敗');
        }
    };

    const copyWebhookUrl = async () => {
        if (!profile?.webhook_key) return;
        const baseUrl = window.location.origin.replace(':8080', ':8081');
        const url = `${baseUrl}/api/line/webhook?key=${profile.webhook_key}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!profile) {
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
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>個人設定</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>管理您的帳號資訊、LINE Bot 設定與密碼。</p>
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', marginBottom: '1rem', color: 'var(--danger)' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Profile Info */}
                <Card title="帳號資訊">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>使用者名稱</label>
                            <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                                {profile.username}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>顯示名稱</label>
                            {isEditingName ? (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        style={{ marginBottom: 0, flex: 1 }}
                                    />
                                    <Button onClick={handleSaveName} variant="success">
                                        <Save size={16} />
                                    </Button>
                                    <Button onClick={() => { setIsEditingName(false); setEditName(profile.name); }} variant="secondary">
                                        取消
                                    </Button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)', flex: 1 }}>
                                        {profile.name}
                                    </div>
                                    <Button onClick={() => setIsEditingName(true)} variant="secondary">
                                        <Edit2 size={16} />
                                    </Button>
                                </div>
                            )}
                            {nameSaved && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>已儲存！</span>}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>角色</label>
                            <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                                {profile.role === 'admin' ? '管理員' : '一般使用者'}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>每月配額</label>
                            {isEditingQuota ? (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <Input
                                        type="number"
                                        value={editQuota}
                                        onChange={(e) => setEditQuota(parseInt(e.target.value) || 0)}
                                        style={{ marginBottom: 0, flex: 1 }}
                                        min="0"
                                    />
                                    <Button onClick={async () => {
                                        setError('');
                                        try {
                                            const res = await api.users.updateProfile({ message_quota: editQuota });
                                            if (res.ok) {
                                                setQuotaSaved(true);
                                                setTimeout(() => setQuotaSaved(false), 2000);
                                                setIsEditingQuota(false);
                                                loadProfile();
                                            }
                                        } catch (e) {
                                            setError('儲存失敗');
                                        }
                                    }} variant="success">
                                        <Save size={16} />
                                    </Button>
                                    <Button onClick={() => { setIsEditingQuota(false); setEditQuota(profile.message_quota); }} variant="secondary">
                                        取消
                                    </Button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)', flex: 1 }}>
                                        {profile.message_quota} 則
                                    </div>
                                    <Button onClick={() => setIsEditingQuota(true)} variant="secondary">
                                        <Edit2 size={16} />
                                    </Button>
                                </div>
                            )}
                            {quotaSaved && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>已儲存！</span>}
                        </div>
                    </div>
                </Card>

                {/* Invite Code (Admin Only) */}
                {user?.role === 'admin' && (
                    <Card title="邀請碼設定">
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            新使用者需要輸入此邀請碼才能註冊帳號。
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <Input
                                    label="邀請碼"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    placeholder="請輸入邀請碼"
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                            <Button onClick={handleSaveInviteCode}>
                                <Save size={18} /> 儲存
                            </Button>
                        </div>
                        {inviteCodeSaved && <span style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>邀請碼已更新！</span>}
                    </Card>
                )}

                {/* Webhook URL */}
                <Card title="您的 Webhook URL">
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        請將此 URL 設定到 LINE Developers Console 中的 Messaging API → Webhook URL
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <code style={{
                            flex: 1,
                            display: 'block',
                            padding: '12px',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            wordBreak: 'break-all',
                            color: 'var(--text-primary)'
                        }}>
                            {window.location.origin.replace(':8080', ':8081')}/api/line/webhook?key={profile.webhook_key}
                        </code>
                        <Button onClick={copyWebhookUrl} variant="secondary">
                            {copied ? <><Check size={16} /> 已複製</> : <><Copy size={16} /> 複製</>}
                        </Button>
                    </div>
                </Card>

                {/* LINE Settings */}
                <Card title="LINE Bot 設定">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <Key size={18} />
                        <span>LINE Bot 憑證狀態：</span>
                        {profile.has_line_config ? (
                            <span style={{ color: 'var(--success)' }}>✓ 已設定</span>
                        ) : (
                            <span style={{ color: 'var(--danger)' }}>✗ 未設定</span>
                        )}
                    </div>
                    <Input
                        label="Channel Secret（留空不變更）"
                        type="password"
                        value={channelSecret}
                        onChange={e => setChannelSecret(e.target.value)}
                        placeholder="請輸入 Channel Secret"
                    />
                    <Input
                        label="Channel Access Token（留空不變更）"
                        type="password"
                        value={channelAccessToken}
                        onChange={e => setChannelAccessToken(e.target.value)}
                        placeholder="請輸入 Channel Access Token"
                    />
                    <div className="flex justify-end gap-2 items-center" style={{ marginTop: '1rem' }}>
                        {saved && <span style={{ color: 'var(--success)' }}>已儲存！</span>}
                        <Button onClick={handleSaveLineSettings}>
                            <Save size={18} /> 儲存 LINE 設定
                        </Button>
                    </div>
                </Card>

                {/* Password Change */}
                <Card title="變更密碼">
                    <Input
                        label="目前密碼"
                        type="password"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="請輸入目前的密碼"
                    />
                    <Input
                        label="新密碼"
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="請輸入新密碼（至少 4 個字元）"
                    />
                    <Input
                        label="確認新密碼"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="請再次輸入新密碼"
                    />
                    <div className="flex justify-end gap-2 items-center" style={{ marginTop: '1rem' }}>
                        {passwordSaved && <span style={{ color: 'var(--success)' }}>密碼已更新！</span>}
                        <Button onClick={handleChangePassword}>
                            <Key size={18} /> 變更密碼
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Settings;

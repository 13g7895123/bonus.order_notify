import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Save, MessageSquare, Key, User, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [channelSecret, setChannelSecret] = useState('');
    const [channelAccessToken, setChannelAccessToken] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saved, setSaved] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await api.users.me();
            setProfile(data);
        } catch (e) {
            console.error('Failed to load profile', e);
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
        if (newPassword.length < 6) {
            setError('新密碼至少需要 6 個字元');
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
                            <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                                {profile.name}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>角色</label>
                            <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                                {profile.role === 'admin' ? '管理員' : '一般使用者'}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>每月配額</label>
                            <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                                {profile.message_quota} 則
                            </div>
                        </div>
                    </div>
                </Card>

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
                        placeholder="請輸入新密碼（至少 6 個字元）"
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


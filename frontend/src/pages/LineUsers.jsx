import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Users, Link, RefreshCw, Copy, Check } from 'lucide-react';

const LineUsers = () => {
    const [lineUsers, setLineUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadProfile();
        loadLineUsers();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await api.users.me();
            setProfile(data);
        } catch (e) {
            console.error('Failed to load profile', e);
        }
    };

    const loadLineUsers = async () => {
        setLoading(true);
        try {
            const data = await api.line.getUsers();
            setLineUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load LINE users', e);
        }
        setLoading(false);
    };

    const copyWebhookUrl = async () => {
        if (!profile?.webhook_key) return;
        const baseUrl = window.location.origin.replace(':8080', ':8081');
        const url = `${baseUrl}/api/line/webhook?key=${profile.webhook_key}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const webhookUrl = profile?.webhook_key
        ? `${window.location.origin.replace(':8080', ':8081')}/api/line/webhook?key=${profile.webhook_key}`
        : '載入中...';

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>LINE 使用者</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>透過 Webhook 收到的 LINE 使用者列表。</p>
                </div>
                <Button onClick={loadLineUsers} variant="secondary">
                    <RefreshCw size={18} /> 重新整理
                </Button>
            </div>

            <Card style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <Link size={20} color="var(--accent-primary)" />
                        <div style={{ flex: 1 }}>
                            <strong>您的 Webhook URL:</strong>
                            <code style={{
                                marginLeft: '10px',
                                backgroundColor: 'var(--bg-tertiary)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                display: 'block',
                                marginTop: '8px',
                                fontSize: '0.85rem',
                                wordBreak: 'break-all'
                            }}>
                                {webhookUrl}
                            </code>
                        </div>
                    </div>
                    {profile?.webhook_key && (
                        <Button onClick={copyWebhookUrl} variant="secondary" style={{ flexShrink: 0 }}>
                            {copied ? <><Check size={16} /> 已複製</> : <><Copy size={16} /> 複製</>}
                        </Button>
                    )}
                </div>
                <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    請將此 URL 設定到您的 LINE Developers Console 中的 Messaging API → Webhook URL。
                </p>
            </Card>

            {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
            ) : lineUsers.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>尚無 LINE 使用者。當使用者加入您的 LINE Bot 或傳送訊息時，將會在此顯示。</p>
                    </div>
                </Card>
            ) : (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>頭像</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>顯示名稱</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>LINE UID</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>已連結客戶</th>
                                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>加入時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineUsers.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        {u.picture_url ? (
                                            <img src={u.picture_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                        ) : (
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Users size={20} />
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem' }}>{u.display_name || '-'}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}>{u.line_uid}</td>
                                    <td style={{ padding: '1rem' }}>
                                        {u.linked_customer_name ? (
                                            <span style={{ color: 'var(--success)' }}>{u.linked_customer_name}</span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)' }}>未連結</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{u.created_at}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
};

export default LineUsers;


import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Save, MessageSquare } from 'lucide-react';

const Settings = () => {
    const [channelSecret, setChannelSecret] = useState('');
    const [channelAccessToken, setChannelAccessToken] = useState('');
    const [messageQuota, setMessageQuota] = useState('200');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await api.settings.get();
        if (data.line_channel_secret) setChannelSecret(data.line_channel_secret);
        if (data.line_channel_access_token) setChannelAccessToken(data.line_channel_access_token);
        if (data.message_quota) setMessageQuota(data.message_quota);
    };

    const handleSave = async () => {
        await api.settings.update({
            line_channel_secret: channelSecret,
            line_channel_access_token: channelAccessToken,
            message_quota: messageQuota
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>系統設定</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>設定 LINE Message API 與系統參數。</p>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '2rem' }}>
                <Card title="LINE Message API 設定">
                    <Input
                        label="Channel Secret"
                        type="password"
                        value={channelSecret}
                        onChange={e => setChannelSecret(e.target.value)}
                        placeholder="請輸入 Channel Secret"
                    />
                    <Input
                        label="Channel Access Token"
                        type="password"
                        value={channelAccessToken}
                        onChange={e => setChannelAccessToken(e.target.value)}
                        placeholder="請輸入 Channel Access Token"
                    />
                </Card>

                <Card title="訊息配額設定">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '10px', color: 'var(--accent-primary)' }}>
                            <MessageSquare size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <Input
                                label="每月訊息配額上限"
                                type="number"
                                value={messageQuota}
                                onChange={e => setMessageQuota(e.target.value)}
                                placeholder="200"
                                style={{ marginBottom: 0 }}
                            />
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                設定每月可發送的訊息數量上限。免費版 LINE 官方帳號每月限制 200 則。
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-2 items-center">
                    {saved && <span style={{ color: 'var(--success)' }}>已儲存！</span>}
                    <Button onClick={handleSave}>
                        <Save size={18} /> 儲存設定
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Settings;

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Save } from 'lucide-react';

const Settings = () => {
    const [channelSecret, setChannelSecret] = useState('');
    const [channelAccessToken, setChannelAccessToken] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await api.settings.get();
        if (data.line_channel_secret) setChannelSecret(data.line_channel_secret);
        if (data.line_channel_access_token) setChannelAccessToken(data.line_channel_access_token);
    };

    const handleSave = async () => {
        await api.settings.update({
            line_channel_secret: channelSecret,
            line_channel_access_token: channelAccessToken
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>系統設定</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>設定 LINE Message API 相關參數。</p>
                </div>
            </div>

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
                <div className="flex justify-end gap-2 items-center">
                    {saved && <span style={{ color: 'var(--success)' }}>已儲存！</span>}
                    <Button onClick={handleSave}>
                        <Save size={18} /> 儲存設定
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default Settings;

import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Save } from 'lucide-react';

const Settings = () => {
    const [token, setToken] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        const savedToken = localStorage.getItem('line_usage_token');
        if (savedToken) setToken(savedToken);
    }, []);

    const handleSave = () => {
        localStorage.setItem('line_usage_token', token);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>系統設定</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>設定系統參數。</p>
                </div>
            </div>

            <Card title="LINE API 設定">
                <Input
                    label="Channel Access Token"
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="請在此貼上您的 Channel Access Token"
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

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

const SendNotification = () => {
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const t = await api.templates.list();
        setTemplates(t);
        const c = await api.customers.list();
        setCustomers(c);
    };

    const handleSend = async () => {
        setSending(true);
        setResult(null);

        try {
            const res = await api.notifications.send({
                template_id: selectedTemplate,
                customer_ids: selectedCustomers
            });
            setResult({ success: res.success, message: res.message });
        } catch (e) {
            setResult({ success: false, message: '發送失敗' });
        }

        setSending(false);
        setSelectedCustomers([]);
    };
    const toggleCustomer = (id) => {
        if (selectedCustomers.includes(id)) {
            setSelectedCustomers(selectedCustomers.filter(cid => cid !== id));
        } else {
            setSelectedCustomers([...selectedCustomers, id]);
        }
    };

    const getTemplateContent = () => {
        if (!selectedTemplate) return '';
        const tmpl = templates.find(t => t.id === parseInt(selectedTemplate));
        return tmpl ? tmpl.content : '';
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>發送通知</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>將訊息發送給已選定的客戶。</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div>
                    <Card title="1. 選擇範本">
                        <select
                            value={selectedTemplate}
                            onChange={e => setSelectedTemplate(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                marginBottom: '1rem'
                            }}
                        >
                            <option value="">-- 請選擇 --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>

                        {selectedTemplate && (
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>預覽內容：</div>
                                {getTemplateContent()}
                            </div>
                        )}
                    </Card>

                    <Card title="2. 選擇客戶">
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {customers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleCustomer(c.id)}
                                    style={{
                                        padding: '10px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        backgroundColor: selectedCustomers.includes(c.id) ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <span>{c.name}</span>
                                    {selectedCustomers.includes(c.id) && <CheckCircle size={16} color="var(--accent-primary)" />}
                                </div>
                            ))}
                            {customers.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>無客戶資料。</p>}
                        </div>
                        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {selectedCustomers.length} 位客戶已選取。
                        </div>
                    </Card>
                </div>

                <div>
                    <Card title="3. 確認並發送">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ marginBottom: '0.5rem' }}>此操作將發送通知給 <strong>{selectedCustomers.length}</strong> 位收件者。</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                注意：實際變數 (如 {'{{order_id}}'}) 將由後端或 XLS 檔案提供。此處僅為預覽。
                            </p>
                        </div>

                        {result && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: result.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: result.success ? 'var(--success)' : 'var(--danger)',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                {result.message}
                            </div>
                        )}

                        <Button
                            onClick={handleSend}
                            disabled={!selectedTemplate || selectedCustomers.length === 0 || sending}
                            style={{ width: '100%', justifyContent: 'center', opacity: (!selectedTemplate || selectedCustomers.length === 0 || sending) ? 0.5 : 1 }}
                        >
                            {sending ? '發送中...' : <><Send size={18} /> 發送通知</>}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SendNotification;

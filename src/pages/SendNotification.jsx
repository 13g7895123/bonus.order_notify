import React, { useState, useEffect } from 'react';
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
        const t = localStorage.getItem('templates');
        if (t) setTemplates(JSON.parse(t));
        const c = localStorage.getItem('customers');
        if (c) setCustomers(JSON.parse(c));
    }, []);

    const handleSend = async () => {
        setSending(true);
        setResult(null);

        // Simulate sending
        await new Promise(r => setTimeout(r, 1500));

        // Mock Result
        const successCount = selectedCustomers.length;
        setResult({ success: true, message: `Successfully sent to ${successCount} customers.` });
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
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Send Notification</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Dispatch messages to your customers.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div>
                    <Card title="1. Select Template">
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
                            <option value="">-- Choose a template --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>

                        {selectedTemplate && (
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Preview Pattern:</div>
                                {getTemplateContent()}
                            </div>
                        )}
                    </Card>

                    <Card title="2. Select Customers">
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
                            {customers.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No customers found.</p>}
                        </div>
                        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {selectedCustomers.length} customers selected.
                        </div>
                    </Card>
                </div>

                <div>
                    <Card title="3. Confirm & Send">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ marginBottom: '0.5rem' }}>This action will send notifications to <strong>{selectedCustomers.length}</strong> recipients.</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Note: Actual values for variables (e.g., {'{{order_id}}'}) will be retrieved from the backend/XLS source in the final version.
                                For this demo, they will be sent as-is or replaced with defaults.
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
                            {sending ? 'Sending...' : <><Send size={18} /> Send Notifications</>}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SendNotification;

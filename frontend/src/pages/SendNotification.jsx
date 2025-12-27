import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Send, CheckCircle, AlertCircle, Upload, Users, Info } from 'lucide-react';

const SendNotification = () => {
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setImportResult(null);

        try {
            const res = await api.notifications.importPreview(file);
            setImportResult(res);

            // Auto-select matched customers
            if (res.matched && res.matched.length > 0) {
                const matchedIds = res.matched.map(c => c.id);
                // Merge matched IDs with current selection avoiding duplicates
                setSelectedCustomers(prev => [...new Set([...prev, ...matchedIds])]);
            }
        } catch (e) {
            alert('匯入失敗，請確認檔案格式是否正確');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
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
                    <p style={{ color: 'var(--text-secondary)' }}>選擇範本與收件客戶，或透過 Excel 匯入名單。</p>
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
                                marginBottom: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">-- 請選擇範本 --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>

                        {selectedTemplate && (
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>內容預覽：</div>
                                {getTemplateContent()}
                            </div>
                        )}
                    </Card>

                    <Card title="2. 選擇客戶">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {selectedCustomers.length} 位已選取
                            </div>
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    accept=".xls,.xlsx"
                                    style={{ display: 'none' }}
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => fileInputRef.current.click()}
                                    disabled={uploading}
                                >
                                    <Upload size={16} /> {uploading ? '辨識中...' : '匯入 XLS'}
                                </Button>
                            </div>
                        </div>

                        {importResult && (
                            <div style={{
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Info size={14} /> 匯入結果
                                    </h4>
                                    <button
                                        onClick={() => setImportResult(null)}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <div style={{ color: 'var(--success)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle size={14} /> 成功對應並自動勾選 {importResult.matched?.length || 0} 位客戶
                                    </div>
                                    {importResult.not_found?.length > 0 && (
                                        <div style={{ color: 'var(--danger)', marginTop: '8px' }}>
                                            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertCircle size={14} /> 找不到以下自定義名稱 (共 {importResult.not_found.length} 筆)：
                                            </div>
                                            <div style={{
                                                maxHeight: '100px',
                                                overflowY: 'auto',
                                                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                color: 'var(--text-secondary)',
                                                lineHeight: '1.6'
                                            }}>
                                                {importResult.not_found.join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            {customers.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleCustomer(c.id)}
                                    style={{
                                        padding: '12px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        backgroundColor: selectedCustomers.includes(c.id) ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{c.custom_name || c.name || '未命名'}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{c.line_uid}</div>
                                    </div>
                                    {selectedCustomers.includes(c.id) && <CheckCircle size={18} color="var(--accent-primary)" />}
                                </div>
                            ))}
                            {customers.length === 0 && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    無客戶資料。
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div>
                    <Card title="3. 確認並發送">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--accent-primary)',
                                    fontSize: '1.3rem',
                                    fontWeight: 'bold'
                                }}>
                                    {selectedCustomers.length}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600' }}>位收件者</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>已選取</div>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                此操作將會透過 LINE Messaging API 將選定的範本發送給您所選取的收件者。請確認名稱與範本變數是否正確。
                            </p>
                        </div>

                        {result && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: result.success ? 'var(--success)' : 'var(--danger)',
                                borderLeft: `4px solid ${result.success ? 'var(--success)' : 'var(--danger)'}`,
                                borderRadius: '4px',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <span>{result.message}</span>
                            </div>
                        )}

                        <Button
                            onClick={handleSend}
                            disabled={!selectedTemplate || selectedCustomers.length === 0 || sending}
                            style={{
                                width: '100%',
                                padding: '15px',
                                fontSize: '1.1rem',
                                justifyContent: 'center',
                                opacity: (!selectedTemplate || selectedCustomers.length === 0 || sending) ? 0.5 : 1,
                                cursor: 'pointer'
                            }}
                        >
                            {sending ? '發送中...' : <><Send size={20} /> 開始發送通知</>}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SendNotification;

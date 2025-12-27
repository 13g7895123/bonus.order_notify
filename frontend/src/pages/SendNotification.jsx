import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Send, CheckCircle, AlertCircle, Upload, Users, Info, Settings } from 'lucide-react';

const SendNotification = () => {
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Variable Support
    const [variables, setVariables] = useState([]);
    const [variableValues, setVariableValues] = useState({});

    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    // Extract variables when template changes
    useEffect(() => {
        if (!selectedTemplate) {
            setVariables([]);
            setVariableValues({});
            return;
        }

        const tmpl = templates.find(t => t.id === parseInt(selectedTemplate));
        if (!tmpl) return;

        // Regex to find {{variable}}
        const regex = /\{\{(.*?)\}\}/g;
        const found = [];
        let match;
        while ((match = regex.exec(tmpl.content)) !== null) {
            const varName = match[1].trim();
            // 'name' is a system reserved variable (customer name)
            if (varName !== 'name' && !found.includes(varName)) {
                found.push(varName);
            }
        }
        setVariables(found);

        // Reset values (or preserve if name matches? sticking to simple reset for clarity now)
        // Ideally we keep value if key exists to avoid accidental clearing if switching back and forth
        setVariableValues(prev => {
            const next = {};
            found.forEach(v => {
                next[v] = prev[v] || '';
            });
            return next;
        });

    }, [selectedTemplate, templates]);

    const loadData = async () => {
        const t = await api.templates.list();
        setTemplates(t);
        const c = await api.customers.list();
        setCustomers(c);
    };

    const handleSend = async () => {
        setSending(true);
        setResult(null);

        // Validate variables
        const missing = variables.filter(v => !variableValues[v]);
        if (missing.length > 0) {
            alert(`請填寫所有範本變數: ${missing.join(', ')}`);
            setSending(false);
            return;
        }

        try {
            const res = await api.notifications.send({
                template_id: selectedTemplate,
                customer_ids: selectedCustomers,
                variables: variableValues
            });
            setResult({ success: res.success, message: res.message });
        } catch (e) {
            setResult({ success: false, message: '發送失敗' });
        }

        setSending(false);
        if (result?.success) {
            setSelectedCustomers([]);
        }
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

    const getPreviewContent = () => {
        if (!selectedTemplate) return null;
        const tmpl = templates.find(t => t.id === parseInt(selectedTemplate));
        if (!tmpl) return null;

        let content = tmpl.content;

        // 1. Highlight system variable
        content = content.replace(/\{\{name\}\}/g, '<span class="var-system">王小明</span>');

        // 2. Highlight user variables
        variables.forEach(v => {
            const val = variableValues[v];
            const display = val ? `<span class="var-filled">${val}</span>` : `<span class="var-empty">{{${v}}}</span>`;
            // Safe replacement
            content = content.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), display);
        });

        // Convert newlines to <br/> logic is handled by 'white-space: pre-wrap' in CSS usually, 
        // but since we are using dangerouslySetInnerHTML, we need to be careful.
        // Actually the container has white-space: pre-wrap, so raw text is fine unless we use HTML for coloring.

        return content;
    };

    return (
        <div>
            <style>{`
                .var-system {
                    color: #10b981;
                    font-weight: bold;
                    background: rgba(16, 185, 129, 0.1);
                    padding: 0 4px;
                    border-radius: 4px;
                }
                .var-empty {
                    color: #ef4444;
                    font-weight: bold;
                    background: rgba(239, 68, 68, 0.1);
                    padding: 0 4px;
                    border-radius: 4px;
                }
                .var-filled {
                    color: #3b82f6;
                    font-weight: bold;
                    background: rgba(59, 130, 246, 0.1);
                    padding: 0 4px;
                    border-radius: 4px;
                }
            `}</style>

            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>發送通知</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>選擇範本與收件客戶，或透過 Excel 匯入名單。</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                <div>
                    <Card title="1. 設定內容">
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>選擇範本</label>
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
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="">-- 請選擇範本 --</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {variables.length > 0 && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Settings size={14} /> 填寫變數
                                </h4>
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {variables.map(v => (
                                        <div key={v}>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>{v}</label>
                                            <input
                                                type="text"
                                                value={variableValues[v] || ''}
                                                onChange={e => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                                                placeholder={`請輸入 ${v} 的內容`}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    color: 'var(--text-primary)',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedTemplate && (
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>內容預覽 (系統變數已自動帶入測試資料)：</div>
                                <div
                                    style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                                    dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                                />
                            </div>
                        )}
                    </Card>

                    {/* Customer Selection Card moved below or kept aside depending on layout preference. 
                        Original layout was 2 columns. Left: Template. Right: Customers. 
                        Let's keep the split but rename titles.
                     */}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {variables.length > 0 ? `使用 ${variables.length} 個自訂變數` : '無自訂變數'}
                                    </div>
                                </div>
                            </div>

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

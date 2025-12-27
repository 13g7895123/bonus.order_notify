import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Send, CheckCircle, AlertCircle, Upload, Users, Info, Settings, X, Eye, Search } from 'lucide-react';

const SendNotification = () => {
    const [templates, setTemplates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState([]);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Import Data State
    const [importData, setImportData] = useState(null); // { headers: [], matched: [], not_found: [] }
    const [searchTerm, setSearchTerm] = useState('');

    // Variable Support
    const [variables, setVariables] = useState([]);

    // Global manual values for variables
    const [variableValues, setVariableValues] = useState({});

    // Mapping from Template Variable -> XLS Header
    const [variableMapping, setVariableMapping] = useState({});

    // Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    // Extract variables when template changes
    useEffect(() => {
        if (!selectedTemplate) {
            setVariables([]);
            setVariableValues({});
            setVariableMapping({});
            return;
        }

        // Ensure we match by ID (both as numbers or strings)
        const tmpl = templates.find(t => String(t.id) === String(selectedTemplate));
        if (!tmpl) return;

        // Regex to find {{variable}}
        const regex = /\{\{(.*?)\}\}/g;
        const found = [];
        let match;
        const tmplContent = tmpl.content || ''; // Safety check

        while ((match = regex.exec(tmplContent)) !== null) {
            const varName = match[1].trim();
            // 'name' is a system reserved variable (customer name)
            if (varName !== 'name' && !found.includes(varName)) {
                found.push(varName);
            }
        }
        setVariables(found);

        // Reset values
        setVariableValues(prev => {
            const next = {};
            found.forEach(v => {
                next[v] = prev[v] || '';
            });
            return next;
        });

        // Initialize mapping
        setVariableMapping(prev => {
            const next = {};
            // Parse template variables JSON settings if available
            let defaultStats = {};
            try {
                defaultStats = typeof tmpl.variables === 'string'
                    ? JSON.parse(tmpl.variables)
                    : (tmpl.variables || {});
            } catch (e) { console.error('Error parsing template variables', e); }

            found.forEach(v => {
                // Priority: Previous state -> Template Default -> Empty (Manual)
                // Actually, if a template changes, we probably want to load its defaults.
                // But if we toggle back and forth, maybe keep user selection? 
                // Let's prioritize Template Default for better UX on fresh select.
                next[v] = defaultStats[v] || '';
            });
            return next;
        });

    }, [selectedTemplate, templates]);

    const loadData = async () => {
        const t = await api.templates.list();
        setTemplates(t);
        const c = await api.customers.list();
        // Ensure IDs are numbers
        setCustomers(c.map(cust => ({ ...cust, id: Number(cust.id) })));
    };

    const handlePreSend = () => {
        // Validation
        // If variable is mapped to Manual (empty string), check if manual value is provided
        const missing = [];
        variables.forEach(v => {
            const source = variableMapping[v];
            if (!source) { // Manual
                if (!variableValues[v]) missing.push(v);
            }
            // If mapped to XLS header, we assume it's fine for now (or we could warn if some rows miss it)
        });

        if (missing.length > 0) {
            alert(`請填寫以下變數的內容 (或選擇對應的 XLS 欄位): ${missing.join(', ')}`);
            return;
        }

        if (selectedCustomers.length === 0) {
            alert('請至少選擇一位客戶');
            return;
        }

        setShowPreviewModal(true);
    };

    const handleConfirmSend = async () => {
        setSending(true);
        setResult(null);
        setShowPreviewModal(false);

        // Build recipients list
        // Strategy: 
        // 1. Identify which customers are from XLS import (for mapping)
        // 2. Others use global manual values

        const recipients = [];

        selectedCustomers.forEach(cid => {
            const recipient = { id: cid, variables: {} };

            // Check if this customer is in import matched list (ensure ID match)
            const imported = importData?.matched?.find(m => Number(m.id) === Number(cid));

            variables.forEach(v => {
                const header = variableMapping[v];
                if (header && imported && imported.row_data && imported.row_data[header]) {
                    // Use XLS value
                    recipient.variables[v] = imported.row_data[header];
                } else {
                    // Use Manual value (Global fallback)
                    recipient.variables[v] = variableValues[v];
                }
            });

            recipients.push(recipient);
        });

        try {
            const res = await api.notifications.send({
                template_id: selectedTemplate,
                recipients: recipients,
                variables: variableValues // Fallback global checks
            });
            setResult({ success: res.success, message: res.message });
        } catch (e) {
            setResult({ success: false, message: '發送失敗' });
        }

        setSending(false);
        if (result?.success) {
            // Optional: reset selection
            // setSelectedCustomers([]);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setImportData(null);

        try {
            const res = await api.notifications.importPreview(file);
            setImportData(res);

            // Auto-select matched customers
            if (res.matched && res.matched.length > 0) {
                const matchedIds = res.matched.map(c => Number(c.id));
                // Merge matched IDs with current selection avoiding duplicates
                setSelectedCustomers(prev => {
                    // Ensure prev are numbers too
                    const prevNums = prev.map(p => Number(p));
                    return [...new Set([...prevNums, ...matchedIds])];
                });
            }
        } catch (e) {
            alert('匯入失敗，請確認檔案格式是否正確');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleCustomer = (id) => {
        const numId = Number(id);
        if (selectedCustomers.includes(numId)) {
            setSelectedCustomers(selectedCustomers.filter(cid => cid !== numId));
        } else {
            setSelectedCustomers([...selectedCustomers, numId]);
        }
    };

    const getPreviewContent = (previewLocal = true) => {
        // previewLocal = true: uses manual values (for Main Page Preview)
        // previewLocal = false: logic for Modal (showing specific user example)

        if (!selectedTemplate) return null;
        // Ensure we match by ID (both as numbers or strings)
        const tmpl = templates.find(t => String(t.id) === String(selectedTemplate));
        if (!tmpl) return null;

        let content = tmpl.content || '';

        // Determine Preview Target Data
        let previewName = '王小明';
        let previewData = null;

        if (!previewLocal && selectedCustomers.length > 0) {
            const firstCid = selectedCustomers[0];
            const customer = customers.find(c => c.id === firstCid);
            if (customer) {
                previewName = customer.custom_name || customer.name || '客戶';
            }
            if (importData?.matched) {
                const match = importData.matched.find(m => m.id === firstCid);
                if (match) previewData = match.row_data;
            }
        }

        // 1. Highlight system variable
        const nameDisplay = previewLocal
            ? '<span class="var-system">王小明</span>'
            : `<span class="var-system">${previewName}</span>`;
        content = content.replace(/\{\{name\}\}/g, nameDisplay);

        // 2. Highlight user variables
        variables.forEach(v => {
            let val = '';
            const header = variableMapping[v];

            if (previewLocal) {
                // Main page: show manual value or headers
                if (header) {
                    val = `[欄位: ${header}]`;
                } else {
                    val = variableValues[v];
                }
            } else {
                // Modal Preview
                if (header && previewData) {
                    val = previewData[header] || '';
                }

                // Fallback to manual value if empty or no XLS data found for this specific user
                if (!val) {
                    val = variableValues[v] || '';
                }

                if (!val) val = '(空)';
            }

            const display = val ? `<span class="var-filled">${val}</span>` : `<span class="var-empty">{{${v}}}</span>`;
            content = content.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), display);
        });

        return content;
    };

    // Helper to get preview user name
    const getPreviewUserName = () => {
        if (selectedCustomers.length > 0) {
            const c = customers.find(x => x.id === selectedCustomers[0]);
            return c ? (c.custom_name || c.name) : '未知客戶';
        }
        return '';
    };

    return (
        <div>
            <style>{`
                .var-system { color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.1); padding: 0 4px; border-radius: 4px; }
                .var-empty { color: #ef4444; font-weight: bold; background: rgba(239, 68, 68, 0.1); padding: 0 4px; border-radius: 4px; }
                .var-filled { color: #3b82f6; font-weight: bold; background: rgba(59, 130, 246, 0.1); padding: 0 4px; border-radius: 4px; }
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex; justify-content: center; align-items: center;
                    z-index: 1000;
                    backdrop-filter: blur(5px);
                }
                .modal-content {
                    background: #1e1e2d; /* Assuming dark theme bg */
                    padding: 2rem;
                    border-radius: 12px;
                    width: 90%; max-width: 600px;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                }
            `}</style>

            {showPreviewModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>確認發送內容</h2>
                            <button onClick={() => setShowPreviewModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>您即將發送通知給 <strong>{selectedCustomers.length}</strong> 位客戶。</p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>以下是預覽 (以第一位選取者 <strong>{getPreviewUserName()}</strong> 為例)：</p>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            marginBottom: '2rem',
                            border: '1px solid var(--border-color)',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6'
                        }} dangerouslySetInnerHTML={{ __html: getPreviewContent(false) }} />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>取消</Button>
                            <Button onClick={handleConfirmSend} disabled={sending}>
                                {sending ? '發送中...' : <><Send size={18} /> 確認發送</>}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

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
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                                <label style={{ fontSize: '0.85rem' }}>{v}</label>
                                                {importData?.headers && (
                                                    <select
                                                        value={variableMapping[v] || ''}
                                                        onChange={e => setVariableMapping(prev => ({ ...prev, [v]: e.target.value }))}
                                                        style={{
                                                            fontSize: '0.8rem',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: 'var(--bg-primary)',
                                                            color: 'var(--text-secondary)',
                                                            border: '1px solid var(--border-color)'
                                                        }}
                                                    >
                                                        <option value="">手動輸入</option>
                                                        {importData.headers.map(h => (
                                                            <option key={h} value={h}>從 XLS: {h}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {(!variableMapping[v]) ? (
                                                <input
                                                    type="text"
                                                    value={variableValues[v] || ''}
                                                    onChange={e => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                                                    placeholder={`請輸入 ${v} 的通用內容`}
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
                                            ) : (
                                                <div style={{
                                                    padding: '10px',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-secondary)',
                                                    border: '1px dashed var(--border-color)'
                                                }}>
                                                    將使用 XLS 欄位「{variableMapping[v]}」的值
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedTemplate && (
                            <div style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>內容預覽 (顯示)：</div>
                                <div
                                    style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}
                                    dangerouslySetInnerHTML={{ __html: getPreviewContent(true) }}
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

                        <div style={{ marginBottom: '1rem', position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="搜尋客戶名稱或 LINE ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 10px 10px 36px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {importData && (
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
                                        onClick={() => { setImportData(null); setSelectedCustomers([]); }}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.85rem' }}>
                                    <div style={{ color: 'var(--success)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CheckCircle size={14} /> 成功對應並自動勾選 {importData.matched?.length || 0} 位客戶
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '6px', marginLeft: '20px' }}>
                                        已偵測欄位: {importData.headers?.join(', ')}
                                    </div>
                                    {importData.not_found?.length > 0 && (
                                        <div style={{ color: 'var(--danger)', marginTop: '8px' }}>
                                            <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <AlertCircle size={14} /> 找不到以下自定義名稱 (共 {importData.not_found.length} 筆)：
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
                                                {importData.not_found.join(', ')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            {customers.filter(c => {
                                const term = searchTerm.toLowerCase();
                                return (c.name && c.name.toLowerCase().includes(term)) ||
                                    (c.custom_name && c.custom_name.toLowerCase().includes(term)) ||
                                    (c.line_uid && c.line_uid.toLowerCase().includes(term));
                            }).map(c => (
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
                            onClick={handlePreSend}
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
                            {sending ? '發送中...' : <><Eye size={20} /> 預覽並發送</>}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SendNotification;

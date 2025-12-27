import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2, Table } from 'lucide-react';

const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, name: '', content: '', variables: {} });

    // Detected variables from content content
    const [detectedVars, setDetectedVars] = useState([]);

    useEffect(() => {
        loadTemplates();
    }, []);

    // Auto-detect variables when content changes
    useEffect(() => {
        if (!isEditing) return;

        const regex = /\{\{(.*?)\}\}/g;
        const found = [];
        let match;
        while ((match = regex.exec(currentTemplate.content)) !== null) {
            const varName = match[1].trim();
            if (varName !== 'name' && !found.includes(varName)) {
                found.push(varName);
            }
        }
        setDetectedVars(found);
    }, [currentTemplate.content, isEditing]);

    const loadTemplates = async () => {
        const data = await api.templates.list();
        // Parse variables JSON if string
        const parsed = data.map(t => ({
            ...t,
            variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : (t.variables || {})
        }));
        setTemplates(parsed);
    };

    const handleEdit = (tmpl) => {
        setCurrentTemplate({
            ...tmpl,
            variables: tmpl.variables || {}
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (confirm('確定要刪除此範本嗎？')) {
            await api.templates.delete(id);
            loadTemplates();
        }
    };

    const handleSave = async () => {
        if (!currentTemplate.name || !currentTemplate.content) return;

        // Clean up variables: remove keys that are no longer in content
        const cleanVariables = {};
        detectedVars.forEach(v => {
            cleanVariables[v] = currentTemplate.variables[v] || '';
        });

        const payload = {
            ...currentTemplate,
            variables: cleanVariables
        };

        if (currentTemplate.id) {
            await api.templates.update(currentTemplate.id, payload);
        } else {
            await api.templates.create(payload);
        }
        loadTemplates();
        setIsEditing(false);
        setCurrentTemplate({ id: null, name: '', content: '', variables: {} });
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>通知範本</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>設計您的通知訊息內容與變數對應。</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => { setCurrentTemplate({ id: null, name: '', content: '', variables: {} }); setIsEditing(true); }}>
                        <Plus size={18} /> 新增範本
                    </Button>
                )}
            </div>

            {isEditing ? (
                <Card title={currentTemplate.id ? '編輯範本' : '新增範本'}>
                    <Input
                        label="範本名稱"
                        value={currentTemplate.name}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                        placeholder="例如: 訂單出貨通知"
                    />
                    <Input
                        label="內容 (使用 {{variable}} 作為動態變數)"
                        multiline
                        value={currentTemplate.content}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                        placeholder="哈囉 {{name}}, ..."
                    />

                    {detectedVars.length > 0 && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Table size={16} /> Excel 欄位對應設定
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                設定每個變數預設對應的 Excel 標題名稱。當匯入包含此標題的 Excel 時，系統將自動取值。
                            </p>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {detectedVars.map(v => (
                                    <div key={v}>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem' }}>變數 <code>{`{{${v}}}`}</code> 對應 Excel 欄位：</label>
                                        <input
                                            type="text"
                                            value={currentTemplate.variables[v] || ''}
                                            onChange={e => setCurrentTemplate(prev => ({
                                                ...prev,
                                                variables: { ...prev.variables, [v]: e.target.value }
                                            }))}
                                            placeholder={`輸入 Excel 標題 (例如: ${v === 'price' ? '金額' : v})`}
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

                    <div className="flex gap-2 justify-end" style={{ marginTop: '1.5rem' }}>
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>取消</Button>
                        <Button onClick={handleSave}>儲存範本</Button>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {templates.map(tmpl => (
                        <Card key={tmpl.id} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="flex justify-between items-start" style={{ marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{tmpl.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(tmpl)} style={{ padding: '8px', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                    <button onClick={() => handleDelete(tmpl.id)} style={{ padding: '8px', color: 'var(--danger)', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', flex: 1, marginBottom: '1rem' }}>{tmpl.content}</div>
                            {tmpl.variables && Object.keys(tmpl.variables).length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    <strong>變數設定：</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        {Object.entries(tmpl.variables).map(([k, v]) => (
                                            <span key={k} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                {k} &rarr; {v || '(未設定)'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Templates;

import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState({ id: null, name: '', content: '' });

    useEffect(() => {
        const saved = localStorage.getItem('templates');
        if (saved) {
            setTemplates(JSON.parse(saved));
        } else {
            // Mock data
            const mock = [
                { id: 1, name: '訂單確認', content: '嗨 {{name}}，您的訂單 {{order_id}} 已確認。' },
                { id: 2, name: '出貨通知', content: '哈囉 {{name}}，您的訂單 {{order_id}} 已出貨。追蹤號碼：{{tracking_number}}' }
            ];
            setTemplates(mock);
            localStorage.setItem('templates', JSON.stringify(mock));
        }
    }, []);

    const saveTemplates = (newTemplates) => {
        setTemplates(newTemplates);
        localStorage.setItem('templates', JSON.stringify(newTemplates));
    };

    const handleEdit = (tmpl) => {
        setCurrentTemplate(tmpl);
        setIsEditing(true);
    };

    const handleDelete = (id) => {
        if (confirm('確定要刪除此範本嗎？')) {
            saveTemplates(templates.filter(t => t.id !== id));
        }
    };

    const handleSave = () => {
        if (!currentTemplate.name || !currentTemplate.content) return;

        if (currentTemplate.id) {
            // Update
            saveTemplates(templates.map(t => t.id === currentTemplate.id ? currentTemplate : t));
        } else {
            // Create
            const newId = Math.max(...templates.map(t => t.id), 0) + 1;
            saveTemplates([...templates, { ...currentTemplate, id: newId }]);
        }
        setIsEditing(false);
        setCurrentTemplate({ id: null, name: '', content: '' });
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>通知範本</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>設計您的通知訊息內容。</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => { setCurrentTemplate({ id: null, name: '', content: '' }); setIsEditing(true); }}>
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
                    <div className="flex gap-2 justify-end">
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
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'pre-wrap', flex: 1 }}>{tmpl.content}</p>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Templates;

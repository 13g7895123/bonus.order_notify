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
                { id: 1, name: 'Order Confirmation', content: 'Hi {{name}}, your order {{order_id}} has been confirmed.' },
                { id: 2, name: 'Shipping Update', content: 'Hello {{name}}, your order {{order_id}} has shipped. Tracking: {{tracking_number}}' }
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
        if (confirm('Are you sure you want to delete this template?')) {
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
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Templates</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Design your notification messages.</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => { setCurrentTemplate({ id: null, name: '', content: '' }); setIsEditing(true); }}>
                        <Plus size={18} /> New Template
                    </Button>
                )}
            </div>

            {isEditing ? (
                <Card title={currentTemplate.id ? 'Edit Template' : 'New Template'}>
                    <Input
                        label="Template Name"
                        value={currentTemplate.name}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                        placeholder="e.g., Order Shipped"
                    />
                    <Input
                        label="Content (Use {{variable}} for dynamic data)"
                        multiline
                        value={currentTemplate.content}
                        onChange={e => setCurrentTemplate({ ...currentTemplate, content: e.target.value })}
                        placeholder="Hello {{name}}, ..."
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Template</Button>
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

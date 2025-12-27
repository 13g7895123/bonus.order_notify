import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2, Search, Users, Link } from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [lineUsers, setLineUsers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState({ id: null, custom_name: '', line_uid: '' });
    const [search, setSearch] = useState('');
    const [showLineUserPicker, setShowLineUserPicker] = useState(false);

    useEffect(() => {
        loadCustomers();
        loadLineUsers();
    }, [search]);

    const loadCustomers = async () => {
        const data = await api.customers.list(search);
        setCustomers(Array.isArray(data) ? data : []);
    };

    const loadLineUsers = async () => {
        const data = await api.line.getUsers();
        setLineUsers(Array.isArray(data) ? data : []);
    };

    const handleEdit = (cust) => {
        setCurrentCustomer({
            id: cust.id,
            custom_name: cust.custom_name || '',
            line_uid: cust.line_uid || ''
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (confirm('確定要刪除此客戶設定嗎？')) {
            await api.customers.delete(id);
            loadCustomers();
        }
    };

    const handleSave = async () => {
        if (!currentCustomer.line_uid) return;
        await api.customers.save(currentCustomer);
        loadCustomers();
        setIsEditing(false);
        setCurrentCustomer({ id: null, custom_name: '', line_uid: '' });
    };

    const selectLineUser = (lineUser) => {
        setCurrentCustomer({
            ...currentCustomer,
            line_uid: lineUser.line_uid,
            custom_name: currentCustomer.custom_name || lineUser.display_name || ''
        });
        setShowLineUserPicker(false);
    };

    const getLineUserInfo = (lineUid) => {
        return lineUsers.find(u => u.line_uid === lineUid);
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>客戶名單</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>管理客戶，連結 LINE 使用者並設定自定義名稱。</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => { setCurrentCustomer({ id: null, custom_name: '', line_uid: '' }); setIsEditing(true); }}>
                        <Plus size={18} /> 新增客戶
                    </Button>
                )}
            </div>

            {isEditing ? (
                <Card title={currentCustomer.id ? '編輯客戶' : '新增客戶'}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            LINE 使用者
                        </label>
                        <div className="flex gap-2">
                            <Input
                                value={currentCustomer.line_uid}
                                onChange={e => setCurrentCustomer({ ...currentCustomer, line_uid: e.target.value })}
                                placeholder="LINE User ID"
                                style={{ marginBottom: 0, flex: 1 }}
                            />
                            <Button variant="secondary" onClick={() => setShowLineUserPicker(!showLineUserPicker)}>
                                <Users size={18} /> 選擇
                            </Button>
                        </div>

                        {/* LINE User Picker */}
                        {showLineUserPicker && (
                            <div style={{
                                marginTop: '0.5rem',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                maxHeight: '200px',
                                overflowY: 'auto'
                            }}>
                                {lineUsers.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        尚無 LINE 使用者，請先設定 Webhook。
                                    </div>
                                ) : lineUsers.map(u => (
                                    <div
                                        key={u.id}
                                        onClick={() => selectLineUser(u)}
                                        style={{
                                            padding: '0.75rem 1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {u.picture_url ? (
                                            <img src={u.picture_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        ) : (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Users size={16} />
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{u.display_name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{u.line_uid}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Input
                        label="自定義名稱"
                        value={currentCustomer.custom_name}
                        onChange={e => setCurrentCustomer({ ...currentCustomer, custom_name: e.target.value })}
                        placeholder="例如：王小明（訂單客戶）"
                    />

                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => { setIsEditing(false); setShowLineUserPicker(false); }}>取消</Button>
                        <Button onClick={handleSave}>儲存</Button>
                    </div>
                </Card>
            ) : (
                <>
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                        <Input
                            placeholder="搜尋客戶..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '40px', marginBottom: 0 }}
                        />
                    </div>

                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>LINE 資訊</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>自定義名稱</th>
                                    <th style={{ padding: '1rem', width: '100px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(c => {
                                    return (
                                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex items-center gap-2">
                                                    {c.picture_url ? (
                                                        <img src={c.picture_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                                                    ) : (
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Users size={18} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{c.line_display_name || '-'}</div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{c.line_uid}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {c.custom_name || <span style={{ color: 'var(--text-secondary)' }}>未設定</span>}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => handleEdit(c)} style={{ color: 'var(--accent-primary)', cursor: 'pointer', background: 'none', border: 'none' }}><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none' }}><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {customers.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            尚無客戶資料。請先從 LINE 使用者頁面確認有收到使用者，再新增客戶。
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Customers;

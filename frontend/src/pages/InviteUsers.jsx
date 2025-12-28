import React, { useState } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { UserPlus, Plus, Trash2, CheckCircle } from 'lucide-react';

const InviteUsers = () => {
    const [users, setUsers] = useState([{ username: '', password: '', name: '' }]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const addUser = () => {
        setUsers([...users, { username: '', password: '', name: '' }]);
    };

    const removeUser = (index) => {
        if (users.length === 1) return;
        setUsers(users.filter((_, i) => i !== index));
    };

    const updateUser = (index, field, value) => {
        const newUsers = [...users];
        newUsers[index][field] = value;
        setUsers(newUsers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        // Validate
        const validUsers = users.filter(u => u.username && u.password && u.name);
        if (validUsers.length === 0) {
            setResult({ success: false, message: '請至少填寫一個完整的使用者資料' });
            setLoading(false);
            return;
        }

        try {
            const res = await api.applications.inviteUsers(validUsers);
            setResult(res);
            if (res.success) {
                setUsers([{ username: '', password: '', name: '' }]);
            }
        } catch (err) {
            setResult({ success: false, message: '操作失敗' });
        }
        setLoading(false);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>邀請使用者</h1>
                <p style={{ color: 'var(--text-secondary)' }}>建立多個新使用者帳號。</p>
            </div>

            <Card style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <span>使用者名稱 *</span>
                            <span>密碼 *</span>
                            <span>顯示名稱 *</span>
                            <span></span>
                        </div>

                        {users.map((user, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <Input
                                    value={user.username}
                                    onChange={(e) => updateUser(index, 'username', e.target.value)}
                                    placeholder="帳號"
                                    style={{ marginBottom: 0 }}
                                />
                                <Input
                                    value={user.password}
                                    onChange={(e) => updateUser(index, 'password', e.target.value)}
                                    placeholder="密碼"
                                    style={{ marginBottom: 0 }}
                                />
                                <Input
                                    value={user.name}
                                    onChange={(e) => updateUser(index, 'name', e.target.value)}
                                    placeholder="顯示名稱"
                                    style={{ marginBottom: 0 }}
                                />
                                <Button
                                    type="button"
                                    onClick={() => removeUser(index)}
                                    variant="danger"
                                    disabled={users.length === 1}
                                    style={{ height: '42px' }}
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2" style={{ marginBottom: '1rem' }}>
                        <Button type="button" onClick={addUser} variant="secondary">
                            <Plus size={18} /> 新增一列
                        </Button>
                    </div>

                    {result && (
                        <div style={{
                            padding: '1rem',
                            marginBottom: '1rem',
                            borderRadius: '6px',
                            backgroundColor: result.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${result.success ? 'var(--success)' : 'var(--danger)'}`,
                            color: result.success ? 'var(--success)' : 'var(--danger)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                {result.success && <CheckCircle size={18} />}
                                <strong>{result.message}</strong>
                            </div>
                            {result.created && result.created.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <strong>已建立的帳號：</strong>
                                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                                        {result.created.map(u => (
                                            <li key={u.id}>{u.username} - {u.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {result.errors && result.errors.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <strong>錯誤：</strong>
                                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: 'var(--danger)' }}>
                                        {result.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <Button type="submit" disabled={loading}>
                        <UserPlus size={18} />
                        {loading ? '建立中...' : '建立帳號'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default InviteUsers;

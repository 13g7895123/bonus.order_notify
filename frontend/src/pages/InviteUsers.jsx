import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { UserPlus, Plus, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';

const CreateUsers = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([{
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        line_channel_secret: '',
        line_channel_access_token: '',
        showLineSettings: false
    }]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    // 管理員導向使用者管理頁面
    if (user?.role === 'admin') {
        return (
            <div>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>建立使用者</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>此功能提供給一般使用者建立新帳號。</p>
                </div>
                <Card style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        管理員請使用「使用者管理」功能來建立和管理使用者。
                    </p>
                    <Button onClick={() => window.location.href = '/users'}>
                        前往使用者管理
                    </Button>
                </Card>
            </div>
        );
    }

    // 沒有權限的使用者
    if (!user?.can_create_users) {
        return (
            <div>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>建立使用者</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>建立新的使用者帳號。</p>
                </div>
                <Card style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        您尚未取得建立使用者的權限。<br />
                        請聯繫管理員開通此功能。
                    </p>
                </Card>
            </div>
        );
    }

    const addUser = () => {
        setUsers([...users, {
            username: '',
            password: '',
            confirmPassword: '',
            name: '',
            line_channel_secret: '',
            line_channel_access_token: '',
            showLineSettings: false
        }]);
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

    const toggleLineSettings = (index) => {
        const newUsers = [...users];
        newUsers[index].showLineSettings = !newUsers[index].showLineSettings;
        setUsers(newUsers);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);

        // Validate passwords match
        const validationErrors = [];
        users.forEach((u, i) => {
            if (u.username && u.password && u.name) {
                if (u.password !== u.confirmPassword) {
                    validationErrors.push(`第 ${i + 1} 筆：兩次輸入的密碼不一致`);
                }
                if (u.password.length < 4) {
                    validationErrors.push(`第 ${i + 1} 筆：密碼至少需要 4 個字元`);
                }
            }
        });

        if (validationErrors.length > 0) {
            setResult({ success: false, message: '驗證失敗', errors: validationErrors });
            setLoading(false);
            return;
        }

        // Filter and prepare valid users
        const validUsers = users
            .filter(u => u.username && u.password && u.name)
            .map(u => ({
                username: u.username,
                password: u.password,
                name: u.name,
                line_channel_secret: u.line_channel_secret || null,
                line_channel_access_token: u.line_channel_access_token || null
            }));

        if (validUsers.length === 0) {
            setResult({ success: false, message: '請至少填寫一個完整的使用者資料' });
            setLoading(false);
            return;
        }

        try {
            const res = await api.applications.inviteUsers(validUsers);
            setResult(res);
            if (res.success) {
                setUsers([{
                    username: '',
                    password: '',
                    confirmPassword: '',
                    name: '',
                    line_channel_secret: '',
                    line_channel_access_token: '',
                    showLineSettings: false
                }]);
            }
        } catch (err) {
            setResult({ success: false, message: '操作失敗' });
        }
        setLoading(false);
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>建立使用者</h1>
                <p style={{ color: 'var(--text-secondary)' }}>建立新的使用者帳號。</p>
            </div>

            <Card style={{ padding: '1.5rem' }}>
                <form onSubmit={handleSubmit}>
                    {users.map((user, index) => (
                        <div key={index} style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: '8px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>使用者 #{index + 1}</span>
                                <Button
                                    type="button"
                                    onClick={() => removeUser(index)}
                                    variant="danger"
                                    disabled={users.length === 1}
                                    style={{ padding: '6px 12px' }}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                <Input
                                    label="帳號 *"
                                    value={user.username}
                                    onChange={(e) => updateUser(index, 'username', e.target.value)}
                                    placeholder="請輸入帳號"
                                    style={{ marginBottom: 0 }}
                                />
                                <Input
                                    label="顯示名稱 *"
                                    value={user.name}
                                    onChange={(e) => updateUser(index, 'name', e.target.value)}
                                    placeholder="請輸入顯示名稱"
                                    style={{ marginBottom: 0 }}
                                />
                                <div></div>
                                <Input
                                    label="密碼 *"
                                    type="password"
                                    value={user.password}
                                    onChange={(e) => updateUser(index, 'password', e.target.value)}
                                    placeholder="至少 4 個字元"
                                    style={{ marginBottom: 0 }}
                                />
                                <Input
                                    label="確認密碼 *"
                                    type="password"
                                    value={user.confirmPassword}
                                    onChange={(e) => updateUser(index, 'confirmPassword', e.target.value)}
                                    placeholder="再次輸入密碼"
                                    style={{ marginBottom: 0 }}
                                />
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    {user.password && user.confirmPassword && (
                                        <span style={{
                                            fontSize: '0.85rem',
                                            color: user.password === user.confirmPassword ? 'var(--success)' : 'var(--danger)',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {user.password === user.confirmPassword ? '✓ 密碼相符' : '✗ 密碼不符'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* LINE Settings Toggle */}
                            <button
                                type="button"
                                onClick={() => toggleLineSettings(index)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginTop: '1rem',
                                    padding: '0.5rem',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {user.showLineSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                LINE Bot 設定（選填）
                            </button>

                            {user.showLineSettings && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <Input
                                        label="Channel Secret"
                                        type="password"
                                        value={user.line_channel_secret}
                                        onChange={(e) => updateUser(index, 'line_channel_secret', e.target.value)}
                                        placeholder="選填"
                                        style={{ marginBottom: 0 }}
                                    />
                                    <Input
                                        label="Channel Access Token"
                                        type="password"
                                        value={user.line_channel_access_token}
                                        onChange={(e) => updateUser(index, 'line_channel_access_token', e.target.value)}
                                        placeholder="選填"
                                        style={{ marginBottom: 0 }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="flex gap-2" style={{ marginBottom: '1rem' }}>
                        <Button type="button" onClick={addUser} variant="secondary">
                            <Plus size={18} /> 新增一位使用者
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

export default CreateUsers;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Send, UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        email: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.username || !formData.password || !formData.name) {
            setError('請填寫使用者名稱、密碼和顯示名稱');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('兩次輸入的密碼不一致');
            return;
        }

        if (formData.password.length < 6) {
            setError('密碼長度至少 6 個字元');
            return;
        }

        setLoading(true);
        try {
            const result = await api.applications.apply({
                username: formData.username,
                password: formData.password,
                name: formData.name,
                email: formData.email || null,
                reason: formData.reason || null
            });

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.messages?.error || result.message || '申請失敗');
            }
        } catch (err) {
            setError('申請失敗，請稍後再試');
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--bg-primary)',
                padding: '1rem'
            }}>
                <Card style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}>
                    <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>申請已送出！</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        您的帳號申請已成功送出，請等待管理員審核。<br />
                        審核通過後即可使用帳號登入。
                    </p>
                    <Link to="/login">
                        <Button style={{ width: '100%' }}>
                            <ArrowLeft size={18} /> 返回登入頁面
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: '1rem'
        }}>
            <Card style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Send size={32} color="var(--accent-primary)" />
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>NotifyHub</span>
                    </div>
                    <h2 style={{ margin: 0 }}>申請帳號</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>填寫以下資料申請使用帳號</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="使用者名稱 *"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="請輸入使用者名稱"
                    />
                    <Input
                        label="顯示名稱 *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="請輸入顯示名稱"
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="選填"
                    />
                    <Input
                        label="密碼 *"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="至少 6 個字元"
                    />
                    <Input
                        label="確認密碼 *"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="再次輸入密碼"
                    />
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            申請原因
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="請簡述您申請帳號的用途（選填）"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                fontSize: '1rem',
                                minHeight: '80px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid var(--danger)',
                            borderRadius: '6px',
                            color: 'var(--danger)',
                            marginBottom: '1rem',
                            fontSize: '0.9rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <Button type="submit" disabled={loading} style={{ width: '100%', marginBottom: '1rem' }}>
                        <UserPlus size={18} />
                        {loading ? '送出中...' : '送出申請'}
                    </Button>

                    <div style={{ textAlign: 'center' }}>
                        <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                            已有帳號？返回登入
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Register;

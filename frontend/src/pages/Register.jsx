import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Send, UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        name: '',
        invite_code: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.username || !formData.password || !formData.name || !formData.invite_code) {
            setError('所有欄位皆為必填');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('兩次輸入的密碼不一致');
            return;
        }

        if (formData.password.length < 4) {
            setError('密碼長度至少 4 個字元');
            return;
        }

        setLoading(true);
        try {
            const result = await api.applications.apply({
                username: formData.username,
                password: formData.password,
                name: formData.name,
                invite_code: formData.invite_code
            });

            if (result.success) {
                setSuccess(true);
            } else {
                setError(result.messages?.error || result.message || '註冊失敗');
            }
        } catch (err) {
            setError('註冊失敗，請稍後再試');
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
                    <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>註冊成功！</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        您的帳號已建立完成，現在可以登入使用了。
                    </p>
                    <Button onClick={() => navigate('/login')} style={{ width: '100%' }}>
                        <ArrowLeft size={18} /> 前往登入
                    </Button>
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
            <Card style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <Send size={32} color="var(--accent-primary)" />
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>NotifyHub</span>
                    </div>
                    <h2 style={{ margin: 0 }}>註冊帳號</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>請填寫以下資料完成註冊</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="邀請碼 *"
                        value={formData.invite_code}
                        onChange={(e) => setFormData({ ...formData, invite_code: e.target.value })}
                        placeholder="請輸入邀請碼"
                    />
                    <Input
                        label="使用者名稱 *"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="請輸入帳號"
                    />
                    <Input
                        label="顯示名稱 *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="請輸入您的名稱"
                    />
                    <Input
                        label="密碼 *"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="至少 4 個字元"
                    />
                    <Input
                        label="確認密碼 *"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="再次輸入密碼"
                    />

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
                        {loading ? '註冊中...' : '註冊'}
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

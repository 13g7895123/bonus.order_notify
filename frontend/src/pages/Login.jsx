import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { Send } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(email, password); // AuthContext now needs to use api
        if (success) {
            navigate('/');
        } else {
            setError('登入失敗，請檢查帳號密碼');
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--bg-primary)'
        }}>
            <Card style={{ width: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        color: 'var(--accent-primary)',
                        marginBottom: '1rem'
                    }}>
                        <Send size={32} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>NotifyHub</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>請登入您的帳戶</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="admin"
                    />

                    {error && (
                        <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <Button style={{ width: '100%', justifyContent: 'center' }} type="submit">
                        登入
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default Login;

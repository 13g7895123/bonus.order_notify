import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { api } from '../services/api';
import { FileText, Users, Send, MessageSquare, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await api.stats.get();
            setStats(data);
        } catch (e) {
            console.error('Failed to load stats', e);
        }
        setLoading(false);
    };

    const getQuotaColor = () => {
        if (!stats?.messages) return 'var(--success)';
        const percentage = (stats.messages.sent_this_month / stats.messages.quota) * 100;
        if (percentage >= 90) return 'var(--danger)';
        if (percentage >= 70) return '#f59e0b'; // warning yellow
        return 'var(--success)';
    };

    const getQuotaPercentage = () => {
        if (!stats?.messages) return 0;
        return Math.min(100, (stats.messages.sent_this_month / stats.messages.quota) * 100);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>載入中...</div>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>儀表板</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>歡迎來到 NotifyHub 訂單通知系統</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <Card style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                        <FileText size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.templates ?? 0}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>通知範本</div>
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: 'var(--success)' }}>
                        <Users size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats?.customers ?? 0}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>客戶名單</div>
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: 'var(--danger)' }}>
                        <Send size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>正常</div>
                        <div style={{ color: 'var(--text-secondary)' }}>系統狀態</div>
                    </div>
                </Card>
            </div>

            {/* Message Quota Card */}
            <div style={{ marginTop: '2rem' }}>
                <Card title="本月訊息配額">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: `${getQuotaColor()}20`, borderRadius: '10px', color: getQuotaColor() }}>
                            <MessageSquare size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '600' }}>
                                    {stats?.messages?.period || '本月'}
                                </span>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                    已發送 <strong style={{ color: getQuotaColor() }}>{stats?.messages?.sent_this_month ?? 0}</strong> / {stats?.messages?.quota ?? 200} 則
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                backgroundColor: 'var(--bg-tertiary)',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${getQuotaPercentage()}%`,
                                    backgroundColor: getQuotaColor(),
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            剩餘可發送：<strong style={{ color: getQuotaColor() }}>{stats?.messages?.remaining ?? 200}</strong> 則
                        </div>
                        {getQuotaPercentage() >= 90 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.85rem' }}>
                                <AlertTriangle size={16} /> 配額即將用盡
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <Card title="快速操作">
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/send" style={{ textDecoration: 'none' }}>
                            <button style={{ padding: '10px 20px', backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                建立新通知
                            </button>
                        </Link>
                        <Link to="/templates" style={{ textDecoration: 'none' }}>
                            <button style={{ padding: '10px 20px', backgroundColor: 'var(--bg-tertiary)', color: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}>
                                管理範本
                            </button>
                        </Link>
                        <Link to="/settings" style={{ textDecoration: 'none' }}>
                            <button style={{ padding: '10px 20px', backgroundColor: 'var(--bg-tertiary)', color: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}>
                                調整配額
                            </button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;

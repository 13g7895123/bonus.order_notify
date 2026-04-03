import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Users, Send, MessageSquare, AlertTriangle, Shield, TrendingUp, TrendingDown, Minus, UserCheck, Clock, CheckCircle, XCircle, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Admin Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.stats.adminDashboard()
            .then(setStats)
            .catch(e => console.error('Failed to load admin stats', e))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingState />;

    const p = stats?.platform || {};
    const m = stats?.messages || {};
    const monthTrend = m.last_month > 0
        ? ((m.this_month - m.last_month) / m.last_month * 100).toFixed(1)
        : null;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={28} color="var(--danger)" /> 管理員儀表板
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>平台整體運營狀況 · {stats?.period}</p>
            </div>

            {/* Platform overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard icon={<Users size={24} />} color="59,130,246" label="使用者總數" value={p.total_users} sub={`${p.active_users} 啟用`} />
                <StatCard icon={<CheckCircle size={24} />} color="16,185,129" label="目前在線" value={p.online_users} sub="有 session" />
                <StatCard icon={<Pause size={24} />} color="239,68,68" label="暫停帳號" value={p.suspended_users} />
                <StatCard icon={<UserCheck size={24} />} color="139,92,246" label="客戶總數" value={p.total_customers} sub="所有使用者" />
                <StatCard icon={<FileText size={24} />} color="245,158,11" label="範本總數" value={p.total_templates} />
                <StatCard icon={<Send size={24} />} color="236,72,153" label="今日發送" value={m.today} />
            </div>

            {/* Monthly messages */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card title={`${stats?.period} 發送統計`}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                        <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--accent-primary)', lineHeight: 1 }}>
                            {m.this_month?.toLocaleString()}
                        </div>
                        {monthTrend !== null && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.95rem', fontWeight: '600', marginBottom: '8px',
                                color: Number(monthTrend) > 0 ? 'var(--success)' : Number(monthTrend) < 0 ? 'var(--danger)' : 'var(--text-secondary)'
                            }}>
                                {Number(monthTrend) > 0 ? <TrendingUp size={18} /> : Number(monthTrend) < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
                                {Math.abs(monthTrend)}% 較上月
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        上月共 <strong style={{ color: 'var(--text-primary)' }}>{m.last_month?.toLocaleString()}</strong> 則
                    </div>
                </Card>

                {/* Top senders */}
                <Card title="本月發送排行 (前5名)">
                    {(stats?.top_senders || []).length === 0 ? (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>本月尚無發送記錄</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(stats?.top_senders || []).map((s, i) => (
                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        backgroundColor: i === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                                        color: i === 0 ? '#f59e0b' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: '700', flexShrink: 0
                                    }}>{i + 1}</div>
                                    <div style={{ flex: 1, fontSize: '0.9rem' }}>{s.name || s.username}</div>
                                    <div style={{ fontWeight: '700', color: 'var(--accent-primary)', fontSize: '0.95rem' }}>{s.sent_count}</div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', width: '22px' }}>則</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Per-user table */}
            <Card title="所有使用者狀況">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                <th style={th}>使用者</th>
                                <th style={{ ...th, textAlign: 'center' }}>狀態</th>
                                <th style={{ ...th, textAlign: 'right' }}>客戶數</th>
                                <th style={{ ...th, textAlign: 'right' }}>範本數</th>
                                <th style={{ ...th, textAlign: 'right' }}>本月發送</th>
                                <th style={{ ...th, textAlign: 'right' }}>上月發送</th>
                                <th style={{ ...th, textAlign: 'center' }}>配額剩餘</th>
                                <th style={{ ...th, textAlign: 'center' }}>最後登入</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(stats?.users || []).map(u => {
                                const quotaPct = u.quota > 0 ? Math.min(100, (u.msgs_this_month / u.quota) * 100) : 0;
                                const quotaColor = quotaPct >= 90 ? 'var(--danger)' : quotaPct >= 70 ? '#f59e0b' : 'var(--success)';
                                return (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: u.is_suspended ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{
                                                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                                                    backgroundColor: u.is_online ? '#10b981' : '#6b7280'
                                                }} title={u.is_online ? '在線' : '離線'} />
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>{u.name || u.username}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{u.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            {u.is_suspended ? (
                                                <Chip color="239,68,68">暫停</Chip>
                                            ) : u.is_active ? (
                                                <Chip color="16,185,129">正常</Chip>
                                            ) : (
                                                <Chip color="107,114,128">停用</Chip>
                                            )}
                                        </td>
                                        <td style={{ ...td, textAlign: 'right' }}>{u.customers}</td>
                                        <td style={{ ...td, textAlign: 'right' }}>{u.templates}</td>
                                        <td style={{ ...td, textAlign: 'right', fontWeight: '600', color: u.msgs_this_month > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                                            {u.msgs_this_month}
                                        </td>
                                        <td style={{ ...td, textAlign: 'right', color: 'var(--text-secondary)' }}>{u.msgs_last_month}</td>
                                        <td style={{ ...td, textAlign: 'center' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                                <span style={{ fontWeight: '600', color: quotaColor, fontSize: '0.9rem' }}>
                                                    {u.quota_remaining}
                                                </span>
                                                <div style={{
                                                    width: '70px', height: '4px', borderRadius: '2px',
                                                    backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden'
                                                }}>
                                                    <div style={{ height: '100%', width: `${quotaPct}%`, backgroundColor: quotaColor, borderRadius: '2px' }} />
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>/ {u.quota}</span>
                                            </div>
                                        </td>
                                        <td style={{ ...td, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                            {u.last_login_at ? formatDate(u.last_login_at) : '從未登入'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {(!stats?.users || stats.users.length === 0) && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>尚無非管理員使用者</div>
                    )}
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                    <Link to="/user-management" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>管理使用者 →</Link>
                    <span style={{ margin: '0 0.75rem', color: 'var(--border-color)' }}>|</span>
                    <Link to="/user-send-stats" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>發送統計 →</Link>
                </div>
            </Card>
        </div>
    );
};

// ── User Dashboard ────────────────────────────────────────────────────────────
const UserDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.stats.get()
            .then(setStats)
            .catch(e => console.error('Failed to load stats', e))
            .finally(() => setLoading(false));
    }, []);

    const getQuotaColor = () => {
        if (!stats?.messages) return 'var(--success)';
        const percentage = (stats.messages.sent_this_month / stats.messages.quota) * 100;
        if (percentage >= 90) return 'var(--danger)';
        if (percentage >= 70) return '#f59e0b';
        return 'var(--success)';
    };

    const getQuotaPercentage = () => {
        if (!stats?.messages) return 0;
        return Math.min(100, (stats.messages.sent_this_month / stats.messages.quota) * 100);
    };

    if (loading) return <LoadingState />;

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

// ── Shared helpers ────────────────────────────────────────────────────────────
const LoadingState = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>載入中...</div>
    </div>
);

const StatCard = ({ icon, color, label, value, sub }) => (
    <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ color: `rgb(${color})` }}>{icon}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}>{value ?? '-'}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{sub}</div>}
    </Card>
);

const Chip = ({ color, children }) => (
    <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
        backgroundColor: `rgba(${color},0.15)`, color: `rgb(${color})`
    }}>{children}</span>
);

const th = {
    padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem',
    color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: '0.05em', whiteSpace: 'nowrap'
};
const td = { padding: '0.85rem 1rem', verticalAlign: 'middle' };

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Entry point ───────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useAuth();
    if (user?.role === 'admin') return <AdminDashboard />;
    return <UserDashboard />;
};

export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
    BarChart2, Users, RefreshCw, AlertOctagon, CheckCircle, XCircle, Calendar, Pause, Play, Search
} from 'lucide-react';

const MODES = [
    { value: 'last_month', label: '上個月' },
    { value: 'month',      label: '指定月份' },
    { value: 'last30',     label: '最近30次' },
    { value: 'all',        label: '全部' },
];

// Modal for setting/clearing suspend notice
const SuspendModal = ({ user, onClose, onSave }) => {
    const [notice, setNotice] = useState(user.suspend_notice || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!notice.trim()) {
            alert('請填寫暫停說明');
            return;
        }
        setSaving(true);
        await onSave(user.id, true, notice.trim());
        setSaving(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                borderRadius: '12px', padding: '2rem', width: '480px', maxWidth: '95vw'
            }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>
                    暫停使用 - {user.name || user.username}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                    當該使用者嘗試發送通知時，系統將顯示以下提示說明。
                </p>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    暫停說明 (必填)
                </label>
                <textarea
                    value={notice}
                    onChange={e => setNotice(e.target.value)}
                    rows={4}
                    placeholder="例如：帳號因違規行為暫停使用，請聯絡客服。"
                    style={{
                        width: '100%', padding: '0.75rem', borderRadius: '8px',
                        border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'vertical',
                        boxSizing: 'border-box'
                    }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                    <button onClick={onClose} style={{
                        padding: '0.5rem 1rem', border: '1px solid var(--border-color)',
                        borderRadius: '8px', backgroundColor: 'transparent',
                        color: 'var(--text-primary)', cursor: 'pointer'
                    }}>取消</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '0.5rem 1.25rem', border: 'none', borderRadius: '8px',
                            backgroundColor: '#dc2626', color: 'white', cursor: saving ? 'wait' : 'pointer',
                            fontWeight: '600'
                        }}
                    >
                        {saving ? '儲存中...' : '確認暫停'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const UserSendStats = () => {
    const [mode, setMode] = useState('last_month');
    const [month, setMonth] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [showAll, setShowAll] = useState(false);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Suspend modal
    const [suspendTarget, setSuspendTarget] = useState(null);

    const loadStats = useCallback(async () => {
        setLoading(true);
        try {
            const params = { mode, show_all: showAll ? '1' : '0' };
            if (mode === 'month') params.month = month;
            const result = await api.users.adminSendStats(params);
            setData(result);
        } catch (e) {
            console.error('Failed to load stats', e);
        }
        setLoading(false);
    }, [mode, month, showAll]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleSuspend = async (userId, isSuspended, notice) => {
        await api.users.setSuspend(userId, isSuspended, notice);
        loadStats();
    };

    const handleResume = async (userId) => {
        if (!confirm('確定要解除此使用者的暫停狀態嗎？')) return;
        await api.users.setSuspend(userId, false, '');
        loadStats();
    };

    const users = data?.users || [];
    const periodLabel = data?.period_label || '';

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={28} /> 發送統計
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>查看所有使用者的訊息發送狀況並管理帳號暫停。</p>
            </div>

            {/* Controls */}
            <Card style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                    {/* Mode tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {MODES.map(m => (
                            <button
                                key={m.value}
                                onClick={() => setMode(m.value)}
                                style={{
                                    padding: '0.4rem 1rem', borderRadius: '20px', border: '1px solid',
                                    borderColor: mode === m.value ? 'var(--accent-primary)' : 'var(--border-color)',
                                    backgroundColor: mode === m.value ? 'var(--accent-primary)' : 'transparent',
                                    color: mode === m.value ? 'white' : 'var(--text-primary)',
                                    cursor: 'pointer', fontSize: '0.875rem', fontWeight: mode === m.value ? '600' : '400',
                                    transition: 'all 0.2s'
                                }}
                            >{m.label}</button>
                        ))}
                    </div>

                    {/* Month picker */}
                    {mode === 'month' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                            <input
                                type="month"
                                value={month}
                                onChange={e => setMonth(e.target.value)}
                                style={{
                                    padding: '0.4rem 0.75rem', borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                    )}

                    {/* Show all toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            顯示所有使用者
                        </span>
                        <div
                            onClick={() => setShowAll(v => !v)}
                            style={{
                                width: '40px', height: '22px', borderRadius: '11px',
                                backgroundColor: showAll ? 'var(--accent-primary)' : 'var(--border-color)',
                                position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s'
                            }}
                        >
                            <div style={{
                                position: 'absolute', top: '3px',
                                left: showAll ? '21px' : '3px',
                                width: '16px', height: '16px', borderRadius: '50%',
                                backgroundColor: 'white', transition: 'left 0.2s'
                            }} />
                        </div>
                    </label>

                    <button
                        onClick={loadStats}
                        style={{
                            padding: '0.4rem 0.75rem', borderRadius: '8px',
                            border: '1px solid var(--border-color)', backgroundColor: 'transparent',
                            color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem'
                        }}
                    >
                        <RefreshCw size={15} /> 重新整理
                    </button>
                </div>
            </Card>

            {/* Summary */}
            {data && (
                <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} />
                    <span>
                        查詢期間：<strong style={{ color: 'var(--text-primary)' }}>{periodLabel}</strong>
                        　共 <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong> 位使用者
                        {!showAll && <span style={{ color: '#f59e0b' }}>（僅顯示上個月有發送的使用者）</span>}
                    </span>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>載入中...</div>
            ) : users.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        {showAll ? '尚無使用者資料' : '上個月沒有使用者發送過訊息'}
                    </div>
                </Card>
            ) : (
                <Card>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={thStyle}>使用者</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>帳號狀態</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>
                                        {mode === 'last30' ? '最近30次' : `${periodLabel} 發送數`}
                                    </th>
                                    {mode === 'last30' && (
                                        <th style={{ ...thStyle, textAlign: 'center' }}>涵蓋時間範圍</th>
                                    )}
                                    <th style={{ ...thStyle, textAlign: 'center' }}>上次發送</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id} style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        backgroundColor: u.is_suspended ? 'rgba(220,38,38,0.05)' : 'transparent',
                                        transition: 'background-color 0.15s'
                                    }}>
                                        {/* User info */}
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: '600' }}>{u.name || u.username}</div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>@{u.username}</div>
                                        </td>

                                        {/* Status */}
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {u.is_suspended ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 10px', borderRadius: '20px',
                                                    backgroundColor: 'rgba(220,38,38,0.15)', color: '#dc2626',
                                                    fontSize: '0.8rem', fontWeight: '600'
                                                }}>
                                                    <Pause size={12} /> 暫停使用
                                                </span>
                                            ) : u.is_active ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 10px', borderRadius: '20px',
                                                    backgroundColor: 'rgba(34,197,94,0.15)', color: '#16a34a',
                                                    fontSize: '0.8rem', fontWeight: '600'
                                                }}>
                                                    <CheckCircle size={12} /> 正常
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 10px', borderRadius: '20px',
                                                    backgroundColor: 'rgba(156,163,175,0.2)', color: 'var(--text-secondary)',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    <XCircle size={12} /> 停用
                                                </span>
                                            )}
                                            {u.is_suspended && u.suspend_notice && (
                                                <div style={{
                                                    marginTop: '4px', fontSize: '0.75rem', color: '#dc2626',
                                                    maxWidth: '180px', wordBreak: 'break-word'
                                                }}>
                                                    {u.suspend_notice}
                                                </div>
                                            )}
                                        </td>

                                        {/* Send count */}
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: '1.2rem', fontWeight: '700',
                                                color: u.send_count > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)'
                                            }}>
                                                {u.send_count}
                                            </span>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '3px' }}>次</span>
                                        </td>

                                        {/* Last30 range */}
                                        {mode === 'last30' && (
                                            <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {u.last30_oldest && u.last30_newest ? (
                                                    <>
                                                        <div>{formatDate(u.last30_oldest)}</div>
                                                        <div>~ {formatDate(u.last30_newest)}</div>
                                                    </>
                                                ) : '-'}
                                            </td>
                                        )}

                                        {/* Last send */}
                                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {u.last_send_at ? formatDate(u.last_send_at) : '-'}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {u.is_suspended ? (
                                                <button
                                                    onClick={() => handleResume(u.id)}
                                                    title="解除暫停"
                                                    style={{
                                                        padding: '5px 12px', borderRadius: '6px',
                                                        border: '1px solid #16a34a', backgroundColor: 'rgba(34,197,94,0.1)',
                                                        color: '#16a34a', cursor: 'pointer', fontSize: '0.8rem',
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <Play size={13} /> 恢復使用
                                                </button>
                                            ) : u.sent_last_month ? (
                                                <button
                                                    onClick={() => setSuspendTarget(u)}
                                                    title="暫停使用"
                                                    style={{
                                                        padding: '5px 12px', borderRadius: '6px',
                                                        border: '1px solid #dc2626', backgroundColor: 'rgba(220,38,38,0.08)',
                                                        color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem',
                                                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                                                    }}
                                                >
                                                    <Pause size={13} /> 暫停使用
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Suspend modal */}
            {suspendTarget && (
                <SuspendModal
                    user={suspendTarget}
                    onClose={() => setSuspendTarget(null)}
                    onSave={handleSuspend}
                />
            )}
        </div>
    );
};

const thStyle = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    color: 'var(--text-secondary)',
    fontWeight: '600',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap'
};

const tdStyle = {
    padding: '0.85rem 1rem',
    verticalAlign: 'top'
};

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default UserSendStats;

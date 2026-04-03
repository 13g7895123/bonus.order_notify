import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import { AlertOctagon, RefreshCw, User, ChevronLeft, ChevronRight, Calendar, Filter } from 'lucide-react';

const DuplicateSendLogs = () => {
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [page, setPage]           = useState(1);
    const [filterUser, setFilterUser] = useState('');
    const [filterDate, setFilterDate] = useState('');

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p };
            if (filterUser) params.user_id = filterUser;
            if (filterDate) params.date    = filterDate;
            const res = await api.stats.adminDuplicateLogs(params);
            setData(res);
            setPage(p);
        } catch (e) {
            console.error('Failed to load duplicate logs', e);
        }
        setLoading(false);
    }, [filterUser, filterDate]);

    useEffect(() => { load(1); }, [load]);

    const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <AlertOctagon size={26} color="var(--danger)" /> 重複發送攔截記錄
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    當天已發送相同訊息給相同客戶時，系統會自動略過並記錄於此
                </p>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <SummaryCard label="累計攔截次數" value={data?.summary?.total_count ?? '-'} color="239,68,68" />
                <SummaryCard label="今日攔截次數" value={data?.summary?.today_count ?? '-'} color="245,158,11" />
            </div>

            {/* Per-user summary */}
            {(data?.user_summary?.length ?? 0) > 0 && (
                <Card style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.9rem' }}>各使用者攔截統計</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {data.user_summary.map(u => (
                            <button key={u.user_id} onClick={() => setFilterUser(filterUser === String(u.user_id) ? '' : String(u.user_id))} style={{
                                padding: '5px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                                backgroundColor: filterUser === String(u.user_id) ? 'rgba(239,68,68,0.8)' : 'rgba(239,68,68,0.12)',
                                color: filterUser === String(u.user_id) ? '#fff' : 'rgb(239,68,68)',
                                fontSize: '0.8rem', fontWeight: '600',
                                transition: 'all 0.15s',
                            }}>
                                {u.name || u.username}
                                <span style={{
                                    marginLeft: '6px', padding: '1px 7px', borderRadius: '10px',
                                    backgroundColor: filterUser === String(u.user_id) ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.2)',
                                }}>{u.count}</span>
                            </button>
                        ))}
                    </div>
                </Card>
            )}

            {/* Filter bar */}
            <Card style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Filter size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>日期篩選</label>
                        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                    </div>
                    {(filterUser || filterDate) && (
                        <button onClick={() => { setFilterUser(''); setFilterDate(''); }} style={{
                            padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem'
                        }}>清除篩選</button>
                    )}
                    <button onClick={() => load(1)} style={{
                        marginLeft: 'auto', padding: '5px 12px', borderRadius: '6px',
                        border: 'none', backgroundColor: 'var(--accent-primary)', color: '#fff',
                        cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                        <RefreshCw size={13} /> 重新整理
                    </button>
                </div>
            </Card>

            {/* Logs table */}
            <Card>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>載入中...</div>
                ) : (data?.logs?.length ?? 0) === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <AlertOctagon size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>目前無攔截記錄</p>
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                        <th style={th}>攔截時間</th>
                                        <th style={th}>使用者</th>
                                        <th style={th}>客戶名稱</th>
                                        <th style={th}>範本</th>
                                        <th style={th}>訊息內容</th>
                                        <th style={th}>原始發送時間</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.logs.map(log => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={td}>
                                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                    {formatDate(log.created_at)}
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <User size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{log.user_name || log.username}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>@{log.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ fontWeight: '500' }}>{log.customer_name || '-'}</div>
                                                {log.line_uid && (
                                                    <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                        {log.line_uid.slice(0, 14)}…
                                                    </div>
                                                )}
                                            </td>
                                            <td style={td}>
                                                <span style={{ fontSize: '0.82rem' }}>{log.template_name || '（已刪除）'}</span>
                                            </td>
                                            <td style={{ ...td, maxWidth: '280px' }}>
                                                <div style={{
                                                    fontSize: '0.8rem', color: 'var(--text-secondary)',
                                                    overflow: 'hidden', display: '-webkit-box',
                                                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all'
                                                }} title={log.message_content}>
                                                    {log.message_content}
                                                </div>
                                            </td>
                                            <td style={td}>
                                                <div style={{ fontSize: '0.8rem', color: '#10b981', whiteSpace: 'nowrap' }}>
                                                    {formatDate(log.original_sent_at)}
                                                </div>
                                                <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)' }}>（已於此時發送）</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                                <button onClick={() => load(page - 1)} disabled={page <= 1} style={pageBtn(page <= 1)}>
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    第 {page} / {totalPages} 頁 （共 {data.total} 筆）
                                </span>
                                <button onClick={() => load(page + 1)} disabled={page >= totalPages} style={pageBtn(page >= totalPages)}>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Card>
        </div>
    );
};

const SummaryCard = ({ label, value, color }) => (
    <Card style={{ padding: '1.25rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{label}</div>
        <div style={{ fontSize: '2.2rem', fontWeight: '800', color: `rgb(${color})`, lineHeight: 1 }}>{value}</div>
    </Card>
);

const th = {
    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.74rem',
    color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: '0.04em', whiteSpace: 'nowrap'
};
const td = { padding: '0.75rem 1rem', verticalAlign: 'top' };

const pageBtn = (disabled) => ({
    padding: '6px 10px', border: '1px solid var(--border-color)', cursor: disabled ? 'not-allowed' : 'pointer',
    borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
    opacity: disabled ? 0.4 : 1, display: 'flex', alignItems: 'center',
});

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default DuplicateSendLogs;

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Activity, RefreshCw, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, total_pages: 0 });
    const [filters, setFilters] = useState({ method: '', endpoint: '', date_from: '', date_to: '' });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadLogs();
        loadStats();
    }, []);

    const loadLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, per_page: 50 };
            if (filters.method) params.method = filters.method;
            if (filters.endpoint) params.endpoint = filters.endpoint;
            if (filters.date_from) params.date_from = filters.date_from;
            if (filters.date_to) params.date_to = filters.date_to;

            const data = await api.activityLogs.list(params);
            setLogs(data.data || []);
            setPagination(data.pagination || { page: 1, per_page: 50, total: 0, total_pages: 0 });
        } catch (e) {
            console.error('Failed to load logs', e);
        }
        setLoading(false);
    };

    const loadStats = async () => {
        try {
            const data = await api.activityLogs.stats();
            setStats(data);
        } catch (e) {
            console.error('Failed to load stats', e);
        }
    };

    const handleClearLogs = async () => {
        if (!window.confirm('確定要清除 30 天前的紀錄嗎？')) return;
        try {
            await api.activityLogs.clear(30);
            loadLogs();
            loadStats();
        } catch (e) {
            console.error('Failed to clear logs', e);
        }
    };

    const applyFilters = () => {
        loadLogs(1);
    };

    const clearFilters = () => {
        setFilters({ method: '', endpoint: '', date_from: '', date_to: '' });
        setTimeout(() => loadLogs(1), 0);
    };

    const getMethodColor = (method) => {
        const colors = {
            'GET': '#10b981',
            'POST': '#3b82f6',
            'PUT': '#f59e0b',
            'DELETE': '#ef4444'
        };
        return colors[method] || '#6b7280';
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>操作紀錄</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>檢視所有 API 請求的紀錄。</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setShowFilters(!showFilters)} variant="secondary">
                        <Filter size={18} /> 篩選
                    </Button>
                    <Button onClick={() => { loadLogs(); loadStats(); }} variant="secondary">
                        <RefreshCw size={18} /> 重新整理
                    </Button>
                    <Button onClick={handleClearLogs} variant="danger">
                        <Trash2 size={18} /> 清除舊紀錄
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <Card style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{stats.today}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>今日請求</div>
                    </Card>
                    <Card style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.this_hour}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>這小時</div>
                    </Card>
                    <Card style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{pagination.total}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>總紀錄數</div>
                    </Card>
                    <Card style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>今日 Top 使用者</div>
                        {stats.top_users?.slice(0, 3).map((u, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span>{u.username}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{u.count}</span>
                            </div>
                        ))}
                    </Card>
                </div>
            )}

            {/* Filters */}
            {showFilters && (
                <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Method</label>
                            <select
                                value={filters.method}
                                onChange={e => setFilters({ ...filters, method: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                            >
                                <option value="">全部</option>
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        <Input
                            label="Endpoint"
                            value={filters.endpoint}
                            onChange={e => setFilters({ ...filters, endpoint: e.target.value })}
                            placeholder="/api/..."
                            style={{ marginBottom: 0 }}
                        />
                        <Input
                            label="開始日期"
                            type="date"
                            value={filters.date_from}
                            onChange={e => setFilters({ ...filters, date_from: e.target.value })}
                            style={{ marginBottom: 0 }}
                        />
                        <Input
                            label="結束日期"
                            type="date"
                            value={filters.date_to}
                            onChange={e => setFilters({ ...filters, date_to: e.target.value })}
                            style={{ marginBottom: 0 }}
                        />
                        <div className="flex gap-2">
                            <Button onClick={applyFilters}>套用</Button>
                            <Button onClick={clearFilters} variant="secondary">清除</Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Logs Table */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>載入中...</div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Activity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>尚無操作紀錄</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>時間</th>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>使用者</th>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Method</th>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Endpoint</th>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>狀態</th>
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{log.created_at}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>{log.username || <span style={{ color: 'var(--text-secondary)' }}>-</span>}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            backgroundColor: getMethodColor(log.method) + '20',
                                            color: getMethodColor(log.method),
                                            fontWeight: '600',
                                            fontSize: '0.8rem'
                                        }}>
                                            {log.method}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {log.endpoint}
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <span style={{
                                            color: log.response_code >= 200 && log.response_code < 300 ? 'var(--success)' :
                                                log.response_code >= 400 ? 'var(--danger)' : 'var(--warning)'
                                        }}>
                                            {log.response_code || '-'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.ip_address}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
                <div className="flex justify-center items-center gap-2" style={{ marginTop: '1.5rem' }}>
                    <Button
                        onClick={() => loadLogs(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        variant="secondary"
                    >
                        <ChevronLeft size={18} />
                    </Button>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        第 {pagination.page} / {pagination.total_pages} 頁
                    </span>
                    <Button
                        onClick={() => loadLogs(pagination.page + 1)}
                        disabled={pagination.page >= pagination.total_pages}
                        variant="secondary"
                    >
                        <ChevronRight size={18} />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;

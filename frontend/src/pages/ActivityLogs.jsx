import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Activity, RefreshCw, Trash2, Filter, ChevronLeft, ChevronRight, Eye, X, AlertCircle } from 'lucide-react';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, per_page: 50, total: 0, total_pages: 0 });
    const [filters, setFilters] = useState({ user_id: '', method: '', endpoint: '', date_from: '', date_to: '' });
    const [showFilters, setShowFilters] = useState(false);
    const [userList, setUserList] = useState([]);

    // Detail modal state
    const [showDetail, setShowDetail] = useState(false);
    const [detailLog, setDetailLog] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    useEffect(() => {
        loadLogs();
        loadStats();
        api.users.list().then(data => setUserList(Array.isArray(data) ? data : (data?.data || [])));
    }, []);

    const loadLogs = async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, per_page: 50 };
            if (filters.user_id) params.user_id = filters.user_id;
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

    const handleViewDetail = async (log) => {
        setShowDetail(true);
        setDetailLog(null);
        setLoadingDetail(true);
        try {
            const data = await api.activityLogs.show(log.id);
            setDetailLog(data);
        } catch (e) {
            console.error('Failed to load log detail', e);
        }
        setLoadingDetail(false);
    };

    const applyFilters = () => {
        loadLogs(1);
    };

    const clearFilters = () => {
        setFilters({ user_id: '', method: '', endpoint: '', date_from: '', date_to: '' });
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

    const formatJson = (data) => {
        if (!data) return null;
        if (typeof data === 'object') {
            return JSON.stringify(data, null, 2);
        }
        try {
            return JSON.stringify(JSON.parse(data), null, 2);
        } catch {
            return data;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>操作紀錄</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>檢視所有 API 請求的紀錄。點擊錯誤紀錄可以查看詳細的請求與回應內容。</p>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>使用者</label>
                            <select
                                value={filters.user_id}
                                onChange={e => setFilters({ ...filters, user_id: e.target.value })}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                            >
                                <option value=''>全部</option>
                                {userList.map(u => (
                                    <option key={u.id} value={u.id}>{u.username}</option>
                                ))}
                            </select>
                        </div>
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
                                <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr
                                    key={log.id}
                                    style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        backgroundColor: (log.response_code < 200 || log.response_code >= 300) ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                    }}
                                >
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
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            color: log.response_code >= 200 && log.response_code < 300 ? 'var(--success)' :
                                                log.response_code >= 400 ? 'var(--danger)' : 'var(--warning)'
                                        }}>
                                            {(log.response_code < 200 || log.response_code >= 300) && <AlertCircle size={14} />}
                                            {log.response_code || '-'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.ip_address}</td>
                                    <td style={{ padding: '0.75rem 1rem' }}>
                                        <button
                                            onClick={() => handleViewDetail(log)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: (log.response_code < 200 || log.response_code >= 300) ? 'var(--danger)' : 'var(--accent-primary)',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="查看詳細"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </td>
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

            {/* Detail Modal */}
            {showDetail && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '12px',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'sticky',
                            top: 0,
                            backgroundColor: 'var(--bg-primary)',
                            zIndex: 1
                        }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>日誌詳細資料</h2>
                            <button
                                onClick={() => setShowDetail(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '8px'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '1.5rem' }}>
                            {loadingDetail ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    載入中...
                                </div>
                            ) : detailLog ? (
                                <div>
                                    {/* Basic Info */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '1rem',
                                        marginBottom: '1.5rem',
                                        padding: '1rem',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px'
                                    }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>時間</div>
                                            <div>{detailLog.created_at}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>使用者</div>
                                            <div>{detailLog.username || '-'}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>IP 位址</div>
                                            <div>{detailLog.ip_address}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Method</div>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: getMethodColor(detailLog.method) + '20',
                                                color: getMethodColor(detailLog.method),
                                                fontWeight: '600',
                                                fontSize: '0.85rem'
                                            }}>
                                                {detailLog.method}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>狀態碼</div>
                                            <span style={{
                                                color: detailLog.response_code >= 200 && detailLog.response_code < 300 ? 'var(--success)' :
                                                    detailLog.response_code >= 400 ? 'var(--danger)' : 'var(--warning)',
                                                fontWeight: '600'
                                            }}>
                                                {detailLog.response_code}
                                            </span>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>Endpoint</div>
                                            <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{detailLog.endpoint}</div>
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '4px' }}>User Agent</div>
                                            <div style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{detailLog.user_agent || '-'}</div>
                                        </div>
                                    </div>

                                    {/* Request Body */}
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            Request Body
                                            {detailLog.request_body && (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
                                                    (敏感欄位已隱藏)
                                                </span>
                                            )}
                                        </h3>
                                        <pre style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            overflow: 'auto',
                                            maxHeight: '200px',
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-all'
                                        }}>
                                            {formatJson(detailLog.request_body_formatted || detailLog.request_body) || <span style={{ color: 'var(--text-secondary)' }}>無資料</span>}
                                        </pre>
                                    </div>

                                    {/* Response Body (only for non-200) */}
                                    {(detailLog.response_code < 200 || detailLog.response_code >= 300) && (
                                        <div>
                                            <h3 style={{
                                                fontSize: '1rem',
                                                fontWeight: '600',
                                                marginBottom: '0.5rem',
                                                color: 'var(--danger)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                <AlertCircle size={18} />
                                                Response Body (錯誤詳情)
                                            </h3>
                                            <pre style={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                padding: '1rem',
                                                borderRadius: '8px',
                                                overflow: 'auto',
                                                maxHeight: '300px',
                                                fontSize: '0.85rem',
                                                fontFamily: 'monospace',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all'
                                            }}>
                                                {formatJson(detailLog.response_body_formatted || detailLog.response_body) || <span style={{ color: 'var(--text-secondary)' }}>無資料（此紀錄可能在新增 response_body 功能之前）</span>}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    無法載入日誌詳細資料
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;


import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Filter, RefreshCw, Search, X, ChevronLeft, ChevronRight, Eye, Activity, Zap, Info, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

const WebhookLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    
    // Webhook test states
    const [showTestModal, setShowTestModal] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState('');
    
    // Filter states
    const [filters, setFilters] = useState({
        user_id: '',
        start_date: '',
        end_date: '',
        status: '', // 'success', 'error', 'test'
        page: 1,
        limit: 20
    });

    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

    useEffect(() => {
        loadUsers();
        loadStats();
        loadLogs();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [filters.page]);

    const loadUsers = async () => {
        try {
            const data = await api.users.list();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
        }
    };

    const loadStats = async () => {
        try {
            const data = await api.line.getWebhookStats();
            setStats(data);
        } catch (error) {
            console.error('Failed to load stats', error);
        }
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await api.line.getWebhookLogs(filters);
            setLogs(data.data || []);
            setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
        } catch (error) {
            console.error('Failed to load logs', error);
        }
        setLoading(false);
    };

    const applyFilters = () => {
        setFilters({ ...filters, page: 1 });
        loadLogs();
    };

    const resetFilters = () => {
        setFilters({
            user_id: '',
            start_date: '',
            end_date: '',
            status: '',
            page: 1,
            limit: 20
        });
        setTimeout(loadLogs, 0);
    };

    const handleTestWebhook = async () => {
        if (!selectedUserId) {
            alert('請選擇要測試的使用者');
            return;
        }

        setTestLoading(true);
        setTestResult(null);
        
        try {
            const result = await api.line.testWebhook(selectedUserId);
            setTestResult(result);
        } catch (error) {
            console.error('Webhook test failed', error);
            setTestResult({
                overall_status: 'error',
                user: { username: '錯誤', name: '測試失敗' },
                tests: {
                    error: {
                        name: '連線錯誤',
                        status: 'error',
                        message: '無法連線到伺服器: ' + error.message
                    }
                }
            });
        }
        
        setTestLoading(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={18} style={{ color: 'var(--success)' }} />;
            case 'error':
                return <AlertCircle size={18} style={{ color: 'var(--danger)' }} />;
            case 'warning':
                return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
            case 'info':
            default:
                return <Info size={18} style={{ color: 'var(--text-secondary)' }} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success': return 'var(--success)';
            case 'error': return 'var(--danger)';
            case 'warning': return '#f59e0b';
            default: return 'var(--text-secondary)';
        }
    };

    const getStatusBadge = (status) => {
        if (status === 200) {
            return <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '4px 8px', 
                borderRadius: '4px', 
                backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                color: '#10b981',
                fontSize: '0.85rem',
                fontWeight: '500'
            }}>
                <CheckCircle size={14} /> 成功
            </span>;
        } else if (status === 401 || status === 403) {
            return <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '4px 8px', 
                borderRadius: '4px', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: '500'
            }}>
                <AlertCircle size={14} /> 驗證失敗
            </span>;
        } else if (status >= 500) {
            return <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '4px 8px', 
                borderRadius: '4px', 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: '500'
            }}>
                <AlertCircle size={14} /> 伺服器錯誤
            </span>;
        }
        return <span style={{ padding: '4px 8px', fontSize: '0.85rem' }}>{status}</span>;
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Activity size={32} style={{ color: 'var(--accent-primary)' }} />
                        Webhook 請求記錄
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>查看所有 LINE Webhook 請求的詳細記錄</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                        onClick={() => setShowTestModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        <Zap size={18} />
                        測試 Webhook
                    </button>
                    <button 
                        onClick={() => { loadLogs(); loadStats(); }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        <RefreshCw size={18} />
                        重新整理
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '1rem', 
                    marginBottom: '2rem' 
                }}>
                    <div style={{ 
                        padding: '1.5rem', 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>總請求數</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total_requests}</div>
                    </div>
                    <div style={{ 
                        padding: '1.5rem', 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>成功請求</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.successful_requests}</div>
                    </div>
                    <div style={{ 
                        padding: '1.5rem', 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>失敗請求</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{stats.failed_requests}</div>
                    </div>
                    <div style={{ 
                        padding: '1.5rem', 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>測試請求</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.test_requests}</div>
                    </div>
                    <div style={{ 
                        padding: '1.5rem', 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>平均處理時間</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.avg_processing_time_ms}ms</div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={{ 
                padding: '1.5rem', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <Filter size={18} />
                    <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>篩選條件</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>使用者</label>
                        <select
                            value={filters.user_id}
                            onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="">全部使用者</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name} (@{user.username})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>開始日期</label>
                        <input
                            type="date"
                            value={filters.start_date}
                            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>結束日期</label>
                        <input
                            type="date"
                            value={filters.end_date}
                            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>狀態</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <option value="">全部狀態</option>
                            <option value="success">成功 (200)</option>
                            <option value="error">錯誤 (401/403/500)</option>
                            <option value="test">測試請求</option>
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button
                        onClick={applyFilters}
                        style={{
                            padding: '0.5rem 1.5rem',
                            backgroundColor: 'var(--accent-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <Search size={16} />
                        套用篩選
                    </button>
                    <button
                        onClick={resetFilters}
                        style={{
                            padding: '0.5rem 1.5rem',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <X size={16} />
                        重置
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '8px', 
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
            }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        載入中...
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        沒有找到任何記錄
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>時間</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>使用者</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>狀態</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>事件數</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>事件類型</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>處理時間</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>來源IP</th>
                                        <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, index) => (
                                        <tr 
                                            key={log.id} 
                                            style={{ 
                                                borderBottom: '1px solid var(--border-color)',
                                                backgroundColor: index % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)'
                                            }}
                                        >
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                                                    {new Date(log.created_at).toLocaleString('zh-TW')}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                {log.user_name ? (
                                                    <div>
                                                        <div style={{ fontWeight: '500' }}>{log.user_name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>@{log.username}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>系統</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {getStatusBadge(log.response_status)}
                                                {log.is_test_request === 1 && (
                                                    <span style={{ 
                                                        marginLeft: '0.5rem',
                                                        fontSize: '0.75rem', 
                                                        color: '#f59e0b',
                                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px'
                                                    }}>測試</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
                                                {log.events_count}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                {log.event_types || '-'}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                                {log.processing_time_ms ? `${log.processing_time_ms}ms` : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                {log.ip_address || '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    style={{
                                                        padding: '0.5rem',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        color: 'var(--accent-primary)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem'
                                                    }}
                                                    title="查看詳細"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ 
                            padding: '1rem 1.5rem', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            borderTop: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)'
                        }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                共 {pagination.total} 筆記錄，第 {pagination.page} / {pagination.pages} 頁
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                    disabled={filters.page <= 1}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: filters.page <= 1 ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                                        color: filters.page <= 1 ? 'var(--text-secondary)' : 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: filters.page <= 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <ChevronLeft size={16} />
                                    上一頁
                                </button>
                                <button
                                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                    disabled={filters.page >= pagination.pages}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: filters.page >= pagination.pages ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                                        color: filters.page >= pagination.pages ? 'var(--text-secondary)' : 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: filters.page >= pagination.pages ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    下一頁
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '12px',
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Webhook 請求詳細</h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    padding: '0.5rem'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                {/* Basic Info */}
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>基本資訊</h3>
                                    <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>請求時間:</span>
                                            <span>{new Date(selectedLog.created_at).toLocaleString('zh-TW')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>使用者:</span>
                                            <span>{selectedLog.user_name || '系統'} {selectedLog.username && `(@${selectedLog.username})`}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>來源IP:</span>
                                            <span>{selectedLog.ip_address || '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Webhook Key:</span>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{selectedLog.webhook_key || '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>處理時間:</span>
                                            <span>{selectedLog.processing_time_ms}ms</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>回應狀態:</span>
                                            {getStatusBadge(selectedLog.response_status)}
                                        </div>
                                        {selectedLog.signature_valid !== null && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>簽章驗證:</span>
                                                <span style={{ color: selectedLog.signature_valid === 1 ? '#10b981' : '#ef4444' }}>
                                                    {selectedLog.signature_valid === 1 ? '✓ 通過' : '✗ 失敗'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Events Info */}
                                {selectedLog.events_count > 0 && (
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>事件資訊</h3>
                                        <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>事件數量:</span>
                                                <span>{selectedLog.events_count}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>事件類型:</span>
                                                <span>{selectedLog.event_types || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Message */}
                                {selectedLog.error_message && (
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#ef4444' }}>錯誤訊息</h3>
                                        <div style={{ 
                                            padding: '1rem', 
                                            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                            borderRadius: '6px',
                                            fontSize: '0.875rem',
                                            color: '#ef4444'
                                        }}>
                                            {selectedLog.error_message}
                                        </div>
                                    </div>
                                )}

                                {/* Request Body */}
                                {selectedLog.request_body && (
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>請求內容</h3>
                                        <pre style={{ 
                                            padding: '1rem', 
                                            backgroundColor: 'rgba(0, 0, 0, 0.2)', 
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            overflow: 'auto',
                                            maxHeight: '200px'
                                        }}>
                                            {JSON.stringify(JSON.parse(selectedLog.request_body), null, 2)}
                                        </pre>
                                    </div>
                                )}

                                {/* Response Body */}
                                {selectedLog.response_body && (
                                    <div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>回應內容</h3>
                                        <pre style={{ 
                                            padding: '1rem', 
                                            backgroundColor: 'rgba(0, 0, 0, 0.2)', 
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            overflow: 'auto',
                                            maxHeight: '200px'
                                        }}>
                                            {JSON.stringify(selectedLog.response_body, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    padding: '0.5rem 1.5rem',
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Webhook Test Modal */}
            {showTestModal && (
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
                        maxWidth: '700px',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Zap size={24} style={{ color: '#10b981' }} />
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                        Webhook 連通性測試
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                                        模擬 LINE 伺服器發送測試請求
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTestModal(false);
                                    setTestResult(null);
                                    setSelectedUserId('');
                                }}
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
                            {!testResult ? (
                                <>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ 
                                            display: 'block', 
                                            marginBottom: '0.5rem', 
                                            fontSize: '0.9rem',
                                            fontWeight: '500'
                                        }}>
                                            選擇要測試的使用者
                                        </label>
                                        <select
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-color)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            <option value="">-- 請選擇使用者 --</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} (@{user.username})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(59, 130, 246, 0.3)',
                                        marginBottom: '1.5rem'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'flex-start', 
                                            gap: '0.75rem',
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            <Info size={18} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '2px' }} />
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#3b82f6', marginBottom: '0.5rem' }}>
                                                    測試說明
                                                </div>
                                                <ul style={{ margin: '0', paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                                                    <li>檢查帳號狀態和 Webhook Key 設定</li>
                                                    <li>驗證 Channel Secret 配置</li>
                                                    <li>模擬 LINE 發送測試請求到 Webhook URL</li>
                                                    <li>檢查簽章驗證和請求記錄功能</li>
                                                    <li>測試結果會顯示詳細的診斷資訊</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTestWebhook}
                                        disabled={!selectedUserId || testLoading}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            backgroundColor: selectedUserId && !testLoading ? '#10b981' : 'var(--bg-secondary)',
                                            color: selectedUserId && !testLoading ? 'white' : 'var(--text-secondary)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: selectedUserId && !testLoading ? 'pointer' : 'not-allowed',
                                            fontSize: '1rem',
                                            fontWeight: '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        {testLoading ? (
                                            <>
                                                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                                測試中...
                                            </>
                                        ) : (
                                            <>
                                                <Zap size={18} />
                                                開始測試
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Overall Status */}
                                    <div style={{
                                        padding: '1rem',
                                        marginBottom: '1.5rem',
                                        borderRadius: '8px',
                                        backgroundColor: testResult.overall_status === 'success' 
                                            ? 'rgba(16, 185, 129, 0.1)' 
                                            : testResult.overall_status === 'warning'
                                            ? 'rgba(245, 158, 11, 0.1)'
                                            : 'rgba(239, 68, 68, 0.1)',
                                        border: `1px solid ${
                                            testResult.overall_status === 'success' 
                                                ? 'rgba(16, 185, 129, 0.3)' 
                                                : testResult.overall_status === 'warning'
                                                ? 'rgba(245, 158, 11, 0.3)'
                                                : 'rgba(239, 68, 68, 0.3)'
                                        }`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem'
                                    }}>
                                        {getStatusIcon(testResult.overall_status)}
                                        <div>
                                            <div style={{ fontWeight: '600', color: getStatusColor(testResult.overall_status) }}>
                                                {testResult.overall_status === 'success' 
                                                    ? '✅ 所有測試通過' 
                                                    : testResult.overall_status === 'warning'
                                                    ? '⚠️ 部分項目需要注意'
                                                    : '❌ 發現問題'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                使用者: {testResult.user?.name} (@{testResult.user?.username})
                                            </div>
                                        </div>
                                    </div>

                                    {/* Test Results */}
                                    <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        {testResult.tests && Object.entries(testResult.tests).map(([key, test]) => (
                                            <div key={key} style={{
                                                padding: '1rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                    {getStatusIcon(test.status)}
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                                            {test.name}
                                                        </div>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                            {test.message}
                                                        </div>
                                                        {test.details && (
                                                            <details style={{ marginTop: '0.75rem' }}>
                                                                <summary style={{ 
                                                                    cursor: 'pointer', 
                                                                    fontSize: '0.85rem',
                                                                    color: 'var(--accent-primary)',
                                                                    userSelect: 'none'
                                                                }}>
                                                                    查看詳細資訊
                                                                </summary>
                                                                <pre style={{
                                                                    marginTop: '0.5rem',
                                                                    padding: '0.75rem',
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.75rem',
                                                                    overflow: 'auto',
                                                                    maxHeight: '200px'
                                                                }}>
                                                                    {JSON.stringify(test.details, null, 2)}
                                                                </pre>
                                                            </details>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => {
                                                setTestResult(null);
                                                setSelectedUserId('');
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                backgroundColor: 'var(--bg-secondary)',
                                                color: 'var(--text-primary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            重新測試
                                        </button>
                                        <button
                                            onClick={() => {
                                                loadLogs();
                                                loadStats();
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                backgroundColor: 'var(--accent-primary)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem'
                                            }}
                                        >
                                            <RefreshCw size={16} />
                                            更新記錄
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WebhookLogs;

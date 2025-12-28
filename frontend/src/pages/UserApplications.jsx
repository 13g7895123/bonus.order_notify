import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { UserCheck, UserX, RefreshCw, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';

const UserApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [rejectModal, setRejectModal] = useState({ show: false, id: null, reason: '' });

    useEffect(() => {
        loadApplications();
    }, [statusFilter]);

    const loadApplications = async () => {
        setLoading(true);
        try {
            const data = await api.applications.list(statusFilter);
            setApplications(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load applications', e);
        }
        setLoading(false);
    };

    const handleApprove = async (id) => {
        if (!window.confirm('確定要核准這個申請嗎？')) return;
        try {
            const result = await api.applications.approve(id);
            if (result.success) {
                loadApplications();
            } else {
                alert(result.message || '核准失敗');
            }
        } catch (e) {
            alert('操作失敗');
        }
    };

    const handleReject = async () => {
        try {
            const result = await api.applications.reject(rejectModal.id, rejectModal.reason);
            if (result.success) {
                setRejectModal({ show: false, id: null, reason: '' });
                loadApplications();
            } else {
                alert(result.message || '拒絕失敗');
            }
        } catch (e) {
            alert('操作失敗');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', icon: <Clock size={14} />, text: '待審核' },
            approved: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', icon: <CheckCircle size={14} />, text: '已核准' },
            rejected: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', icon: <XCircle size={14} />, text: '已拒絕' }
        };
        const s = styles[status] || styles.pending;
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: s.bg,
                color: s.color,
                fontSize: '0.85rem',
                fontWeight: '500'
            }}>
                {s.icon} {s.text}
            </span>
        );
    };

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>帳號申請審核</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>審核使用者的帳號申請。</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadApplications} variant="secondary">
                        <RefreshCw size={18} /> 重新整理
                    </Button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                    { value: 'pending', label: '待審核' },
                    { value: 'approved', label: '已核准' },
                    { value: 'rejected', label: '已拒絕' },
                    { value: '', label: '全部' }
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: statusFilter === tab.value ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: statusFilter === tab.value ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
            ) : applications.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        <Filter size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p>沒有符合條件的申請</p>
                    </div>
                </Card>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {applications.map(app => (
                        <Card key={app.id} style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                                        <h3 style={{ margin: 0 }}>{app.name}</h3>
                                        {getStatusBadge(app.status)}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <div><strong>使用者名稱：</strong>{app.username}</div>
                                        <div><strong>Email：</strong>{app.email || '-'}</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>申請時間：</strong>{app.created_at}</div>
                                        {app.reason && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <strong>申請原因：</strong>
                                                <p style={{ margin: '0.5rem 0 0 0', padding: '0.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                                    {app.reason}
                                                </p>
                                            </div>
                                        )}
                                        {app.reject_reason && (
                                            <div style={{ gridColumn: '1 / -1', color: 'var(--danger)' }}>
                                                <strong>拒絕原因：</strong>{app.reject_reason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {app.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleApprove(app.id)} variant="success">
                                            <UserCheck size={18} /> 核准
                                        </Button>
                                        <Button onClick={() => setRejectModal({ show: true, id: app.id, reason: '' })} variant="danger">
                                            <UserX size={18} /> 拒絕
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal.show && (
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
                    zIndex: 1000
                }}>
                    <Card style={{ maxWidth: '400px', width: '90%', padding: '1.5rem' }}>
                        <h3 style={{ marginTop: 0 }}>拒絕申請</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                拒絕原因（選填）
                            </label>
                            <textarea
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                                placeholder="請輸入拒絕原因..."
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
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setRejectModal({ show: false, id: null, reason: '' })} variant="secondary">
                                取消
                            </Button>
                            <Button onClick={handleReject} variant="danger">
                                確認拒絕
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserApplications;

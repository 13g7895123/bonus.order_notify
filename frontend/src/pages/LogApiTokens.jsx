import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import { api } from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { KeyRound, RefreshCw, Plus, Ban } from 'lucide-react';

const LogApiTokens = () => {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.logTokens.list();
            if (res.tokens) {
                setTokens(res.tokens);
                setError('');
            } else {
                setError(res.messages?.error || res.message || '載入失敗');
            }
        } catch (e) {
            console.error('Failed to load log tokens', e);
            setError('載入失敗');
        }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Plaintext is only available in this response, so force the admin to acknowledge it.
    const showPlaintext = async (title, token) => {
        await Swal.fire({
            icon: 'success',
            title,
            html: `<p style="margin-bottom:8px">明文只會顯示這一次，關閉後無法再查看。</p>
                   <input id="log-token-value" readonly value="${token}"
                     style="width:100%;padding:8px;font-family:monospace;font-size:0.85rem;border:1px solid #ccc;border-radius:6px" />`,
            confirmButtonText: '已複製保存',
            showDenyButton: true,
            denyButtonText: '複製',
            preDeny: async () => {
                try { await navigator.clipboard.writeText(token); } catch { document.getElementById('log-token-value')?.select(); }
                Swal.showValidationMessage('已複製到剪貼簿');
                return false;
            },
            allowOutsideClick: false,
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
            const res = await api.logTokens.create(name.trim());
            if (res.token) {
                setName('');
                await showPlaintext('Token 已建立', res.token);
                load();
            } else {
                Swal.fire({ icon: 'error', title: '建立失敗', text: res.messages?.error || res.message || '未知錯誤' });
            }
        } finally {
            setBusy(false);
        }
    };

    const handleRefresh = async (t) => {
        const ok = await Swal.fire({
            icon: 'warning', title: `刷新「${t.name}」？`,
            text: '刷新後舊的 Token 會立即失效，使用中的程式需要換成新值。',
            showCancelButton: true, confirmButtonText: '刷新', cancelButtonText: '取消',
        });
        if (!ok.isConfirmed) return;
        const res = await api.logTokens.refresh(t.id);
        if (res.token) {
            await showPlaintext('Token 已刷新', res.token);
        } else {
            Swal.fire({ icon: 'error', title: '刷新失敗', text: res.messages?.error || res.message || '未知錯誤' });
        }
        load();
    };

    const handleRevoke = async (t) => {
        const ok = await Swal.fire({
            icon: 'warning', title: `註銷「${t.name}」？`,
            text: '註銷後此 Token 永久失效，無法復原。',
            showCancelButton: true, confirmButtonText: '註銷', confirmButtonColor: '#ef4444', cancelButtonText: '取消',
        });
        if (!ok.isConfirmed) return;
        const res = await api.logTokens.revoke(t.id);
        if (res.messages?.error) {
            Swal.fire({ icon: 'error', title: '註銷失敗', text: res.messages.error });
        }
        load();
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <KeyRound size={26} /> Log API Token
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    用於查詢系統 log 的唯讀 API（<code>/api/system/logs</code>、<code>/api/system/diagnostics</code>）。
                    請求時帶入 header <code>X-Log-Token: &lt;token&gt;</code>。
                </p>
            </div>

            <Card style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        value={name} onChange={e => setName(e.target.value)} maxLength={100}
                        placeholder="Token 名稱（例如：維運查詢、Claude 除錯）"
                        style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                    <Button type="submit" size="sm" disabled={busy || !name.trim()}>
                        <Plus size={16} /> 建立 Token
                    </Button>
                    <Button type="button" size="sm" variant="secondary" onClick={load}>
                        <RefreshCw size={14} /> 重新整理
                    </Button>
                </form>
            </Card>

            <Card>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>載入中...</div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>{error}</div>
                ) : tokens.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>尚未建立任何 Token</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={th}>名稱</th>
                                    <th style={th}>Token</th>
                                    <th style={th}>狀態</th>
                                    <th style={th}>建立</th>
                                    <th style={th}>最後刷新</th>
                                    <th style={th}>最後使用</th>
                                    <th style={th}>次數</th>
                                    <th style={th}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map(t => {
                                    const active = t.status === 'active';
                                    return (
                                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: active ? 1 : 0.55 }}>
                                            <td style={td}>{t.name}</td>
                                            <td style={{ ...td, fontFamily: 'monospace' }}>{t.token_prefix}…</td>
                                            <td style={td}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 600,
                                                    backgroundColor: active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: active ? 'rgb(34,197,94)' : 'rgb(239,68,68)',
                                                }}>{active ? '使用中' : '已註銷'}</span>
                                                {!active && <div style={sub}>{t.revoked_at}（{t.revoked_by_name || '-'}）</div>}
                                            </td>
                                            <td style={td}>{t.created_at}<div style={sub}>{t.created_by_name || '-'}</div></td>
                                            <td style={td}>{t.refreshed_at || '-'}{t.refreshed_at && <div style={sub}>{t.refreshed_by_name || '-'}</div>}</td>
                                            <td style={td}>{t.last_used_at || '從未使用'}{t.last_used_ip && <div style={sub}>{t.last_used_ip}</div>}</td>
                                            <td style={td}>{t.use_count}</td>
                                            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                                {active && (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <Button size="sm" variant="secondary" onClick={() => handleRefresh(t)}>
                                                            <RefreshCw size={13} /> 刷新
                                                        </Button>
                                                        <Button size="sm" variant="danger" onClick={() => handleRevoke(t)}>
                                                            <Ban size={13} /> 註銷
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

const th = {
    padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.74rem',
    color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.04em', whiteSpace: 'nowrap'
};
const td = { padding: '0.75rem 1rem', verticalAlign: 'top' };
const sub = { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' };

export default LogApiTokens;

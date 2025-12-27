import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { FileText, Users, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [stats, setStats] = useState({ templates: 0, customers: 0, sent: 0 });

    useEffect(() => {
        const t = JSON.parse(localStorage.getItem('templates') || '[]');
        const c = JSON.parse(localStorage.getItem('customers') || '[]');
        setStats({ templates: t.length, customers: c.length, sent: 0 });
    }, []);

    return (
        <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Welcome to NotifyHub.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <Card style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                        <FileText size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.templates}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Templates</div>
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: 'var(--success)' }}>
                        <Users size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.customers}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Customers</div>
                    </div>
                </Card>

                <Card style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: 'var(--danger)' }}>
                        <Send size={32} />
                    </div>
                    <div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>Ready</div>
                        <div style={{ color: 'var(--text-secondary)' }}>System Status</div>
                    </div>
                </Card>
            </div>

            <div style={{ marginTop: '2rem' }}>
                <Card title="Quick Actions">
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/send" style={{ textDecoration: 'none' }}>
                            <button style={{ padding: '10px 20px', backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                New Notification
                            </button>
                        </Link>
                        <Link to="/templates" style={{ textDecoration: 'none' }}>
                            <button style={{ padding: '10px 20px', backgroundColor: 'var(--bg-tertiary)', color: 'white', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}>
                                Manage Templates
                            </button>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;

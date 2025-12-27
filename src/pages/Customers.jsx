import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState({ id: null, name: '', line_id: '' });
    const [search, setSearch] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('customers');
        if (saved) {
            setCustomers(JSON.parse(saved));
        } else {
            // Mock
            const mock = [
                { id: 1, name: 'Alice Smith', line_id: 'U12345678' },
                { id: 2, name: 'Bob Jones', line_id: 'U87654321' }
            ];
            setCustomers(mock);
            localStorage.setItem('customers', JSON.stringify(mock));
        }
    }, []);

    const saveCustomers = (newCustomers) => {
        setCustomers(newCustomers);
        localStorage.setItem('customers', JSON.stringify(newCustomers));
    };

    const handleEdit = (cust) => {
        setCurrentCustomer(cust);
        setIsEditing(true);
    };

    const handleDelete = (id) => {
        if (confirm('Delete this customer mapping?')) {
            saveCustomers(customers.filter(c => c.id !== id));
        }
    };

    const handleSave = () => {
        if (!currentCustomer.name || !currentCustomer.line_id) return;

        if (currentCustomer.id) {
            saveCustomers(customers.map(c => c.id === currentCustomer.id ? currentCustomer : c));
        } else {
            const newId = Math.max(...customers.map(c => c.id), 0) + 1;
            saveCustomers([...customers, { ...currentCustomer, id: newId }]);
        }
        setIsEditing(false);
        setCurrentCustomer({ id: null, name: '', line_id: '' });
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.line_id.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Customers</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage Customer to LINE ID mappings.</p>
                </div>
                {!isEditing && (
                    <Button onClick={() => { setCurrentCustomer({ id: null, name: '', line_id: '' }); setIsEditing(true); }}>
                        <Plus size={18} /> Add Customer
                    </Button>
                )}
            </div>

            {isEditing ? (
                <Card title={currentCustomer.id ? 'Edit Customer' : 'Add Customer'}>
                    <Input
                        label="Customer Name"
                        value={currentCustomer.name}
                        onChange={e => setCurrentCustomer({ ...currentCustomer, name: e.target.value })}
                    />
                    <Input
                        label="LINE User ID"
                        value={currentCustomer.line_id}
                        onChange={e => setCurrentCustomer({ ...currentCustomer, line_id: e.target.value })}
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </div>
                </Card>
            ) : (
                <>
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                        <Input
                            placeholder="Search customers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '40px', marginBottom: 0 }}
                        />
                    </div>

                    <Card style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                                <tr>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Name</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>LINE ID</th>
                                    <th style={{ padding: '1rem', width: '100px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(c => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '1rem' }}>{c.name}</td>
                                        <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{c.line_id}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => handleEdit(c)} style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No customers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Card>
                </>
            )}
        </div>
    );
};

export default Customers;

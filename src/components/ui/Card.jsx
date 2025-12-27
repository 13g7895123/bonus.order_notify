import React from 'react';

const Card = ({ children, title, action, style }) => {
    return (
        <div className="glass" style={{
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            backgroundColor: 'rgba(30, 41, 59, 0.5)',
            ...style
        }}>
            {(title || action) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    {title && <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>{title}</h2>}
                    {action && <div>{action}</div>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;

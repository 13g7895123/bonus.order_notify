import React from 'react';

const Button = ({ children, variant = 'primary', onClick, style, ...props }) => {
    const baseStyle = {
        padding: '10px 20px',
        borderRadius: '8px',
        fontWeight: '600',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer'
    };

    const variants = {
        primary: {
            backgroundColor: 'var(--accent-primary)',
            color: 'white',
            border: '1px solid var(--accent-primary)'
        },
        secondary: {
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
        },
        danger: {
            backgroundColor: 'var(--danger)',
            color: 'white',
            border: '1px solid var(--danger)'
        }
    };

    return (
        <button
            onClick={onClick}
            style={{ ...baseStyle, ...variants[variant], ...style }}
            onMouseOver={(e) => {
                if (variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseOut={(e) => {
                if (variant === 'primary') e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
            }}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;

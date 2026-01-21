import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', onClick, style, ...props }) => {
    const baseStyle = {
        borderRadius: '8px',
        fontWeight: '600',
        transition: 'all 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer'
    };

    const sizes = {
        sm: {
            padding: '6px 12px',
            fontSize: '0.875rem'
        },
        md: {
            padding: '10px 20px',
            fontSize: '1rem'
        },
        lg: {
            padding: '14px 28px',
            fontSize: '1.125rem'
        }
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
            style={{ ...baseStyle, ...sizes[size], ...variants[variant], ...style }}
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

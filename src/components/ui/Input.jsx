import React from 'react';

const Input = ({ label, type = 'text', value, onChange, placeholder, style, multiline = false, ...props }) => {
    const inputStyle = {
        width: '100%',
        padding: '12px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
    };

    const focusStyle = {
        borderColor: 'var(--accent-primary)',
    };

    return (
        <div style={{ marginBottom: '1rem', width: '100%', ...style }}>
            {label && <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{label}</label>}
            {multiline ? (
                <textarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                    onFocus={(e) => e.target.style.borderColor = focusStyle.borderColor}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    {...props}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = focusStyle.borderColor}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    {...props}
                />
            )}
        </div>
    );
};

export default Input;

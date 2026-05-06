import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../lib/apiClient';
interface LoginResponse {
    data: {
        accessToken: string;
        refreshToken: string;
        role: string;
    };
}
export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loginVal, setLoginVal] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await apiClient.post<LoginResponse>('/auth/login', {
                login: loginVal,
                password,
            });
            const { accessToken, refreshToken, role } = res.data.data;
            login(accessToken, refreshToken);
            if (role === 'admin') {
                navigate('/admin', { replace: true });
            }
            else if (role === 'commander') {
                navigate('/raskhod', { replace: true });
            }
            else {
                navigate('/', { replace: true });
            }
        }
        catch {
            setError('Неверный логин или пароль');
        }
        finally {
            setLoading(false);
        }
    }
    return (<div style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, color: '#1e293b', textAlign: 'center' }}>
          Вход в систему
        </h2>

        {error && (<div style={errorStyle}>{error}</div>)}

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Логин</label>
          <input style={inputStyle} value={loginVal} onChange={(e) => setLoginVal(e.target.value)} autoFocus autoComplete="username"/>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Пароль</label>
          <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"/>
        </div>

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>);
}
const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(165deg, #e2e8f0 0%, #f1f5f9 45%, #e8eef5 100%)',
};
const formStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    borderRadius: 12,
    padding: '32px 36px',
    width: 340,
    maxWidth: 'calc(100vw - 32px)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
};
const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
};
const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
};
const btnStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '11px',
    fontSize: 15,
    cursor: 'pointer',
    fontWeight: 600,
};
const errorStyle: React.CSSProperties = {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#b91c1c',
    borderRadius: 4,
    padding: '8px 12px',
    marginBottom: 16,
    fontSize: 14,
};

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
export function NotFoundPage() {
    return (<div style={wrapStyle}>
      <div style={cardStyle}>
        <h1 style={codeStyle}>404</h1>
        <p style={textStyle}>Страница не найдена</p>
        <Link to="/login" style={linkStyle}>
          На страницу входа
        </Link>
      </div>
    </div>);
}
const wrapStyle: CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'linear-gradient(165deg, #e2e8f0 0%, #f1f5f9 45%, #e8eef5 100%)',
};
const cardStyle: CSSProperties = {
    textAlign: 'center',
    background: 'var(--bg-elevated)',
    borderRadius: 12,
    padding: '40px 48px',
    maxWidth: 400,
    width: '100%',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-md)',
};
const codeStyle: CSSProperties = {
    margin: '0 0 8px',
    fontSize: 48,
    fontWeight: 800,
    color: '#1e293b',
    letterSpacing: '-0.04em',
};
const textStyle: CSSProperties = {
    margin: '0 0 24px',
    fontSize: 16,
    color: 'var(--text-muted)',
};
const linkStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--primary)',
    textDecoration: 'none',
};

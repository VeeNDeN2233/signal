import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { COMMANDER_SHELL_MAX } from '../layout/commanderLayout';
interface CommanderNavProps {
    title: string;
}
export function CommanderNav({ title }: CommanderNavProps) {
    const { logout, sessionUser } = useAuth();
    const navigate = useNavigate();
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    return (<>
      <header style={headerOuter} className="commander-app-header">
        <div style={headerInner} className="commander-header-inner">
          <div style={brandBlock} className="commander-header-brand">
            <div style={brandMark} aria-hidden>У</div>
            <div style={titleBlock}>
              <span style={kicker}>Руководитель подразделения</span>
              <span style={titleLine} title={title}>{title}</span>
            </div>
          </div>

          <nav style={navBlock} aria-label="Разделы" className="commander-header-nav">
            <NavLink to="/alerts" end style={({ isActive }) => tabStyle(isActive)}>Тревога</NavLink>
            <NavLink to="/alerts/history" style={({ isActive }) => tabStyle(isActive)}>История тревог</NavLink>
            <NavLink to="/raskhod" end style={({ isActive }) => tabStyle(isActive)}>Расход</NavLink>
            <NavLink to="/raskhod/history" style={({ isActive }) => tabStyle(isActive)}>История расходов</NavLink>
          </nav>

          <button type="button" onClick={handleLogout} style={logoutBtnStyle}>
            Выход
          </button>
        </div>
      </header>

      <div style={sessionStripOuter} className="commander-session-strip">
        <div style={sessionStripInner}>
          {sessionUser ? (<>
              <SessionField label="Логин" value={sessionUser.login}/>
              <SessionField label="ФИО" value={sessionUser.fio ?? '—'}/>
              <SessionField label="Должность" value={sessionUser.position_name ?? '—'}/>
              <SessionField label="Подразделение" value={sessionUser.unit_name ?? '—'}/>
            </>) : (<span style={sessionLoading}>Загрузка данных сеанса…</span>)}
        </div>
      </div>
    </>);
}
function SessionField({ label, value }: {
    label: string;
    value: string;
}) {
    return (<div style={sessionFieldStyle}>
      <span style={sessionFieldLabel}>{label}</span>
      <span style={sessionFieldValue}>{value}</span>
    </div>);
}
const headerOuter: React.CSSProperties = {
    width: '100%',
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
};
const headerInner: React.CSSProperties = {
    maxWidth: COMMANDER_SHELL_MAX,
    margin: '0 auto',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    height: 72,
    minHeight: 72,
    maxHeight: 72,
    boxSizing: 'border-box',
};
const brandBlock: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: '0 0 260px',
    width: 260,
    minWidth: 260,
    maxWidth: 260,
    minHeight: 0,
};
const brandMark: React.CSSProperties = {
    width: 42,
    height: 42,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
};
const titleBlock: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
};
const kicker: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#64748b',
    lineHeight: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};
const titleLine: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: '22px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};
const navBlock: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
    alignItems: 'stretch',
    height: 44,
};
function tabStyle(isActive: boolean): React.CSSProperties {
    return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.25,
        padding: '0 8px',
        borderRadius: 8,
        height: 44,
        minHeight: 44,
        maxHeight: 44,
        boxSizing: 'border-box',
        border: isActive ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
        color: isActive ? '#ffffff' : '#475569',
        background: isActive ? '#1d4ed8' : '#f8fafc',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };
}
const logoutBtnStyle: React.CSSProperties = {
    flexShrink: 0,
    height: 44,
    padding: '0 20px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    background: '#ffffff',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    transition: 'background 0.15s, border-color 0.15s',
};
const sessionStripOuter: React.CSSProperties = {
    width: '100%',
    background: '#e2e8f0',
    borderBottom: '1px solid #cbd5e1',
};
const sessionStripInner: React.CSSProperties = {
    maxWidth: COMMANDER_SHELL_MAX,
    margin: '0 auto',
    padding: '10px 20px',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: '12px 28px',
    minHeight: 54,
    boxSizing: 'border-box',
};
const sessionFieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 100,
    maxWidth: 280,
};
const sessionFieldLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#64748b',
};
const sessionFieldValue: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.35,
    wordBreak: 'break-word',
};
const sessionLoading: React.CSSProperties = {
    fontSize: 13,
    color: '#64748b',
};

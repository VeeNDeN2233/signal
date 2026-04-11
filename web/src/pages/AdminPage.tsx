import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../lib/apiClient'

const NAV_ITEMS = [
  { to: '/admin/roster', label: 'Личный состав' },
  { to: '/admin/users', label: 'Учётные записи' },
  { to: '/admin/positions', label: 'Должности' },
  { to: '/admin/ranks', label: 'Звания' },
  { to: '/admin/units', label: 'Подразделения' },
  { to: '/admin/user-statuses', label: 'Статусы' },
  { to: '/admin/audit-log', label: 'Журнал входов' },
]

export function AdminPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // ignore
    }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={layoutStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={logoStyle}>Администратор</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }: { isActive: boolean }) => navLinkStyle(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px 12px' }}>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}

const layoutStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}

const sidebarStyle: React.CSSProperties = {
  width: 220,
  background: '#1e293b',
  color: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
}

const logoStyle: React.CSSProperties = {
  padding: '20px 16px 16px',
  fontSize: 15,
  fontWeight: 700,
  color: '#f8fafc',
  borderBottom: '1px solid #334155',
  marginBottom: 8,
}

function navLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    display: 'block',
    padding: '10px 16px',
    color: isActive ? '#fff' : '#94a3b8',
    background: isActive ? '#2563eb' : 'transparent',
    textDecoration: 'none',
    fontSize: 14,
    borderRadius: 4,
    margin: '2px 8px',
    transition: 'background 0.15s',
  }
}

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: 28,
  background: '#f8fafc',
  overflowY: 'auto',
}

const logoutBtnStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  color: '#94a3b8',
  border: '1px solid #334155',
  borderRadius: 4,
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: 13,
}

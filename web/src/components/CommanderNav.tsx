import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface CommanderNavProps {
  title: string
}

export function CommanderNav({ title }: CommanderNavProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={headerRowStyle}>
      <h1 style={titleStyle}>{title}</h1>
      <div style={navContainerStyle}>
        <div style={navLinksStyle}>
          <NavLink to="/alerts" style={({ isActive }) => navLinkStyle(isActive)}>Тревога</NavLink>
          <NavLink to="/alerts/history" style={({ isActive }) => navLinkStyle(isActive)}>История тревог</NavLink>
          <NavLink to="/raskhod" style={({ isActive }) => navLinkStyle(isActive)}>Расход</NavLink>
          <NavLink to="/raskhod/history" style={({ isActive }) => navLinkStyle(isActive)}>История расходов</NavLink>
        </div>
        <button onClick={handleLogout} style={logoutBtnStyle}>
          Выход
        </button>
      </div>
    </div>
  )
}

// Styles
const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 24,
  flexWrap: 'wrap',
  gap: 16,
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
  color: '#1e293b',
}

const navContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
}

const navLinksStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'center',
}

function navLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    color: isActive ? '#fff' : '#1d4ed8',
    background: isActive ? '#1d4ed8' : '#fff',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
    padding: '6px 10px',
    borderRadius: 4,
    border: '1px solid #2563eb',
    transition: 'all 0.2s',
  }
}

const logoutBtnStyle: React.CSSProperties = {
  background: '#dc2626',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '6px 16px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
}

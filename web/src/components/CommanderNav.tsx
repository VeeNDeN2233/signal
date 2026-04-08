import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
          <Link to="/raskhod" style={navLinkStyle}>Расход</Link>
          <Link to="/alerts" style={navLinkStyle}>Тревога</Link>
          <Link to="/raskhod/history" style={navLinkStyle}>История</Link>
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

const navLinkStyle: React.CSSProperties = {
  color: '#2563eb',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  padding: '6px 12px',
  borderRadius: 4,
  border: '1px solid #2563eb',
  transition: 'all 0.2s',
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

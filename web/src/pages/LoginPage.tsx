import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../lib/apiClient'

interface LoginResponse {
  data: { accessToken: string; refreshToken: string; role: string }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [loginVal, setLoginVal] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', { login: loginVal, password })
      const { accessToken, refreshToken, role } = res.data.data
      login(accessToken, refreshToken)
      navigate(role === 'admin' ? '/admin' : role === 'commander' ? '/raskhod' : '/', { replace: true })
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 8, padding: '32px 36px', width: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, color: '#1e293b', textAlign: 'center' }}>Вход в систему</h2>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 4, padding: '8px 12px', marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: '#374151' }}>Логин</label>
          <input style={{ width: '100%', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} value={loginVal} onChange={e => setLoginVal(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500, color: '#374151' }}>Пароль</label>
          <input style={{ width: '100%', padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 14, boxSizing: 'border-box' }} type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '10px', fontSize: 15, cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
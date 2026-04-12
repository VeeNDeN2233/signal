import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Role, SessionUser } from '../types/auth'
import { tokenStorage } from '../lib/tokenStorage'
import { parseJwt } from '../lib/parseJwt'
import apiClient from '../lib/apiClient'

interface AuthState {
  accessToken: string | null
  role: Role | null
  userId: string | null
  unitId: string | null
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: boolean
  sessionUser: SessionUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function resolveStateFromToken(token: string | null): AuthState {
  if (!token) return { accessToken: null, role: null, userId: null, unitId: null }
  const payload = parseJwt(token)
  if (!payload) return { accessToken: null, role: null, userId: null, unitId: null }
  return {
    accessToken: token,
    role: payload.role,
    userId: payload.sub,
    unitId: payload.unit_id,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    resolveStateFromToken(tokenStorage.getAccess())
  )
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    if (!state.accessToken) {
      setSessionUser(null)
      return
    }
    let cancelled = false
    apiClient
      .get<{ data: SessionUser }>('/auth/me')
      .then((res) => {
        if (!cancelled) setSessionUser(res.data.data)
      })
      .catch(() => {
        if (!cancelled) setSessionUser(null)
      })
    return () => {
      cancelled = true
    }
  }, [state.accessToken])

  const login = useCallback((accessToken: string, refreshToken: string) => {
    tokenStorage.setTokens(accessToken, refreshToken)
    setState(resolveStateFromToken(accessToken))
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setState({ accessToken: null, role: null, userId: null, unitId: null })
    setSessionUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        isAuthenticated: !!state.accessToken,
        sessionUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

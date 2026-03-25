import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Role } from '../types/auth'
import { tokenStorage } from '../lib/tokenStorage'
import { parseJwt } from '../lib/parseJwt'

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

  const login = useCallback((accessToken: string, refreshToken: string) => {
    tokenStorage.setTokens(accessToken, refreshToken)
    setState(resolveStateFromToken(accessToken))
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setState({ accessToken: null, role: null, userId: null, unitId: null })
  }, [])

  return (
    <AuthContext.Provider
      value={{ ...state, login, logout, isAuthenticated: !!state.accessToken }}
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

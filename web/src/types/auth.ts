export type Role = 'user' | 'admin' | 'commander'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  sub: string
  role: Role
  unit_id: string
  iat: number
  exp: number
}

/** Ответ GET /api/auth/me */
export interface SessionUser {
  login: string
  role: string
  unit_name: string | null
  position_name: string | null
  fio: string | null
}

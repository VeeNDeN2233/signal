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

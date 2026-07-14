import type { Request, Response } from 'express'
import { config } from '../config.js'

export const AUTH_COOKIE_NAME = 'ninewood_token'

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    try {
      out[key] = decodeURIComponent(value)
    } catch {
      out[key] = value
    }
  }
  return out
}

/** 从 Authorization Bearer 或 HttpOnly Cookie 提取 JWT */
export function extractAuthToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim()
    if (token) return token
  }
  const cookies = parseCookies(req.headers.cookie)
  return cookies[AUTH_COOKIE_NAME] || null
}

export function extractSocketToken(handshake: {
  auth?: { token?: string }
  headers?: { cookie?: string }
}): string | null {
  const authToken = handshake.auth?.token
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim()
  }
  return parseCookies(handshake.headers?.cookie)[AUTH_COOKIE_NAME] || null
}

export function setAuthCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${config.jwtExpiresIn}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

export function clearAuthCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production'
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  res.append('Set-Cookie', parts.join('; '))
}

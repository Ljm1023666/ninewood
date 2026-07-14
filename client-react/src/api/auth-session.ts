/** 内存态 JWT（HttpOnly Cookie 为主；Bearer 仅用于 Socket 与过渡期） */
let memoryToken: string | null = null

const legacy = localStorage.getItem('token')
if (legacy) {
  memoryToken = legacy
  localStorage.removeItem('token')
}

export function getAuthToken(): string | null {
  return memoryToken
}

export function setAuthToken(token: string | null): void {
  memoryToken = token
}

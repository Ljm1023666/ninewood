import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) {
    socket.auth = { ...(socket.auth as object), token }
    return socket
  }

  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => console.log('[Socket] connected'))
  socket.on('disconnect', () => console.log('[Socket] disconnected'))
  socket.on('connect_error', (err) =>
    console.warn('[Socket] connect error:', err.message),
  )

  if (pingInterval) clearInterval(pingInterval)
  pingInterval = setInterval(() => socket?.emit('ping'), 20000)

  return socket
}

export function getSocket(): Socket | null {
  return socket
}

export function disconnectSocket() {
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock('../../services/message.service.js', () => ({
  messageService: {
    send: mocks.send,
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {},
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(() => ({ userId: 'u-sender' })),
  },
}))

vi.mock('../auth-cookie.js', () => ({
  extractSocketToken: () => 'test-token',
}))

vi.mock('../../config.js', () => ({
  config: { jwtSecret: 'test' },
}))

import { setupSocket } from '../socket.js'

function createFakeSocket() {
  const handlers = new Map<string, Function>()
  const emitted: Array<{ event: string; payload: unknown }> = []
  const socket: any = {
    id: 'sock-1',
    handshake: {},
    userId: 'u-sender',
    on(event: string, fn: Function) {
      handlers.set(event, fn)
      return socket
    },
    emit(event: string, payload: unknown) {
      emitted.push({ event, payload })
    },
    join() {},
    leave() {},
  }
  return { socket, handlers, emitted }
}

describe('socket private:message 安全', () => {
  let connectionHandler: (socket: any) => void
  let ioEmit: ReturnType<typeof vi.fn>
  let roomEmits: Array<{ room: string; event: string; payload: unknown }>

  beforeEach(() => {
    mocks.send.mockReset()
    ioEmit = vi.fn()
    roomEmits = []
    const io: any = {
      use: (fn: any) => {
        fn({ handshake: {} } as any, () => undefined)
      },
      on: (event: string, fn: any) => {
        if (event === 'connection') connectionHandler = fn
      },
      emit: ioEmit,
      to: (room: string) => ({
        emit: (event: string, payload: unknown) => {
          roomEmits.push({ room, event, payload })
        },
      }),
    }
    setupSocket(io)
  })

  it('走 messageService.send 落库并推送给接收方', async () => {
    const saved = {
      id: 'm1',
      fromUserId: 'u-sender',
      toUserId: 'u-recv',
      content: 'hello',
      type: 'TEXT',
    }
    mocks.send.mockResolvedValue(saved)
    const { socket, handlers, emitted } = createFakeSocket()
    connectionHandler(socket)

    await handlers.get('private:message')!({ receiverId: 'u-recv', content: 'hello' })

    expect(mocks.send).toHaveBeenCalledWith('u-sender', 'u-recv', 'hello')
    expect(roomEmits.some((e) => e.event === 'private:message' && e.payload === saved)).toBe(true)
    expect(emitted.some((e) => e.event === 'private:message:ack')).toBe(true)
    expect(ioEmit).not.toHaveBeenCalledWith('online:update', expect.anything())
  })

  it('屏蔽或过滤失败时回错误事件且不推送私信', async () => {
    mocks.send.mockRejectedValue(Object.assign(new Error('无法向该用户发送消息'), { status: 403 }))
    const { socket, handlers, emitted } = createFakeSocket()
    connectionHandler(socket)

    await handlers.get('private:message')!({ receiverId: 'u-blocked', content: 'x' })

    expect(roomEmits.every((e) => e.event !== 'private:message')).toBe(true)
    expect(emitted.some((e) => e.event === 'private:message:error')).toBe(true)
  })

  it('缺少内容时不调用消息服务', async () => {
    const { socket, handlers } = createFakeSocket()
    connectionHandler(socket)

    await handlers.get('private:message')!({ receiverId: 'u-recv', content: '  ' })
    expect(mocks.send).not.toHaveBeenCalled()
  })
})

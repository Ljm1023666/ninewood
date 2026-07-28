import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { messageService } from '../services/message.service.js';

interface OnlineUser {
  socketId: string;
  userId: string;
  lastPing: number;
}

const onlineUsers = new Map<string, OnlineUser>();

function isUserOnline(userId: string): boolean {
  for (const u of onlineUsers.values()) {
    if (u.userId === userId) return true;
  }
  return false;
}

const HEARTBEAT_INTERVAL = 25_000;
const HEARTBEAT_TIMEOUT = 60_000;

import { extractSocketToken } from './auth-cookie.js';

/** 仅向当事人推送在线状态，禁止广播全站用户 ID 列表 */
function emitPresence(io: Server, userId: string, online: boolean) {
  io.to(`user:${userId}`).emit('presence:update', { userId, online });
}

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = extractSocketToken(socket.handshake);
    if (!token) return next(new Error('未提供 token'));
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
      (socket as any).userId = payload.userId;
      next();
    } catch {
      next(new Error('token 无效'));
    }
  });

  // Heartbeat cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [sid, u] of onlineUsers) {
      if (now - u.lastPing > HEARTBEAT_TIMEOUT) {
        onlineUsers.delete(sid);
        if (!isUserOnline(u.userId)) {
          emitPresence(io, u.userId, false);
        }
      }
    }
  }, HEARTBEAT_INTERVAL);

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    onlineUsers.set(socket.id, { socketId: socket.id, userId, lastPing: Date.now() });
    socket.join(`user:${userId}`);
    emitPresence(io, userId, true);

    socket.on('ping', () => {
      const entry = onlineUsers.get(socket.id);
      if (entry) entry.lastPing = Date.now();
      socket.emit('pong');
    });

    // Join demand room for real-time updates
    socket.on('demand:join', (demandId: string) => {
      if (typeof demandId === 'string' && demandId.length > 0 && demandId.length <= 64) {
        socket.join(`demand:${demandId}`);
      }
    });

    socket.on('demand:leave', (demandId: string) => {
      if (typeof demandId === 'string') socket.leave(`demand:${demandId}`);
    });

    socket.on('circle:join', (circleId: string) => {
      if (typeof circleId === 'string' && circleId.length > 0 && circleId.length <= 64) {
        socket.join(`circle:${circleId}`);
      }
    });

    socket.on('circle:leave', (circleId: string) => {
      if (typeof circleId === 'string') socket.leave(`circle:${circleId}`);
    });

    /**
     * 私信必须走正式消息服务：落库、屏蔽、内容过滤。
     * 禁止仅靠 Socket 旁路推送。
     */
    socket.on('private:message', async (data: { receiverId?: string; content?: string }) => {
      try {
        const receiverId = typeof data?.receiverId === 'string' ? data.receiverId.trim() : '';
        const content = typeof data?.content === 'string' ? data.content : '';
        if (!receiverId || !content.trim()) {
          socket.emit('private:message:error', { message: '缺少接收者或内容' });
          return;
        }
        if (receiverId === userId) {
          socket.emit('private:message:error', { message: '不能给自己发消息' });
          return;
        }
        const msg = await messageService.send(userId, receiverId, content.trim().slice(0, 5000));
        io.to(`user:${receiverId}`).emit('private:message', msg);
        socket.emit('private:message:ack', msg);
      } catch (e: any) {
        socket.emit('private:message:error', {
          message: e?.message || '发送失败',
          status: e?.status || 400,
        });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      if (!isUserOnline(userId)) {
        emitPresence(io, userId, false);
      }
    });
  });
}

/** 测试辅助：当前在线用户去重数量 */
export function getOnlineUserCountForTests(): number {
  return new Set([...onlineUsers.values()].map((u) => u.userId)).size;
}

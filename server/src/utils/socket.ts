import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';

interface OnlineUser {
  socketId: string;
  userId: string;
  lastPing: number;
}

const onlineUsers = new Map<string, OnlineUser>();

function findSocketByUserId(userId: string): string | undefined {
  for (const [sid, u] of onlineUsers) {
    if (u.userId === userId) return sid;
  }
  return undefined;
}

function getUserIds(): string[] {
  return [...new Set([...onlineUsers.values()].map(u => u.userId))];
}

const HEARTBEAT_INTERVAL = 25_000;
const HEARTBEAT_TIMEOUT = 60_000;

export function setupSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
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
      }
    }
    io.emit('online:update', getUserIds());
  }, HEARTBEAT_INTERVAL);

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    onlineUsers.set(socket.id, { socketId: socket.id, userId, lastPing: Date.now() });
    socket.join(`user:${userId}`);
    io.emit('online:update', getUserIds());

    socket.on('ping', () => {
      const entry = onlineUsers.get(socket.id);
      if (entry) entry.lastPing = Date.now();
      socket.emit('pong');
    });

    // Join demand room for real-time updates
    socket.on('demand:join', (demandId: string) => {
      socket.join(`demand:${demandId}`);
    });

    socket.on('demand:leave', (demandId: string) => {
      socket.leave(`demand:${demandId}`);
    });

    socket.on('circle:join', (circleId: string) => {
      socket.join(`circle:${circleId}`);
    });

    socket.on('circle:leave', (circleId: string) => {
      socket.leave(`circle:${circleId}`);
    });

    // Private message (real-time delivery — look up sender info and forward to receiver)
    socket.on('private:message', async (data: { receiverId: string; content: string }) => {
      try {
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, nickname: true, avatarUrl: true },
        });
        const msg = {
          fromUserId: userId,
          toUserId: data.receiverId,
          content: data.content,
          type: 'TEXT',
          createdAt: new Date().toISOString(),
          fromUser: sender || { id: userId, nickname: '未知', avatarUrl: null },
        };
        io.to(`user:${data.receiverId}`).emit('private:message', msg);
      } catch {}
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online:update', getUserIds());
    });
  });
}

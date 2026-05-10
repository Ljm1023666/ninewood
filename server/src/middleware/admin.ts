import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

export async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.userId) {
    res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { role: true },
  });

  if (user?.role !== 'ADMIN') {
    res.status(403).json({ code: 403, message: '无权访问', timestamp: Date.now() });
    return;
  }

  next();
}

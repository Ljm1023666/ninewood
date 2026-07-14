import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthPayload {
  userId: string;
  phone: string;
  certLevel: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

import { extractAuthToken } from '../utils/auth-cookie.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  if (!token) {
    res.status(401).json({ code: 401, message: '未登录', timestamp: Date.now() });
    return;
  }

  try {
    req.user = jwt.verify(token, config.jwtSecret) as AuthPayload;
    next();
  } catch {
    res.status(401).json({ code: 401, message: 'token 无效或已过期', timestamp: Date.now() });
  }
}

/** 有 token 则解析用户，无 token 或无效 token 仍放行 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret) as AuthPayload;
    } catch {
      // 可选鉴权：无效 token 按未登录处理
    }
  }
  next();
}

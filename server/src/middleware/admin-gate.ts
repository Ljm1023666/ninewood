import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { authMiddleware } from './auth.js';
import { adminMiddleware } from './admin.js';

declare global {
  namespace Express {
    interface Request {
      /** 运营操作者：JWT 管理员或 API Key 鉴权通过后的用户 ID */
      adminOperatorId?: string;
    }
  }
}

import { secureEqual } from '../utils/secure-compare.js';

/** 运营后台鉴权：X-Admin-Api-Key 或 JWT + User.role=ADMIN */
export function adminGate(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-admin-api-key'];
  if (
    typeof key === 'string' &&
    config.adminApiKey &&
    secureEqual(key, config.adminApiKey)
  ) {
    req.adminOperatorId = config.adminSystemUserId || undefined;
    next();
    return;
  }

  authMiddleware(req, res, () => {
    void adminMiddleware(req, res, () => {
      req.adminOperatorId = req.user?.userId;
      next();
    });
  });
}

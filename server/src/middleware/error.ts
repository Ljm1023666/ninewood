import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message, err.stack);
  res.status(500).json({
    code: 500,
    message: err.message || '服务器错误',
    timestamp: Date.now(),
  });
}

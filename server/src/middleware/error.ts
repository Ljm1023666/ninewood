import { Request, Response, NextFunction } from 'express';

const isProd = process.env.NODE_ENV === 'production';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message, err.stack);
  const status = (err as Error & { status?: number }).status;
  const code = typeof status === 'number' && status >= 400 && status < 600 ? status : 500;
  res.status(code).json({
    code,
    message: isProd && code >= 500 ? '服务器错误' : err.message || '服务器错误',
    timestamp: Date.now(),
  });
}

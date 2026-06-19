import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';

export const captchaRouter = Router();

// ── 导出供 auth 路由复用 ──

const isDev = process.env.NODE_ENV !== 'production'
const DEV_TOKEN_PREFIX = 'dev-bypass-'

const verified = new Map<string, { expires: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of verified) {
    if (v.expires < now) verified.delete(k);
  }
}, 300_000);

/** 检查 token 是否通过了 hCaptcha 验证 */
export function verifyCaptcha(token: string): boolean {
  if (isDev && token.startsWith(DEV_TOKEN_PREFIX)) return true
  const entry = verified.get(token);
  if (!entry || entry.expires < Date.now()) return false;
  return true;
}

/** 消费 token */
export function consumeCaptcha(token: string): void {
  verified.delete(token);
}

/**
 * GET /api/captcha
 * 返回 hCaptcha site key。
 */
captchaRouter.get('/', (_req: Request, res: Response) => {
  res.json({ siteKey: config.hcaptcha.siteKey });
});

/**
 * POST /api/captcha/verify
 * 向 hCaptcha 服务端验证 token。
 */
captchaRouter.post('/verify', async (req: Request, res: Response) => {
  const { token } = (req.body || {}) as { token?: string };

  if (!token) {
    res.status(400).json({ success: false, message: '缺少验证 token' });
    return;
  }

  // 开发环境：绕过 hCaptcha 服务端验证
  if (isDev && token.startsWith(DEV_TOKEN_PREFIX)) {
    verified.set(token, { expires: Date.now() + 30 * 60 * 1000 });
    res.json({ success: true, token, message: '验证通过（DEV 绕过）' });
    return;
  }

  try {
    const params = new URLSearchParams();
    params.set('secret', config.hcaptcha.secretKey);
    params.set('response', token);

    const r = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await r.json()) as { success: boolean };

    if (!data.success) {
      res.status(400).json({ success: false, message: '人机验证失败，请重试' });
      return;
    }

    // 标记 token 为已验证
    verified.set(token, { expires: Date.now() + 5 * 60 * 1000 });

    res.json({ success: true, token, message: '验证通过' });
  } catch {
    res.status(500).json({ success: false, message: '验证服务异常，请稍后重试' });
  }
});

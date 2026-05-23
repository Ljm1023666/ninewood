import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';

// 全局限流 — 所有 /api 路由
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  max: isProd ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});

// 认证接口限流 — 发送验证码、登录、注册
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '操作过于频繁，请 15 分钟后再试' },
});

// 抢单接口限流 — 防止脚本刷抢单
export const snatchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟窗口
  max: isProd ? 10 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '抢单操作过于频繁，请稍后再试' },
});

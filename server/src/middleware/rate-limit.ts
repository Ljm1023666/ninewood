import rateLimit from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';
/** 本地开发默认跳过限流；生产可用 DISABLE_RATE_LIMIT=1 临时关闭 */
const skipRateLimit = !isProd || process.env.DISABLE_RATE_LIMIT === '1';

// 全局限流 — 所有 /api 路由
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  max: isProd ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimit,
  message: { success: false, message: '请求过于频繁，请稍后再试' },
});

// 认证接口限流 — 发送验证码、登录、注册（开发环境跳过，避免调试时误触封禁）
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimit,
  skipSuccessfulRequests: true,
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

// 需求路径编辑限流 — 每需求每小时最多 10 次（按用户+需求维度）
export const demandPathsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as { user?: { userId: string } }).user?.userId ?? 'anon'
    const demandId = req.params.id ?? 'unknown'
    return `paths:${userId}:${demandId}`
  },
  message: { success: false, message: '路径编辑过于频繁，请稍后再试' },
});

// AI 接口限流 — 防止 LLM 额度被刷
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimit,
  keyGenerator: (req) => {
    const userId = (req as { user?: { userId: string } }).user?.userId ?? 'anon'
    return `ai:${userId}`
  },
  message: { success: false, message: 'AI 请求过于频繁，请稍后再试' },
});

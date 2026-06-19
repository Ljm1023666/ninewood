import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { success, fail } from '../utils/response.js';
import { getClientIp } from '../services/ipgeo.service.js';

export const authRouter = Router();

// 认证接口统一限流
authRouter.use(authLimiter);

const sendCodeSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, '请输入有效的手机号'),
  captchaToken: z.string().min(1, '请先完成人机验证'),
});

const registerSchema = z.object({
  phone: z.string().regex(/^\d{11}$/),
  code: z.string().length(6),
});

const loginSchema = z.object({
  phone: z.string().regex(/^\d{11}$/),
  password: z.string().min(1),
});

/**
 * @openapi
 * /api/auth/send-code:
 *   post:
 *     tags: [Auth]
 *     summary: 发送短信验证码
 *     description: 为新用户手机号发送注册验证码
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "13800000001"
 *     responses:
 *       200:
 *         description: 验证码已发送
 *       400:
 *         description: 输入验证失败
 *
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: 注册新用户
 *     description: 手机号 + 验证码注册，返回 JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, code]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "13800000001"
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 注册成功，返回 token + 用户信息
 *       400:
 *         description: 验证码错误或已过期
 *
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: 密码登录
 *     description: 手机号 + 密码登录已有的用户
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "13800000001"
 *               password:
 *                 type: string
 *                 example: "1"
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 密码错误
 */

// POST /api/auth/send-code — 人机验证 → 短信验证码
authRouter.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { phone, captchaToken } = sendCodeSchema.parse(req.body);
    // 校验人机验证
    const { verifyCaptcha, consumeCaptcha } = await import('./captcha.js');
    if (!verifyCaptcha(captchaToken)) {
      return fail(res, '人机验证未通过或已过期', 400);
    }
    // 发送短信
    const result = await authService.sendCode(phone);
    // 消费人机验证 token
    consumeCaptcha(captchaToken);
    success(res, result, '验证码已发送');
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '发送失败', e.status || 500);
  }
});

// POST /api/auth/register — phone + code → create account
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, code } = registerSchema.parse(req.body);
    const ip = getClientIp(req);
    const result = await authService.register(phone, code, ip);
    success(res, result, '注册成功');
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '注册失败', e.status || 500);
  }
});

// POST /api/auth/login — phone + password
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const ip = getClientIp(req);
    const result = await authService.login(phone, password, ip);
    success(res, result, '登录成功');
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '登录失败', e.status || 500);
  }
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = await authService.me(req.user!.userId);
  if (!user) return fail(res, '用户不存在', 404);
  success(res, user);
});


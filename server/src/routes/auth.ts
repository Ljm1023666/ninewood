import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { authMiddleware } from '../middleware/auth.js';
import { success, fail } from '../utils/response.js';

export const authRouter = Router();

const sendCodeSchema = z.object({
  phone: z.string().regex(/^\d{11}$/, '请输入有效的手机号'),
});

const registerSchema = z.object({
  phone: z.string().regex(/^\d{11}$/),
  code: z.string().length(6),
});

const loginSchema = z.object({
  phone: z.string().regex(/^\d{11}$/),
  password: z.string().min(1),
});

// POST /api/auth/send-code — only for new users
authRouter.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { phone } = sendCodeSchema.parse(req.body);
    const result = await authService.sendCode(phone);
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
    const result = await authService.register(phone, code);
    success(res, result, '注册成功');
  } catch (e: any) {
    if (e instanceof z.ZodError) return fail(res, '输入验证失败', 400, e.errors);
    fail(res, e.message || '注册失败', e.status || 500);
  }
});

// POST /api/auth/login — phone + password for existing users
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = loginSchema.parse(req.body);
    const result = await authService.login(phone, password);
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

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { messageService } from '../services/message.service.js';
import { success, fail } from '../utils/response.js';
import { q } from '../utils/query.js';

export const messageRouter = Router();

// GET /api/messages/conversations
messageRouter.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const conversations = await messageService.getConversations(req.user!.userId);
    success(res, conversations);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/messages/notifications
messageRouter.get('/notifications', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const result = await messageService.getNotifications(req.user!.userId, page);
    success(res, result);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// ── 群聊（ConversationMerge）──

// POST /api/messages/merge — 创建群聊
messageRouter.post('/merge', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, memberIds } = req.body;
    const merge = await messageService.createMerge(req.user!.userId, title, memberIds || []);
    success(res, merge, '群聊已创建', 201);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/messages/merge — 我的群聊列表
messageRouter.get('/merge', authMiddleware, async (req: Request, res: Response) => {
  try {
    const merges = await messageService.getMerges(req.user!.userId);
    success(res, merges);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/messages/merge/:id — 群聊消息
messageRouter.get('/merge/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const messages = await messageService.getMergeMessages(String(req.params.id), req.user!.userId, page);
    success(res, messages);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/messages/merge/:id/send — 发送群聊消息
messageRouter.post('/merge/:id/send', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return fail(res, '消息不能为空', 400);
    const result = await messageService.sendMergeMessage(req.user!.userId, String(req.params.id), content);
    success(res, result, '已发送', 201);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/messages/:userId
messageRouter.get('/:userId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = parseInt(q(req.query.page) || '1');
    const messages = await messageService.getMessages(req.user!.userId, req.params.userId as string, page);
    success(res, messages);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// POST /api/messages/send
messageRouter.post('/send', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { toUserId, content, orderId } = req.body;
    const file = req.file;
    let msgContent = content || '';
    if (file) msgContent = msgContent || `/uploads/${file.filename}`;
    if (!toUserId || !msgContent) return fail(res, '缺少接收者或内容', 400);
    const msg = await messageService.send(req.user!.userId, toUserId, msgContent, orderId);

    // Notify receiver via socket (real-time delivery)
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${toUserId}`).emit('private:message', msg);
      console.log(`[Socket] emitted private:message to user:${toUserId}`);
    } else {
      console.warn('[Socket] io instance not available on req.app');
    }

    success(res, msg, '发送成功', 201);
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

// GET /api/messages/unread-count
messageRouter.get('/unread-count', authMiddleware, async (req: Request, res: Response) => {
  try {
    const count = await messageService.getUnreadCount(req.user!.userId);
    success(res, { count });
  } catch (e: any) {
    fail(res, e.message || '服务器错误', e.status || 500);
  }
});

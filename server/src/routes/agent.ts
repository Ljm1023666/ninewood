import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import { toolRegistry } from '../services/agent/tool-registry.js';
import { loadAllSkills } from '../services/agent/skill-loader.js';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  addMessage,
} from '../services/agent/conversation.js';
import { executeAgent } from '../services/agent/executor.js';

export const agentRouter = Router();

/** 获取可用工具列表 */
agentRouter.get('/tools', (_req: Request, res: Response) => {
  const tools = toolRegistry.listAll().map((t) => ({
    name: t.definition.name,
    description: t.definition.description,
    parameters: t.definition.parameters,
    category: t.category,
    requiresConfirmation: t.requiresConfirmation,
  }));
  res.json({ tools });
});

/** 获取可用技能列表 */
agentRouter.get('/skills', (_req: Request, res: Response) => {
  const skills = loadAllSkills().map((s) => ({
    name: s.name,
    description: s.description,
    source: s.source,
  }));
  res.json({ skills });
});

/** 获取 AI 供应商信息 */
agentRouter.get('/provider', (_req: Request, res: Response) => {
  res.json({
    provider: 'minimax',
    model: config.aiModel,
    thinkModel: config.aiThinkModel || config.aiModel,
    fastModel: config.aiFastModel || config.aiModel,
  });
});

// ── 对话 CRUD（需认证）──

/** 创建新对话 */
agentRouter.post('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { title, model, provider, thinkMode } = req.body;
    const conv = await createConversation({
      userId,
      title,
      model: model || config.aiModel,
      provider: provider || 'minimax',
      thinkMode,
    });
    res.status(201).json(conv);
  } catch (e: any) {
    console.error('[Agent] create conversation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** 获取对话列表 */
agentRouter.get('/conversations', authMiddleware, async (req: Request, res: Response) => {
  try {
    const list = await listConversations(req.user!.userId);
    res.json({ conversations: list });
  } catch (e: any) {
    console.error('[Agent] list conversations error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** 获取单个对话（含消息） */
agentRouter.get('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const conv = await getConversation(req.params.id as string, req.user!.userId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });
    res.json(conv);
  } catch (e: any) {
    console.error('[Agent] get conversation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** 删除对话 */
agentRouter.delete('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await deleteConversation(req.params.id as string, req.user!.userId);
    if (result.count === 0) return res.status(404).json({ error: '对话不存在' });
    res.json({ success: true });
  } catch (e: any) {
    console.error('[Agent] delete conversation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── 流式对话（SSE）──

/** 发送消息并获取流式 Agent 响应 */
agentRouter.post('/conversations/:id/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { message, thinkMode, webSearch, context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '请输入消息内容' });
    }

    // 获取历史消息
    const conv = await getConversation(req.params.id as string, userId);
    if (!conv) return res.status(404).json({ error: '对话不存在' });

    const history = conv.messages
      .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
    };

    await executeAgent(
      {
        userId,
        conversationId: req.params.id as string,
        message,
        history,
        thinking: thinkMode ?? false,
        webSearch: webSearch ?? false,
        context,
      },
      send,
    );

    res.end();
  } catch (e: any) {
    console.error('[Agent] stream error:', e.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message });
    }
    res.write(`event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`);
    res.end();
  }
});

/** 非流式发送消息 */
agentRouter.post('/conversations/:id/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '请输入消息内容' });
    }

    await addMessage({
      conversationId: req.params.id as string,
      role: 'user',
      content: message,
    });

    res.json({ success: true });
  } catch (e: any) {
    console.error('[Agent] add message error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

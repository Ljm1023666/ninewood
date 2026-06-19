import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';
import { toolRegistry } from '../services/agent/tool-registry.js';
import { loadAllSkills } from '../services/agent/skill-loader.js';
import {
  getKnowledgeMeta,
  getKnowledgeContent,
} from '../services/agent/knowledge-loader.js';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  addMessage,
} from '../services/agent/conversation.js';
import { executeAgent } from '../services/agent/executor.js';
import { checkQuota, recordCall, getRemaining } from '../services/agent/quota.js';
import { semanticNavigate } from '../services/semantic-classifier.js';

export const agentRouter = Router();

/** 语义导航 — 调用本地 8001 分类器识别页面跳转意图 */
agentRouter.post('/navigate', async (req: Request, res: Response) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.json({ match: null, candidates: [] })
    const match = await semanticNavigate(text.trim())
    if (match) {
      res.json({ match, candidates: [match] })
    } else {
      res.json({ match: null, candidates: [] })
    }
  } catch {
    res.json({ match: null, candidates: [] })
  }
});

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
    provider: config.aiProvider,
    model: config.aiModel,
    thinkModel: config.aiThinkModel || config.aiModel,
    fastModel: config.aiFastModel || config.aiModel,
  });
});

/** 获取知识库元信息 */
agentRouter.get('/knowledge', (_req: Request, res: Response) => {
  const meta = getKnowledgeMeta();
  res.json({ files: meta });
});

/** 获取指定知识库文件内容 */
agentRouter.get('/knowledge/:filename', (req: Request, res: Response) => {
  const content = getKnowledgeContent(req.params.filename as string);
  if (!content) return res.status(404).json({ error: '知识文件不存在' });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(content);
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

/** 语义分类代理 — 转发到 8001 本地分类服务 */
agentRouter.post('/classify', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });

    const resp = await fetch('http://127.0.0.1:8001/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, top_k: 5, threshold: 0.15 }),
    });
    const data = await resp.json();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: '分类服务不可用', fallback: true });
  }
});

/** 语义导航 — 用分类器识别页面跳转意图 */
const NAV_TARGETS: { name: string; keywords: string[]; path: string; title: string }[] = [
  { name: '发现', keywords: ['发现', '首页', '主页', 'discover', '全部需求', '浏览需求'], path: '/discover', title: '发现页' },
  { name: '发布需求', keywords: ['发布', '发需求', '创建需求', '发单'], path: '/demands/create', title: '发布需求' },
  { name: '我的需求', keywords: ['我的需求', '我发布的', '管理需求'], path: '/my-demands', title: '我的需求' },
  { name: '订单', keywords: ['订单', '我的订单', '交易记录'], path: '/orders', title: '订单' },
  { name: '设置', keywords: ['设置', '偏好', '配置'], path: '/settings', title: '设置' },
  { name: '帮助', keywords: ['帮助', 'help', '怎么用', '使用帮助'], path: '/help', title: '帮助文档' },
  { name: '消息', keywords: ['消息', '私信', '聊天'], path: '/messages', title: '消息' },
  { name: '卡池', keywords: ['卡池', '资源池'], path: '/card-pool', title: '卡池' },
  { name: '死池', keywords: ['死池', '过期池'], path: '/card-pool/dead', title: '死池' },
  { name: '认证', keywords: ['认证', '实名认证'], path: '/cert-center', title: '认证中心' },
  { name: '圈子', keywords: ['圈子', '社区'], path: '/circles', title: '圈子' },
  { name: '公益', keywords: ['公益', '福利'], path: '/welfare', title: '公益中心' },
  { name: '找人', keywords: ['找人', '搜索用户', '找师傅'], path: '/search', title: '找人' },
  { name: '数据看板', keywords: ['数据', '看板', 'dashboard', '监控', '统计'], path: '/dashboard', title: '数据看板' },
];

agentRouter.post('/navigate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '请提供文本' });

    // 先尝试关键词精确匹配
    const lowered = text.toLowerCase();
    for (const nav of NAV_TARGETS) {
      if (nav.keywords.some(kw => lowered.includes(kw))) {
        return res.json({ match: { name: nav.name, path: nav.path, title: nav.title, similarity: 1 }, candidates: [] });
      }
    }

    // 回退到语义模型
    try {
      const resp = await fetch('http://127.0.0.1:8001/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, top_k: 3, threshold: 0.4 }),
      });
      const data = await resp.json();
      const results = data.results || [];
      if (results.length > 0 && results[0].similarity > 0.4) {
        // 尝试匹配到 NAV_TARGETS
        for (const nav of NAV_TARGETS) {
          if (results[0].name.includes(nav.name) || nav.keywords.some(kw => results[0].path.includes(kw))) {
            return res.json({ match: { name: nav.name, path: nav.path, title: nav.title, similarity: results[0].similarity }, candidates: [] });
          }
        }
      }
      res.json({ match: null, candidates: results.slice(0, 3).map((r: any) => ({ name: r.name, path: r.path, title: r.name, similarity: r.similarity })) });
    } catch {
      res.json({ match: null, candidates: [] });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message, match: null, candidates: [] });
  }
});

/** 获取当前配额余量 */
agentRouter.get('/quota', authMiddleware, (req: Request, res: Response) => {
  const remaining = getRemaining(req.user!.userId);
  res.json({ remaining, dailyLimit: 150, hourlyLimit: 50 });
});

/** 发送消息并获取流式 Agent 响应 */
agentRouter.post('/conversations/:id/stream', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const conversationId = req.params.id as string;
    const { message, thinkMode, webSearch, context, model } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '请输入消息内容' });
    }

    // ── 配额检查 ──
    const quota = checkQuota(userId, conversationId);
    if (!quota.allowed) {
      return res.status(429).json({ error: quota.reason, remaining: quota.remaining, cooldownMs: quota.cooldownMs });
    }

    // 获取历史消息
    const conv = await getConversation(conversationId, userId);
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
        conversationId,
        message,
        history,
        thinking: thinkMode ?? false,
        webSearch: webSearch ?? false,
        model: model || undefined,
        context,
      },
      send,
    );

    res.end();
    // 记录配额消耗（仅成功调用）
    recordCall(userId, conversationId);
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

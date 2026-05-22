import { Router, Request, Response } from 'express';
import { config } from '../config.js';
import { prisma } from '../lib/prisma.js';
import {
  getDescendantLeafIds,
  getChildNodes,
  getAncestorPath,
  findNodeByLabels,
  taxonomySnapshot,
} from '../taxonomy.js';

export const aiRouter = Router();

const PROVIDER = {
  baseUrl: config.aiBaseUrl,
  apiKey: config.aiApiKey,
  model: config.aiModel,
};

/** 提取 JSON（去掉 markdown 包裹） */
function parseJSON(text: string) {
  const trimmed = text.trim();

  // 1) 提取 markdown 代码块中的 JSON（可能不在开头）
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]!.trim()); } catch { /* 继续 */ }
  }

  // 2) 尝试找到第一个 { 到最后一个 } 的 JSON 对象
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)); } catch { /* 继续 */ }
  }

  // 3) 直接解析
  try { return JSON.parse(trimmed); } catch { return null; }
}

// POST /api/ai/analyze-demand — 非流式（保持原样）
aiRouter.post('/analyze-demand', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请输入需求描述' });
    }

    const system = `你是九木平台的需求分析助手。将用户的自然语言需求描述解析为结构化分类。

返回 JSON（纯 JSON，不要 markdown 包裹）：
{
  "matched": boolean,
  "title": string | null,
  "category": string | null,
  "scopePath": string[] | null,
  "serviceType": "ONLINE" | "OFFLINE" | null,
  "confidence": "high" | "medium" | "low",
  "missingInfo": string[],
  "summary": string,
  "suggestedKeywords": string[],
  "budget": string | null,
  "schedule": string | null
}

规则：
- 始终使用简体中文回复，禁止使用繁体字。
- title 是 10-20 字的简洁需求标题，从对话中提取核心信息。
- summary 必须是可独立阅读的一句话需求摘要，包含服务类型+具体规格+预算+时间要求。禁止写"用户表示…""用户没有说明…"等元描述。
- budget 从对话中提取预算或价格信息，如"跑腿费50元""30元/局""商品100元以内"。如果有商品价格和跑腿费等多重预算，合并写出。未提及时为 null。
- schedule 从对话中提取时间要求，如"现在就要""今晚""本周六下午"。未提及时为 null。
- matched=false 时，missingInfo 列出 2-4 个具体的追问问题（不是泛泛的"请补充需求细节"），每个问题指向一个缺失的关键信息点。
- 即使信息不全，也要尽力推断 category 和 scopePath，confidence 反映确定程度。
- suggestedKeywords 给出 3-5 个可用于搜索的精准关键词。

平台分类示例（不限于此）：
- 跑腿/代取/代送（线下）
- 跑腿/代买（线下）
- 跑腿/排队（线下）
- 游戏/陪玩/代打（线上）
- 游戏/代练（线上）
- 设计/平面/LOGO（线上）
- 设计/UI/网页（线上）
- 编程/网站开发（线上）
- 编程/脚本工具（线上）
- 翻译/文档（线上）
- 教育/辅导（线上）
- 家政/维修（线下）
- 家政/搬运（线下）`;

    // 复用非流式调用
    const r = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROVIDER.apiKey}` },
      body: JSON.stringify({ model: PROVIDER.model, max_tokens: 1024, temperature: 0.1, messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
    });
    if (!r.ok) throw new Error(`AI API ${r.status}`);
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content || '';

    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    const think = thinkMatch ? thinkMatch[1].trim() : undefined;
    const clean = thinkMatch ? content.replace(/<think>[\s\S]*?<\/think>\s*/gi, '') : content;
    const data = parseJSON(clean);

    // 将 scopePath 映射为 taxonomyLeafId
    if (data && data.scopePath) {
      let path: string[] = [];
      if (Array.isArray(data.scopePath)) {
        // 展平：AI 可能返回 ["游戏", "陪玩"] 或 ["游戏/陪玩/王者荣耀"]
        path = data.scopePath.flatMap((s: string) => s.split('/'));
      }
      if (path.length > 0) {
        data.taxonomyLeafId = findNodeByLabels(path);
      }
    }

    return res.json({ data, think });
  } catch (e: any) {
    console.error('[AI] analyze-demand error:', e.message);
    return res.status(500).json({ error: e.message || 'AI 服务异常' });
  }
});

// POST /api/ai/discover-stream — 流式：思考过程逐行推送
aiRouter.post('/discover-stream', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请输入描述' });
    }

    const system = `你是九木平台的服务者意图分析助手。用户描述他们能提供什么服务/想接什么单，你解析出筛选条件。

返回 JSON（纯 JSON，不要 markdown）：
{
  "understood": boolean,
  "summary": string,
  "categoryHint": string | null,
  "serviceType": "ONLINE" | "OFFLINE" | null,
  "missingInfo": string[],
  "matched": boolean,
  "keyword": string,
  "scopePath": string[]
}

规则：
- summary 必须是一句可独立阅读的服务能力描述（如"可提供王者荣耀陪玩服务，擅长打野位，段位荣耀王者"）。禁止写"用户表示…""用户没有说明…""没有说明想接什么类型"等元描述——直接提炼信息，信息不足就写已确认的部分。
- missingInfo 必须是 2-4 个精准追问（如"期望时薪多少？""可接单的时间段是？""是否有线下到场要求？"），禁止泛泛的"请补充服务详情"。
- keyword 给出最核心的 1-3 个搜索词。
- scopePath 是分类路径数组，如 ["全部", "线上服务", "游戏", "陪玩", "王者荣耀"]。最细粒度到叶子节点。无法匹配时为空数组。`;

    // 设置 SSE 头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // 调 MiniMax 流式接口
    const aiRes = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROVIDER.apiKey}` },
      body: JSON.stringify({
        model: PROVIDER.model,
        max_tokens: 1024,
        temperature: 0.1,
        stream: true,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      res.write(`event: error\ndata: ${JSON.stringify({ message: `AI API ${aiRes.status}: ${errText}` })}\n\n`);
      res.end();
      return;
    }

    const reader = aiRes.body?.getReader();
    if (!reader) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: '无法读取 AI 流' })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let thinkLinesSent = 0;
    let thinkSentEnd = 0;

    const sendThinkLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      res.write(`event: think\ndata: ${JSON.stringify({ line: trimmed })}\n\n`);
      thinkLinesSent++;
    };

    const flushThinkLines = () => {
      const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (!thinkMatch || thinkMatch.index === undefined) {
        const openMatch = fullContent.match(/<think>/i);
        if (openMatch && openMatch.index !== undefined) {
          const thinkStart = openMatch.index + '<think>'.length;
          sendNewLines(fullContent.slice(thinkStart), thinkStart);
        }
        return;
      }
      const thinkStart = thinkMatch.index + '<think>'.length;
      const thinkSection = fullContent.slice(thinkStart, thinkMatch.index + thinkMatch[0].length - '</think>'.length);
      sendNewLines(thinkSection, thinkStart);
    };

    const sendNewLines = (section: string, offset: number) => {
      const slice = section.slice(Math.max(0, thinkSentEnd - offset));
      if (!slice) return;
      const lines = slice.split('\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]!;
        if (line.trim()) sendThinkLine(line.trim());
      }
      const sent = lines.slice(0, -1).join('\n');
      thinkSentEnd = offset + (sent ? sent.length + 1 : 0);
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta?.content || '';
          if (!delta) continue;

          fullContent += delta;
          flushThinkLines();
        } catch {
          // 跳过解析失败的行
        }
      }
    }

    // 发送最后残留的 think 行
    {
      const thinkMatch = fullContent.match(/<think>([\s\S]*?)(<\/think>|$)/i);
      if (thinkMatch) {
        const lines = thinkMatch[1]!.split('\n');
        for (const line of lines) {
          if (line.trim()) sendThinkLine(line.trim());
        }
      }
    }
    thinkSentEnd = 0;
    flushThinkLines();

    if (thinkLinesSent > 0) {
      res.write(`event: think-end\ndata: ok\n\n`);
    }

    // 解析最终结果
    const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i);
    const cleanContent = thinkMatch ? fullContent.replace(/<think>[\s\S]*?<\/think>\s*/gi, '') : fullContent;
    const data = parseJSON(cleanContent);

    if (data) {
      res.write(`event: result\ndata: ${JSON.stringify(data)}\n\n`);
    } else {
      res.write(`event: result\ndata: ${JSON.stringify({ matched: false, missingInfo: ['无法解析需求'] })}\n\n`);
    }

    res.write(`event: done\ndata: ok\n\n`);
    res.end();
  } catch (e: any) {
    console.error('[AI] discover-stream error:', e.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' });
    }
    res.write(`event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`);
    res.end();
  }
});

// POST /api/ai/discover — 非流式（兼容旧调用）
aiRouter.post('/discover', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '请输入描述' });
    }

    const system = `你是九木平台的服务者意图分析助手。用户描述他们能提供什么服务/想接什么单，你解析出筛选条件。

返回 JSON（纯 JSON，不要 markdown）：
{
  "understood": boolean,
  "summary": string,
  "categoryHint": string | null,
  "serviceType": "ONLINE" | "OFFLINE" | null,
  "missingInfo": string[],
  "matched": boolean,
  "keyword": string
}

规则：
- summary 必须是一句可独立阅读的服务能力描述。禁止写"用户表示…""用户没有说明…"等元描述——提炼已确认信息即可。
- missingInfo 必须是 2-4 个精准追问（如"期望时薪多少？"），禁止泛泛的"请补充更多信息"。
- keyword 给出最核心的 1-3 个搜索词。`;

    const r = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROVIDER.apiKey}` },
      body: JSON.stringify({ model: PROVIDER.model, max_tokens: 1024, temperature: 0.1, messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
    });
    if (!r.ok) throw new Error(`AI API ${r.status}`);
    const j = await r.json();
    const content = j.choices?.[0]?.message?.content || '';

    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
    const think = thinkMatch ? thinkMatch[1].trim() : undefined;
    const clean = thinkMatch ? content.replace(/<think>[\s\S]*?<\/think>\s*/gi, '') : content;
    const data = parseJSON(clean);

    return res.json({ data, think });
  } catch (e: any) {
    console.error('[AI] discover error:', e.message);
    return res.status(500).json({ error: e.message || 'AI 服务异常' });
  }
});

// POST /api/ai/discover-classify-stream — AI 理解 + 系统搜索
aiRouter.post('/discover-classify-stream', async (req: Request, res: Response) => {
  try {
    const { message, history, thinkMode } = req.body as {
      message?: string
      history?: { role: 'user' | 'assistant'; content: string }[]
      thinkMode?: boolean
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '请输入描述' })
    }

    const thinkModeEnabled = thinkMode === true

    const model = thinkModeEnabled
      ? (config.aiThinkModel || config.aiModel)
      : (config.aiFastModel || config.aiModel)

    const system = `你只做一件事：判断用户输入类型，输出 JSON。

用户是服务者（想接单赚钱），描述自己的服务能力。

【两种输出格式——选其一，不要混用】

类型 A — 通用问答：
{
  "queryType": "general",
  "answer": "完整回答"
}

类型 B — 找需求：
{
  "queryType": "service",
  "keywords": ["王者荣耀", "陪玩"],
  "hint": "试试加上段位（选填）"
}

【规则】
- 如果用户问天气、知识、教程等 → 类型 A
- 如果用户描述自己有什么技能、能接什么活 → 类型 B
- 类型 B 时：keywords 只从用户输入提取 1-3 个词，不脑补
- 类型 B 时：hint 选填，只在可能匹配很多时给建议
- 输出纯 JSON，不要 markdown，不要多余文字
${thinkModeEnabled ? '- 推理分析放在 <think>...</think> 标签中' : ''}`;

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: system },
    ]
    if (history && history.length > 0) {
      for (const h of history) {
        messages.push({ role: h.role, content: h.content })
      }
    }
    messages.push({ role: 'user', content: message })

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const body: Record<string, unknown> = {
      model,
      max_tokens: 1024,
      temperature: 0.1,
      stream: true,
      messages,
      ...(thinkModeEnabled ? { thinking: { type: 'enabled' } } : {}),
    }

    const aiRes = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROVIDER.apiKey}` },
      body: JSON.stringify(body),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '')
      const msg = `AI API ${aiRes.status}: ${errText}`
      res.write(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`)
      res.end()
      return
    }

    const reader = aiRes.body?.getReader()
    if (!reader) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: '无法读取 AI 流' })}\n\n`)
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buf = ''
    let fullContent = ''
    let thinkLinesSent = 0
    let thinkSentEnd = 0

    const sendThinkLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return
      res.write(`event: think\ndata: ${JSON.stringify({ line: trimmed })}\n\n`)
      thinkLinesSent++
    }

    /** 从 fullContent 中提取新增的 think 行并逐行发送 */
    const flushThinkLines = () => {
      const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i)
      if (!thinkMatch || thinkMatch.index === undefined) {
        // 可能是 <think> 已开但未闭合，取 <think> 之后的所有内容
        const openMatch = fullContent.match(/<think>/i)
        if (openMatch && openMatch.index !== undefined) {
          const thinkStart = openMatch.index + '<think>'.length
          const thinkSection = fullContent.slice(thinkStart)
          sendNewLines(thinkSection, thinkStart)
        }
        return
      }
      const thinkStart = thinkMatch.index + '<think>'.length
      const thinkSection = fullContent.slice(thinkStart, thinkMatch.index + thinkMatch[0].length - '</think>'.length)
      sendNewLines(thinkSection, thinkStart)
    }

    const sendNewLines = (section: string, offset: number) => {
      const slice = section.slice(Math.max(0, thinkSentEnd - offset))
      if (!slice) return
      const lines = slice.split('\n')
      // 最后一行可能不完整，保留
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]!
        if (line.trim()) sendThinkLine(line.trim())
      }
      const sent = lines.slice(0, -1).join('\n')
      thinkSentEnd = offset + (sent ? sent.length + 1 : 0)
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue

        try {
          const chunk = JSON.parse(raw)
          const delta = chunk.choices?.[0]?.delta
          if (!delta) continue

          // MiniMax thinking 模式：reasoning_content 直接流式发送给前端
          const reasoning: string = (delta as any).reasoning_content || ''
          if (reasoning && thinkModeEnabled) {
            const lines = reasoning.split('\n')
            for (const line of lines) {
              if (line.trim()) sendThinkLine(line.trim())
            }
          }

          const contentDelta: string = delta.content || ''
          if (contentDelta) {
            fullContent += contentDelta
            if (thinkModeEnabled) flushThinkLines()
          }
        } catch { /* skip malformed chunk */ }
      }
    }

    if (thinkModeEnabled) {
      // 发送最后可能残留的 think 行
      {
        const thinkMatch = fullContent.match(/<think>([\s\S]*?)(<\/think>|$)/i)
        if (thinkMatch) {
          const thinkSection = thinkMatch[1]!
          const lines = thinkSection.split('\n')
          for (const line of lines) {
            if (line.trim()) sendThinkLine(line.trim())
          }
        }
      }
      // 重置 thinkSentEnd 确保最后一轮 flush 不会漏
      thinkSentEnd = 0
      flushThinkLines()

      if (thinkLinesSent > 0) {
        res.write(`event: think-end\ndata: ok\n\n`)
      }
    }

    const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i)
    const cleanContent = thinkMatch
      ? fullContent.replace(/<think>[\s\S]*?<\/think>\s*/gi, '')
      : fullContent
    const aiData = parseJSON(cleanContent)

    if (!aiData) {
      // JSON 解析失败——把原始文本当通用回答返回
      const fallbackAnswer = cleanContent.trim() || '未能理解，请换个方式描述'
      res.write(`event: result\ndata: ${JSON.stringify({ queryType: 'general', answer: fallbackAnswer })}\n\n`)
      res.write(`event: done\ndata: ok\n\n`)
      res.end()
      return
    }

    // 通用问答模式：直接返回答案
    if (aiData.queryType === 'general') {
      res.write(`event: result\ndata: ${JSON.stringify({ queryType: 'general', answer: aiData.answer || '未能获取信息' })}\n\n`)
      res.write(`event: done\ndata: ok\n\n`)
      res.end()
      return
    }

    // 三阶段分类搜索：规则 → GPU 语义 → 关键词降级
    const keywords: string[] = aiData.keywords || []
    const keyword = keywords[0] || message

    const { routeClassify } = await import('../services/semantic-classifier.js')
    const { demandService } = await import('../services/demand.service.js')
    const classified = await routeClassify(keywords)

    let searchResult
    if (classified.method === 'fuzzy') {
      // 降级：关键词模糊搜索
      const tags = keywords.slice(1).join(',')
      const params: Record<string, unknown> = {
        keyword,
        searchMode: 'fuzzy' as const,
        limit: 10,
      }
      if (tags) params.tags = tags
      searchResult = await demandService.search(params)
    } else {
      // 规则/语义分类 → 精确搜索
      searchResult = await demandService.search({
        taxonomyLeafIds: classified.nodeIds.join(','),
        searchMode: 'fuzzy' as const,
        limit: 10,
      })
    }

    const result = {
      keywords,
      hint: aiData.hint || '',
      demands: searchResult.demands || [],
      total: searchResult.total || 0,
      classifiedLabels: classified.labels,
      classifyMethod: classified.method,
      classifiedNodeIds: classified.nodeIds,
    }

    res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`)
    res.write(`event: done\ndata: ok\n\n`)
    res.end()
  } catch (e: any) {
    console.error('[AI] discover-classify-stream error:', e.message)
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' })
    }
    res.write(`event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`)
    res.end()
  }
});

// POST /api/ai/analyze-demand-stream — 多轮需求分析 + Think 模式流式
aiRouter.post('/analyze-demand-stream', async (req: Request, res: Response) => {
  try {
    const { message, requirementState, thinkMode } = req.body as {
      message?: string
      requirementState?: { confirmed: Record<string, string>; pending: string[] }
      thinkMode?: boolean
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '请输入需求描述' })
    }

    const thinkModeEnabled = thinkMode === true
    const model = thinkModeEnabled
      ? (config.aiThinkModel || config.aiModel)
      : (config.aiFastModel || config.aiModel)

    const confirmedBlock = requirementState && Object.keys(requirementState.confirmed).length > 0
      ? `当前已确认的信息：\n${Object.entries(requirementState.confirmed).map(([k, v]) => `- ${k}: ${v}`).join('\n')}`
      : '(暂无已确认信息，这是第一轮对话)'

    const pendingBlock = requirementState && requirementState.pending.length > 0
      ? `当前待补充：${requirementState.pending.join('、')}`
      : ''

    const system = `你是九木平台的需求澄清代理。你的任务是与用户进行多轮对话，逐步收集完整、清晰的服务需求。

${confirmedBlock}
${pendingBlock}

${thinkModeEnabled ? '' : '【重要】直接输出 JSON，不要使用 <think> 标签，不要进行冗长推理。'}

你必须返回一个 JSON 对象（纯 JSON，不要 markdown 包裹）：
{
  "summary": "一句完整的需求摘要，融合已确认信息+本轮新增信息",
  "scopeLabels": ["线上服务", "游戏", "陪玩教学"],
  "serviceType": "ONLINE",
  "confidence": "high",
  "missingInfo": ["追问1", "追问2"],
  "suggestedKeywords": ["关键词1", "关键词2"],
  "readyToPublish": false,
  "requirementState": {
    "confirmed": {"游戏": "王者荣耀", "服务": "代打上分20星"},
    "pending": ["确认大区", "确认完成时间"]
  }
}

【工作流程】
1. 分析用户本轮消息，提取新信息
2. 将新信息合并到 requirementState.confirmed 中（键用中文描述维度，值用简短中文记录）
3. 更新 requirementState.pending：移除已确认的项，添加需要追问的新项
4. 如果 pending 为空，readyToPublish 设为 true；否则为 false

【规则】
- summary 必须包含所有已确认的关键信息，是一句完整的、可独立理解的描述
- scopeLabels 从分类树中选路径，从"线上服务"或"线下到场"开始
- serviceType 为 "ONLINE" 或 "OFFLINE"
- confidence 为 "high"（大部分信息已确认）/ "medium"（中等）/ "low"（信息很少）
- missingInfo 列出 2-4 个具体追问，引导用户补充 pending 中的信息
- suggestedKeywords 给出 3-5 个搜索关键词
- requirementState.confirmed 的键值对要简洁准确，值的长度控制在 20 字以内
- 不要重复问已经确认过的问题

【消歧规则——这是最重要的规则】
用户在本轮的简短回复（如数字、短词组）必须在 pending 列表中找到对应项来理解：
- 如果 pending 中有段位/等级相关项（"确认起始段位""确认目标段位"），则数字优先理解为段位
- 如果 pending 中有价格/预算相关项，则数字优先理解为价格
- 只有当 pending 中明确有预算项时，才将数字理解为金额
- 结合上一个 confirmed 中的游戏/服务类型来判断领域术语（如王者荣耀中"30-50"是星数不是元）
- 选 pending 中最匹配的一项来填写，移除该项，保留其余 pending

平台分类示例：
- 游戏/陪玩/代打（线上）
- 游戏/代练（线上）
- 设计/平面/LOGO（线上）
- 设计/UI/网页（线上）
- 编程/网站开发（线上）
- 编程/脚本工具（线上）
- 翻译/文档（线上）
- 教育/辅导（线上）
- 跑腿/代取/代送（线下）
- 跑腿/代买（线下）
- 跑腿/排队（线下）
- 家政/维修（线下）
- 家政/搬运（线下）`

    const messages: { role: string; content: string }[] = [
      { role: 'system', content: system },
      { role: 'user', content: message },
    ]

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const aiRes = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROVIDER.apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.1,
        stream: true,
        messages,
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '')
      res.write(`event: error\ndata: ${JSON.stringify({ message: `AI API ${aiRes.status}: ${errText}` })}\n\n`)
      res.end()
      return
    }

    const reader = aiRes.body?.getReader()
    if (!reader) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: '无法读取 AI 流' })}\n\n`)
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buf = ''
    let fullContent = ''
    let thinkLinesSent = 0
    let thinkSentEnd = 0

    const sendThinkLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return
      res.write(`event: think\ndata: ${JSON.stringify({ line: trimmed })}\n\n`)
      thinkLinesSent++
    }

    const flushThinkLines = () => {
      const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i)
      if (!thinkMatch || thinkMatch.index === undefined) {
        const openMatch = fullContent.match(/<think>/i)
        if (openMatch && openMatch.index !== undefined) {
          const thinkStart = openMatch.index + '<think>'.length
          const thinkSection = fullContent.slice(thinkStart)
          sendNewLines(thinkSection, thinkStart)
        }
        return
      }
      const thinkStart = thinkMatch.index + '<think>'.length
      const thinkSection = fullContent.slice(thinkStart, thinkMatch.index + thinkMatch[0].length - '</think>'.length)
      sendNewLines(thinkSection, thinkStart)
    }

    const sendNewLines = (section: string, offset: number) => {
      const slice = section.slice(Math.max(0, thinkSentEnd - offset))
      if (!slice) return
      const lines = slice.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]!
        if (line.trim()) sendThinkLine(line.trim())
      }
      const sent = lines.slice(0, -1).join('\n')
      thinkSentEnd = offset + (sent ? sent.length + 1 : 0)
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue
        try {
          const chunk = JSON.parse(raw)
          const delta = chunk.choices?.[0]?.delta?.content || ''
          if (!delta) continue
          fullContent += delta
          if (thinkModeEnabled) flushThinkLines()
        } catch { /* skip */ }
      }
    }

    if (thinkModeEnabled) {
      {
        const thinkMatch = fullContent.match(/<think>([\s\S]*?)(<\/think>|$)/i)
        if (thinkMatch) {
          const thinkSection = thinkMatch[1]!
          const lines = thinkSection.split('\n')
          for (const line of lines) {
            if (line.trim()) sendThinkLine(line.trim())
          }
        }
      }
      thinkSentEnd = 0
      flushThinkLines()
      if (thinkLinesSent > 0) {
        res.write(`event: think-end\ndata: ok\n\n`)
      }
    }

    const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i)
    const cleanContent = thinkMatch
      ? fullContent.replace(/<think>[\s\S]*?<\/think>\s*/gi, '')
      : fullContent
    const aiData = parseJSON(cleanContent)

    if (!aiData) {
      res.write(`event: result\ndata: ${JSON.stringify({ summary: '无法理解，请换个方式描述', readyToPublish: false })}\n\n`)
      res.write(`event: done\ndata: ok\n\n`)
      res.end()
      return
    }

    // 将 scopeLabels 映射为 taxonomyLeafId
    if (aiData.scopeLabels) {
      let path: string[] = [];
      if (Array.isArray(aiData.scopeLabels)) {
        path = aiData.scopeLabels.flatMap((s: string) => s.split('/'));
      }
      if (path.length > 0) {
        const leafId = findNodeByLabels(path);
        if (leafId) aiData.taxonomyLeafId = leafId;
      }
    }

    res.write(`event: result\ndata: ${JSON.stringify(aiData)}\n\n`)
    res.write(`event: done\ndata: ok\n\n`)
    res.end()
  } catch (e: any) {
    console.error('[AI] analyze-demand-stream error:', e.message)
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' })
    }
    res.write(`event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`)
    res.end()
  }
});

// POST /api/ai/agent-demand-stream — Agentic 需求收集 · 流式 + Function Calling
aiRouter.post('/agent-demand-stream', async (req: Request, res: Response) => {
  try {
    const { messages, thinkMode } = req.body as {
      messages?: { role: 'user' | 'assistant'; content: string }[]
      thinkMode?: boolean
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '请提供对话历史' })
    }

    const thinkModeEnabled = thinkMode === true
    const model = thinkModeEnabled
      ? (config.aiThinkModel || config.aiModel)
      : (config.aiFastModel || config.aiModel)

    const SYSTEM_PROMPT = `你是九木平台的需求收集助手。通过自然对话帮助用户清晰、完整地表达服务需求。

工作方式：
1. 理解用户的自然语言输入，提取关键信息
2. 如果信息不足，友好地追问缺失信息。一次只问 1-2 个问题
3. 当所有必要信息都已收集齐全时，调用 publish_requirement 函数发布需求
4. 保持对话自然流畅，像一个有经验的客服专员

关键原则：
- 始终使用简体中文回复，禁止使用繁体字
- 必要信息包括：服务类型（线上/线下）、具体内容、预算范围、时间要求
- 永远不要在信息不完整时调用发布函数
- 用户简短回复（数字、短词组）要结合对话历史来理解
- 忠实保留用户说的数值和单位（元/小时、元/局、元/次等），不要自行换算或改写
- 如果用户前后矛盾，主动要求澄清
${thinkModeEnabled ? '\n【要求】将你的推理分析过程放在 <think>...</think> 标签中。' : ''}`

    const PUBLISH_TOOL = {
      type: 'function' as const,
      function: {
        name: 'publish_requirement',
        description: '当已完整收集用户需求的所有必要信息（服务类型、具体内容、预算、时间）时，调用此函数发布需求',
        parameters: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: '需求标题，10-30字，简洁概括需求' },
            description: { type: 'string', description: '完整需求描述，包含所有已确认的细节' },
            serviceType: { type: 'string', enum: ['ONLINE', 'OFFLINE'], description: '线上服务或线下到场服务' },
            budget: { type: 'string', description: '预算范围或价格' },
            schedule: { type: 'string', description: '时间要求或截止日期' },
            category: { type: 'string', description: '服务分类路径，如 游戏/陪玩/代打' },
          },
          required: ['title', 'description', 'serviceType'],
        },
      },
    }

    const chatMessages: { role: string; content: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ]

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const body: Record<string, unknown> = {
      model,
      max_tokens: 1024,
      temperature: 0.1,
      stream: true,
      messages: chatMessages,
      tools: [PUBLISH_TOOL],
      tool_choice: 'auto' as const,
    }

    const aiRes = await fetch(`${PROVIDER.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PROVIDER.apiKey}` },
      body: JSON.stringify(body),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '')
      res.write(`event: error\ndata: ${JSON.stringify({ message: `AI API ${aiRes.status}: ${errText}` })}\n\n`)
      res.end()
      return
    }

    const reader = aiRes.body?.getReader()
    if (!reader) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: '无法读取 AI 流' })}\n\n`)
      res.end()
      return
    }

    const decoder = new TextDecoder()
    let buf = ''
    let fullContent = ''
    let thinkLinesSent = 0
    let thinkSentEnd = 0

    // 累积 tool_call 增量
    const toolCallsAcc: Map<number, { id: string; name: string; arguments: string }> = new Map()
    let hasToolCall = false

    // 非 think 模式：从文本中剥离 <think> 标签
    let cleanSentLen = 0
    const stripThink = (raw: string): string => {
      let c = raw
      // 移除所有完整的 <think>...</think> 块
      c = c.replace(/<think>[\s\S]*?<\/think>/g, '')
      // 移除未闭合的 <think> 及之后的内容
      const openIdx = c.indexOf('<think>')
      if (openIdx !== -1) c = c.slice(0, openIdx)
      return c
    }

    const sendThinkLine = (line: string) => {
      const trimmed = line.trim()
      if (!trimmed) return
      res.write(`event: think\ndata: ${JSON.stringify({ line: trimmed })}\n\n`)
      thinkLinesSent++
    }

    const sendNewLines = (section: string, offset: number) => {
      const slice = section.slice(Math.max(0, thinkSentEnd - offset))
      if (!slice) return
      const lines = slice.split('\n')
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]!
        if (line.trim()) sendThinkLine(line.trim())
      }
      const sent = lines.slice(0, -1).join('\n')
      thinkSentEnd = offset + (sent ? sent.length + 1 : 0)
    }

    const flushThinkLines = () => {
      const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i)
      if (!thinkMatch || thinkMatch.index === undefined) {
        const openMatch = fullContent.match(/<think>/i)
        if (openMatch && openMatch.index !== undefined) {
          const thinkStart = openMatch.index + '<think>'.length
          const thinkSection = fullContent.slice(thinkStart)
          sendNewLines(thinkSection, thinkStart)
        }
        return
      }
      const thinkStart = thinkMatch.index + '<think>'.length
      const thinkSection = fullContent.slice(thinkStart, thinkMatch.index + thinkMatch[0].length - '</think>'.length)
      sendNewLines(thinkSection, thinkStart)
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (raw === '[DONE]') continue

        try {
          const chunk = JSON.parse(raw)
          const delta = chunk.choices?.[0]?.delta
          if (!delta) continue

          // 文本增量 → 流式输出给前端
          const contentDelta: string = delta.content || ''
          if (contentDelta) {
            fullContent += contentDelta
            if (thinkModeEnabled) {
              flushThinkLines()
              res.write(`event: text\ndata: ${JSON.stringify({ delta: contentDelta })}\n\n`)
            } else {
              // 非 think 模式：剥离 <think> 标签后发送
              const clean = stripThink(fullContent)
              if (clean.length > cleanSentLen) {
                const newPart = clean.slice(cleanSentLen)
                cleanSentLen = clean.length
                res.write(`event: text\ndata: ${JSON.stringify({ delta: newPart })}\n\n`)
              }
            }
          }

          // 工具调用增量 → 累积
          if (delta.tool_calls) {
            hasToolCall = true
            for (const tc of delta.tool_calls as Array<{
              index?: number
              id?: string
              function?: { name?: string; arguments?: string }
            }>) {
              const idx = tc.index ?? 0
              if (!toolCallsAcc.has(idx)) {
                toolCallsAcc.set(idx, { id: tc.id || '', name: '', arguments: '' })
              }
              const acc = toolCallsAcc.get(idx)!
              if (tc.id) acc.id = tc.id
              if (tc.function?.name) acc.name += tc.function.name
              if (tc.function?.arguments) acc.arguments += tc.function.arguments
            }
          }
        } catch { /* skip malformed chunk */ }
      }
    }

    // 发送最后残留的 think 行
    if (thinkModeEnabled) {
      {
        const thinkMatch = fullContent.match(/<think>([\s\S]*?)(<\/think>|$)/i)
        if (thinkMatch) {
          const lines = thinkMatch[1]!.split('\n')
          for (const line of lines) {
            if (line.trim()) sendThinkLine(line.trim())
          }
        }
      }
      thinkSentEnd = 0
      flushThinkLines()
      if (thinkLinesSent > 0) {
        res.write(`event: think-end\ndata: ok\n\n`)
      }
    }

    // 工具调用事件
    if (hasToolCall && toolCallsAcc.size > 0) {
      const tc = toolCallsAcc.get(0)
      if (tc && tc.name === 'publish_requirement') {
        try {
          const args = JSON.parse(tc.arguments)
          res.write(`event: tool_call\ndata: ${JSON.stringify({ name: tc.name, arguments: args })}\n\n`)
        } catch {
          res.write(`event: error\ndata: ${JSON.stringify({ message: '工具参数解析失败' })}\n\n`)
        }
      }
    }

    res.write(`event: done\ndata: ok\n\n`)
    res.end()
  } catch (e: any) {
    console.error('[AI] agent-demand-stream error:', e.message)
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' })
    }
    res.write(`event: error\ndata: ${JSON.stringify({ message: e.message })}\n\n`)
    res.end()
  }
});

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
  let clean = text.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
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
  "category": string | null,
  "scopePath": string[] | null,
  "serviceType": "ONLINE" | "OFFLINE" | null,
  "confidence": "high" | "medium" | "low",
  "missingInfo": string[],
  "summary": string,
  "suggestedKeywords": string[]
}

规则：
- summary 必须是可独立阅读的一句话需求摘要，包含服务类型+具体规格+预算+时间要求。禁止写"用户表示…""用户没有说明…"等元描述。
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

// POST /api/ai/discover-classify-stream — 多轮对话分类 + 需求计数
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

    const snapshot = taxonomySnapshot(3)
    const thinkModeEnabled = thinkMode === true

    // Think 模式用推理模型，非 Think 用极速模型；未配置则回退到默认模型
    const model = thinkModeEnabled
      ? (config.aiThinkModel || config.aiModel)
      : (config.aiFastModel || config.aiModel)

    const system = `你是九木平台的服务匹配助手。用户描述他们能提供什么服务/想接什么单，你将需求分类到平台分类树中。${thinkModeEnabled ? '' : '\n\n【重要】直接输出 JSON，不要使用 <think> 标签，不要进行冗长推理。'}

【分类树结构（前 3 层）】
${snapshot}

【你的任务】
分析用户输入，输出 JSON（纯 JSON，不要 markdown）：
{
  "understood": "一句自然语言 — 确认已理解的服务能力",
  "scopeLabels": ["线上服务", "游戏", "陪玩教学", "王者陪玩"],
  "childLabels": ["排位陪玩", "娱乐陪玩", "教学指导", "女陪玩"],
  "tags": ["高段位", "排位", "打野", "语音"],
  "refinePrompt": "一句自然追问 — 帮用户缩小范围",
  "serviceType": "ONLINE",
  "confidence": "high"
}

【分类维度（按优先级）】
1. 服务大类：线上/线下
2. 行业领域：游戏、设计、开发、教育、家政、维修等（参考上面的分类树）
3. 细分领域：具体游戏名、设计类型、开发语言等
4. 规格/层级：段位、平台、时长等

【scopeLabels 规则】
- 从分类树中选路径，用 label 而不是 id
- 从 "线上服务" 或 "线下到场" 开始（不要包含"全部"）
- 每层标签必须存在于分类树中（同层匹配）
- 最终层级应为你能确定的最细粒度节点

【childLabels 规则】
- 列出当前节点下的直接子节点标签（用于 UI 展示可点击的下钻选项）
- 如果当前已是叶子节点，返回空数组 []
- 最多返回 6 个

【tags 规则】
- tags 是描述需求特征的扁平标签，与分类树无关
- 从用户描述中提取关键属性词，如段位、方式、价格倾向、紧急程度等
- 随对话轮次累积：用户上一轮未提到的维度，本轮新增的标签要继续输出
- 最多返回 8 个
- 不要重复已有的冗余标签（如已有"王者荣耀"就不需要"MOBA"）

【refinePrompt 规则】
- 如果 confidence 是 "medium" 或 "low"，写出具体的追问（如"什么段位？""需要上门服务吗？"）
- 如果 confidence 是 "high" 且 childLabels 不为空，写出帮你细化的提示
- 如果 confidence 是 "high" 且 childLabels 为空（已到叶子），写 "范围已足够精准，可以加入手牌了"

【serviceType】
- "ONLINE" 表示线上服务
- "OFFLINE" 表示线下到场服务

【重要】
- 即使用户信息不全，也尽力映射到当前最可能的节点，通过追问来补全
- 禁止写"用户表示…""用户没有说明…"等元描述
- 禁止编造分类树中不存在的标签
- scopeLabels 和 childLabels 必须是分类树中真实存在的 label`;

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
    // 追踪已发送的 think 内容位置，避免重复发送
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
          const delta = chunk.choices?.[0]?.delta?.content || ''
          if (!delta) continue

          fullContent += delta
          if (thinkModeEnabled) flushThinkLines()
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
      res.write(
        `event: result\ndata: ${JSON.stringify({ understood: '无法理解，请换个方式描述', scopePath: [], matchCount: 0, refineOptions: [], preciseEnough: false })}\n\n`,
      )
      res.write(`event: done\ndata: ok\n\n`)
      res.end()
      return
    }

    const scopeLabels: string[] = aiData.scopeLabels || []
    const childLabels: string[] = aiData.childLabels || []
    const currentNodeId = findNodeByLabels(scopeLabels)

    let matchCount = 0
    const refineOptions: {
      label: string
      taxonomyNodeId: string
      scopePath: string[]
      count: number
    }[] = []

    if (currentNodeId) {
      const leafIds = getDescendantLeafIds(currentNodeId)
      if (leafIds.length > 0) {
        matchCount = await prisma.demand.count({
          where: {
            status: 'PENDING',
            taxonomyLeafId: { in: leafIds },
            isPublic: true,
          },
        })
      }

      for (const childLabel of childLabels) {
        const childNodes = getChildNodes(currentNodeId)
        const matched = childNodes.find((c) => c.label === childLabel)
        if (matched) {
          const childLeafIds = getDescendantLeafIds(matched.id)
          const childCount =
            childLeafIds.length > 0
              ? await prisma.demand.count({
                  where: {
                    status: 'PENDING',
                    taxonomyLeafId: { in: childLeafIds },
                    isPublic: true,
                  },
                })
              : 0
          const childPath = getAncestorPath(matched.id)
          refineOptions.push({
            label: childLabel,
            taxonomyNodeId: matched.id,
            scopePath: childPath.map((n) => n.label),
            count: childCount,
          })
        }
      }
    } else {
      const keyword = scopeLabels[scopeLabels.length - 1] || message
      matchCount = await prisma.demand.count({
        where: {
          status: 'PENDING',
          isPublic: true,
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
      })
    }

    const ancestorPath = currentNodeId
      ? getAncestorPath(currentNodeId)
      : []

    const currentPathLabels = ancestorPath.map((n) => n.label)
    const scopeNodeIds = ancestorPath.map((n) => n.id)

    const isLeaf = currentNodeId
      ? getDescendantLeafIds(currentNodeId).length <= 1
      : false

    const result = {
      understood: aiData.understood || '已理解你的需求',
      scopePath: ['全部', ...currentPathLabels],
      scopeNodeIds: ['root', ...scopeNodeIds],
      taxonomyNodeId: currentNodeId,
      matchCount,
      refineOptions,
      tags: (aiData.tags as string[]) || [],
      refinePrompt: aiData.refinePrompt || '',
      preciseEnough: isLeaf || refineOptions.length === 0 || matchCount <= 6,
      serviceType: aiData.serviceType || null,
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

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
import {
  chatCompletion,
  chatCompletionStream,
  agentStream,
  readSSEStream,
  parseJSON,
  extractThink,
} from '../services/ai/client.js';

export const aiRouter = Router();

// ── 辅助：发送错误并结束 SSE ──

function sseError(res: Response, message: string) {
  res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  res.end();
}

// ── 非流式端点 ──

// POST /api/ai/analyze-demand
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

    const { content, think } = await chatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    });

    const data = parseJSON(content);

    if (data && data.scopePath) {
      let path: string[] = [];
      if (Array.isArray(data.scopePath)) {
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

// POST /api/ai/discover
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

    const { content, think } = await chatCompletion({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    });

    const data = parseJSON(content);

    return res.json({ data, think });
  } catch (e: any) {
    console.error('[AI] discover error:', e.message);
    return res.status(500).json({ error: e.message || 'AI 服务异常' });
  }
});

// ── 流式端点 ──

// POST /api/ai/discover-stream
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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const fullContent = await chatCompletionStream({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
      onEvent(event, data) {
        res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
      },
    });

    const cleanContent = extractThink(fullContent).content;
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
    sseError(res, e.message);
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

    const t0 = Date.now()
    // ── 快速通道：本地分类器先行匹配，命中则跳过 AI 和远程分类 ──
    try {
      const { classifyForSearch } = await import('../classifier.js')
      const localMatch = classifyForSearch([message])
      if (localMatch.matchCount > 0 && localMatch.nodeIds.length > 0) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        const result = {
          keywords: localMatch.labels,
          hint: '',
          matchCount: localMatch.matchCount,
          classifiedLabels: localMatch.labels,
          classifyMethod: 'local' as const,
          classifiedNodeIds: localMatch.nodeIds,
        }

        res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`)
        res.write('event: done\ndata: ok\n\n')
        res.end()
        console.log(`[discover] 快速通道命中 → "${message}" → ${localMatch.labels.join(',')} (${Date.now() - t0}ms)`)
        return
      }
      console.log(`[discover] 快速通道未命中 → "${message}" → 直接关键词搜索 (${Date.now() - t0}ms)`)
    } catch (e: any) {
      console.warn('[discover] 快速通道异常:', e.message || e)
    }

    // 快速通道未命中 → 直接用原始输入当关键词，不走 AI
    {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      const result = {
        keywords: [message],
        hint: '',
        classifiedLabels: [],
        classifyMethod: 'direct' as const,
        classifiedNodeIds: [],
      }

      res.write(`event: result\ndata: ${JSON.stringify(result)}\n\n`)
      res.write('event: done\ndata: ok\n\n')
      res.end()
      console.log(`[discover] 直接搜索完成 → "${message}" (总耗时 ${Date.now() - t0}ms)`)
      return
    }
  } catch (e: any) {
    console.error('[AI] discover-classify-stream error:', e.message)
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' })
    }
    sseError(res, e.message)
  }
});

let _analyzeCount = 0

// POST /api/ai/analyze-demand-stream — 多轮需求分析 + Think 模式流式
aiRouter.post('/analyze-demand-stream', async (req: Request, res: Response) => {
  const reqId = ++_analyzeCount
  console.log(`[analyze-demand-stream #${reqId}] 收到请求`, new Date().toISOString())
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
"title": "5-10字的简短标题，提炼需求的核心动作",
  "summary": "一句完整的需求摘要，融合已确认信息+本轮新增信息",
  "scopeLabels": ["线上服务", "游戏", "陪玩教学"],
  "serviceType": "ONLINE",
  "confidence": "high",
	"budget": "50",
	"category": "跑腿/代买",
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
- title 必须是5-10字以内的极短标题，仅包含需求的核心动作（如"代买酒""王者代打""修水管"），不要包含预算、时间、地址等细节
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

    const aiRes = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.1,
        stream: true,
        messages,
        ...(thinkModeEnabled ? { thinking: { type: 'enabled' } } : {}),
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '')
      sseError(res, `AI API ${aiRes.status}: ${errText}`)
      return
    }

    const reader = aiRes.body?.getReader()
    if (!reader) {
      sseError(res, '无法读取 AI 流')
      return
    }

    let fullContent = ''
    let thinkLinesSent = 0

    await readSSEStream(reader, {
      onTextDelta: (delta) => {
        fullContent += delta
      },
      onThinkLine: (line) => {
        thinkLinesSent++
        res.write(`event: think\ndata: ${JSON.stringify({ line })}\n\n`)
      },
      onReasoningLine: (line) => {
        thinkLinesSent++
        res.write(`event: think\ndata: ${JSON.stringify({ line })}\n\n`)
      },
    })

    if (thinkLinesSent > 0) {
      res.write(`event: think-end\ndata: ok\n\n`)
    }

    const cleanContent = extractThink(fullContent).content
    const aiData = parseJSON(cleanContent)

    if (!aiData) {
      res.write(`event: result\ndata: ${JSON.stringify({ summary: '无法理解，请换个方式描述', readyToPublish: false })}\n\n`)
      res.write(`event: done\ndata: ok\n\n`)
      res.end()
      return
    }

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

    console.log(`[analyze-demand-stream #${reqId}] 返回结果, title:`, aiData.title)
    res.write(`event: result\ndata: ${JSON.stringify(aiData)}\n\n`)
    res.write(`event: done\ndata: ok\n\n`)
    res.end()
  } catch (e: any) {
    console.error('[AI] analyze-demand-stream error:', e.message)
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' })
    }
    sseError(res, e.message)
  }
});

// POST /api/ai/agent-demand-stream — Agentic 需求收集 · 流式 + Function Calling
aiRouter.post('/agent-demand-stream', async (req: Request, res: Response) => {
  try {
    const { messages, thinkMode } = req.body as {
      messages?: { role: string; content: string; reasoning_content?: string }[]
      thinkMode?: boolean
    }
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '请提供对话历史' })
    }

    const thinkModeEnabled = thinkMode === true
    const model = thinkModeEnabled
      ? (config.aiThinkModel || config.aiModel)
      : (config.aiFastModel || config.aiModel)

    const SYSTEM_PROMPT = `你是九木平台的智能助手。用户可能在闲聊，也可能在描述服务需求，你需要灵活应对。

工作方式：
1. 如果用户只是在聊天（闲聊、问问题、分享心情等），就自然地陪聊，不要强行把话题转到需求上。但心里要记住用户说的信息（兴趣、偏好、状态等），这些是宝贵的上下文。
2. 如果用户聊着聊着开始提自己的需求（哪怕是从闲聊中转过来的），要结合之前的聊天内容来理解 TA。比如用户之前说困了、无聊、想玩游戏，这些信息都有助于分析 TA 真正想要什么服务。
3. 只有当用户主动提到想发布需求、且信息确实完整时，才调用 publish_requirement 函数
4. 保持对话自然友好，不要像客服机器人一样机械追问

关键原则：
- 始终使用简体中文回复，禁止使用繁体字
- 回答要简短直接，不要绕弯子，不要废话
- 用户聊什么你就回什么，不要每条回复都试图推销需求发布功能
- 聊天中的信息是有价值的：用户的情绪、兴趣、时间、预算暗示等，都可以作为理解需求的线索
- 必要信息包括：服务类型（线上/线下）、具体内容、预算范围、时间要求
- 永远不要在信息不完整时调用发布函数
- 用户简短回复要结合对话历史来理解
- 忠实保留用户说的数值和单位
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

    const chatMessages: { role: string; content: string; reasoning_content?: string }[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.reasoning_content ? { reasoning_content: m.reasoning_content } : {}),
      })),
    ]

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    // 使用 agentStream 处理流式 + 工具调用
    await agentStream({
      messages: chatMessages as { role: 'user' | 'system' | 'assistant'; content: string }[],
      model,
      maxTokens: 1024,
      thinking: thinkModeEnabled,
      tools: [
        {
          name: 'publish_requirement',
          description: PUBLISH_TOOL.function.description,
          parameters: PUBLISH_TOOL.function.parameters as Record<string, unknown>,
        },
      ],
      onEvent(event, data) {
        res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
      },
      onToolCall(name, args) {
        if (name === 'publish_requirement') {
          res.write(`event: tool_call\ndata: ${JSON.stringify({ name, arguments: args })}\n\n`)
        }
      },
    })

    res.write(`event: done\ndata: ok\n\n`)
    res.end()
  } catch (e: any) {
    console.error('[AI] agent-demand-stream error:', e.message)
    if (!res.headersSent) {
      return res.status(500).json({ error: e.message || 'AI 服务异常' })
    }
    sseError(res, e.message)
  }
});

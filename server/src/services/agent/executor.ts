import { config, resolveLlmCredentials } from '../../config.js';
import { readSSEStream } from '../ai/client.js';
import { toolRegistry, type ToolContext } from './tool-registry.js';
import { loadAllSkills, buildSkillPrompt } from './skill-loader.js';
import { buildKnowledgeIndex } from './knowledge-loader.js';
import { addMessage, truncateTitle } from './conversation.js';
import type { ToolResult } from './tool-registry.js';
import {
  normalizeAccessMode,
  canUseWebSearch,
  type AgentAccessMode,
} from './access-mode.js';
import {
  filterToolsForAccessMode,
  type StoredToolCall,
} from './tool-narration.js';
import { inferFollowUpTools } from './follow-up-tools.js';
import { processToolInvocations } from './tool-runner.js';
import { matchForbidden } from './capability-matcher.js';

// ─── 工具调用限流 ──────────────────────────────────────────────────────────
// 同一会话内，单次用户消息最多触发 MAX_TOOL_CALLS 次工具调用
const MAX_TOOL_CALLS = 8;
// 连续工具调用链最大深度（防止工具调用无限循环）
const MAX_CHAIN_DEPTH = 3;

/** Agent 执行参数 */
export interface AgentExecuteParams {
  userId: string;
  conversationId: string;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  thinking?: boolean;
  webSearch?: boolean;
  model?: string;
  context?: Record<string, unknown>;
  accessMode?: AgentAccessMode;
}

/** SSE 事件发送器 */
export type EventSender = (event: string, data: unknown) => void;

/** 流式过滤 MiniMax 自带的 <think> 标签（跨 delta 安全） */
function createThinkStripper() {
  let inside = false
  let buf = ''
  return {
    feed(chunk: string): string | null {
      let out = ''
      for (const ch of chunk) {
        buf += ch
        if (!inside && buf.endsWith('<think>')) {
          inside = true
          buf = ''
          continue
        }
        if (inside && buf.endsWith('</think>')) {
          inside = false
          buf = ''
          continue
        }
        if (!inside && buf.length >= 7) {
          const idx = buf.indexOf('<think>')
          if (idx >= 0) {
            out += buf.slice(0, idx)
            buf = buf.slice(idx)
            inside = true
            buf = buf.replace('<think>', '')
          } else {
            out += buf.slice(0, -7)
            buf = buf.slice(-7)
          }
        }
      }
      return out || null
    },
    flush(): string | null {
      if (inside) return null
      const result = buf.replace(/<think>.*?<\/think>/gs, '')
      buf = ''
      return result || null
    },
  }
}

/** 构建系统提示 */
function buildSystemPrompt(
  ctx: ToolContext,
  options: {
    useTools: boolean;
    accessMode: AgentAccessMode;
    context?: Record<string, unknown>;
  },
): string {
  let prompt = '你是九木平台的智能助手。你可以和用户闲聊、解答问题，也可以在用户需要时帮助发布需求或搜索服务。';

  prompt += `

【平台数据权限 — 默认开放】
- 你拥有九木平台所有「可公开」数据的读取权限：公开需求详情、标签、用户公开资料、知识库、本人订单/需求/申请等
- 服务者找需求、需求者找服务是平台核心场景：应主动调用 search_demands、get_demand_detail 等工具拉取真实数据，不要凭空猜测
- 可串联多个只读工具：搜索 → 查看详情 → 跳转页面 → 文字总结

【页面跳转】
- 用户说「去/打开/跳转 XX 页面」时，调用 navigate_to 工具；跳转前用一句话说明目的
- 查完数据后若用户需要亲自操作，可建议跳转到对应页面

【操作过程展示】
- 每次调用工具前后，用简短中文说明正在做什么、得到了什么（系统也会展示步骤卡片）
- 多步任务按顺序说明：先搜、再看、再跳转或再执行`;

  if (options.context?.page === 'demand-create') {
    prompt += ' 用户当前在"发布需求"页面。如果用户明确想发布需求，帮 TA 分析整理；如果用户只是随便聊聊，就正常聊天，但心里记住聊天中透露的信息（兴趣、偏好、状态等），后续如果 TA 转向需求讨论时，可以结合之前的聊天内容来更好地理解 TA。';
  }
  if (options.context?.page === 'discover') {
    prompt += ' 用户当前在"发现服务者"页面，你可以帮 TA 筛选和搜索合适的服务。';
  }

  prompt += `\n\n要求：
- 使用简体中文，语气自然友好
- 回答简短直接，不要绕弯子、不要说废话
- 用户聊什么就回什么，不要强行把话题转到发布需求上
- 只有当用户明确表达想找人/找服务/发需求时，才引导填写表单
- 如果有不确定的地方，向用户追问确认`;

  if (options.accessMode === 'readonly') {
    prompt += `

【只读建议模式】
- 可调用所有查询/搜索/跳转类工具，读取平台公开数据并 navigate_to 跳转
- 不可执行发布、修改、下架、申请、接受/拒绝等写操作；若用户需要，给出清晰步骤并提示切换到「请求批准」或「完全访问」
- 不要声称已替用户完成写操作`;
  } else if (options.accessMode === 'approval') {
    prompt += `

【请求批准模式 — 默认】
- 所有只读/查询/跳转工具可直接调用，用于获取公开数据与页面导航
- 写操作（发布/修改/下架/申请/接受/拒绝）会弹出批准卡片，批准前不要声称已完成
- 不使用联网搜索（平台内数据已足够）`;
  } else {
    prompt += `

【完全访问模式】
- 写操作可直接执行；必要时可使用联网搜索补充站外信息
- 仍应对每一步操作给出简短文字说明`;
  }

  if (options.useTools) {
    prompt += `
你可以调用工具来完成操作，但请严格遵循以下优先级规则：

【工具选择规则 — 严格按优先级判断】

规则 1：用户问"怎么做""是什么""有什么功能" → 优先调用 read_knowledge 查知识库。
   示例："怎么发布需求"、"认证有什么用"、"什么是卡池" → read_knowledge

规则 2：用户说"帮我做/我要/我想"执行操作 → 优先调用对应写工具。
   示例："帮我发一个王者代打需求" → create_demand
   示例："帮我下架那个需求" → withdraw_demand
   示例："接受张三的申请" → accept_applicant

规则 3：用户说"帮我看看/搜一下"浏览数据 → 优先调用只读工具。
   示例："看看我的需求" → list_my_demands
   示例："搜一下王者荣耀" → search_demands
   示例："看看谁申请了" → list_applicants

规则 4：用户问平台信息（"这是什么平台""九木有什么功能"）→ 用知识库或直接回答，不调工具。

【执行规则】
- 只读工具（search, list, get, read）：可直接调用，无需先问用户
- 写操作工具（create, update, withdraw, apply, accept, reject）：必须先向用户解释清楚要做什么、影响什么，确认后再调用
- 多工具可串联：用户说"搜PPT需求并打开第一个" → 先 search_demands，再 navigate_to path=/demands/{第一个id}（必须实际调用跳转工具，不要只在文字里说已打开）
- 用户明确要求「打开/跳转/查看详情」时，必须调用 navigate_to 或 get_demand_detail，禁止只口头描述
- 一次说清所有操作：如果需要执行多个步骤，一次性列出计划让用户确认，不要来回确认
- 工具调用失败时，根据错误信息引导用户修正，不要直接放弃`;
  }

  // 注入技能提示
  const skills = loadAllSkills();
  if (skills.length > 0) {
    prompt += buildSkillPrompt(skills);
  }

  // 注入知识库（仅索引，完整内容通过 read_knowledge 工具按需检索）
  prompt += buildKnowledgeIndex();

  return prompt;
}

/** 构建消息列表 */
function buildMessages(
  systemPrompt: string,
  message: string,
  history?: { role: 'user' | 'assistant'; content: string }[],
): { role: string; content: string }[] {
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (history && history.length > 0) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.content });
    }
  }

  messages.push({ role: 'user', content: message });
  return messages;
}

/** 执行 Agent 流式对话 */
export async function executeAgent(
  params: AgentExecuteParams,
  send: EventSender,
): Promise<void> {
  const {
    userId,
    conversationId,
    message,
    history,
    thinking = false,
    webSearch = false,
    model,
    accessMode: accessModeInput,
  } = params;

  const accessMode = normalizeAccessMode(accessModeInput);
  const availableTools = toolRegistry.listAll();
  const toolFilter = filterToolsForAccessMode(accessMode);
  const enabledTools = availableTools.filter(toolFilter);
  const useTools = enabledTools.length > 0;
  const useWebSearch = canUseWebSearch(accessMode) && webSearch !== false;

  // 系统提示
  const systemPrompt = buildSystemPrompt(
    { userId, conversationId },
    { useTools, accessMode, context: params.context },
  );

  const messages = buildMessages(systemPrompt, message, history);

  try {
    // L2 拦截：禁区信号 → SSE forbidden + 提前结束，不调用 LLM
    const forbiddenHit = matchForbidden(message);
    if (forbiddenHit) {
      await addMessage({
        conversationId,
        role: 'user',
        content: message,
      });
      await truncateTitle(conversationId, message);
      send('forbidden', {
        id: forbiddenHit.entry.id,
        matchedSignal: forbiddenHit.matchedSignal,
        message: forbiddenHit.entry.message,
        redirect: forbiddenHit.entry.redirect,
        redirectPattern: forbiddenHit.entry.redirect_pattern,
        fallbackPage: forbiddenHit.entry.fallback_page,
      });
      await addMessage({
        conversationId,
        role: 'assistant',
        content: forbiddenHit.entry.message,
      });
      send('done', 'ok');
      return;
    }

    // 保存用户消息
    await addMessage({
      conversationId,
      role: 'user',
      content: message,
    });
    await truncateTitle(conversationId, message);

    // 构建请求体
    const selectedModel = model || config.aiModel
    const body: Record<string, unknown> = {
      model: selectedModel,
      max_tokens: 4096,
      temperature: 0.1,
      stream: true,
      messages,
    };

    const { baseUrl: apiBaseUrl, apiKey } = resolveLlmCredentials(selectedModel)
    const isDeepSeek = selectedModel.startsWith('deepseek')

    if (thinking) {
      // DeepSeek V4+ 用 thinking_mode，旧模型用 thinking
      if (selectedModel.startsWith('deepseek-v4')) {
        body.thinking_mode = 'thinking'
      } else {
        body.thinking = { type: 'enabled' }
      }
    } else if (selectedModel.startsWith('deepseek-v4')) {
      // DeepSeek V4 默认开启思考，关闭时必须显式指定 non-thinking
      body.thinking_mode = 'non-thinking'
    }

    if (useWebSearch) {
      body.web_search = isDeepSeek ? { enable: true } : true
    }

    if (useTools) {
      body.tools = toolRegistry.toOpenAITools(toolFilter);
      body.tool_choice = 'auto';
    }

    // 流式调用
    const aiRes = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      send('error', { message: `AI API ${aiRes.status}: ${errText}` });
      return;
    }

    const reader = aiRes.body?.getReader();
    if (!reader) {
      send('error', { message: '无法读取 AI 流' });
      return;
    }

    // 工具调用累积
    const toolCallsMap = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();

    // 非思考模式下：过滤 MiniMax 自带的 <think> 标签
    const thinkStripper = thinking ? null : createThinkStripper()

    // 使用共享 SSE 流读取器
    const { fullContent, reasoningContent, thinkLinesSent } = await readSSEStream(
      reader,
      {
        onTextDelta: (delta) => {
          if (thinkStripper) {
            const cleaned = thinkStripper.feed(delta)
            if (cleaned) send('text', { delta: cleaned })
          } else {
            send('text', { delta })
          }
        },
        onThinkLine: thinking ? (line) => {
          send('think', { line });
        } : undefined,
        onReasoningLine: thinking ? (line) => {
          send('think', { line });
        } : undefined,
        onToolCallDelta: (deltas) => {
          for (const tc of deltas) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap.has(idx)) {
              toolCallsMap.set(idx, { id: tc.id || '', name: '', arguments: '' });
            }
            const acc = toolCallsMap.get(idx)!;
            if (tc.id) acc.id = tc.id;
            if (tc.function?.name) acc.name += tc.function.name;
            if (tc.function?.arguments) acc.arguments += tc.function.arguments;
          }
        },
      },
    );

    if (thinkLinesSent > 0) {
      send('think-end', 'ok');
    }

    // 限流：截断超过上限的工具调用
    const allToolCalls = Array.from(toolCallsMap.values()).filter((tc) => tc.name);
    const exceeded = allToolCalls.length > MAX_TOOL_CALLS;
    const limitedToolCalls = allToolCalls.slice(0, MAX_TOOL_CALLS);

    // 批量处理工具调用
    const initialInvocations = limitedToolCalls.map((tc) => {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments); } catch { /* use empty */ }
      return { name: tc.name, arguments: args };
    });

    const toolCtx = { userId, conversationId, accessMode, send };
    let { storedCalls, toolResults, executed } = await processToolInvocations(
      initialInvocations,
      toolCtx,
    );

    // 意图跟进：如「搜索并打开第一个」在只搜完后自动跳转
    const followUps = inferFollowUpTools(message, executed);
    if (followUps.length > 0) {
      const extra = await processToolInvocations(followUps, toolCtx);
      storedCalls = [...storedCalls, ...extra.storedCalls];
      toolResults = [...toolResults, ...extra.toolResults];
      executed = [...executed, ...extra.executed];
    }

    // 如果工具调用数超过限制，追加一条说明
    if (exceeded) {
      send('text', {
        delta: `\n\n（提示：一次执行的操作较多，已自动限制为前 ${MAX_TOOL_CALLS} 项。如有需要可以分多次告诉我。）`,
      });
    }

    // 如果有非 pending 的工具结果，做一次批量总结
    const summarizable = toolResults.filter(
      (r) => !(r.data && typeof r.data === 'object' && (r.data as { pending?: boolean }).pending),
    );
    if (summarizable.length > 0) {
      await continueWithToolResults(
        messages,
        summarizable,
        conversationId,
        model,
        thinking,
        send,
      );
    }

    // 非思考模式下冲洗残留缓冲 + 清理 fullContent
    const flushed = thinkStripper?.flush()
    if (flushed) send('text', { delta: flushed })

    const cleanedContent = thinking ? fullContent : fullContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    // 保存 assistant 消息（含工具步骤与 pending 状态）
    await addMessage({
      conversationId,
      role: 'assistant',
      content: cleanedContent,
      thinking: reasoningContent || undefined,
      toolCalls:
        storedCalls.length > 0
          ? storedCalls.map((c) => ({
              id: c.id,
              name: c.name,
              arguments: c.arguments,
              status: c.status,
              steps: c.steps,
              result: c.result,
              data: c.data,
              success: c.success,
            }))
          : undefined,
    });

    send('done', 'ok');
  } catch (e: any) {
    console.error('[Agent] executor error:', e.message);
    send('error', { message: e.message || 'Agent 执行异常' });
  }
}

/** 工具执行后一次性总结所有结果（单次 AI 调用） */
async function continueWithToolResults(
  messages: { role: string; content: string }[],
  toolResults: ToolResult[],
  conversationId: string,
  model?: string,
  thinking?: boolean,
  send?: EventSender,
): Promise<void> {
  // 添加工具调用和结果到消息列表
  messages.push({
    role: 'assistant',
    content: `[工具调用] ${toolResults.map((t) => t.message).join(' ')}`,
  });

  for (const tr of toolResults) {
    messages.push({
      role: 'tool',
      content: JSON.stringify({
        success: tr.success,
        data: tr.data,
        error: tr.error,
        message: tr.message,
      }),
    });
  }

  messages.push({
    role: 'user',
    content:
      '请根据以上工具执行结果，用自然语言向用户总结发生了什么。若已跳转页面则说明正在打开；若未能完成跳转不要声称已打开。保持简洁友好，使用简体中文。',
  });

  const selectedModel = model || config.aiModel
  const { baseUrl: apiBaseUrl, apiKey } = resolveLlmCredentials(selectedModel)

  const body: Record<string, unknown> = {
    model: selectedModel,
    max_tokens: 1024,
    temperature: 0.1,
    stream: true,
    messages,
  };

  if (thinking) {
    if (selectedModel.startsWith('deepseek-v4')) {
      body.thinking_mode = 'thinking'
    } else {
      body.thinking = { type: 'enabled' }
    }
  } else if (selectedModel.startsWith('deepseek-v4')) {
    body.thinking_mode = 'non-thinking'
  }

  try {
    const aiRes = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!aiRes.ok) {
      send?.('error', { message: `总结调用失败: ${aiRes.status}` });
      return;
    }

    const reader = aiRes.body?.getReader();
    if (!reader) return;

    let summaryContent = '';

    await readSSEStream(reader, {
      onTextDelta: (delta) => {
        summaryContent += delta;
        send?.('text', { delta });
      },
      onThinkLine: (line) => {
        send?.('think', { line });
      },
      onReasoningLine: (line) => {
        send?.('think', { line });
      },
    });

    // 保存总结消息
    await addMessage({
      conversationId,
      role: 'assistant',
      content: summaryContent,
    });
  } catch (e: any) {
    console.error('[Agent] continueWithToolResults error:', e.message);
    send?.('error', { message: '工具结果总结失败' });
  }
}

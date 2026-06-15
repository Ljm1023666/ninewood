import { config, resolveLlmCredentials } from '../../config.js';
import { readSSEStream } from '../ai/client.js';
import { toolRegistry, type ToolContext } from './tool-registry.js';
import { loadAllSkills, buildSkillPrompt } from './skill-loader.js';
import { buildKnowledgeIndex } from './knowledge-loader.js';
import { addMessage, truncateTitle } from './conversation.js';
import type { ToolResult } from './tool-registry.js';
import {
  normalizeAccessMode,
  type AgentAccessMode,
} from './access-mode.js';

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
  let prompt = '你是九木平台的智能助手。你可以和用户闲聊、解答问题，也可以在用户需要时帮助发布需求或搜索服务。当用户表达"去/跳转/打开某个页面"的意图时，调用 navigate_to 工具帮 TA 跳转。';

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
- 你不能调用任何工具，也不能声称已替用户执行操作
- 仅提供分析、步骤说明与操作建议
- 如需实际执行，提示用户切换到「请求批准」或「完全访问」`;
  } else if (options.accessMode === 'approval') {
    prompt += `

【请求批准模式】
- 查询、搜索、跳转等只读工具可直接调用
- 发布/修改/下架/申请/接受/拒绝等写操作会提交给用户批准，批准前不要声称已完成
- 不要使用联网搜索`;
  } else {
    prompt += `

【完全访问模式】
- 你已获授权直接调用工具完成操作（含写操作）
- 必要时可使用联网搜索补充信息`;
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
- 多工具可串联：用户说"搜王者荣耀需求，然后看第一个的详情" → 先 search_demands，再用第一个结果的 id 调 get_demand_detail
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
  const useTools = accessMode !== 'readonly' && availableTools.length > 0;
  const useWebSearch = accessMode === 'full' && webSearch !== false;

  // 系统提示
  const systemPrompt = buildSystemPrompt(
    { userId, conversationId },
    { useTools, accessMode, context: params.context },
  );

  const messages = buildMessages(systemPrompt, message, history);

  try {
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
      body.tools = toolRegistry.toOpenAITools();
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
    const toolResults: ToolResult[] = [];
    for (const tc of limitedToolCalls) {
      if (!tc.name) continue;

      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments); } catch { /* use empty */ }

      send('tool_call', { name: tc.name, arguments: args });

      const needsApproval =
        accessMode === 'approval' && toolRegistry.requiresConfirmation(tc.name);

      if (needsApproval) {
        const pendingMessage = `操作「${tc.name}」已提交批准，等待用户确认后再执行。`;
        send('tool_pending', {
          name: tc.name,
          arguments: args,
          message: pendingMessage,
        });
        toolResults.push({
          success: false,
          message: pendingMessage,
          data: { pending: true, name: tc.name, arguments: args },
        });
        send('tool_result', {
          name: tc.name,
          success: false,
          data: { pending: true, arguments: args },
          message: pendingMessage,
        });
        continue;
      }

      const result = await toolRegistry.execute(tc.name, args, {
        userId,
        conversationId,
      });

      toolResults.push(result);

      send('tool_result', {
        name: tc.name,
        success: result.success,
        data: result.data,
        error: result.error,
        message: result.message,
      });
    }

    // 如果工具调用数超过限制，追加一条说明
    if (exceeded) {
      send('text', {
        delta: `\n\n（提示：一次执行的操作较多，已自动限制为前 ${MAX_TOOL_CALLS} 项。如有需要可以分多次告诉我。）`,
      });
    }

    // 如果有工具调用结果，做一次批量总结
    if (toolResults.length > 0) {
      await continueWithToolResults(
        messages,
        toolResults,
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

    // 保存 assistant 消息
    await addMessage({
      conversationId,
      role: 'assistant',
      content: cleanedContent,
      thinking: reasoningContent || undefined,
      toolCalls:
        toolResults.length > 0
          ? toolResults.map((r, i) => {
              const tc = Array.from(toolCallsMap.values())[i];
              return {
                name: tc?.name || 'unknown',
                arguments: tc ? safeParseArgs(tc.arguments) : {},
                result: r.message,
                data: r.data,
              };
            })
          : undefined,
    });

    send('done', 'ok');
  } catch (e: any) {
    console.error('[Agent] executor error:', e.message);
    send('error', { message: e.message || 'Agent 执行异常' });
  }
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
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
    content: '请根据以上工具执行结果，用自然语言向用户总结发生了什么。保持简洁友好，使用简体中文。',
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

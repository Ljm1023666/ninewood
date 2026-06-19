import { config } from '../../config.js';
import { readSSEStream } from '../ai/client.js';
import { toolRegistry, type ToolContext } from './tool-registry.js';
import { loadAllSkills, buildSkillPrompt } from './skill-loader.js';
import { addMessage, truncateTitle } from './conversation.js';
import type { ToolResult } from './tool-registry.js';

/** Agent 执行参数 */
export interface AgentExecuteParams {
  userId: string;
  conversationId: string;
  message: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  thinking?: boolean;
  model?: string;
  context?: Record<string, unknown>;
}

/** SSE 事件发送器 */
export type EventSender = (event: string, data: unknown) => void;

/** 构建系统提示 */
function buildSystemPrompt(
  ctx: ToolContext,
  options: {
    useTools: boolean;
    context?: Record<string, unknown>;
  },
): string {
  let prompt = '你是九木平台的智能助手。你可以和用户闲聊、解答问题，也可以在用户需要时帮助发布需求或搜索服务。';

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

  if (options.useTools) {
    prompt += '\n- 你可以调用工具来完成操作，工具调用前先向用户解释你要做什么';
  }

  // 注入技能提示
  const skills = loadAllSkills();
  if (skills.length > 0) {
    prompt += buildSkillPrompt(skills);
  }

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
    model,
  } = params;

  // 获取可用工具
  const availableTools = toolRegistry.listAll();
  const useTools = availableTools.length > 0;

  // 系统提示
  const systemPrompt = buildSystemPrompt(
    { userId, conversationId },
    { useTools, context: params.context },
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
    const body: Record<string, unknown> = {
      model: model || config.aiModel,
      max_tokens: 4096,
      temperature: 0.1,
      stream: true,
      messages,
    };

    if (thinking) {
      body.thinking = { type: 'enabled' };
    }

    if (useTools) {
      body.tools = toolRegistry.toOpenAITools();
      body.tool_choice = 'auto';
    }

    // 流式调用
    const aiRes = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.aiApiKey}`,
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

    // 使用共享 SSE 流读取器
    const { fullContent, reasoningContent, thinkLinesSent } = await readSSEStream(
      reader,
      {
        onTextDelta: (delta) => {
          send('text', { delta });
        },
        onThinkLine: (line) => {
          send('think', { line });
        },
        onReasoningLine: (line) => {
          send('think', { line });
        },
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

    // 批量处理工具调用
    const toolResults: ToolResult[] = [];
    for (const [, tc] of toolCallsMap) {
      if (!tc.name) continue;

      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments); } catch { /* use empty */ }

      send('tool_call', { name: tc.name, arguments: args });

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

    // 保存 assistant 消息
    await addMessage({
      conversationId,
      role: 'assistant',
      content: fullContent,
      thinking: reasoningContent || undefined,
      toolCalls:
        toolResults.length > 0
          ? toolResults.map((r, i) => {
              const tc = Array.from(toolCallsMap.values())[i];
              return {
                name: tc?.name || 'unknown',
                arguments: tc ? safeParseArgs(tc.arguments) : {},
                result: r.data,
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

  const body: Record<string, unknown> = {
    model: model || config.aiModel,
    max_tokens: 1024,
    temperature: 0.1,
    stream: true,
    messages,
  };

  if (thinking) {
    body.thinking = { type: 'enabled' };
  }

  try {
    const aiRes = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.aiApiKey}`,
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

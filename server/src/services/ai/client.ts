import { config } from '../../config.js';
import type {
  ChatCompletionParams,
  ChatCompletionResult,
  ChatCompletionStreamParams,
  AgentStreamParams,
  ToolDefinition,
} from './types.js';

// ── 构建 MiniMax 请求体 ──

function buildBody(params: ChatCompletionParams, stream: boolean) {
  const body: Record<string, unknown> = {
    model: params.model || config.aiModel,
    max_tokens: params.maxTokens ?? 1024,
    temperature: params.temperature ?? 0.1,
    stream,
    messages: params.messages,
  };

  if (params.thinking) {
    body.thinking = { type: 'enabled' };
  }

  if (params.webSearch) {
    body.web_search = { enable: true };
  }

  return body;
}

// ── 工具函数 ──

/** 从 AI 响应中提取 <think> 标签内的思考内容 */
export function extractThink(fullContent: string): { think?: string; content: string } {
  const thinkMatch = fullContent.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    return {
      think: thinkMatch[1].trim(),
      content: fullContent.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim(),
    };
  }
  return { content: fullContent };
}

/** 提取 JSON（去掉 markdown 包裹） */
export function parseJSON(text: string) {
  const trimmed = text.trim();

  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1]!.trim()); } catch { /* continue */ }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)); } catch { /* continue */ }
  }

  try { return JSON.parse(trimmed); } catch { return null; }
}

// ── 共享 SSE 流处理器 ──

/** MiniMax <think> 标签逐行提取器状态 */
interface ThinkExtractor {
  fullContent: string
  sentEnd: number
  linesSent: number
}

function createThinkExtractor(): ThinkExtractor {
  return { fullContent: '', sentEnd: 0, linesSent: 0 };
}

/** 从累积内容中提取新的 <think> 行并发送 */
function flushThinkLines(ext: ThinkExtractor, sendLine: (line: string) => void) {
  const thinkMatch = ext.fullContent.match(/<think>([\s\S]*?)<\/think>/i);
  const start: number = thinkMatch?.index !== undefined
    ? thinkMatch.index + '<think>'.length
    : (() => {
        const om = ext.fullContent.match(/<think>/i);
        if (om?.index !== undefined) return om.index + '<think>'.length;
        return -1;
      })();

  if (start === -1) return;
  const end = thinkMatch?.index !== undefined
    ? thinkMatch.index + thinkMatch[0].length - '</think>'.length
    : ext.fullContent.length;

  const section = ext.fullContent.slice(start, end);
  const slice = section.slice(Math.max(0, ext.sentEnd - start));
  if (!slice) return;

  const lines = slice.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i]!.trim()) {
      sendLine(lines[i]!.trim());
      ext.linesSent++;
    }
  }
  const sent = lines.slice(0, -1).join('\n');
  ext.sentEnd = start + (sent ? sent.length + 1 : 0);
}

/** 发送 <think> 区域中可能残留的行 */
function flushThinkRemaining(ext: ThinkExtractor, sendLine: (line: string) => void) {
  const thinkMatch = ext.fullContent.match(/<think>([\s\S]*?)(<\/think>|$)/i);
  if (thinkMatch) {
    for (const line of thinkMatch[1]!.split('\n')) {
      if (line.trim()) {
        sendLine(line.trim());
        ext.linesSent++;
      }
    }
  }
  ext.sentEnd = 0;
  flushThinkLines(ext, sendLine);
}

export interface SSEStreamHandlers {
  /** 文本增量 */
  onTextDelta?: (delta: string) => void
  /** <think> 标签内逐行思考（MiniMax 旧 API） */
  onThinkLine?: (line: string) => void
  /** reasoning_content 字段（MiniMax 新 API 思考模式） */
  onReasoningLine?: (line: string) => void
  /** 工具调用增量 */
  onToolCallDelta?: (deltas: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }>) => void
  /** 流结束 */
  onDone?: (fullContent: string, reasoningContent: string) => void
}

/**
 * 共享 SSE 流式读取器。
 * 所有流式端点复用这一份实现，消除重复的 buffer/parse/delta 逻辑。
 */
export async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: SSEStreamHandlers,
): Promise<{ fullContent: string; reasoningContent: string; thinkLinesSent: number }> {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let reasoningContent = '';
  const thinkExt = createThinkExtractor();

  const sendThinkLine = (line: string) => {
    handlers.onThinkLine?.(line);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;

      try {
        const chunk = JSON.parse(raw);
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        // reasoning_content（MiniMax 思考模式）→ 逐行发送
        const reasoning: string = (delta as any).reasoning_content || '';
        if (reasoning) {
          reasoningContent += reasoning;
          for (const rl of reasoning.split('\n')) {
            if (rl.trim()) handlers.onReasoningLine?.(rl.trim());
          }
        }

        // 文本增量
        const textDelta: string = delta.content || '';
        if (textDelta) {
          fullContent += textDelta;
          handlers.onTextDelta?.(textDelta);
          // 从内容中提取 <think> 标签（MiniMax 旧 API 兼容）
          flushThinkLines(thinkExt, sendThinkLine);
        }

        // 工具调用增量
        if (delta.tool_calls) {
          handlers.onToolCallDelta?.(delta.tool_calls);
        }
      } catch {
        // 跳过解析失败的行
      }
    }
  }

  // 刷新残留 think 行
  flushThinkRemaining(thinkExt, sendThinkLine);

  handlers.onDone?.(fullContent, reasoningContent);
  return { fullContent, reasoningContent, thinkLinesSent: thinkExt.linesSent };
}

// ── 公开 API ──

/** 非流式聊天补全 */
export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const body = buildBody(params, false);

  const r = await fetch(`${config.aiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.aiApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) throw new Error(`AI API ${r.status}: ${await r.text().catch(() => '')}`);

  const json = await r.json();
  const rawContent = json.choices?.[0]?.message?.content || '';
  const { think, content } = extractThink(rawContent);

  return { content, think };
}

/** SSE 流式聊天补全（无工具调用） */
export async function chatCompletionStream(
  params: ChatCompletionStreamParams,
): Promise<string> {
  const { onEvent, ...chatParams } = params;
  const body = buildBody(chatParams, true);

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
    onEvent('error', { message: `AI API ${aiRes.status}: ${errText}` });
    return '';
  }

  const reader = aiRes.body?.getReader();
  if (!reader) {
    onEvent('error', { message: '无法读取 AI 流' });
    return '';
  }

  const { fullContent, thinkLinesSent } = await readSSEStream(reader, {
    onTextDelta: (_delta) => {
      // 文本增量由调用方按需处理
    },
    onThinkLine: (line) => {
      onEvent('think', { line });
    },
    onReasoningLine: (line) => {
      onEvent('think', { line });
    },
  });

  if (thinkLinesSent > 0) {
    onEvent('think-end', 'ok');
  }

  return fullContent;
}

/** Agent 模式流式（带工具调用 + 思考） */
export async function agentStream(params: AgentStreamParams): Promise<void> {
  const { onEvent, onToolCall, tools, ...chatParams } = params;

  const body: Record<string, unknown> = {
    model: chatParams.model || config.aiModel,
    max_tokens: chatParams.maxTokens ?? 4096,
    temperature: chatParams.temperature ?? 0.1,
    stream: true,
    messages: chatParams.messages,
  };

  if (chatParams.thinking) {
    body.thinking = { type: 'enabled' };
  }

  if (chatParams.webSearch) {
    body.web_search = { enable: true };
  }

  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
    body.tool_choice = 'auto';
  }

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
    onEvent('error', { message: `AI API ${aiRes.status}: ${errText}` });
    return;
  }

  const reader = aiRes.body?.getReader();
  if (!reader) {
    onEvent('error', { message: '无法读取 AI 流' });
    return;
  }

  // 工具调用累积器
  const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

  const { fullContent, reasoningContent, thinkLinesSent } = await readSSEStream(reader, {
    onTextDelta: (delta) => {
      onEvent('text', { delta });
    },
    onThinkLine: (line) => {
      onEvent('think', { line });
    },
    onReasoningLine: (line) => {
      onEvent('think', { line });
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
  });

  if (thinkLinesSent > 0) {
    onEvent('think-end', 'ok');
  }

  // 发送完成的工具调用
  for (const [, tc] of toolCallsMap) {
    if (tc.name) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.arguments); } catch { /* use empty */ }

      onEvent('tool_call', { name: tc.name, arguments: args });
      onToolCall?.(tc.name, args);
    }
  }

  onEvent('done', 'ok');
}

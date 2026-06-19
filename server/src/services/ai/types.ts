/** 非流式调用参数 */
export interface ChatCompletionParams {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** MiniMax 思考模式 */
  thinking?: boolean;
}

/** 非流式调用结果 */
export interface ChatCompletionResult {
  content: string;
  think?: string;
}

/** 流式调用参数 */
export interface ChatCompletionStreamParams extends ChatCompletionParams {
  /** SSE 事件发送器 */
  onEvent: (event: string, data: unknown) => void;
}

/** 函数/工具定义 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** 带工具调用的流式参数 */
export interface AgentStreamParams extends ChatCompletionStreamParams {
  tools?: ToolDefinition[];
  /** 工具调用发送回前端时触发 */
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
}

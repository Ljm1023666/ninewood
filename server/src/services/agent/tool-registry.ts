import type { ToolDefinition } from '../ai/types.js';

/** 工具执行上下文 */
export interface ToolContext {
  userId: string;
  conversationId?: string;
}

/** 工具注册项：定义 + 执行函数 */
export interface RegisteredTool {
  definition: ToolDefinition;
  category: 'demand' | 'order' | 'user' | 'system' | 'skill';
  /** 是否需要思考确认后才执行（默认 true） */
  requiresConfirmation: boolean;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  /** 以 assistant 角色追加到对话的消息 */
  message: string;
}

/** 全局工具注册表 */
class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`工具 "${tool.definition.name}" 已经注册过`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  listAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  listByCategory(category: RegisteredTool['category']): RegisteredTool[] {
    return this.listAll().filter((t) => t.category === category);
  }

  /** 构建 OpenAI 兼容的工具列表（用于 API 请求） */
  toOpenAITools(
    filter?: (tool: RegisteredTool) => boolean,
  ): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    const list = filter ? this.listAll().filter(filter) : this.listAll();
    return list.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.definition.name,
        description: t.definition.description,
        parameters: t.definition.parameters,
      },
    }));
  }

  requiresConfirmation(name: string): boolean {
    return this.tools.get(name)?.requiresConfirmation ?? false;
  }

  /** 执行工具调用 */
  async execute(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `未知工具: ${name}`, message: `工具 "${name}" 不存在` };
    }
    try {
      return await tool.handler(args, ctx);
    } catch (e: any) {
      return { success: false, error: e.message, message: `工具执行失败: ${e.message}` };
    }
  }
}

export const toolRegistry = new ToolRegistry();

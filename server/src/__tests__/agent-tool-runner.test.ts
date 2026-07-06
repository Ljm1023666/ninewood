import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { processToolInvocations } from '../services/agent/tool-runner.js';
import { invalidateCapabilityCache } from '../services/agent/capability-matcher.js';
import { toolRegistry } from '../services/agent/tool-registry.js';
import { registerNinewoodTools } from '../services/agent/tools.js';

function collectEvents() {
  const events: Array<{ event: string; data: unknown }> = [];
  const send = (event: string, data: unknown) => events.push({ event, data });
  return { events, send };
}

beforeAll(() => {
  invalidateCapabilityCache();
  if (!toolRegistry.get('read_knowledge')) {
    registerNinewoodTools();
  }
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('processToolInvocations · report SSE', () => {
  it('does not emit report for read_knowledge (side_effect none)', async () => {
    vi.spyOn(toolRegistry, 'execute').mockResolvedValueOnce({
      success: true,
      data: 'FAQ content',
      message: '已找到',
    });
    const { events, send } = collectEvents();
    await processToolInvocations(
      [{ name: 'read_knowledge', arguments: { query: '发布需求' } }],
      { userId: 'u1', conversationId: 'c1', accessMode: 'full', send },
    );
    expect(events.some((e) => e.event === 'report')).toBe(false);
    expect(events.some((e) => e.event === 'tool_result')).toBe(true);
  });

  it('emits report for navigate_to (side_effect navigate)', async () => {
    vi.spyOn(toolRegistry, 'execute').mockResolvedValueOnce({
      success: true,
      data: { path: '/my-demands', title: '我的需求' },
      message: '正在前往我的需求',
    });
    const { events, send } = collectEvents();
    await processToolInvocations(
      [{ name: 'navigate_to', arguments: { page: '我的需求' } }],
      { userId: 'u1', conversationId: 'c1', accessMode: 'full', send },
    );
    const report = events.find((e) => e.event === 'report');
    expect(report).toBeTruthy();
    expect((report!.data as { summary?: string }).summary).toContain('我的需求');
  });

  it('emits navigate SSE when tool returns path', async () => {
    vi.spyOn(toolRegistry, 'execute').mockResolvedValueOnce({
      success: true,
      data: { path: '/demands/abc', title: '详情' },
      message: 'ok',
    });
    const { events, send } = collectEvents();
    await processToolInvocations(
      [{ name: 'navigate_to', arguments: { path: '/demands/abc' } }],
      { userId: 'u1', conversationId: 'c1', accessMode: 'full', send },
    );
    expect(
      events.some(
        (e) => e.event === 'navigate' && (e.data as { path: string }).path === '/demands/abc',
      ),
    ).toBe(true);
  });
});

describe('processToolInvocations · readonly mode', () => {
  it('blocks write tools in readonly accessMode', async () => {
    const executeSpy = vi.spyOn(toolRegistry, 'execute');
    const { events, send } = collectEvents();
    const { toolResults } = await processToolInvocations(
      [{ name: 'create_demand', arguments: { title: 'x' } }],
      { userId: 'u1', conversationId: 'c1', accessMode: 'readonly', send },
    );
    expect(executeSpy).not.toHaveBeenCalled();
    expect(toolResults[0]!.success).toBe(false);
    expect(toolResults[0]!.message).toContain('只读');
    expect(events.some((e) => e.event === 'report')).toBe(false);
  });
});

describe('processToolInvocations · approval mode', () => {
  it('emits plan + tool_pending for create_demand without executing', async () => {
    const executeSpy = vi.spyOn(toolRegistry, 'execute');
    const { events, send } = collectEvents();
    const { toolResults } = await processToolInvocations(
      [{ name: 'create_demand', arguments: { title: 'test' } }],
      { userId: 'u1', conversationId: 'c1', accessMode: 'approval', send },
    );
    expect(executeSpy).not.toHaveBeenCalled();
    expect(events.some((e) => e.event === 'plan')).toBe(true);
    expect(events.some((e) => e.event === 'tool_pending')).toBe(true);
    expect(toolResults[0]!.data).toMatchObject({ pending: true });
  });
});

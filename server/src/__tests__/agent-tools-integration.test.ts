import { describe, it, expect, beforeAll } from 'vitest';
import { registerNinewoodTools } from '../services/agent/tools.js';
import { toolRegistry } from '../services/agent/tool-registry.js';
import { matchForbidden } from '../services/agent/capability-matcher.js';
import { invalidateCapabilityCache } from '../services/agent/capability-matcher.js';
import { invalidateKnowledgeCache } from '../services/agent/knowledge-loader.js';
import {
  normalizeAccessMode,
  canAutoExecuteWrites,
  canUseWebSearch,
} from '../services/agent/access-mode.js';
import { filterToolsForAccessMode } from '../services/agent/tool-narration.js';

beforeAll(() => {
  invalidateCapabilityCache();
  invalidateKnowledgeCache();
  if (!toolRegistry.get('read_knowledge')) {
    registerNinewoodTools();
  }
});

describe('read_knowledge tool', () => {
  it('returns FAQ content in data field for 发布需求', async () => {
    const result = await toolRegistry.execute(
      'read_knowledge',
      { query: '发布需求' },
      { userId: 'u-test' },
    );
    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('string');
    expect(String(result.data).length).toBeGreaterThan(50);
    expect(String(result.data)).toMatch(/how-to-publish|summary:|发布/);
  });

  it('returns friendly message when query empty', async () => {
    const result = await toolRegistry.execute(
      'read_knowledge',
      { query: '' },
      { userId: 'u-test' },
    );
    expect(result.success).toBe(false);
  });
});

describe('navigate_to tool', () => {
  it('resolves known page names', async () => {
    const result = await toolRegistry.execute(
      'navigate_to',
      { page: '发布需求' },
      { userId: 'u-test' },
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ path: '/demands/create' });
  });

  it('accepts direct path', async () => {
    const result = await toolRegistry.execute(
      'navigate_to',
      { path: '/demands/abc-123' },
      { userId: 'u-test' },
    );
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ path: '/demands/abc-123' });
  });
});

describe('matchForbidden', () => {
  it('blocks payment intent', () => {
    const hit = matchForbidden('帮我支付这个订单');
    expect(hit?.entry.id).toBe('payment');
  });

  it('allows normal FAQ question', () => {
    expect(matchForbidden('什么是发布需求')).toBeNull();
  });
});

describe('access mode + tool filter', () => {
  it('normalizes invalid mode to approval', () => {
    expect(normalizeAccessMode(undefined)).toBe('approval');
    expect(normalizeAccessMode('bogus')).toBe('approval');
  });

  it('readonly hides write tools', () => {
    const filter = filterToolsForAccessMode('readonly');
    const names = toolRegistry.listAll().filter(filter).map((t) => t.definition.name);
    expect(names).toContain('read_knowledge');
    expect(names).toContain('search_demands');
    expect(names).not.toContain('create_demand');
  });

  it('full mode allows web search flag', () => {
    expect(canUseWebSearch('full')).toBe(true);
    expect(canUseWebSearch('approval')).toBe(false);
    expect(canAutoExecuteWrites('full')).toBe(true);
    expect(canAutoExecuteWrites('approval')).toBe(false);
  });
});

describe('tool registry completeness', () => {
  it('registers core agent tools', () => {
    const names = toolRegistry.listAll().map((t) => t.definition.name);
    for (const n of [
      'read_knowledge',
      'navigate_to',
      'search_demands',
      'create_demand',
      'apply_for_demand',
      'list_my_demands',
    ]) {
      expect(names).toContain(n);
    }
  });
});

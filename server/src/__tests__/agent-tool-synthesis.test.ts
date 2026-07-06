import { describe, it, expect } from 'vitest';
import {
  synthesizeAnswerFromTools,
  toOpenAIToolCalls,
  shouldEmitToolReport,
} from '../services/agent/agent-tool-synthesis.js';
import type { ExecutedTool } from '../services/agent/follow-up-tools.js';
import { searchKnowledge } from '../services/agent/knowledge-loader.js';
import { invalidateKnowledgeCache } from '../services/agent/knowledge-loader.js';

describe('toOpenAIToolCalls', () => {
  it('wraps calls in OpenAI function format', () => {
    const out = toOpenAIToolCalls([
      { id: 'call-1', name: 'read_knowledge', arguments: '{"query":"发布需求"}' },
    ]);
    expect(out).toEqual([
      {
        id: 'call-1',
        type: 'function',
        function: { name: 'read_knowledge', arguments: '{"query":"发布需求"}' },
      },
    ]);
  });
});

describe('shouldEmitToolReport', () => {
  it('blocks report for read-only side_effect none', () => {
    expect(shouldEmitToolReport('none')).toBe(false);
    expect(shouldEmitToolReport(undefined)).toBe(false);
  });

  it('allows report for navigate and write', () => {
    expect(shouldEmitToolReport('navigate')).toBe(true);
    expect(shouldEmitToolReport('write_once')).toBe(true);
    expect(shouldEmitToolReport('write_batch')).toBe(true);
  });
});

describe('synthesizeAnswerFromTools', () => {
  it('builds structured answer from read_knowledge data', () => {
    invalidateKnowledgeCache();
    const kb = searchKnowledge('发布需求');
    expect(kb.length).toBeGreaterThan(0);

    const executed: ExecutedTool[] = [
      {
        name: 'read_knowledge',
        arguments: { query: '发布需求' },
        result: { success: true, data: kb, message: 'ok' },
      },
    ];
    const answer = synthesizeAnswerFromTools(executed);
    expect(answer).toBeTruthy();
    expect(answer!).toMatch(/## 发布需求/);
    expect(answer!).toMatch(/### 操作步骤/);
    expect(answer!).toMatch(/进入发布页|填写标题/);
  });

  it('returns null when no read_knowledge success', () => {
    expect(
      synthesizeAnswerFromTools([
        {
          name: 'search_demands',
          arguments: {},
          result: { success: true, data: [], message: 'empty' },
        },
      ]),
    ).toBeNull();
  });

  it('returns null when read_knowledge data empty', () => {
    expect(
      synthesizeAnswerFromTools([
        {
          name: 'read_knowledge',
          arguments: { query: 'x' },
          result: { success: true, data: '', message: 'empty' },
        },
      ]),
    ).toBeNull();
  });
});

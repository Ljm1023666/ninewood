import { describe, it, expect, beforeAll } from 'vitest';
import {
  searchKnowledge,
  getKnowledgeMeta,
  getKnowledgeContent,
  buildKnowledgeIndex,
  invalidateKnowledgeCache,
} from '../services/agent/knowledge-loader.js';

beforeAll(() => invalidateKnowledgeCache());

describe('knowledge-loader · 路径与加载', () => {
  it('loads all 4 yaml files from server/ai-knowledge', () => {
    const meta = getKnowledgeMeta();
    expect(meta.map((m) => m.filename).sort()).toEqual([
      '00-system.yaml',
      '01-business-rules.yaml',
      '02-help-knowledge.yaml',
      '03-agent-capabilities.yaml',
    ]);
  });

  it('getKnowledgeContent returns non-empty for help file', () => {
    const content = getKnowledgeContent('02-help-knowledge.yaml');
    expect(content).toBeTruthy();
    expect(content).toContain('how-to-publish');
  });

  it('buildKnowledgeIndex lists help knowledge', () => {
    const index = buildKnowledgeIndex();
    expect(index).toContain('帮助知识库');
  });
});

describe('knowledge-loader · searchKnowledge', () => {
  it('returns non-empty FAQ excerpt for 发布需求', () => {
    const result = searchKnowledge('发布需求');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/how-to-publish|发需求|进入发布页/);
  });

  it('prefers FAQ help over business rules for 什么是发布需求', () => {
    const result = searchKnowledge('什么是发布需求');
    expect(result).toContain('how-to-publish');
    expect(result).toMatch(/summary:|进入发布页|demands\/create/);
    expect(result).not.toContain('PUBLISH_REQUIRES_VERIFIED');
  });

  it('finds content for 认证', () => {
    const result = searchKnowledge('认证');
    expect(result.length).toBeGreaterThan(0);
  });

  it('finds content for 卡池', () => {
    const result = searchKnowledge('卡池');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty for blank query', () => {
    expect(searchKnowledge('')).toBe('');
    expect(searchKnowledge('   ')).toBe('');
  });

  it('returns empty for single-char query', () => {
    expect(searchKnowledge('卡')).toBe('');
  });
});

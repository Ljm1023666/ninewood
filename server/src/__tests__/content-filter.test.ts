import { describe, it, expect, vi } from 'vitest';

vi.mock('../config.js', () => ({
  config: { contentFilter: { enabled: true, provider: 'local' } },
}));

import { checkContentSafety, assertUserContentSafe } from '../services/content-filter/index.js';

describe('content-filter', () => {
  it('allows normal text', () => {
    const result = checkContentSafety('帮我设计一个海报');
    expect(result.safe).toBe(true);
  });

  it('blocks gambling keywords', () => {
    const result = checkContentSafety('这里有网赌平台');
    expect(result.safe).toBe(false);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.hits.length).toBeGreaterThan(0);
  });

  it('assertUserContentSafe throws on hit', () => {
    expect(() => assertUserContentSafe('色情直播', '消息')).toThrow(/违规/);
  });
});

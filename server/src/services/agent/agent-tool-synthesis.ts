import type { ExecutedTool } from './follow-up-tools.js';

function extractYamlStringList(raw: string, key: string): string[] {
  const re = new RegExp(`${key}:\\s*\\n((?:\\s+-\\s+"[^"]+"\\s*\\n)+)`, 'm');
  const block = raw.match(re)?.[1];
  if (!block) return [];
  return [...block.matchAll(/-\s+"([^"]+)"/g)].map((m) => m[1]!);
}

/** 从 read_knowledge 等工具结果生成确定性兜底回答（LLM 总结失败时使用） */
export function synthesizeAnswerFromTools(executed: ExecutedTool[]): string | null {
  for (const e of executed) {
    if (e.name !== 'read_knowledge' || !e.result.success) continue;
    const raw = e.result.data;
    if (typeof raw !== 'string' || !raw.trim()) continue;

    const summary = raw.match(/summary:\s*"([^"]+)"/)?.[1];
    const stepTitles = [...raw.matchAll(/- title:\s*(.+)/g)]
      .map((m) => m[1]!.trim())
      .filter(Boolean)
      .slice(0, 8);
    const preconditions = extractYamlStringList(raw, 'preconditions').slice(0, 6);
    const warnings = extractYamlStringList(raw, 'warnings').slice(0, 4);

    const parts: string[] = [];
    if (summary) {
      parts.push(`## 发布需求\n\n${summary}`);
    }

    if (preconditions.length > 0) {
      parts.push(
        '### 前置条件\n\n' + preconditions.map((p) => `- ${p}`).join('\n'),
      );
    }

    if (stepTitles.length > 0) {
      parts.push(
        '### 操作步骤\n\n' + stepTitles.map((t, i) => `${i + 1}. ${t}`).join('\n'),
      );
    }

    if (warnings.length > 0) {
      parts.push(
        '### 注意事项\n\n' + warnings.map((w) => `- ${w}`).join('\n'),
      );
    }

    if (parts.length > 0) return parts.join('\n\n');

    const trimmed = raw.replace(/^【[^】]+】\n?/, '').trim();
    return trimmed.length > 1600 ? `${trimmed.slice(0, 1600)}…` : trimmed;
  }
  return null;
}

/** OpenAI 兼容的 tool_calls 格式（供 executor 与单测共用） */
export function toOpenAIToolCalls(
  calls: Array<{ id: string; name: string; arguments: string }>,
): Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> {
  return calls.map((tc) => ({
    id: tc.id,
    type: 'function' as const,
    function: { name: tc.name, arguments: tc.arguments },
  }));
}

/** 是否应对该 capability 发送 report SSE（纯查阅不发） */
export function shouldEmitToolReport(
  sideEffect: 'none' | 'navigate' | 'write_once' | 'write_batch' | undefined,
): boolean {
  return sideEffect != null && sideEffect !== 'none';
}

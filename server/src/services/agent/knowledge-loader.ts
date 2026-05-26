import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface KnowledgeDoc {
  filename: string;
  title: string;
  content: string;
  sections: { heading: string; keywords: string[] }[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** ai-knowledge 目录路径（相对于 server/） */
const KNOWLEDGE_DIR = path.resolve(__dirname, '../../ai-knowledge');

/** 读取后的知识库缓存 */
let cachedKnowledge: KnowledgeDoc[] | null = null;

/**
 * 从 ai-knowledge/ 目录加载所有 YAML 文件
 * 缓存到内存中，后续调用直接返回缓存
 */
function loadKnowledgeFiles(): KnowledgeDoc[] {
  if (cachedKnowledge) return cachedKnowledge;

  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.warn('[knowledge] ai-knowledge directory not found:', KNOWLEDGE_DIR);
    cachedKnowledge = [];
    return cachedKnowledge;
  }

  const files = fs
    .readdirSync(KNOWLEDGE_DIR)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();

  const docs: KnowledgeDoc[] = [];

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const title = extractTitle(raw, file);
      const sections = extractSectionKeywords(raw);

      // 压缩：移除空行和过多注释，保持可读但减少 token
      const content = compressYaml(raw);

      docs.push({ filename: file, title, content, sections });
    } catch (e: any) {
      console.error(`[knowledge] failed to load ${file}:`, e.message);
    }
  }

  cachedKnowledge = docs;
  return docs;
}

/** 从 YAML 中提取标题（取第一个注释行或文件名） */
function extractTitle(raw: string, fallback: string): string {
  const lines = raw.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ') && !trimmed.startsWith('# =')) {
      return trimmed.replace(/^#+\s*/, '').trim();
    }
  }
  return fallback
    .replace(/\.(yaml|yml)$/, '')
    .replace(/^\d+-/, '')
    .replace(/-/g, ' ');
}

/** 提取各段落的 heading 和关键词（用于检索匹配） */
function extractSectionKeywords(raw: string): { heading: string; keywords: string[] }[] {
  const sections: { heading: string; keywords: string[] }[] = [];
  const commentLines = raw.split('\n').filter((l) => l.trim().startsWith('#'));
  for (const line of commentLines) {
    const heading = line.replace(/^#+\s*/, '').trim();
    if (heading.length > 0 && heading.length < 60) {
      sections.push({
        heading,
        keywords: heading
          .replace(/[#=\s]+/g, ' ')
          .split(/\s+/)
          .filter(Boolean),
      });
    }
  }
  return sections;
}

/**
 * 压缩 YAML 内容：移除冗余空行、缩减少量注释
 * 保留关键的结构化内容
 */
function compressYaml(raw: string): string {
  return raw
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => {
      // 保留内容行和标题注释
      if (l.trim().length === 0) {
        // 压缩连续空行为一个
        return i === 0 || arr[i - 1].trim().length > 0;
      }
      return true;
    })
    .join('\n')
    .trim();
}

/**
 * 加载后的知识库文档元信息（不含完整内容）
 */
export function getKnowledgeMeta(): { filename: string; title: string; sectionCount: number }[] {
  const docs = loadKnowledgeFiles();
  return docs.map((d) => ({
    filename: d.filename,
    title: d.title,
    sectionCount: d.sections.length,
  }));
}

/**
 * 获取指定文件的知识库内容
 */
export function getKnowledgeContent(filename: string): string | null {
  const docs = loadKnowledgeFiles();
  const doc = docs.find((d) => d.filename === filename);
  return doc ? doc.content : null;
}

/**
 * 构建知识库注入文本（用于 system prompt）
 * 自动包含所有知识文档
 */
export function buildKnowledgePrompt(): string {
  const docs = loadKnowledgeFiles();
  if (docs.length === 0) return '';

  const sections = docs.map(
    (doc) => `--- ${doc.title} ---\n${doc.content}`,
  );

  return `\n【九木平台知识库 / Ninewood Knowledge Base】\n以下是关于平台功能、数据模型、业务规则的详细说明。在回答用户关于平台操作、数据查询、业务逻辑的问题时请参考以下内容：\n\n${sections.join('\n\n')}\n`;
}

/**
 * 根据用户查询关键词检索最相关的知识段落
 * 截取匹配段落附近的内容，避免返回整个文件
 */
export function searchKnowledge(query: string): string {
  const docs = loadKnowledgeFiles();
  if (docs.length === 0) return '';

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 1);

  if (keywords.length === 0) return '';

  // 按关键词匹配度对文档排序
  const scored = docs
    .map((doc) => {
      let score = 0;
      for (const keyword of keywords) {
        if (doc.title.toLowerCase().includes(keyword)) score += 10;
        if (doc.content.toLowerCase().includes(keyword)) score += 3;
        for (const section of doc.sections) {
          if (section.keywords.some((k) => k.toLowerCase().includes(keyword))) {
            score += 5;
          }
        }
      }
      return { doc, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return '';

  const best = scored[0].doc;
  const lines = best.content.split('\n');

  // 找到第一个包含关键词的行，取其前后上下文
  let matchLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (keywords.some((k) => l.includes(k))) {
      matchLineIdx = i;
      break;
    }
  }

  if (matchLineIdx === -1) {
    // 没有行级匹配，返回文档开头
    return `【${best.title}】\n${lines.slice(0, 30).join('\n')}`;
  }

  // 取匹配行前后各 15 行（共约 30 行）
  const start = Math.max(0, matchLineIdx - 15);
  const end = Math.min(lines.length, matchLineIdx + 16);
  const excerpt = lines.slice(start, end).join('\n');
  const context = start > 0 ? `...（前文省略）\n` : '';
  const trail = end < lines.length ? `\n...（后文省略）` : '';

  return `【${best.title}】\n${context}${excerpt}${trail}`;
}

/**
 * 构建知识库索引摘要（用于 system prompt 轻量注入）
 * 只包含目录级别的概述，具体内容通过 read_knowledge 工具检索
 */
export function buildKnowledgeIndex(): string {
  const docs = loadKnowledgeFiles();
  if (docs.length === 0) return '';

  const index = docs.map((doc) => {
    const headings = doc.sections.map((s) => s.heading).join(', ');
    return `- ${doc.title}：${headings}`;
  });

  return `\n【九木平台知识库索引】\n以下知识库可通过 read_knowledge 工具按关键词检索：\n${index.join('\n')}\n`;
}

/** 刷新知识库缓存（文件变更时调用） */
export function invalidateKnowledgeCache(): void {
  cachedKnowledge = null;
}

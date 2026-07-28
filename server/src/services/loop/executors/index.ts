// 回执行器注册表 + 内置实现 · 自然回
// 注册表模式对齐 task-types（registerLoopExecutor / getLoopExecutor）。
// 详见 docs/specs/TASK-12-natural-loop-handoff.md §5.3
import { prisma } from '../../../lib/prisma.js';
import { resolveDemandPaths } from '../../path-search.js';
import { CapabilityHealth } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { LoopExecutor } from './types.js';

const registry = new Map<string, LoopExecutor>();

export function registerLoopExecutor(exec: LoopExecutor): void {
  if (registry.has(exec.definitionCode)) {
    throw new Error(`[loop-executor] duplicate registration: ${exec.definitionCode}`);
  }
  registry.set(exec.definitionCode, exec);
}

export function getLoopExecutor(code: string): LoopExecutor | undefined {
  return registry.get(code);
}

export function listLoopExecutors(): LoopExecutor[] {
  return Array.from(registry.values());
}

// ── 真实执行器 ──────────────────────────────────────────────────────────────

// builtin.earth.demand.structure：轻量规则把口语文本提取为标准字段（title/description/minPrice/paths）
// 不依赖外部 LLM，保证绝对可用；对需求运行时写回这些字段。
const KEYWORD_PATHS: Record<string, string[]> = {
  论文: ['tag:论文'],
  写作: ['tag:写作', 'cat:写作'],
  设计: ['tag:设计', 'cat:设计'],
  翻译: ['tag:翻译', 'cat:语言服务'],
  家教: ['tag:家教', 'cat:教育'],
  老师: ['tag:老师', 'cat:教育'],
  教师: ['tag:教师', 'cat:教育'],
  资格证: ['tag:资格证', 'cat:职业资格'],
  编程: ['tag:编程', 'cat:IT'],
  代码: ['tag:代码', 'cat:IT'],
  视频: ['tag:视频', 'cat:影视'],
  摄影: ['tag:摄影', 'cat:影视'],
  佛山: ['rgn:佛山'],
  广州: ['rgn:广州'],
  深圳: ['rgn:深圳'],
  北京: ['rgn:北京'],
  上海: ['rgn:上海'],
  杭州: ['rgn:杭州'],
  成都: ['rgn:成都'],
  武汉: ['rgn:武汉'],
  西安: ['rgn:西安'],
   outline: ['tag:outline', 'tag:写作'],
  ppt: ['tag:PPT', 'cat:设计'],
};
function extractBudget(text: string): number | null {
  // 1. 阿拉伯数字：「预算 500 元」「500块」「大约500」
  const m1 = text.match(/(?:预算|价格|价钱|费用|大约|大概|左右)?\s*(\d+(?:\.\d+)?)\s*(?:元|块|块钱|rmb|RMB)?/i);
  if (m1) return Number(m1[1]);

  // 2. 中文数字（仅支持百/千/万，覆盖常见口语）
  const m2 = text.match(/(?:预算|价格|价钱|费用|大约|大概)?\s*([一二两三四五六七八九十百千万]+)\s*(?:元|块|块钱|rmb|RMB)?/i);
  if (m2) {
    const s = m2[1]!;
    const cn: Record<string, number> = {
      一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
    };
    let n = 0;
    let cur = 0;
    for (const ch of s) {
      if (ch in cn) {
        cur = cur * 10 + cn[ch]!;
      } else if (ch === '十') {
        cur = cur === 0 ? 10 : cur * 10;
      } else if (ch === '百') {
        cur = cur === 0 ? 100 : cur * 100;
      } else if (ch === '千') {
        cur = cur === 0 ? 1000 : cur * 1000;
      } else if (ch === '万') {
        cur = cur === 0 ? 10000 : cur * 10000;
      }
      if (ch === '万' || ch === '千' || ch === '百' || ch === '十') {
        n += cur;
        cur = 0;
      }
    }
    n += cur;
    if (n > 0) return n;
  }
  return null;
}
function extractTitle(text: string): string {
  const t = text.trim().replace(/[\s,，.。!！?？;:；：]+/g, ' ').trim();
  if (!t) return '需求';
  // 取前 12 个非空字符作为标题
  const words = t.split(/\s+/).filter(Boolean);
  const firstWords = words.slice(0, 3).join(' ');
  return firstWords.length > 16 ? firstWords.slice(0, 16) : firstWords || t.slice(0, 12) || '需求';
}
function extractDescription(text: string): string {
  return text.trim().slice(0, 500);
}
function extractPaths(text: string): string[] {
  const paths = new Set<string>();
  for (const [kw, ps] of Object.entries(KEYWORD_PATHS)) {
    if (text.includes(kw)) {
      for (const p of ps) paths.add(p);
    }
  }
  return Array.from(paths).slice(0, 8);
}
function structureFromText(text: string) {
  const title = extractTitle(text);
  const description = extractDescription(text);
  const minPrice = extractBudget(text);
  const paths = extractPaths(text);
  return { title, description, minPrice, paths };
}
registerLoopExecutor({
  definitionCode: 'builtin.earth.demand.structure',
  async execute(input) {
    const demandId = input.demandId as string | undefined;
    const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
    const rawText = (fields.description as string) || (fields.title as string) || '';

    if (demandId) {
      const d = await prisma.demand.findUnique({ where: { id: demandId } });
      if (!d) throw Object.assign(new Error('需求不存在'), { status: 404 });
      const text = (d.description as string) || (d.title as string) || rawText;
      const structured = structureFromText(text);
      const update: Prisma.DemandUpdateInput = {
        title: structured.title,
        description: structured.description,
      };
      if (structured.minPrice != null) update.minPrice = structured.minPrice;
      if (structured.paths.length) update.paths = structured.paths;
      await prisma.demand.update({ where: { id: demandId }, data: update });
      return {
        status: 'SUCCEEDED',
        outcome: { ...structured, wroteBack: true, source: 'demand' },
      };
    }

    if (!rawText) throw Object.assign(new Error('请提供 description 或 title 作为输入'), { status: 400 });
    const structured = structureFromText(rawText);
    return {
      status: 'SUCCEEDED',
      outcome: { ...structured, wroteBack: false, source: 'free-input' },
    };
  },
});

// builtin.earth.demand.paths：字段→paths（调现有 resolveDemandPaths），回写 demand.paths
// 支持两种输入：demandId（读库并回写）或 fields（自由输入，仅计算不写库）
registerLoopExecutor({
  definitionCode: 'builtin.earth.demand.paths',
  async execute(input) {
    const demandId = input.demandId as string | undefined;
    const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
    const demand = demandId ? await prisma.demand.findUnique({ where: { id: demandId } }) : null;
    if (demandId && !demand) throw Object.assign(new Error('需求不存在'), { status: 404 });

    const src = demand ?? fields;
    const paths = resolveDemandPaths(
      {
        category: (src.category as string) ?? '',
        taxonomyLeafId: (src.taxonomyLeafId as string) ?? null,
        serviceType: ((src.serviceType as 'ONLINE' | 'OFFLINE') ?? 'ONLINE'),
        minPrice: src.minPrice != null ? Number(src.minPrice) : 0,
        regionId: src.regionId != null ? Number(src.regionId) : null,
        isCertifiedOnly: Boolean(src.isCertifiedOnly),
        tags: (src.tags as string[]) ?? [],
        tagsConfirmed: Boolean(src.tagsConfirmed),
        title: (src.title as string) ?? '',
        description: (src.description as string) ?? '',
      },
      (src.paths as string[]) ?? [],
    );
    if (demand) {
      await prisma.demand.update({ where: { id: demandId }, data: { paths } });
    }
    return { status: 'SUCCEEDED', outcome: { paths, count: paths.length, wroteBack: Boolean(demand) } };
  },
});

// builtin.heaven.validate.demand_fields：校验 title/description/minPrice 规则
// 支持 demandId 或 fields（自由输入）
registerLoopExecutor({
  definitionCode: 'builtin.heaven.validate.demand_fields',
  async execute(input) {
    const demandId = input.demandId as string | undefined;
    const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
    const demand = demandId ? await prisma.demand.findUnique({ where: { id: demandId } }) : null;
    if (demandId && !demand) throw Object.assign(new Error('需求不存在'), { status: 404 });

    const src = demand ?? fields;
    const title = (src.title as string) ?? '';
    const description = (src.description as string) ?? '';
    const minPrice = src.minPrice != null ? Number(src.minPrice) : null;

    const errors: string[] = [];
    if (!title || title.trim().length < 2) errors.push('title 过短');
    if (!description || description.trim().length < 2) errors.push('description 过短');
    if (minPrice == null || minPrice < 0) errors.push('minPrice 非法');

    const ok = errors.length === 0;
    return { status: ok ? 'SUCCEEDED' : 'FAILED', outcome: { ok, errors } };
  },
});

// builtin.heaven.validate.paths：paths 非空且 codec 合法
// 支持 demandId 或 fields.paths（自由输入）
const PATH_CODEC = /^(tag|cat|rgn|bkt|attr|intent|kw|loc|usr):.+/;
registerLoopExecutor({
  definitionCode: 'builtin.heaven.validate.paths',
  async execute(input) {
    const demandId = input.demandId as string | undefined;
    const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
    const demand = demandId ? await prisma.demand.findUnique({ where: { id: demandId } }) : null;
    if (demandId && !demand) throw Object.assign(new Error('需求不存在'), { status: 404 });

    const paths: string[] = (demand?.paths as string[] | undefined) ?? (fields.paths as string[]) ?? [];
    if (paths.length === 0) {
      return { status: 'FAILED', outcome: { ok: false, reason: 'paths 为空' } };
    }
    const invalid = paths.filter((p) => !PATH_CODEC.test(p));
    const ok = invalid.length === 0;
    return { status: ok ? 'SUCCEEDED' : 'FAILED', outcome: { ok, invalid, count: paths.length } };
  },
});

// builtin.heaven.health.endpoint_ping：EXTERNAL_API 则 HTTP HEAD/GET 超时 3s；PLATFORM_HOSTED 直接 ONLINE
registerLoopExecutor({
  definitionCode: 'builtin.heaven.health.endpoint_ping',
  async execute(input) {
    const endpointId = input.endpointId as string | undefined;
    const endpoint = endpointId ? await prisma.capabilityEndpoint.findUnique({ where: { id: endpointId } }) : null;
    const hostMode = (input.hostMode as string) || endpoint?.hostMode || 'EXTERNAL_API';

    if (hostMode === 'PLATFORM_HOSTED') {
      if (endpoint) {
        await prisma.capabilityEndpoint.update({
          where: { id: endpoint.id },
          data: { healthStatus: CapabilityHealth.ONLINE, healthCheckedAt: new Date() },
        });
      }
      return { status: 'SUCCEEDED', outcome: { healthStatus: 'ONLINE', mode: hostMode } };
    }

    const url = (input.url as string) || undefined;
    let health: 'ONLINE' | 'DEGRADED' = 'DEGRADED';
    if (url) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const resp = await fetch(url, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(timer);
        health = resp.ok ? 'ONLINE' : 'DEGRADED';
      } catch {
        health = 'DEGRADED';
      }
    }
    if (endpoint) {
      await prisma.capabilityEndpoint.update({
        where: { id: endpoint.id },
        data: { healthStatus: health, healthCheckedAt: new Date() },
      });
    }
    return { status: 'SUCCEEDED', outcome: { healthStatus: health, mode: hostMode, url } };
  },
});

// ── 辅助：附件标准化 / 安全扫描共用 ─────────────────────────────────────────
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
  pdf: 'application/pdf', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.document',
  txt: 'text/plain', md: 'text/markdown', csv: 'text/csv', rtf: 'application/rtf',
  zip: 'application/zip', rar: 'application/x-rar-compressed', '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar', gz: 'application/gzip',
};
const SAFE_EXT = new Set(Object.keys(MIME));
// 高危可执行/脚本扩展名：命中即判不安全
const BANNED_EXT = new Set([
  'exe', 'scr', 'msi', 'bat', 'cmd', 'com', 'ps1', 'sh', 'php', 'php3', 'php4', 'php5',
  'jsp', 'jar', 'vbs', 'vb', 'dll', 'cpl', 'wsf', 'wsh', 'py', 'pyc', 'rb', 'pl', 'pm',
  'lnk', 'reg', 'inf',
]);

function deriveExt(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : '';
}
function mimeFromExt(ext: string): string {
  return MIME[ext] ?? 'application/octet-stream';
}
function kindFromMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/') || /pdf|word|excel|sheet|presentation/.test(mime)) return 'document';
  return 'other';
}
function canonicalizeUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    u.hash = '';
    u.search = ''; // 去掉查询/锚点，得到规范化资源地址
    return u.toString();
  } catch {
    return trimmed; // 相对路径/非 http，原样返回
  }
}
/** 从 input 解析附件列表（demandId 读库，或 fields.mediaUrls/attachments） */
async function resolveMediaItems(input: Record<string, unknown>): Promise<unknown[]> {
  const demandId = input.demandId as string | undefined;
  const attachmentId = input.attachmentId as string | undefined;
  const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
  if (attachmentId) {
    const attachment = await prisma.cardAttachment.findUnique({
      where: { id: attachmentId },
      select: { snapshot: true },
    });
    if (!attachment) throw Object.assign(new Error('卡片附件不存在'), { status: 404 });
    const snapshot = (attachment.snapshot as Record<string, unknown>) ?? {};
    const items = snapshot.mediaUrls ?? snapshot.attachments ?? [];
    return Array.isArray(items) ? items : [];
  }
  if (demandId) {
    const d = await prisma.demand.findUnique({ where: { id: demandId }, select: { mediaUrls: true } });
    if (!d) throw Object.assign(new Error('需求不存在'), { status: 404 });
    const arr = (d.mediaUrls as unknown[]) ?? [];
    return Array.isArray(arr) ? arr : [];
  }
  const raw = (fields.mediaUrls as unknown[]) ?? (fields.attachments as unknown[]) ?? [];
  return Array.isArray(raw) ? raw : [];
}

// builtin.earth.media.normalize：规范化附件清单（去参/扩展名/类型/可达性探测）
registerLoopExecutor({
  definitionCode: 'builtin.earth.media.normalize',
  async execute(input) {
    const items = await resolveMediaItems(input);
    const entries = await Promise.all(
      items.map(async (it) => {
        const url = typeof it === 'string' ? it : ((it as Record<string, unknown>)?.url as string) ?? '';
        const ext = deriveExt(url);
        const mime = mimeFromExt(ext);
        const supported = SAFE_EXT.has(ext);
        let reachable: boolean | null = null;
        const norm = canonicalizeUrl(url);
        if (norm.startsWith('http://') || norm.startsWith('https://')) {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 3000);
            const resp = await fetch(norm, { method: 'HEAD', signal: ctrl.signal });
            clearTimeout(t);
            reachable = resp.ok;
          } catch {
            reachable = false;
          }
        }
        return { raw: url, url: norm, ext, mime, kind: kindFromMime(mime), supported, reachable };
      }),
    );
    const unsupported = entries.filter((e) => !e.supported);
    return {
      status: 'SUCCEEDED',
      outcome: {
        normalized: entries,
        unsupported,
        summary: { total: entries.length, supported: entries.length - unsupported.length, unsupported: unsupported.length },
      },
    };
  },
});

// builtin.earth.demand.card_cover：依据标题生成确定性 SVG 封面（data URI）
// 对需求运行时写回 demand.coverImage；自由输入仅返回不落库。
const COVER_PALETTES: [string, string][] = [
  ['#6366F1', '#8B5CF6'], ['#0EA5E9', '#22D3EE'], ['#10B981', '#34D399'],
  ['#F59E0B', '#FBBF24'], ['#EF4444', '#F472B6'], ['#14B8A6', '#5EEAD4'],
];
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string),
  );
}
function wrapTitle(title: string, perLine = 12): string[] {
  const t = title.trim() || '需求';
  const lines: string[] = [];
  for (let i = 0; i < t.length; i += perLine) lines.push(t.slice(i, i + perLine));
  return lines.slice(0, 3);
}
registerLoopExecutor({
  definitionCode: 'builtin.earth.demand.card_cover',
  async execute(input) {
    const demandId = input.demandId as string | undefined;
    const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
    let src: Record<string, unknown>;
    if (demandId) {
      const d = await prisma.demand.findUnique({
        where: { id: demandId },
        select: { title: true, description: true, mediaUrls: true },
      });
      if (!d) throw Object.assign(new Error('需求不存在'), { status: 404 });
      src = d as unknown as Record<string, unknown>;
    } else {
      src = fields;
    }
    const title = (src.title as string) || '需求';
    const [c1, c2] = COVER_PALETTES[hashString(title) % COVER_PALETTES.length];
    const lines = wrapTitle(title);
    const hasMedia = Array.isArray(src.mediaUrls) && (src.mediaUrls as unknown[]).length > 0;
    const titleSvg = lines
      .map(
        (ln, i) =>
          `<text x="48" y="${196 + i * 52}" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-size="42" font-weight="700" fill="#FFFFFF">${escapeXml(
            ln,
          )}</text>`,
      )
      .join('');
    const dots = Array.from({ length: 5 })
      .map((_, i) => `<circle cx="${720 - i * 26}" cy="56" r="6" fill="#FFFFFF" fill-opacity="${0.85 - i * 0.15}"/>`)
      .join('');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect width="800" height="420" fill="url(#g)"/>` +
      `<g opacity="0.18" fill="none" stroke="#FFFFFF" stroke-width="2">` +
      `<path d="M0 340 Q200 280 400 340 T800 340"/><path d="M0 380 Q200 320 400 380 T800 380"/></g>` +
      dots +
      titleSvg +
      (hasMedia ? `<text x="48" y="372" font-family="system-ui,sans-serif" font-size="20" fill="#FFFFFF" fill-opacity="0.85">附 ${(
        (src.mediaUrls as unknown[]) ?? []
      ).length} 个素材</text>`
              : `<text x="48" y="372" font-family="system-ui,sans-serif" font-size="20" fill="#FFFFFF" fill-opacity="0.85">九樟 · 能力封面</text>`) +
      `</svg>`;
    const dataUri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    let wroteBack = false;
    if (demandId) {
      await prisma.demand.update({ where: { id: demandId }, data: { coverImage: dataUri } });
      wroteBack = true;
    }
    return {
      status: 'SUCCEEDED',
      outcome: { dataUri, width: 800, height: 420, palette: [c1, c2], title: lines, hasMedia, wroteBack },
    };
  },
});

// builtin.heaven.validate.attachment_safety：扩展名白名单安全扫描
registerLoopExecutor({
  definitionCode: 'builtin.heaven.validate.attachment_safety',
  async execute(input) {
    const items = await resolveMediaItems(input);
    const safe: unknown[] = [];
    const blocked: { url: string; ext: string; reason: string }[] = [];
    const flagged: { url: string; ext: string; reason: string }[] = [];
    for (const it of items) {
      const url = typeof it === 'string' ? it : ((it as Record<string, unknown>)?.url as string) ?? '';
      const ext = deriveExt(url);
      if (!ext) {
        flagged.push({ url, ext: '', reason: '缺少扩展名，无法识别类型' });
        continue;
      }
      if (BANNED_EXT.has(ext)) {
        blocked.push({ url, ext, reason: `高危扩展名 .${ext}` });
        continue;
      }
      if (!SAFE_EXT.has(ext)) {
        flagged.push({ url, ext, reason: '未知格式，建议人工复核' });
        continue;
      }
      safe.push({ url, ext });
    }
    const ok = blocked.length === 0;
    return {
      status: ok ? 'SUCCEEDED' : 'FAILED',
      outcome: { ok, safeCount: safe.length, blocked, flagged, total: items.length },
    };
  },
});

// builtin.earth.text.condense：文本精简地回样板（宣称压缩比 + 实际产出）
// 只做诚实去冗（空白规范化 + 去重句），禁止为凑宣称而把正文砍到只剩一字。
// 达不到宣称时仍提交 outcome，由天回判定 FAILED——地回不得自证成功。
function condenseText(raw: string): { text: string; ratio: number } {
  const original = raw.replace(/\s+/g, ' ').trim();
  if (!original) return { text: '', ratio: 0 };
  const sentences = original
    .split(/(?<=[。！？.!?；;])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
  }
  // 轻度收束：去掉句末多余语气词，不做破坏语义的硬截断
  const joined = deduped
    .map((s) => s.replace(/[啊呢吧嘛]+([。！？.!?])?$/u, '$1').trim())
    .filter(Boolean)
    .join('');
  const ratio = original.length === 0 ? 0 : Math.max(0, 1 - joined.length / original.length);
  return { text: joined || original, ratio: Math.round(ratio * 1000) / 1000 };
}

registerLoopExecutor({
  definitionCode: 'builtin.earth.text.condense',
  async execute(input) {
    const fields = (input.fields as Record<string, unknown> | undefined) ?? {};
    const text =
      (fields.text as string) ||
      (fields.description as string) ||
      (fields.content as string) ||
      '';
    if (!text.trim()) {
      throw Object.assign(new Error('请提供 text / description'), { status: 400 });
    }
    const claimedRaw =
      fields.claimedCompressionRatio != null
        ? Number(fields.claimedCompressionRatio)
        : 0.3;
    if (!Number.isFinite(claimedRaw) || claimedRaw < 0 || claimedRaw >= 1) {
      throw Object.assign(new Error('claimedCompressionRatio 须在 [0,1)'), { status: 400 });
    }
    // 契约下限（来自 VerificationContract.claimSchema）优先：地回不得按低于上架宣称的目标偷懒
    const claimFloor =
      typeof (input.claimSchema as { minCompressionRatio?: number } | undefined)?.minCompressionRatio ===
      'number'
        ? Number((input.claimSchema as { minCompressionRatio: number }).minCompressionRatio)
        : 0;
    const claimed = Math.max(claimedRaw, claimFloor);
    const { text: condensedText, ratio } = condenseText(text);
    return {
      status: 'SUCCEEDED',
      outcome: {
        condensedText,
        originalLength: text.trim().length,
        condensedLength: condensedText.length,
        claimedCompressionRatio: claimed,
        actualCompressionRatio: ratio,
        metClaim: ratio + 1e-9 >= claimed,
      },
    };
  },
});
// builtin.heaven.validate.text_claim：按宣称压缩比核验地回产出（双重剥夺判断权样板）
registerLoopExecutor({
  definitionCode: 'builtin.heaven.validate.text_claim',
  async execute(input) {
    const parentOutcome =
      (input.parentOutcome as Record<string, unknown> | undefined) ??
      (input.fields as Record<string, unknown> | undefined) ??
      {};
    const claimSchema = (input.claimSchema as Record<string, unknown> | undefined) ?? {};
    // 优先核验本轮地回宣称（已含上架契约下限）；否则退回契约宣称
    const minRatio =
      typeof parentOutcome.claimedCompressionRatio === 'number'
        ? (parentOutcome.claimedCompressionRatio as number)
        : typeof claimSchema.minCompressionRatio === 'number'
          ? (claimSchema.minCompressionRatio as number)
          : 0.15;
    const actual =
      typeof parentOutcome.actualCompressionRatio === 'number'
        ? (parentOutcome.actualCompressionRatio as number)
        : null;
    const condensed = String(parentOutcome.condensedText ?? '');
    const originalLen =
      typeof parentOutcome.originalLength === 'number'
        ? (parentOutcome.originalLength as number)
        : null;

    const errors: string[] = [];
    if (!condensed.trim()) errors.push('缺少 condensedText');
    if (actual == null) errors.push('缺少 actualCompressionRatio');
    if (originalLen != null && condensed.length > originalLen) {
      errors.push('精简结果长于原文');
    }
    if (actual != null && actual + 1e-9 < minRatio) {
      errors.push(`实际压缩比 ${actual} 低于宣称下限 ${minRatio}`);
    }
    const ok = errors.length === 0;
    return {
      status: ok ? 'SUCCEEDED' : 'FAILED',
      outcome: { ok, errors, minCompressionRatio: minRatio, actualCompressionRatio: actual },
    };
  },
});

// builtin.heaven.validate.order_wallet_consistency：订单金额与钱包流水一致性（只读，不改账）
registerLoopExecutor({
  definitionCode: 'builtin.heaven.validate.order_wallet_consistency',
  async execute(input) {
    const demandId = (input.demandId as string | undefined) ?? ((input.fields as Record<string, unknown>)?.demandId as string | undefined);
    const orderId = input.orderId as string | undefined;
    if (!demandId && !orderId) throw Object.assign(new Error('需要提供 demandId 或 orderId'), { status: 400 });

    const orders = await prisma.order.findMany({
      where: orderId ? { id: orderId } : { demandId },
      select: { id: true, agreedPrice: true, status: true },
    });
    if (orders.length === 0) {
      return {
        status: 'INCONCLUSIVE',
        outcome: { ok: false, reason: '该需求暂无订单，无法校验钱包一致性', checked: 0 },
      };
    }
    let allConsistent = true;
    const rows = [];
    for (const o of orders) {
      const agg = await prisma.walletLedger.aggregate({
        _sum: { amount: true },
        where: { referenceId: o.id, referenceType: 'ORDER' },
      });
      const ledgerTotal = Math.abs(agg._sum.amount ?? 0);
      const agreed = Number(o.agreedPrice);
      const consistent = Math.abs(ledgerTotal - agreed) < 0.01;
      if (!consistent) allConsistent = false;
      rows.push({
        orderId: o.id,
        status: o.status,
        agreedPrice: agreed,
        ledgerTotal: Math.round(ledgerTotal * 100) / 100,
        consistent,
      });
    }
    return {
      status: allConsistent ? 'SUCCEEDED' : 'FAILED',
      outcome: { ok: allConsistent, orders: rows, checked: rows.length },
    };
  },
});

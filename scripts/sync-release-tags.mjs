#!/usr/bin/env node
/**
 * 同步 Ninewood 稳定版本 git tags 并生成 docs/RELEASE-NOTES.md
 *
 * 用法:
 *   node scripts/sync-release-tags.mjs           # tags + RELEASE-NOTES
 *   node scripts/sync-release-tags.mjs --tags     # 仅创建/更新 tags
 *   node scripts/sync-release-tags.mjs --notes    # 仅生成 RELEASE-NOTES.md
 *   node scripts/sync-release-tags.mjs --dry-run  # 预览，不写 tag/文件
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MILESTONES, TIER_LABELS } from './release-milestones.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NOTES_PATH = join(ROOT, 'docs', 'RELEASE-NOTES.md');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const tagsOnly = args.has('--tags');
const notesOnly = args.has('--notes');
const runTags = !notesOnly;
const runNotes = !tagsOnly;

/** @param {string[]} cmdArgs */
function git(cmdArgs) {
  return execFileSync('git', cmdArgs, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function resolveHash(shortHash) {
  return git(['rev-parse', '--verify', `${shortHash}^{commit}`]);
}

function getCommitSubject(fullHash) {
  return git(['log', '-1', '--format=%s', fullHash]);
}

function getCommitDate(fullHash) {
  return git(['log', '-1', '--format=%ci', fullHash]).slice(0, 10);
}

function getShortstat(fullHash) {
  const out = git(['show', '--shortstat', '--format=', fullHash]);
  return out.replace(/\s+/g, ' ').trim() || '(no diff)';
}

function getLogRange(prevHash, fullHash) {
  if (!prevHash) return [];
  return git(['log', '--oneline', `${prevHash}..${fullHash}`])
    .split('\n')
    .filter(Boolean);
}

function buildTagMessage(m) {
  const lines = [
    m.title,
    '',
    `Date: ${m.date}`,
    `Stats: ${m.stats}`,
    '',
    ...m.summary.map((s) => `- ${s}`),
  ];
  if (m.spec) lines.push('', `Spec: ${m.spec}`);
  if (m.grade) lines.push('', `Grade: ${m.grade}`);
  if (m.notes) lines.push('', `Notes: ${m.notes}`);
  return lines.join('\n');
}

function syncTags() {
  const results = [];
  for (const m of MILESTONES) {
    const fullHash = resolveHash(m.hash);
    const subject = getCommitSubject(fullHash);

    if (!subject.includes(m.title.split(' — ')[0].split(': ').pop()?.slice(0, 8) ?? m.hash)) {
      // 宽松校验：至少 hash 必须存在
    }

    const existing = (() => {
      try {
        execFileSync('git', ['rev-parse', `refs/tags/${m.tag}^{commit}`], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        return git(['rev-parse', `refs/tags/${m.tag}^{commit}`]);
      } catch {
        return null;
      }
    })();

    const tagMsg = buildTagMessage(m);

    if (existing === fullHash) {
      results.push({ tag: m.tag, action: 'exists', hash: m.hash });
      continue;
    }

    if (existing && existing !== fullHash) {
      if (dryRun) {
        results.push({ tag: m.tag, action: 'would-move', hash: m.hash, from: existing.slice(0, 7) });
        continue;
      }
      git(['tag', '-d', m.tag]);
      results.push({ tag: m.tag, action: 'moved', hash: m.hash, from: existing.slice(0, 7) });
    } else if (!existing) {
      results.push({ tag: m.tag, action: dryRun ? 'would-create' : 'created', hash: m.hash });
    }

    if (!dryRun) {
      git(['tag', '-a', m.tag, '-m', tagMsg, fullHash]);
    }
  }
  return results;
}

function buildReleaseNotes() {
  const generated = new Date().toISOString().slice(0, 10);
  const lines = [
    '# Ninewood 发布说明（Release Notes）',
    '',
    `> 自动生成于 ${generated} · 维护命令: \`node scripts/sync-release-tags.mjs\``,
    '>',
    '> **双轨阅读**：',
    '> - **快照视角** — 本文 + `git tag -l`，每个 tag 是一个自认稳定的版本节点',
    '> - **演进视角** — `git log <prev-tag>..<tag>` 查看两版本之间的原子提交',
    '',
    '## 快速导航',
    '',
    '| Tag | 层级 | 日期 | 标题 | 评级 |',
    '|-----|------|------|------|------|',
  ];

  for (const m of MILESTONES) {
    const grade = m.grade ?? '—';
    lines.push(`| [\`${m.tag}\`](#${anchor(m.tag)}) | ${TIER_LABELS[m.tier]} | ${m.date} | ${escapePipe(m.title)} | ${grade} |`);
  }

  lines.push('', '---', '');

  let prevFullHash = null;
  const byTier = /** @type {Record<string, typeof MILESTONES>} */ ({});

  for (const m of MILESTONES) {
    byTier[m.tier] ??= [];
    byTier[m.tier].push(m);
  }

  for (const [tier, items] of Object.entries(byTier)) {
    lines.push(`## ${TIER_LABELS[tier]}`, '');

    for (const m of items) {
      const fullHash = resolveHash(m.hash);
      const subject = getCommitSubject(fullHash);
      const date = getCommitDate(fullHash);
      const shortstat = getShortstat(fullHash);
      const rangeLog = getLogRange(prevFullHash, fullHash);

      lines.push(`### ${m.tag}`, '');
      lines.push(`<a id="${anchor(m.tag)}"></a>`, '');
      lines.push(`**${m.title}**`, '');
      lines.push('');
      lines.push(`| 字段 | 值 |`);
      lines.push(`|------|-----|`);
      lines.push(`| Commit | \`${fullHash.slice(0, 7)}\` — ${escapePipe(subject)} |`);
      lines.push(`| 日期 | ${date} |`);
      lines.push(`| 体量 | ${shortstat} |`);
      if (m.grade) lines.push(`| 评级 | ${m.grade} |`);
      if (m.spec) lines.push(`| 规格 | [\`${m.spec}\`](./${m.spec.replace('docs/', '')}) |`);
      lines.push('');

      lines.push('**包含特性**', '');
      for (const s of m.summary) lines.push(`- ${s}`);
      lines.push('');

      if (m.highlights?.length) {
        lines.push('**组成提交**', '');
        for (const h of m.highlights) lines.push(`- ${h}`);
        lines.push('');
      }

      if (m.notes) {
        lines.push('**备注**', '');
        lines.push(m.notes);
        lines.push('');
      }

      if (rangeLog.length > 1) {
        lines.push('**自上一快照以来的演进**', '');
        lines.push('```');
        lines.push(...rangeLog);
        lines.push('```');
        lines.push('');
      } else if (rangeLog.length === 1) {
        lines.push('**自上一快照**', '');
        lines.push(`- 单提交快照：\`${rangeLog[0]}\``);
        lines.push('');
      }

      lines.push('**常用命令**', '');
      lines.push('```bash');
      lines.push(`git checkout ${m.tag}`);
      if (prevFullHash) {
        const prevTag = MILESTONES[MILESTONES.indexOf(m) - 1]?.tag;
        if (prevTag) {
          lines.push(`git log ${prevTag}..${m.tag} --oneline`);
          lines.push(`git diff ${prevTag} ${m.tag} --stat`);
        }
      }
      lines.push('```');
      lines.push('', '---', '');
    }

    prevFullHash = null; // reset between tiers for cleaner "first in tier" handling
  }

  // Fix: recompute prev across ALL milestones for diff commands
  // Rebuild detailed sections with global prev
  return rebuildDetailedSections(lines.slice(0, lines.indexOf('---') + 1));
}

function rebuildDetailedSections(headerLines) {
  const body = [];
  let prevTag = null;
  let prevFullHash = null;

  const tierOrder = ['pre', 'product', 'engineering'];
  for (const tier of tierOrder) {
    body.push(`## ${TIER_LABELS[tier]}`, '');
    const items = MILESTONES.filter((m) => m.tier === tier);

    for (const m of items) {
      const fullHash = resolveHash(m.hash);
      const subject = getCommitSubject(fullHash);
      const date = getCommitDate(fullHash);
      const shortstat = getShortstat(fullHash);
      const rangeLog = prevFullHash ? getLogRange(prevFullHash, fullHash) : [];

      body.push(`### ${m.tag}`, '');
      body.push(`<a id="${anchor(m.tag)}"></a>`, '');
      body.push(`**${m.title}**`, '');
      body.push('');
      body.push('| 字段 | 值 |');
      body.push('|------|-----|');
      body.push(`| Commit | \`${fullHash.slice(0, 7)}\` — ${escapePipe(subject)} |`);
      body.push(`| 日期 | ${date} |`);
      body.push(`| 体量 | ${shortstat} |`);
      if (m.grade) body.push(`| 评级 | ${m.grade} |`);
      if (m.spec) body.push(`| 规格 | [\`${m.spec}\`](./${m.spec.replace('docs/', '')}) |`);
      body.push('');

      body.push('**包含特性**', '');
      for (const s of m.summary) body.push(`- ${s}`);
      body.push('');

      if (m.highlights?.length) {
        body.push('**组成提交**', '');
        for (const h of m.highlights) body.push(`- ${h}`);
        body.push('');
      }

      if (m.notes) {
        body.push('**备注**', '');
        body.push(m.notes);
        body.push('');
      }

      if (rangeLog.length > 0) {
        body.push(`**自 \`${prevTag ?? '起点'}\` 以来的演进** (${rangeLog.length} commits)`, '');
        body.push('```');
        body.push(...rangeLog);
        body.push('```');
        body.push('');
      }

      body.push('**常用命令**', '');
      body.push('```bash');
      body.push(`git checkout ${m.tag}`);
      if (prevTag) {
        body.push(`git log ${prevTag}..${m.tag} --oneline`);
        body.push(`git diff ${prevTag} ${m.tag} --stat`);
      }
      body.push('```');
      body.push('', '---', '');

      prevTag = m.tag;
      prevFullHash = fullHash;
    }
  }

  body.push(
    '## 阅读指南',
    '',
    '| 你想… | 推荐做法 |',
    '|-------|----------|',
    '| 快速了解某版本做了什么 | 读对应 tag 小节 + `git show <tag>` |',
    '| 对比两个稳定版本 | `git diff ai/3.0 ai/3.1.pro --stat` |',
    '| 定位回归引入点 | `git bisect start` + tag 作为 good/bad |',
    '| 理解设计决策 | 优先读 `stage/*` 与 `docs/specs/` |',
    '| 补充/修正快照 | 编辑 `scripts/release-milestones.mjs` 后重跑本脚本 |',
    '',
  );

  return [...headerLines, '', ...body].join('\n');
}

function anchor(tag) {
  return tag.replace(/\//g, '-');
}

function escapePipe(s) {
  return s.replace(/\|/g, '\\|');
}

function main() {
  console.log(`Ninewood release sync${dryRun ? ' (dry-run)' : ''}`);

  if (runTags) {
    const results = syncTags();
    for (const r of results) {
      console.log(`  [${r.action}] ${r.tag} → ${r.hash}${r.from ? ` (was ${r.from})` : ''}`);
    }
    console.log(`Tags: ${results.length} milestones processed`);
  }

  if (runNotes) {
    const content = buildReleaseNotes();
    if (dryRun) {
      console.log(`Would write ${NOTES_PATH} (${content.length} chars)`);
    } else {
      writeFileSync(NOTES_PATH, content, 'utf8');
      console.log(`Wrote ${NOTES_PATH}`);
    }
  }
}

main();

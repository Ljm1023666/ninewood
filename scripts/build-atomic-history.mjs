#!/usr/bin/env node
/**
 * 在 history/atomic 分支上重建拆分后的演进历史。
 * master 与 tag 快照不变；本分支供 bisect / code review。
 *
 *   node scripts/build-atomic-history.mjs
 *   node scripts/build-atomic-history.mjs --dry-run
 */

import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPLIT_PLAN, ATOMIC_BRANCH } from './atomic-split-plan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const dryRun = process.argv.includes('--dry-run');

/** @param {string[]} args */
function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function resolveHash(short) {
  if (short === '@master') {
    return git(['rev-parse', 'master']);
  }
  return git(['rev-parse', '--verify', `${short}^{commit}`]);
}

/** @param {string} file @param {string[]} prefixes */
function matchesAnyPrefix(file, prefixes) {
  for (const p of prefixes) {
    if (p.endsWith('/')) {
      if (file.startsWith(p) || file === p.slice(0, -1)) return true;
    } else if (file === p || file.startsWith(`${p}/`)) {
      return true;
    }
  }
  return false;
}

/** @param {string} commit */
function splitCommit(commit, parts) {
  const files = git(['diff-tree', '--no-commit-id', '--name-only', '-r', commit])
    .split('\n')
    .filter(Boolean);
  const groups = parts.map((part) => ({ part, files: [] }));
  for (const file of files) {
    let matched = false;
    for (const group of groups) {
      if (matchesAnyPrefix(file, group.part.paths)) {
        group.files.push(file);
        matched = true;
        break;
      }
    }
    if (!matched) groups[groups.length - 1].files.push(file);
  }
  return groups.filter((g) => g.files.length > 0);
}

function run(cmd, args) {
  if (dryRun) {
    console.log(`  [dry-run] ${cmd} ${args.join(' ')}`);
    return;
  }
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
}

/** 仅清理已知会阻塞 cherry-pick 的未跟踪产物 */
function cleanPickBlockers() {
  if (dryRun) return;
  for (const f of ['pnpm-lock.yaml']) {
    try {
      git(['clean', '-f', '--', f]);
    } catch {
      /* ignore */
    }
  }
}

function cherryPickWhole(commit) {
  if (dryRun) return;
  cleanPickBlockers();
  try {
    run('git', ['cherry-pick', '--strategy-option=theirs', commit]);
  } catch {
    // 仅暂存已跟踪冲突，避免 git add -A 污染未提交 WIP
    run('git', ['add', '-u']);
    run('git', ['cherry-pick', '--continue']);
  }
}

function main() {
  console.log(`Building ${ATOMIC_BRANCH}${dryRun ? ' (dry-run)' : ''}...`);
  const first = resolveHash(SPLIT_PLAN[0].hash);
  const returnRef = git(['rev-parse', 'HEAD']);

  if (!dryRun) {
    try {
      git(['branch', '-D', ATOMIC_BRANCH]);
    } catch {
      /* noop */
    }
    git(['checkout', '--detach', first]);
    cleanPickBlockers();
    git(['checkout', '-B', ATOMIC_BRANCH]);
  }

  let count = 0;

  for (let i = 1; i < SPLIT_PLAN.length; i++) {
    const plan = SPLIT_PLAN[i];
    const commit = resolveHash(plan.hash);
    const subject = git(['log', '-1', '--format=%s', commit]);
    console.log(`\n[${i}/${SPLIT_PLAN.length - 1}] ${commit.slice(0, 7)} ${subject}`);

    if (!plan.parts) {
      if (dryRun) console.log(`  cherry-pick ${commit.slice(0, 7)}`);
      else cherryPickWhole(commit);
      count += 1;
      continue;
    }

    if (!dryRun) {
      cleanPickBlockers();
      try {
        git(['cherry-pick', '-n', commit]);
      } catch {
        git(['cherry-pick', '--abort']);
        throw new Error(`cherry-pick -n failed at ${commit.slice(0, 7)}`);
      }
    }

    for (const { part, files } of splitCommit(commit, plan.parts)) {
      if (dryRun) {
        console.log(`  commit: ${part.message} (${files.length} files)`);
      } else {
        run('git', ['reset']);
        for (const f of files) {
          try {
            run('git', ['add', '--', f]);
          } catch {
            /* deleted */
          }
        }
        run('git', ['commit', '-m', part.message, '-m', `Split from ${commit.slice(0, 7)}: ${subject}`]);
      }
      count += 1;
    }
  }

  if (!dryRun) {
    const newHead = git(['rev-parse', 'HEAD']);
    const oldMaster = resolveHash(SPLIT_PLAN[SPLIT_PLAN.length - 1].hash);
    const treeDiff = git(['diff', oldMaster, newHead, '--stat']);
    console.log(`\nDone: ${count} atomic commits on ${ATOMIC_BRANCH}`);
    console.log(treeDiff ? `Tree diff vs master:\n${treeDiff}` : 'Tree identical to master HEAD.');
    git(['checkout', returnRef]);
  } else {
    console.log(`\nWould create ~${count} commits`);
  }
}

main();

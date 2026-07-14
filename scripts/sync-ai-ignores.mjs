#!/usr/bin/env node
/**
 * 将根目录 .llmignore 同步到各 AI 工具识别的 ignore 文件。
 * 用法：node scripts/sync-ai-ignores.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = readFileSync(join(root, '.llmignore'), 'utf8')

const targets = [
  '.cursorignore',
  '.claudeignore',
  '.codeiumignore',
  '.aiexclude',
  '.geminiignore',
  '.aiderignore',
  '.continueignore',
  '.clineignore',
  '.rooignore',
  '.aiignore',
  '.augmentignore',
  '.repomixignore',
  '.copilotignore',
]

for (const name of targets) {
  writeFileSync(join(root, name), body, 'utf8')
  console.log('synced', name)
}

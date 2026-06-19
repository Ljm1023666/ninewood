/**
 * 开发环境启动 Electron（与 electron-dev.sh 等价，Windows / macOS / Linux 通用）。
 * 从仓库根目录执行：node scripts/electron-dev.mjs
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function findElectronCli() {
  const candidates = [
    path.join(root, 'node_modules', 'electron', 'cli.js'),
    path.join(root, 'client-react', 'node_modules', 'electron', 'cli.js'),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  throw new Error(
    '未找到 electron/cli.js，请在仓库根目录执行 npm install（确保 client-react 已安装 electron）。',
  )
}

const cli = findElectronCli()
const appDir = path.join(root, 'client-react')
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(process.execPath, [cli, appDir], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) process.exit(1)
  process.exit(code ?? 0)
})

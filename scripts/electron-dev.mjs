/**
 * 开发环境启动 Electron（与 electron-dev.sh 等价，Windows / macOS / Linux 通用）。
 * 从仓库根目录执行：node scripts/electron-dev.mjs
 *
 * 使用持久化目录 ~/.electron-dist 存放二进制，避免 pnpm 清理 node_modules 时丢失。
 */
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
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

function getPersistentDistPath() {
  const distPath = path.join(os.homedir(), '.electron-dist')
  const exeName = process.platform === 'win32' ? 'electron.exe' : 'electron'
  const exePath = path.join(distPath, exeName)

  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true })
  }

  if (!fs.existsSync(exePath)) {
    extractFromCache(distPath)
  }

  // 为 win32 创建 path.txt（electron 的 index.js 需要它来确定可执行文件名）
  const pathFile = path.join(distPath, 'path.txt')
  if (!fs.existsSync(pathFile)) {
    fs.writeFileSync(pathFile, exeName)
  }

  return distPath
}

function extractFromCache(distPath) {
  const cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron', 'Cache')
  if (!fs.existsSync(cacheDir)) {
    throw new Error('未找到 Electron 缓存目录，请先手动下载 electron 二进制。')
  }

  const pkgJson = JSON.parse(
    fs.readFileSync(
      path.join(root, 'client-react', 'node_modules', 'electron', 'package.json'),
      'utf-8',
    ),
  )
  const pkgVersion = pkgJson.version

  const entries = fs.readdirSync(cacheDir)
  let zipPath = null

  // 优先精确匹配版本，否则用最新缓存版本
  for (const entry of entries) {
    const dir = path.join(cacheDir, entry)
    if (!fs.statSync(dir).isDirectory()) continue
    const files = fs.readdirSync(dir)
    const zip = files.find(f => f.endsWith('.zip') && !f.includes('chromedriver') && !f.includes('mksnapshot'))
    if (zip) {
      zipPath = path.join(dir, zip)
      if (zip.includes(`v${pkgVersion}`)) break
    }
  }

  if (!zipPath) {
    throw new Error('未在缓存中找到 Electron zip，请先下载。')
  }

  console.log(`[electron-dev] 从缓存解压: ${zipPath}`)
  execSync(`unzip -o "${zipPath}" -d "${distPath}"`, { stdio: 'inherit' })

  const exeName = process.platform === 'win32' ? 'electron.exe' : 'electron'
  if (!fs.existsSync(path.join(distPath, exeName))) {
    throw new Error(`解压失败：未找到 ${exeName}`)
  }
}

const cli = findElectronCli()
const appDir = path.join(root, 'client-react')
const env = { ...process.env, ELECTRON_OVERRIDE_DIST_PATH: getPersistentDistPath() }
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

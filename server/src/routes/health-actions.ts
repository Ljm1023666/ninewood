import { Router } from 'express'
import { execSync, spawn, type ChildProcess } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Windows 服务名
const SERVICE_NAMES: Record<string, string> = {
  PostgreSQL: 'postgresql-x64-18',
  Redis: 'Redis',
}

// 跟踪分类器子进程
let classifierProcess: ChildProcess | null = null

function execSvc(serviceName: string, action: 'start' | 'stop'): { ok: boolean; message: string } {
  try {
    const result = execSync(`sc ${action} "${serviceName}"`, {
      encoding: 'utf-8',
      timeout: 15000,
      windowsHide: true,
    })
    return { ok: true, message: result.trim() }
  } catch (e: any) {
    return { ok: false, message: e.stderr || e.stdout || e.message }
  }
}

function startClassifier(): { ok: boolean; message: string } {
  if (classifierProcess && classifierProcess.exitCode === null) {
    return { ok: true, message: '分类器已在运行中' }
  }

  try {
    const classifierDir = path.resolve(__dirname, '..', '..', 'classifier')
    classifierProcess = spawn('python', ['classifier_api.py'], {
      cwd: classifierDir,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    classifierProcess.unref()
    return { ok: true, message: '分类器启动命令已发送' }
  } catch (e: any) {
    return { ok: false, message: e.message }
  }
}

function stopClassifier(): { ok: boolean; message: string } {
  if (!classifierProcess || classifierProcess.exitCode !== null) {
    // 进程未跟踪，尝试通过端口杀进程
    try {
      execSync('for /f "tokens=5" %a in (\'netstat -ano ^| findstr :8001 ^| findstr LISTENING\') do taskkill /PID %a /F 2>nul', {
        timeout: 10000,
        windowsHide: true,
      })
      return { ok: true, message: '已尝试终止占用 8001 端口的进程' }
    } catch {
      return { ok: false, message: '未找到分类器进程' }
    }
  }

  try {
    classifierProcess.kill('SIGTERM')
    classifierProcess = null
    return { ok: true, message: '分类器已停止' }
  } catch (e: any) {
    return { ok: false, message: e.message }
  }
}

router.post('/health/restart/:name', async (req, res) => {
  const { name } = req.params

  // Express 自身
  if (name === 'Express 服务器') {
    res.json({ ok: false, message: 'Express 服务器无法自我重启，请在终端中手动重启' })
    return
  }

  // Windows 服务: PostgreSQL / Redis
  const svcName = SERVICE_NAMES[name]
  if (svcName) {
    const stopResult = execSvc(svcName, 'stop')
    if (!stopResult.ok && !stopResult.message.includes('NOT_STOPPED')) {
      res.json({ ok: false, message: `停止失败: ${stopResult.message}` })
      return
    }
    // 等 2 秒确保端口释放
    await new Promise((r) => setTimeout(r, 2000))
    const startResult = execSvc(svcName, 'start')
    res.json(startResult)
    return
  }

  // 分类器
  if (name === '语义分类器') {
    stopClassifier()
    await new Promise((r) => setTimeout(r, 1000))
    const result = startClassifier()
    res.json(result)
    return
  }

  // Vite Dev Server
  if (name === 'Vite Dev Server') {
    res.json({ ok: false, message: 'Vite Dev Server 请在终端中手动重启' })
    return
  }

  res.status(404).json({ ok: false, message: `未知服务: ${name}` })
})

router.post('/health/start-all', async (_req, res) => {
  const results: { name: string; ok: boolean; message: string }[] = []

  // PostgreSQL
  const pgResult = execSvc(SERVICE_NAMES['PostgreSQL'], 'start')
  results.push({ name: 'PostgreSQL', ...pgResult })

  // Redis
  const redisResult = execSvc(SERVICE_NAMES['Redis'], 'start')
  results.push({ name: 'Redis', ...redisResult })

  // 分类器
  const cfResult = startClassifier()
  results.push({ name: '语义分类器', ...cfResult })

  const failed = results.filter((r) => !r.ok)
  res.json({
    ok: failed.length === 0,
    message: failed.length === 0 ? '全部启动成功' : `${failed.length} 个服务启动失败`,
    results,
  })
})

export { router as healthActionsRouter }

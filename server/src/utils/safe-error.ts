const isProd = process.env.NODE_ENV === 'production'

/** 对外错误文案：生产环境隐藏内部细节 */
export function publicErrorMessage(
  err: unknown,
  fallback = '服务器错误',
): string {
  if (!isProd) {
    if (err instanceof Error && err.message) return err.message
    if (typeof err === 'object' && err && 'message' in err) {
      const msg = (err as { message?: unknown }).message
      if (typeof msg === 'string' && msg) return msg
    }
  }
  const status =
    typeof err === 'object' && err && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : undefined
  if (typeof status === 'number' && status >= 400 && status < 500) {
    const msg =
      typeof err === 'object' && err && 'message' in err
        ? (err as { message?: unknown }).message
        : undefined
    if (typeof msg === 'string' && msg) return msg
  }
  return fallback
}

export function isProductionEnv(): boolean {
  return isProd
}

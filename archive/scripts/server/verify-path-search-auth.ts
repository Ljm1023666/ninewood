/** 验证登录态路径检索 */
const base = 'http://localhost:3001/api'

async function main() {
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800000000', password: '1' }),
  })
  const loginBody = await login.json()
  const token = loginBody?.data?.token as string | undefined
  if (!token) {
    console.error('login failed', loginBody)
    process.exit(1)
  }

  const url = `${base}/path-search?paths=${encodeURIComponent('cat:家政服务')}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  console.log('status', res.status)
  console.log('total', body?.data?.total)
  console.log('items', body?.data?.items?.length)
  if (!res.ok || body?.data?.total == null) {
    console.error(body)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

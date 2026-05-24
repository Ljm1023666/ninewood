# Ninewood 服务器部署记录

> 开始时间：2026-05-24 13:15 CST
> 域名：tothetomorrow.com (阿里云注册)
> 服务器：阿里云 ECS 4核 8GB 通用算力型 u1，Ubuntu 22.04，40GB ESSD
> 公网 IP：121.40.158.46 | 内网 IP：172.24.4.229
> 代码仓库：https://github.com/Ljm1023666/ninewood (公开)

---

## 1. 前置准备

### 1.1 域名与 DNS
- 域名 `tothetomorrow.com` 在阿里云注册
- DNS A 记录：
  - `@` → A → 121.40.158.46（TTL 10分钟）
  - `www` → A → 121.40.158.46（TTL 10分钟）

### 1.2 hCaptcha 人机验证
- 注册 hCaptcha Pro（14 天免费试用，2026-06-06 到期）
- 密钥：
  - Site Key: `4adaab14-2398-43a0-bbd6-8cbe69deab72`
  - Secret Key: `<your-hcaptcha-secret-key>`
- 后台 Domains：`tothetomorrow.com`、`www.tothetomorrow.com`
- 本地开发：hosts `127.0.0.1 ninewood.local`，vite.config `allowedHosts`

### 1.3 代码仓库
- GitHub: https://github.com/Ljm1023666/ninewood（公开）
- 已推送关键版本：
  - `78a298b` fix: 构建脚本自动复制 JSON 数据文件到 dist
  - `2078983` fix: server tsconfig 关闭 declaration 避免 pnpm TS2883
  - `021d213` chore: 添加服务器部署脚本
  - `e08a980` hCaptcha — 人机验证集成 + 隐私政策/服务条款页面 + 注册流程重构
  - `fdb181d` AI 1.6 — Agent 对话系统 + AI 服务层重构 + Redis 集成 + Deposit 重构 + 安全增强

### 1.4 服务器连接
- 阿里云控制台 → ECS → 实例 → 远程连接 → Workbench 远程连接
- 用户：root，密码：baby.3134

---

## 2. 服务器部署

### 2.1 拉取代码

```bash
git clone https://github.com/Ljm1023666/ninewood.git /opt/ninewood
```

**结果**: 成功 (2026-05-24 13:15 UTC)

### 2.2 安装系统依赖

```bash
# 跳过 husky（服务器不需要 git hooks）
export HUSKY=0
cd /opt/ninewood
pnpm install
```

**已知问题**: `pnpm install` 不设置 `HUSKY=0` 会因 husky 脚本失败而报 `[ELIFECYCLE]` 错误。

### 2.3 配置环境变量

创建 `/opt/ninewood/server/.env`：
```
DATABASE_URL="postgresql://ninewood:<password>@localhost:5432/nine_db?schema=public"
JWT_SECRET="ninewood-prod-jwt-<random>"
PORT=3001
CORS_ORIGINS=https://tothetomorrow.com,https://www.tothetomorrow.com
AI_BASE_URL=https://api.minimax.chat/v1
AI_API_KEY=
AI_MODEL=MiniMax-M2.7-highspeed
HCAPTCHA_SITE_KEY=4adaab14-2398-43a0-bbd6-8cbe69deab72
HCAPTCHA_SECRET_KEY=<your-hcaptcha-secret-key>
TENCENT_SECRET_ID=<your-tencent-secret-id>
TENCENT_SECRET_KEY=<your-tencent-secret-key>
TENCENT_SMS_APPID=1401114458
TENCENT_SMS_SIGN=乌鲁木齐往昔科技有限公司
TENCENT_SMS_TEMPLATE=2631789
```

### 2.4 数据库初始化

```bash
su - postgres -c "psql -c \"ALTER USER ninewood WITH PASSWORD '<password>';\""
cd /opt/ninewood/server
npx prisma generate
npx prisma db push
```

### 2.5 构建

```bash
cd /opt/ninewood/server
npm run build          # tsc + 复制 JSON 数据文件
cd /opt/ninewood/client-react
npx vite build         # 前端生产构建
```

### 2.6 启动服务

```bash
pm2 start /opt/ninewood/server/dist/index.js --name ninewood
pm2 save
```

### 2.7 nginx 配置

配置文件 `/etc/nginx/sites-available/ninewood`：
- 80 端口 → 301 跳转 HTTPS
- 443 端口 → 前端静态文件 (`/opt/ninewood/client-react/dist`)
- `/api` → 代理到 `http://localhost:3001`
- `/uploads` → 代理到 `http://localhost:3001`
- `/socket.io` → WebSocket 代理到 `http://localhost:3001`

### 2.8 SSL 证书

```bash
certbot --nginx -d tothetomorrow.com -d www.tothetomorrow.com
```

**踩坑**: 需要在阿里云安全组放开 80/443 入方向端口，否则 Let's Encrypt 验证超时。

### 2.9 阿里云安全组

ECS → 安全组 → 入方向 → 允许：
- 80 TCP 0.0.0.0/0
- 443 TCP 0.0.0.0/0
- 22 TCP 0.0.0.0/0

---

## 3. 踩坑记录

| 问题 | 原因 | 解决 |
|------|------|------|
| `pnpm install` 失败 | husky 在服务器上找不到 git 配置 | `export HUSKY=0` 再装 |
| TypeScript 编译 52→17→4→9 错误 | Express 4/5 类型包共存，pnpm `.pnpm` 路径解析 | `--skipLibCheck` 跳过库检查；9 个剩余错误是 `express-rate-limit`/`multer`/`swagger-ui-express` 的二级依赖类型，不影响 JS 输出 |
| `taxonomy-data.json` 缺失 | `tsc` 只编译 `.ts`，不复制数据文件 | `cp src/*.json dist/`，已加到 `build` 脚本 |
| pm2 进程停不掉 | `pm2 kill` 输到被日志淹掉的终端 | 新开终端窗口执行 |
| Let's Encrypt 超时 | 阿里云安全组未开放 80/443 | 安全组添加入方向规则 |
| 本地无类型错误，服务器有 | `@types/express@4` 被其他依赖引入的 `@types/express@5` 覆盖 | 最终方案：`tsc --skipLibCheck` |

---

## 4. 环境对比

| | 本地开发 | 云服务器 |
|------|------|------|
| **目的** | 写代码、调试 | 对外提供服务 |
| **访问方式** | `ninewood.local:5174` | `https://tothetomorrow.com` |
| **数据库** | `localhost:5432` (本机 PG) | `localhost:5432` (ECS PG) |
| **API** | Vite 代理 → `localhost:3001` | nginx → `localhost:3001` |
| **前端** | Vite dev server (HMR) | nginx 托管构建产物 |
| **两者关系** | 无直接联系，通过 git 同步代码 | 无直接联系 |

---

## 5. 常用运维命令

```bash
pm2 status              # 查看服务状态
pm2 logs ninewood       # 查看日志
pm2 restart ninewood    # 重启
git pull && npm run build -w server && pm2 restart ninewood   # 更新代码
certbot renew           # 手动续期 SSL（自动续期已配置）
```

# 九木 (Ninewood) 部署文档

## 环境要求

- Node.js >= 22
- pnpm >= 9
- PostgreSQL >= 16
- Redis >= 7（可选，目前未强制）

---

## 一、Docker 部署（推荐）

### 1. 克隆并配置

```bash
git clone <repo-url> ninewood
cd ninewood
cp .env.example .env   # 编辑环境变量
```

### 2. 启动

```bash
# 构建并启动所有服务
docker compose up -d --build

# 初始化数据库
docker compose exec server npx prisma migrate deploy
docker compose exec server npx prisma db seed

# 查看日志
docker compose logs -f
```

### 3. 访问

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost |
| API 文档 | http://localhost/api-docs |
| 后端直连 | http://localhost:3001 |

---

## 二、裸机部署（开发用）

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
# server/.env
DATABASE_URL=postgresql://user:password@localhost:5432/ninewood
JWT_SECRET=your_secret_here
SENTRY_DSN=your_sentry_dsn  # 可选
```

### 3. 初始化数据库

```bash
pnpm --filter server run db:push
pnpm --filter server run db:seed
```

### 4. 启动

```bash
# 终端 1: 后端
pnpm --filter server run dev

# 终端 2: 前端
pnpm --filter client-react run dev
```

---

## 三、环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | 必填 |
| `JWT_SECRET` | JWT 签名密钥 | 必填 |
| `SENTRY_DSN` | Sentry 错误追踪 DSN | 可选 |
| `NODE_ENV` | 环境模式 | `development` |
| `PORT` | 服务端端口 | `3001` |
| `VITE_SENTRY_DSN` | 前端 Sentry DSN | 可选 |

---

## 四、CI/CD

项目使用 GitHub Actions 自动执行：

| 触发条件 | 执行内容 |
|----------|----------|
| Push 到 main/develop | Lint → Test → Build |
| PR 到 main | Lint → Test → Build |

配置文件：`.github/workflows/ci.yml`

---

## 五、数据库

```bash
# 生成 Prisma 客户端
pnpm --filter server run db:generate

# 推送 schema 变更（开发）
pnpm --filter server run db:push

# 执行迁移（生产）
pnpm --filter server exec prisma migrate deploy

# 填充种子数据
pnpm --filter server run db:seed
```

---

## 六、监控

| 工具 | 用途 | 配置方式 |
|------|------|----------|
| Sentry | 错误追踪 & 性能监控 | 设置 `SENTRY_DSN` / `VITE_SENTRY_DSN` |
| 健康检查 | 服务存活检测 | `GET /api/health` |

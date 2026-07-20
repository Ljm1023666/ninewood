# Ninewood 配置信息

> 最后更新：2026-07-16（Ninewood 生产 ECS → 8.217.208.203；客户端统一走域名）

## 云服务器

| 项目 | 值 |
|------|-----|
| 实例名 | launch-advisor-20260608 |
| 公网 IP | **8.217.208.203** |
| 内网 IP | 172.22.214.112 |
| 实例 ID | i-j6cbw5rsmyhi7aazt5bb |
| 地域 | 中国香港（D 区） |
| 配置 | 阿里云 ECS 2vCPU / 2GiB（`ecs.e-c1m1.large`） |
| 系统 | Ubuntu 22.04 64-bit |
| 磁盘 | 40GB ESSD Entry |
| root 密码 | baby.3134 |
| SSH 登录 | Workbench 或 `ssh root@8.217.208.203` |
| code 部署路径 | /opt/ninewood |
| PM2 进程 | `ninewood`（Node :3001）；分类器 python :8001 |
| nginx | `/etc/nginx/sites-available/ninewood`（HTTP+HTTPS；`/api` `/uploads` `/socket.io` → 127.0.0.1:3001） |
| SSL | ✅ Let's Encrypt：`tothetomorrow.com` / `www`（2026-07-15 签发，约 2026-10-13 到期；另有 bot/xian 子域证） |
| 状态 | ✅ 2026-07-15 运行中 |
| 旧机（废弃） | 8.218.95.92（上一台）；更早 121.40.158.46 — 勿再当作 Ninewood 生产入口；bot/xian 仍可能在旧机 |

## 数据库（云服务器 PostgreSQL）

| 项目 | 值 |
|------|-----|
| 运行方式 | Docker：`ninewood-postgres-1`（`postgres:16-alpine`），仅监听 `127.0.0.1:5432` |
| 数据库名 | **`ninewood`**（不是本地的 `nine_db`） |
| 用户 | ninewood |
| 密码 | 与云端 `/opt/ninewood/server/.env` 中 `DATABASE_URL` 一致 |
| 连接(服务器本机) | `postgresql://ninewood:***@127.0.0.1:5432/ninewood?schema=public` |
| 连接(本地电脑) | SSH 隧道：`ssh -L 15432:127.0.0.1:5432 root@8.217.208.203`，再连 `localhost:15432`（勿占本地 5433） |
| Redis | Docker：`ninewood-redis-1` → `127.0.0.1:6379` |

> **2026-07-15**：已将本地库数据 + uploads 推上云端；证书/DNS 同日切到新机。**注意**：iOS 已连本机业务库/API——改运维时禁止停 Postgres / 改 `DATABASE_URL` / 清空 schema。

## 数据库（本地开发 PostgreSQL）

| 项目 | 值 |
|------|-----|
| 版本 | **PostgreSQL 18**（端口 **5433**；勿与云隧道端口混用） |
| 数据库 | nine_db |
| 用户 | postgres |
| 密码 | 198514 |
| 连接 | `postgresql://postgres:198514@localhost:5433/nine_db` |

## 域名 / DNS

| 项目 | 值 |
|------|-----|
| 域名 | tothetomorrow.com |
| 注册商 | 阿里云 |
| 公网 A 记录 | `@` / `www` → **`8.217.208.203`**（2026-07-16 已切；旧 `8.218.95.92` / `121.40.158.46` 废弃） |
| HTTPS | 已启用；`certbot` 自动续期 |

## hCaptcha

| 项目 | 值 |
|------|-----|
| Site Key | 4adaab14-2398-43a0-bbd6-8cbe69deab72 |
| Secret Key | <在 server/.env 中> |
| 域名 | tothetomorrow.com, www.tothetomorrow.com |

## 腾讯云 SMS

| 项目 | 值 |
|------|-----|
| Secret ID | <在 server/.env 中> |
| Secret Key | <在 server/.env 中> |
| App ID | 1401114458 |
| 签名 | 乌鲁木齐往昔科技有限公司 |
| 模板 | 2631789 |

## AI 配置（server/.env）

| 项目 | 值 |
|------|-----|
| 供应商 | MiniMax |
| Base URL | https://api.minimax.chat/v1 |
| API Key | (待设置) |
| 默认模型 | MiniMax-M2.7-highspeed |
| Think 模型 | (空，回退到默认) |
| Fast 模型 | (空，回退到默认) |

## 语义分类器（Python）

| 项目 | 值 |
|------|-----|
| 端口 | 8001 |
| 路径 | /opt/ninewood/server/classifier |
| 虚拟环境 | .venv (Python 3.10) |
| 模型 | BAAI/bge-small-zh-v1.5 (192MB) |
| 托管 | 进程监听 :8001（以实机为准） |

## CORS 配置

| 来源 | 说明 |
|------|------|
| https://tothetomorrow.com | 正式域名（客户端唯一生产入口） |
| https://www.tothetomorrow.com | www 子域名 |
| http://localhost:3080 | 本地 Vite 开发 |
| app://. | Electron 本地 dist（file:/app 协议时） |

## 本地素材库（头像 / 主页背景 / 卡面）

| 项目 | 值 |
|------|-----|
| 源目录 | `D:\picture`（勿提交 Git） |
| `avatar/` | 用户头像 → `server/uploads/avatars/avatar_XX.{ext}` |
| `backgrounds/` | 个人主页背景 → `server/uploads/covers/cover_XX.{ext}` |
| `cards/` | 需求卡封面 → `server/uploads/card-covers/100XX.{ext}` |
| 同步命令 | `cd server && npm run assets:sync` |
| 写入数据库 | `cd server && FORCE_ASSET_ASSIGN=1 npm run assets:assign` |
| 清单文件 | `server/uploads/.asset-manifest.json`（同步后生成） |

当前规模（2026-06-15）：头像 12 · 背景 45 · 卡面 19

## 本地启动

| 项目 | 值 |
|------|-----|
| 脚本 | `D:\ninewood\scripts\start-ninewood.bat`（若路径迁移需自行改） |
| 启动内容 | Server(3001) + Client(3080) + Electron |

## GitHub

| 项目 | 值 |
|------|-----|
| 仓库 | https://github.com/Ljm1023666/ninewood |
| 用户 | Ljm1023666 |
| 可见性 | 公开 |

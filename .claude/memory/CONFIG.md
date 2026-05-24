# Ninewood 配置信息

> 最后更新：2026-05-24

## 云服务器

| 项目 | 值 |
|------|-----|
| 公网 IP | 121.40.158.46 |
| 内网 IP | 172.24.4.229 |
| 实例 ID | iZbp10ts0x7eaw4ttrz7rpZ |
| 配置 | 阿里云 ECS 4核8G 通用算力型 u1 |
| 系统 | Ubuntu 22.04 |
| 磁盘 | 40GB ESSD |
| root 密码 | baby.3134 |
| SSH 登录 | Workbench 远程连接 或 `ssh root@121.40.158.46` |
| code 部署路径 | /opt/ninewood |
| PM2 进程 | ninewood (3001), classifier (8001) |
| nginx 配置 | /etc/nginx/sites-available/ninewood |
| SSL 证书 | Let's Encrypt, 自动续期, /etc/letsencrypt/live/tothetomorrow.com/ |
| 状态 | ⚠️ 2026-05-24 已停止（节省停机模式），公网 IP 可能改变；重启后需 `pm2 resurrect` 恢复服务 |
| DNS | 重启后若 IP 变了，需在阿里云更新 @ 和 www 两条 A 记录指向新 IP |

## 数据库（云服务器 PostgreSQL）

| 项目 | 值 |
|------|-----|
| 数据库 | nine_db |
| 用户 | ninewood |
| 密码 | baby.3134 |
| 连接(本地) | SSH 隧道 localhost:5433 → 服务器 localhost:5432 |

## 数据库（本地开发 PostgreSQL）

| 项目 | 值 |
|------|-----|
| 数据库 | nine_db |
| 用户 | postgres |
| 密码 | 123456 |
| 连接 | localhost:5432 |

## 域名

| 项目 | 值 |
|------|-----|
| 域名 | tothetomorrow.com |
| 注册商 | 阿里云 |
| DNS | @ → 121.40.158.46, www → 121.40.158.46 |

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
| 索引 | FAISS, 723 个向量 |
| 托管 | PM2 (classifier) |

## CORS 配置

| 来源 | 说明 |
|------|------|
| https://tothetomorrow.com | 正式域名 |
| https://www.tothetomorrow.com | www 子域名 |
| http://localhost:5173 | 本地 Vite 开发 |
| http://localhost:5174 | 本地 Vite (备用端口) |
| app://. | Electron 客户端 |

## 桌面快捷方式

| 项目 | 值 |
|------|-----|
| 脚本 | E:\Ninewood\scripts\start-ninewood.bat |
| 快捷方式 | 桌面\Ninewood.lnk |
| 启动内容 | Server(3001) + Client(5174) + Electron |

## GitHub

| 项目 | 值 |
|------|-----|
| 仓库 | https://github.com/Ljm1023666/ninewood |
| 用户 | Ljm1023666 |
| 可见性 | 公开 |

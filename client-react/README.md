# Ninewood 前端（client-react）

九木平台 React 渲染层，同时作为 Electron 桌面应用的 UI 入口。

完整的环境搭建、数据库初始化与测试账号见仓库根目录 [README.md](../README.md)。

---

## 技术栈

- React 19 + TypeScript 6
- Vite 8（开发端口 **5174**）
- Tailwind CSS v4（`@tailwindcss/vite`）
- React Router 7
- Zustand
- Axios
- Radix UI + 项目内 UI 组件

---

## 开发

在仓库根目录执行：

```bash
pnpm run dev:client        # 仅前端
pnpm run dev               # 前后端并行（推荐）
pnpm run dev:electron      # Electron 桌面模式
```

本地地址：http://localhost:5174

Vite 将 `/api`、`/uploads`、`/socket.io` 代理到 `http://localhost:3001`。

---

## 目录说明

```text
src/
├── views/           # 页面级组件（路由入口）
├── components/      # 可复用组件（ui/、layout/、card-pool/ …）
├── stores/          # Zustand 状态
├── api/             # HTTP 封装
├── router/          # 路由配置
└── styles/          # 全局与子系统 CSS

electron/
├── main.cjs         # 主进程
└── preload.cjs      # 预加载桥（window.electronAPI）
```

路径别名：`@` → `src/`（见 `vite.config.ts`、`tsconfig.app.json`）。

---

## 质量检查

```bash
pnpm run typecheck              # 在仓库根目录
pnpm run lint -w client-react
pnpm run test -w client-react
```

---

## 用户帮助

- **帮助中心** `/help`：智能跳转 + 常见问题入口
- **帮助文档** `/help/docs`：完整 FAQ（数据源 `src/views/help-faq-data.ts`）

更新产品说明时，请同步修改 `help-faq-data.ts` 中的对应条目。

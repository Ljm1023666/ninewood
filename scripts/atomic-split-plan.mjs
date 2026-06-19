/**
 * 原子提交拆分计划 — 见 build-atomic-history.mjs
 */

/** @typedef {{ message: string, paths: string[] }} AtomicPart */
/** @typedef {{ hash: string, parts: AtomicPart[] | null }} SplitPlan */

/** @type {SplitPlan[]} */
export const SPLIT_PLAN = [
  { hash: '043d598', parts: null },
  { hash: 'dc5eaa3', parts: [
    { message: 'feat(client): 初始化 client-react 脚手架', paths: ['client-react/'] },
    { message: 'chore: 引入 ui-design skill 与 MCP 配置', paths: ['.mcp.json', '.claude/skills/ui-design/', 'CLAUDE.md'] },
    { message: 'feat(server): 扩展 server API 与配置', paths: ['server/'] },
  ]},
  { hash: 'ac60ade', parts: null },
  { hash: '481262b', parts: null },
  { hash: 'f998e1e', parts: [
    { message: 'chore: Husky / ESLint / Prettier 工程化基线', paths: ['.husky/', 'client-react/.eslintrc.js', 'client-react/.husky/', 'client-react/.prettierrc', 'client-react/eslint.config.js', 'client-react/package.json'] },
    { message: 'feat(ui): sidebar 与 Aceternity 按钮库', paths: ['client-react/src/components/blocks/', 'client-react/src/components/ui/'] },
    { message: 'feat(discover): 发现页搜索筛选与 DemandDiscoveryList', paths: ['client-react/src/components/demand/DemandDiscoveryList.tsx', 'client-react/src/components/layout/', 'client-react/src/views/Discover.tsx', 'client-react/src/views/Home.tsx'] },
    { message: 'chore: CLAUDE.md 与测试脚手架', paths: ['CLAUDE.md', 'client-react/src/components/tests/'] },
  ]},
  { hash: '7c44fa0', parts: [
    { message: 'chore: Agent skills 与 Claude memory 导入', paths: ['.claude/', '.gitignore', 'CLAUDE.md'] },
    { message: 'feat(card-pool): 卡池 taxonomy 与核心交互', paths: ['client-react/src/components/card-pool/', 'client-react/src/views/CardPool.tsx', 'client-react/src/views/CardPoolResourceExplorer.tsx'] },
    { message: 'chore: Vue client 移入 archive', paths: ['archive/'] },
  ]},
  { hash: '3aba25d', parts: null },
  { hash: '1dec134', parts: null },
  { hash: 'f7311e8', parts: null },
  { hash: '3f2b935', parts: [
    { message: 'feat(ui): liquid-glass / prompt-input / canvas 组件', paths: ['client-react/src/components/ui/liquid-glass-button.tsx', 'client-react/src/components/ui/prompt-input-box.tsx', 'client-react/src/components/ui/canvas-reveal-effect.tsx', 'client-react/src/components/ui/dot-matrix-bg.tsx'] },
    { message: 'feat(card-pool): taxonomy 重构与 HandPile', paths: ['client-react/src/components/card-pool/'] },
    { message: 'feat(ui): theme store 与 PageTransition', paths: ['client-react/src/stores/theme.ts', 'client-react/src/components/layout/PageTransition.tsx', 'client-react/src/index.css'] },
  ]},
  { hash: 'fef9fb2', parts: [
    { message: 'feat(demand): Workspace 组件与 workspace store', paths: ['client-react/src/components/demand/WorkspaceFields.tsx', 'client-react/src/components/demand/WorkspaceSummary.tsx', 'client-react/src/components/demand/WorkspaceTools.tsx', 'client-react/src/stores/demand-workspace.ts'] },
    { message: 'feat(demand): DemandCreate 与 Discover 重构', paths: ['client-react/src/views/DemandCreate.tsx', 'client-react/src/views/Discover.tsx', 'client-react/src/views/CardPoolResourceExplorer.tsx'] },
    { message: 'feat(ai): 扩展 server AI routes', paths: ['server/src/routes/ai.ts', 'server/src/config.ts', 'server/src/services/demand.service.ts'] },
  ]},
  { hash: 'c9eb94b', parts: [
    { message: 'feat(classifier): FAISS 语义分类器初版', paths: ['server/classifier/', 'server/src/classifier.ts', 'server/src/services/semantic-classifier.ts', 'server/src/taxonomy.ts'] },
    { message: 'feat(ui): Canvas 管理与 material-switch', paths: ['client-react/src/components/ui/canvas-manager.tsx', 'client-react/src/components/ui/canvas-modal.tsx', 'client-react/src/components/ui/material-switch.tsx', 'client-react/src/stores/canvas.ts'] },
    { message: 'feat(demand): Workspace 与 DemandCreate 微调', paths: ['client-react/src/components/demand/', 'client-react/src/views/DemandCreate.tsx', 'client-react/src/views/Discover.tsx', 'client-react/src/stores/demand-workspace.ts'] },
  ]},
  { hash: 'a75b6fe', parts: null },
  { hash: '42f7b62', parts: [
    { message: 'ci: GitHub Actions 与 Docker 部署', paths: ['.github/', 'docker-compose.yml', 'client-react/Dockerfile', 'DEPLOY.md'] },
    { message: 'feat(card-pool): 开包动画与 intro 动画', paths: ['client-react/src/components/card-pool/PackOpeningAnimation.tsx', 'client-react/src/components/ui/animate-card-animation.tsx', 'client-react/src/components/ui/intro-animation.tsx'] },
    { message: 'docs: REASONIX 设计文档', paths: ['REASONIX.md', 'DESIGN.md'] },
  ]},
  { hash: 'fb69c39', parts: null },
  { hash: 'fdb181d', parts: [
    { message: 'feat(agent): Agent 对话 executor 与 tool-registry', paths: ['server/src/services/agent/', 'server/src/routes/agent.ts'] },
    { message: 'feat(infra): Redis 集成与 Deposit 重构', paths: ['server/src/services/deposit', 'server/src/config.ts'] },
    { message: 'refactor(ai): AI 服务层与安全增强', paths: ['server/src/routes/ai.ts', 'server/src/middleware/'] },
  ]},
  { hash: '38d9f78', parts: null },
  { hash: 'ee12978', parts: [
    { message: 'feat(card-pool): 活池/死池分流', paths: ['client-react/src/views/CardPool.tsx', 'client-react/src/views/DeadPool.tsx', 'client-react/src/components/card-pool/'] },
    { message: 'feat(tags): 标签系统与地域筛选', paths: ['client-react/src/views/MyTags.tsx', 'client-react/src/views/UserTagsManage.tsx', 'server/src/routes/user-tag.ts', 'server/prisma/'] },
    { message: 'feat(classifier): 语义分类器集成与种子数据', paths: ['server/classifier/', 'server/src/classifier.ts', 'server/prisma/seed.ts'] },
  ]},
  { hash: 'f6b6c83', parts: [
    { message: 'feat(ui): 星空/粒子首页与发现页视觉', paths: ['client-react/src/components/ui/horizon-hero-section.tsx', 'client-react/src/components/ui/pixel-logo-grid.tsx', 'client-react/src/views/Home.tsx', 'client-react/src/views/Discover.tsx'] },
    { message: 'feat(ui): 玻璃卡片与 UI 组件库扩展', paths: ['client-react/src/components/ui/'] },
    { message: 'feat(pages): 许可页面与帮助文档优化', paths: ['client-react/src/views/Licenses.tsx', 'client-react/src/views/Help.tsx'] },
  ]},
  { hash: '4697fa9', parts: [
    { message: 'feat(help): 帮助文档结构重构', paths: ['client-react/src/views/Help.tsx', 'client-react/src/views/Help.test.tsx'] },
    { message: 'feat(pages): 许可页面与发现页优化', paths: ['client-react/src/views/Licenses.tsx', 'client-react/src/views/Discover.tsx'] },
    { message: 'refactor(theme): theme store 重写', paths: ['client-react/src/stores/theme.ts', 'client-react/src/index.css'] },
  ]},
  { hash: '86bb9ea', parts: [
    { message: 'feat(home): 首页/发现页合并', paths: ['client-react/src/views/Home.tsx', 'client-react/src/views/Discover.tsx', 'client-react/src/router/index.tsx'] },
    { message: 'feat(ui): 星空背景优化与 UI 质量提升', paths: ['client-react/src/components/ui/', 'client-react/src/index.css'] },
  ]},
  { hash: '5441daf', parts: [
    { message: 'feat(admin): 管理后台四 Tab', paths: ['client-react/src/views/AdminDashboard.tsx', 'client-react/src/views/admin/'] },
    { message: 'feat(welfare): 福利中心', paths: ['client-react/src/views/WelfareCenter.tsx'] },
    { message: 'feat(trade): 交易系统与订单', paths: ['client-react/src/views/TransactionHistory.tsx', 'client-react/src/views/Orders.tsx', 'client-react/src/views/OrderDetail.tsx', 'client-react/src/views/Payment.tsx'] },
    { message: 'feat(stats): 标签统计仪表盘', paths: ['client-react/src/views/TagStatsDashboard.tsx', 'server/src/services/tag-stats.ts'] },
    { message: 'feat(ui): UI 组件库扩展', paths: ['client-react/src/components/ui/'] },
  ]},
  { hash: '23e5c84', parts: [
    { message: 'feat(classifier): Python FAISS 语义分类服务集成', paths: ['server/classifier/', 'server/src/classifier.ts', 'server/src/services/semantic-classifier.ts'] },
    { message: 'feat(agent): Agent tools 全功能重构', paths: ['server/src/services/agent/', 'client-react/src/views/AgentChat.tsx', 'client-react/src/api/agent.ts'] },
    { message: 'fix(card-pool): 卡池修复', paths: ['client-react/src/views/CardPool.tsx', 'client-react/src/components/card-pool/'] },
  ]},
  { hash: '01dcccf', parts: null },
  { hash: 'd995c7b', parts: [
    { message: 'docs: 根 README、帮助 FAQ 与 LLM 配置文档', paths: ['README.md', 'docs/', '.claude/memory/'] },
    { message: 'chore: Electron 开发与资产同步脚本', paths: ['scripts/'] },
    { message: 'feat(server): Agent 工具链与 LLM 环境检查', paths: ['server/'] },
    { message: 'feat(ui): 全局可读性与样式令牌', paths: ['client-react/src/index.css', 'client-react/index.html', 'client-react/public/'] },
    { message: 'feat(ui): InternalPageShell 与 Pro 壳', paths: ['client-react/src/components/layout/internal-ui.tsx', 'client-react/src/utils/internal-routes.ts', 'client-react/src/styles/', 'client-react/src/components/layout/PageHeader.tsx', 'client-react/src/components/layout/Layout.tsx'] },
    { message: 'feat(view): 市场分析 SPA Tab 化', paths: ['client-react/src/views/TagStatsDashboard.tsx'] },
    { message: 'feat(ui): 内部页 Pro Shell 批量接入', paths: ['client-react/src/views/'] },
    { message: 'feat(ui): 共享 UI 组件与 Agent Codex 样式', paths: ['client-react/src/components/ui/', 'client-react/src/styles/agent-codex.css', 'client-react/src/constants/', 'client-react/src/api/agent.ts', 'client-react/src/types/'] },
  ]},
  { hash: '52561c1', parts: null },
  { hash: 'b6ea2b5', parts: null },
  { hash: '7c8817a', parts: null },
  { hash: '@master', parts: null },
];

export const ATOMIC_BRANCH = 'history/atomic';

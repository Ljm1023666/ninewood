# Ninewood 功能级工程文档

> 范围：卡池、发布需求、圈子、消息聊天、Electron 桌面集成  
> 目标读者：前后端开发、测试、产品、后续维护者  
> 更新时间：2026-05-15

---

## 1. 文档约定

- **功能入口**：前端路由路径与页面入口文件。
- **核心流程**：用户动作到接口调用再到状态更新的闭环。
- **状态与持久化**：页面状态、全局 store、本地持久化位置。
- **接口契约**：前端调用的 API 方法（以 `src/api/*.ts` 为准）。
- **异常与回退**：加载失败、空数据、权限限制等行为。
- **测试点**：建议优先做自动化回归的关键点。

---

## 2. 卡池功能（CardPool + 资源管理器）

### 2.1 功能入口

- 路由：
  - `/card-pool` -> `client-react/src/views/CardPool.tsx`
  - `/card-pool/explorer` -> `client-react/src/views/CardPoolResourceExplorer.tsx`
- 相关核心组件：
  - `components/card-pool/useTableState.ts`
  - `components/card-pool/search-params.ts`
  - `components/card-pool/taxonomy.ts`
  - `components/demand/DemandDiscoveryList.tsx`

### 2.2 核心流程

1. 进入页面后根据当前 `focus` 计算可见分类节点与总数。
2. 调用 `fetchTotalForScope` 拉取当前 scope 统计，子分类并发拉取统计。
3. 叶子层触发 `fetchFirstDemandId`，有数据时自动打开桌面列表区。
4. 用户可把分类加入手牌、从桌面递归回手牌、在弃牌区恢复。
5. 桌面列表通过 `DemandDiscoveryList` 按分类参数实时请求需求数据。

### 2.3 状态与持久化

- 核心状态：`focus`、`hand`、`discard`、`desktopOpen`、`scopeTotal`、`childTotals`。
- 本地持久化：
  - `ninewood.cardPool.desktopGridRows`（桌面列表行数）
  - 共享焦点（`tablePersistence.ts`）
- 手/弃牌跨页面共享：`usePersistedGlobalHand`。

### 2.4 接口与参数映射

- 统计/列表参数由 `scopeToApiParams` 统一转换，按 `taxonomyLeafId` 与 `taxonomyLeafIds` 过滤。
- 列表组件请求来自 `DemandDiscoveryList` 内部调用 `demandApi.list`（通过 `listScope` 注入）。

### 2.5 异常与回退策略

- `fetchFirstDemandId` 为空：提示“当前范围内暂无需求”，不打开桌面。
- 分类映射失败：提示“无法映射该需求的分类到黑卡”。
- 重复加入手牌：提示“该范围已在手牌中”。

### 2.6 测试点（优先）

- 叶子层自动打开桌面行为是否正确。
- `focus` 在卡池与资源管理器间同步是否一致。
- 手牌/弃牌恢复与去重逻辑是否稳定。
- `taxonomyLeafId` 过滤下统计数与列表条数是否一致。

---

## 3. 发布需求功能（DemandCreate）

### 3.1 功能入口

- 路由：`/demands/create`
- 文件：`client-react/src/views/DemandCreate.tsx`

### 3.2 核心流程

1. 初始化表单（`react-hook-form + zodResolver`）。
2. 根据 `serviceType` 动态计算可选叶子分类（`subtreeLeafIds`）。
3. 自动维护 `taxonomyLeafId <-> category` 的一致性。
4. 提交时构造 `FormData` 并调用 `demandApi.create`。
5. 成功后跳转：
   - 圈内发布：回到 `/circles/:id`
   - 普通发布：跳转 `/my-demands`

### 3.3 关键校验

- 标题：2-100 字
- 描述：2-2000 字
- 预算：1-999999
- 分类：`category` + `taxonomyLeafId` 必填
- 服务方式：`ONLINE/OFFLINE`
- 有效期：1-30 天

### 3.4 状态

- `submitting`：防重复提交
- `hasFrozen`：若存在冻结需求，禁止发布
- `serviceType`、`taxonomyLeafId`：驱动动态分类选项

### 3.5 异常处理

- `create` 失败：toast 统一提示后端消息或兜底文案。
- 用户冻结状态：页面内红色警示提示并禁用提交按钮。

### 3.6 测试点（优先）

- `serviceType` 切换后分类列表是否正确刷新。
- `taxonomyLeafId` 与 `category` 联动是否保持一致。
- 圈内发布场景跳转是否正确。
- 冻结状态下提交按钮是否严格禁用。

---

## 4. 圈子功能（Circles + CircleDetail）

### 4.1 功能入口

- 路由：
  - `/circles` -> `client-react/src/views/Circles.tsx`
  - `/circles/:id` -> `client-react/src/views/CircleDetail.tsx`
- API：`client-react/src/api/circle.ts`

### 4.2 核心流程

#### 圈子列表（Circles）

1. 并发请求公开圈与我的圈：`circleApi.list()` + `circleApi.my()`。
2. 展示卡片网格，含封面、简介、成员数、角色/公开标记。
3. 支持创建圈子弹层：`circleApi.create(...)`。
4. 点击卡片进入详情页。

#### 圈子详情（CircleDetail）

1. `fetchAll` 并发拉取详情与圈内需求：
   - `circleApi.get(id)`
   - `circleApi.getDemands(id)`
2. 根据用户身份计算 `isMember / canJoin`。
3. 公开圈可一键加入：`circleApi.join(id)`。
4. 圈内需求复用 `DemandCardInner` 展示。

### 4.3 状态机简述

- `loading -> ready` / `loading -> error`
- `joinBusy` 控制加入按钮
- `showMembers` 控制成员折叠展开

### 4.4 异常与边界

- 圈子状态 `DEFUNCT`：详情中提示失效，禁加入。
- 私密圈且非成员：显示“仅邀请加入”提示。
- 无圈内需求：展示空态和引导操作。

### 4.5 测试点（优先）

- 公开圈加入后状态刷新（按钮消失/成员身份切换）。
- 圈子详情封面缺失与存在两种渲染路径。
- 成员列表展开/收起与跳转用户主页。

---

## 5. 消息与聊天功能（Messages + ChatDetail）

### 5.1 功能入口

- 路由：
  - `/messages`（含嵌套路由）
  - `/messages/:userId`
  - `/messages/merge/:mergeId`
- 文件：
  - `client-react/src/views/MessagesLayout.tsx`
  - `client-react/src/views/ChatDetail.tsx`
- API：`client-react/src/api/message.ts`

### 5.2 核心流程

#### 会话列表

1. 拉取私聊会话：`messageApi.conversations()`
2. 拉取合并会话：`messageApi.getMerges()`
3. 合并成统一 `TemplateContact[]` 提供给聊天模板 UI。

#### 聊天详情

1. 根据 URL 判断私聊/群聊模式。
2. 私聊：
   - 初始化拉取历史消息：`fetchMessages(peerId)`
   - 发送文本：`messageApi.send(...)`
   - 发送文件/语音：`messageApi.sendForm(FormData)`
3. 群聊：
   - 拉取群消息：`getMergeMessages(mergeId)`
   - 发送群消息：`sendMergeMessage(mergeId, content)`
4. 若 socket 未连接，退化到 10 秒轮询。

### 5.3 关键状态

- `connected`（socket 连接态）
- `messages / mergeMessages`
- `isVoiceMode / isRecording`
- `uploadFile / uploadPreview`

### 5.4 异常与边界

- 与自己私聊会重定向回 `/messages`。
- 语音录制权限失败会自动退出语音模式。
- 合并会话与私聊的消息模型不同，按路由分流处理。

### 5.5 测试点（优先）

- 私聊与群聊路由切换的数据隔离。
- socket 断连时轮询补偿逻辑。
- 文件/语音消息发送后列表刷新与滚底行为。

---

## 6. Electron 桌面集成功能

### 6.1 入口与组件

- 主进程：`client-react/electron/main.cjs`
- 预加载：`client-react/electron/preload.cjs`
- 渲染层按钮接入：`client-react/src/components/layout/Layout.tsx`
- 类型声明：`client-react/src/types/electron-api.d.ts`
- 打包配置：`client-react/electron-builder.json`

### 6.2 当前能力

- 安全基线：
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- 渲染层可调用：
  - `window.electronAPI.minimizeWindow()`
  - `window.electronAPI.maximizeWindow()`
  - `window.electronAPI.quitApp()`
- IPC 模式：`ipcMain.handle` + `ipcRenderer.invoke`

### 6.3 启动与打包

- Electron 开发：`npm run dev:electron`（根）
- 生成安装包：`npm run build:electron`（根）
- 产物目录：`client-react/release/`

### 6.4 风险与约束

- `main.cjs` 仍保留开发便利逻辑（如证书处理）；发布前需按生产策略收敛。
- 安装包产物不应入库（建议持续通过 `.gitignore` 控制）。

---

## 7. 跨功能共性规范

### 7.1 统一错误处理

- 页面级失败：错误态 + 重试按钮
- 操作级失败：toast 消息提示

### 7.2 统一数据契约策略

- 前端筛选参数统一由专用转换层生成（例如卡池 scope -> api params）
- 表单提交优先使用后端可直接消费的字段（例如 `taxonomyLeafId`）

### 7.3 统一可测试性目标

- 每个功能至少覆盖：
  1) 主流程成功路径
  2) 后端失败路径
  3) 边界输入路径

---

## 8. 建议的下一步（按收益排序）

1. 为 `DemandCreate`、`CardPool`、`ChatDetail` 补最小回归测试集（先保证核心链路）。  
2. 为 Electron 增补发布前检查清单（证书、CSP、IPC 白名单）。  
3. 将“业务流程图 + 接口错误码”拆成子文档，便于产品/测试协同。  


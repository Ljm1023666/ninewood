# 产品时间主权 · Phase 0 聚合基线

> 生成时间：2026-07-28T05:36:57.123Z
> 只读聚合；不含媒体内容、排除词原文、私信或需求正文。
> **不得**将 `receivePushes=true` / 无 PushPreference 记录解释为对未来通知类别的永久同意。

## 1. 数据库聚合

| 指标 | 值 |
|------|-----|
| Short 行数 | 0 |
| Short 去重作者数 | 0 |
| Follow 行数 | 79 |
| PushPreference 行数 | 3 |
| receivePushes=true | 3 |
| receivePushes=false | 0 |
| 用户总数 | 849 |
| snatchCredits>0 用户数 | 849 |
| snatchCredits 合计 | 2547 |
| snatchCredits 均值 | 3 |

### pushFrequency 分布

```json
{
  "NORMAL": 3
}
```

### 排除列表长度分桶（不读内容）

```json
{
  "keywords": {
    "0": 3
  },
  "tags": {
    "0": 3
  },
  "regions": {
    "0": 3
  }
}
```

> Short 聚合为 0：删除评审可优先排期，仍须 M3 独立签字。

## 2. 代码调用面（文件数）

### Short / shorts

- server：4 文件；client：0 文件
- 样例路径：
  - `server/src/config/legacy-shorts.ts`
  - `server/src/index.ts`
  - `server/src/routes/shorts.ts`
  - `server/src/__tests__/legacy-shorts-gate.test.ts`

### PushPreference / push-engine

- server：5 文件；client：1 文件
- 样例路径：
  - `server/src/routes/push.ts`
  - `server/src/services/loop/heaven-runner.service.ts`
  - `server/src/services/push-engine.ts`
  - `server/src/services/push.service.ts`
  - `server/src/__tests__/auto-receive.test.ts`
  - `client-react/src/views/PushSettings.tsx`

### Follow

- server：8 文件；client：6 文件
- 样例路径：
  - `server/src/routes/shorts.ts`
  - `server/src/routes/user.ts`
  - `server/src/services/agent/agent-tool-synthesis.ts`
  - `server/src/services/agent/executor.ts`
  - `server/src/services/agent/tool-runner.ts`
  - `server/src/services/user.service.ts`
  - `server/src/__tests__/agent-follow-up.test.ts`
  - `server/src/__tests__/agent-tool-synthesis.test.ts`
  - `client-react/src/api/user.ts`
  - `client-react/src/components/ui/new-group-dialog.tsx`
  - `client-react/src/views/Follows.tsx`
  - `client-react/src/views/Licenses.tsx`
  - `client-react/src/views/NewGroupChat.tsx`
  - `client-react/src/views/Profile.tsx`

### snatchCredits / snatch

- server：9 文件；client：6 文件
- 样例路径：
  - `server/src/cron/index.ts`
  - `server/src/cron/snatch-reset.ts`
  - `server/src/middleware/rate-limit.ts`
  - `server/src/routes/demand.ts`
  - `server/src/routes/user.ts`
  - `server/src/services/agent/tools.ts`
  - `server/src/services/auth.service.ts`
  - `server/src/services/demand.service.ts`
  - `server/src/services/user.service.ts`
  - `client-react/src/api/demand.ts`
  - `client-react/src/api/user.ts`
  - `client-react/src/components/cert/cert-center-views.tsx`
  - `client-react/src/components/cert/cert-workspace-panels.tsx`
  - `client-react/src/stores/user.ts`
  - `client-react/src/views/Profile.tsx`

### CardPool（前端工作集）

- server：2 文件；client：32 文件
- 样例路径：
  - `server/src/routes/agent.ts`
  - `server/src/services/agent/tools.ts`
  - `client-react/src/components/card-pool/browse-black-cards.tsx`
  - `client-react/src/components/card-pool/card-pool-drag-ghost.tsx`
  - `client-react/src/components/card-pool/CardPoolFooter.tsx`
  - `client-react/src/components/card-pool/CardPoolPageSkeleton.tsx`
  - `client-react/src/components/card-pool/CardPoolTile.tsx`
  - `client-react/src/components/card-pool/category-to-scope.ts`
  - `client-react/src/components/card-pool/HandPile.tsx`
  - `client-react/src/components/card-pool/PackOpeningAnimation.tsx`
  - `client-react/src/components/card-pool/scope.ts`
  - `client-react/src/components/card-pool/search-params.ts`
  - `client-react/src/components/card-pool/TableBreadcrumb.tsx`
  - `client-react/src/components/card-pool/TableDiscard.tsx`
  - `client-react/src/components/card-pool/tablePersistence.ts`
  - `client-react/src/components/card-pool/useCardPoolShared.ts`
  - `client-react/src/components/card-pool/usePersistedGlobalHand.ts`
  - `client-react/src/components/card-pool/useTableState.ts`
  - `client-react/src/components/layout/Sidebar.tsx`
  - `client-react/src/components/ui/footer-section.tsx`
  - `client-react/src/components/ui/scroll-navigation-menu.tsx`
  - `client-react/src/constants/card-pool-stitch.ts`
  - `client-react/src/constants/stitch-icons.ts`
  - `client-react/src/hooks/use-pack-card-textures.ts`
  - `client-react/src/router/index.tsx`

## 3. CardPool 说明

- Prisma **无** CardPool 表；手牌/焦点持久化在浏览器 `localStorage`（`ninewood.cardPool.*`）。
- Phase 0 仅记录调用面；去随机奖励文案与「开包→展开分类」属 Phase 2。

## 4. Phase 1 通知迁移前基线结论

- 现行决策：`push-engine.shouldReceivePush` — 无记录则 **accept:true**；`receivePushes` 默认 true。
- `pushFrequency` 已存库但引擎未执行频率/安静时段/每日上限（规格 G-02）。
- Phase 1 必须新建 NotificationPolicy/Subscription；旧默认开启 **不能** 映射为 USER_REQUESTED/DIGEST/RELATIONSHIP 的永久开启。
- 交易必要通知另案默认保留；本基线不授权扩大营销类触达。

## 5. snatch / Follow 兼容风险

- `snatchCredits` 仍被 demand snatch、认证权益文案、cron 月度重置使用；改承接容量前需兼容 API 字段。
- Follow 仍支撑粉丝列表、群聊联系人；短视频 follow tab 已随路由隔离。改语义勿先删表。

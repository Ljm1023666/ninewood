# Task 11 · 路径检索系统（Path-Based Search）

> 状态: **Wave A–E 已落地** · 创建: 2026-07-07  
> 前置: Task 10 ✅  
> 关联: `server/src/services/path-codec.ts`、`server/src/services/demand.service.ts`

---

## 0. 产品定义

需求发布时生成一组**确定性路径标签**（用户可全量增删改）；检索时将查询拆解为路径集合，按**命中路径数**主排序返回需求。无 LLM、无黑箱、结果可解释、可复现。

### 0.0 产品哲学（用户主权）

| 原则 | 说明 |
|------|------|
| 目标在路径上 | 需求发布后被解析为池内可检索目标；目标不膨胀为多字段，而是**挂在多条路径上**（类似 ID 在轨道交叉点） |
| 交叉加权 | 多条路径同时经过同一目标 → `hitCount` 越高，排序越靠前 |
| 截断非枚举 | 检索终点是 **LIMIT 截断**（默认 20 条），不是遍历全池 |
| 透明可控 | 检索后展示拆解路径与池内覆盖率；用户可增删关键词（如「对抗路」）精调结果 |
| 发布对等 | 发布端可查看/修改需求所挂路径；乱改则搜到也没人理——系统不评判语义 |
| 系统边界 | **只负责**把需求放到路径上、按路径找出来；匹配几条、排序权重由用户意志决定 |

检索 UI：单搜索框输入 → `extractPathsFromQuery` 自动拆解 → 展示「检索依据」chips → 用户可补充/删除路径后即时重搜。

### 0.1 平台宪法

| 规则 | 说明 |
|------|------|
| A1 确定性 | 相同路径 + 相同数据快照 ⇒ 相同结果；tie-break 落到 `id` |
| A2 无 LLM | 路径生成与检索全程规则化；`aiTags` 仅作建议，入 paths 需用户确认 |
| A3 透明 | API 返回 `matchedPaths`、`coverage` |
| A4 用户主权 | 发布者可改任意路径；仅格式与数量约束 |
| A5 不破坏现状 | 旧 `/api/demands/search` 保持；新端点双轨 |

---

## 1. 路径 Schema

格式: `<type>:<value>`，NFC、小写、空格→`_`。

| type | 示例 | 来源 |
|------|------|------|
| `tx` | `tx:oldvwf-react` | taxonomyLeafId |
| `cat` | `cat:it技术` | category |
| `tag` | `tag:react` | tags[]（tagsConfirmed） |
| `attr` | `attr:servicetype=online` | serviceType / certonly |
| `bkt` | `bkt:price=500_1000` | minPrice 分桶 |
| `rgn` | `rgn:110105` | regionId |
| `kw` | `kw:急单` | 仅用户手加 |

**约束**: 需求 ≤12 路径；检索 scoring ≤8、facet ≤6；tag≤6、kw≤3。

### 1.1 检索侧分层（v1.1）

| 层 | type | 语义 |
|----|------|------|
| **路径（计分）** | `tx` `cat` `tag` `kw` | OR 交叉计分：`hitCount` / `hitRate` / `intentHitCount` 仅统计此类 |
| **筛选条件（硬 AND）** | `attr` `bkt` `rgn` | 每条 facet 必须 `= ANY(demand.paths)`；**不进** hitCount |

发布端 `Demand.paths` 仍存全部 7 种类型；检索 API 与 UI 将 `paths` 与 `facets` 参数分离。旧链接若在 `paths=` 中混入 facet，服务端 `splitQueryInputs` 自动剥离到 `facets`。

**排序（默认 `sort=cross_hit`）**: `hitCount DESC → intentHitCount DESC → creditScore DESC → createdAt DESC → id DESC`（OR 计分，非 AND）。

**hitRate 分母**: 仅 scoring 路径数（不含 facet）。

**过滤（v1.1）**:
- `match`: `any` | `majority` | `all` | `custom`（配合 `minHit`）
- `intentMatch`: `off` | `any` | `all`（需 `q`）
- `sort`: `cross_hit` | `intent_first` | `hit_rate` | `credit` | `newest` | `price_asc` | `price_desc`

---

## 2. 数据模型

```prisma
paths          String[]  @default([])
pathsEditedAt  DateTime?
@@index([paths], type: Gin)
```

迁移: `20260707000000_add_demand_paths`

---

## 3. 实现文件

| 文件 | 波次 | 状态 |
|------|------|------|
| `server/src/services/path-codec.ts` | A | ✅ |
| `server/src/__tests__/path-codec.test.ts` | A | ✅ |
| `server/scripts/backfill-demand-paths.ts` | A | ✅ |
| `server/src/services/path-search.ts` | B | ✅ |
| `server/src/routes/path-search.ts` | B | ✅ |
| `client-react/src/views/path-search/` | C | ✅ |
| `client-react/src/api/path-search.ts` | C | ✅ |
| `client-react/src/utils/path-codec.ts` | D | ✅ |
| `client-react/src/views/demand-paths/PublishPathsPage.tsx` | D | ✅ 发布前置页 |
| `client-react/src/views/demand-paths/DemandPathsPage.tsx` | D | ✅ 详情后置页 |
| `PathFlowEntryLink` 挂件 + 原页最小入口 | D | ✅ |
| `demandPathsLimiter` + help-faq | E | ✅ |

---

## 4. 波次

### Wave A · 数据与纯函数 ✅
- Prisma 迁移 + path-codec + 单测 + 回填脚本

### Wave B · 检索 API
- `path-search.ts`、`GET /api/path-search`、`PUT /api/demands/:id/paths`、create 接线

### Wave C · 检索页 UI
- `/path-search` + PathChip/PathEditor + URL 同步

### Wave D · 发布端
- **前置页** `/demands/create/paths`：确认路径后发布
- **后置页** `/demands/:id/paths`：发布者编辑路径
- 原页仅保留最小挂件入口（`PathFlowEntryLink`），不内嵌大面板

### Wave E · 治理与文档
- 限流、help-faq、回归

---

## 5. API 草案（Wave B）

### GET `/api/path-search?paths=tx:a,tag:react&facets=attr:servicetype=online&page=1&match=any&sort=cross_hit`

| 参数 | 说明 |
|------|------|
| `paths` | 逗号分隔，**仅 scoring**（`tx|cat|tag|kw`）；若含 facet 类型，服务端自动剥离到 `facets`（兼容旧 URL） |
| `facets` | 逗号分隔，**硬 AND 筛选**（`attr|bkt|rgn`） |
| `q, match, minHit, intentMatch, sort, page, limit, stage` | 不变 |

```json
{
  "items": [{ "id", "title", "hitCount", "intentHitCount", "matchedPaths", "paths", "user", ... }],
  "total", "page", "totalPages",
  "coverage": { "tx:a": 31, "tag:react": 25 },
  "meta": {
    "match": "any",
    "minHit": 1,
    "intentMatch": "off",
    "sort": "cross_hit",
    "queryPathCount": 2,
    "intentPaths": [],
    "intentPathCount": 0,
    "minHitRequired": 1,
    "facetPaths": ["attr:servicetype=online"],
    "facetPathCount": 1
  }
}
```

### GET `/api/path-search/resolve?q=家政+线上`

返回 `{ paths, facets, segments, primarySegments, intentPaths, unresolvedSegments }` — `paths` 仅 scoring，`facets` 为解析出的硬筛选；`unresolvedSegments` 为原词拆段中未挂上路径/筛选的片段。

**地名解析（v1.2）**：城市名（如 `南京`）优先映射为 `rgn:<cityCode>` facet，不再作为 `kw:南京` 计分；需需求侧 `regionId`/`rgn` 路径（导入或 `backfill-demand-paths` 从 `cityCode` 回填）。

### PUT `/api/demands/:id/paths`

Body: `{ "paths": ["..."] }` — 全量替换，仅发布者。

---

## 6. 明确不做（v1）

- LLM 自动抽词（检索侧用规则化 `extractPathsFromQuery`）
- 路径权重系数动态调节（N 可调为 v2；v1 用 hitCount 计数）
- 地理距离计分（v2）
- 服务者按路径订阅推送（v2）

---

## 7. 检索池覆盖与意图精度

见 **`docs/specs/TASK-11-path-pool-coverage.md`**：`query-expansion.ts`、`path-coverage-manifest.json`、`check-path-coverage.ts`、`seed-coverage-gaps.ts`、CI `path-pool-gate`。

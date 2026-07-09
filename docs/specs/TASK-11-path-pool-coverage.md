# 路径检索 · 检索池覆盖与意图精度（系统级方案）

> 状态: **已实施**（2026-07-08 验收通过；2026-07-08 后续优化：租车/出租车 exclude、CI 门禁、manifest 全量补种）  
> 背景: 用户反馈「外包」搜不到、「打车」结果像租车；检索与检索池之间问题高频  
> 关联: `TASK-11-path-search.md`、`path-resolver.ts`、`path-search.ts`、`generate_massive_seed.py`

---

## 1. 问题复盘（已核实）

### 1.1 「外包」为何丢失？

| 层级 | 现状 | 结论 |
|------|------|------|
| `tags-vocabulary.json` | 有 `财务外包`、`客服外包` | 词表有 |
| `generate_massive_seed.py` | 类目池含 `财务外包`、`客服外包` | 生成脚本有 |
| **DB `Demand.tags`** | `hasSome(['财务外包','客服外包','外包'])` → **0 条** | **数据未落地** |
| **DB `Demand.paths`** | `LIKE '%外包%'` → **0 条** | **检索池为空** |
| `resolveQueryToPaths('外包')` | `paths: []`, `unresolvedSegments: ['外包']` | 符合「只认池内路径」规则 |

**根因**：不是解析器 bug，而是 **「词表 / 种子脚本 / 实际 Demand.paths」三层断裂**。  
即使将来有 `tag:财务外包`，`外包` 作为短词可通过 `val.includes(seg)` 挂上复合 tag——但池里根本没有这类路径。

### 1.2 「打车」为何像租车？

**数据核实**（`scripts/_diag-path-pool.ts`）：

- `打车` → `paths: [kw:出租车, tag:出租车]`，`intent: [tag:出租车]` ✅ 标签映射正确
- Top 结果：`深圳出租车包车半天`，`tags: [出租车, 包车]`，**无 `租车` tag**

用户感知的「租车」来自 **服务语义错位**，不是 tag 混标：

| 用户心智 | 池内实际供给 |
|----------|----------------|
| 打车 = 即时叫车 / 网约车 / 短途出行 | 仅有「出租车**包车**半天」类 **包车** 需求 |
| 期望：司机来接、按次计费 | 实际：按半天包车、偏 B2B/巡检场景 |

因此：**tag 层面对了，供给类型错了**。`包车` 在口语里接近「租车（带司机）」，与「打车」不是同一意图。

### 1.3 共性系统缺陷

```
用户输入 → [解析器] → 必须在 Demand.paths 池内命中 → SQL 交叉计分 → 结果
                ↑
         池仅来自已发布需求的 paths 聚合
                ↑
    种子/词表/回填 与 真实入库 无强制一致性校验
```

缺失能力：

1. **池覆盖率治理**（词表有、池无 → 静默失败）
2. **查询意图细分**（出租车 ⊃ 打车 / 包车 / 自驾租车）
3. **受控查询扩展**（同义词、复合词拆挂、建议路径）与 **子串黑名单** 分离治理
4. **降级检索 UX**（未解析不全盘报错，给可操作建议）
5. **回归测试**（高频 query 集 + 最低命中数 CI）

---

## 2. 目标与非目标

### 2.1 目标

- 高频查询（Top 200）在池内 **可解析 + 有结果**（active 阶段）
- 同类意图不跨品类污染（打车 ≠ 包车 ≠ 自驾租车；外包可挂到财务外包/客服外包）
- 未命中时有 **可解释降级**（建议路径 / 放宽 / 补充关键词），而非仅 toast 报错
- 词表、种子、DB paths **可审计、可 CI 门禁**

### 2.2 非目标（本阶段不做）

- 不引入 LLM 检索
- 不改 `Demand.paths` 七元 schema
- 不做移动端适配

---

## 3. 架构方案（四层）

### Layer A · 数据层：检索池覆盖率

**原则**：检索池 = `Demand.paths` 聚合；任何「应可搜到的词」必须能追溯到 ≥1 条 active 需求的 path。

#### A1. 覆盖清单（Coverage Manifest）

新建 `seed-data/path-coverage-manifest.json`：

```json
{
  "version": 1,
  "entries": [
    {
      "query": "外包",
      "requiredPaths": ["tag:财务外包", "tag:客服外包"],
      "minActiveDemands": 8,
      "notes": "短词通过复合 tag 子串挂上"
    },
    {
      "query": "打车",
      "requiredPaths": ["tag:网约车", "tag:叫车"],
      "minActiveDemands": 10,
      "excludePaths": ["tag:包车"],
      "notes": "即时叫车，非半天包车"
    },
    {
      "query": "租车",
      "requiredPaths": ["tag:租车", "tag:自驾租车"],
      "excludePaths": ["tag:出租车", "tag:包车"]
    }
  ]
}
```

#### A2. 覆盖校验脚本

`server/scripts/check-path-coverage.ts`：

- 读 manifest
- 对每条：`resolveQueryToPaths(query)` + `searchByPaths` 计数
- 检查 `requiredPaths` 在池中 `demandCount >= 1`
- 检查 `minActiveDemands`
- 非零 exit code → CI 失败

#### A3. 定向补种

`server/scripts/seed-coverage-gaps.ts`：

- 读 manifest + 当前池缺口
- 按模板插入需求（参考 `seed-car-rental-supplement.ts`）
- 每条需求：`tagsConfirmed: true`，`resolveDemandPaths` 写 paths
- **标签规范**见 §4.2

#### A4. 种子生成约束

改 `generate_massive_seed.py`：

- 生成结束后统计 `tag_freq`；对 manifest 中 `requiredPaths` 对应 tag **强制最低频次**
- 类目模板必须含标题核心词 → tags（已有原则，需对 manifest 词加 hard assert）

---

### Layer B · 解析层：查询 → 池内路径

**原则**：「顺藤摸瓜」不变，但扩展 **受控**、**可审计**、**可测试**。

#### B1. 查询扩展配置（与 SCORING_SYNONYMS 分离）

新建 `server/src/services/query-expansion.ts`：

```ts
/** 用户词 → 仅当池内存在时才生效的候选 path（按优先级） */
export const QUERY_PATH_EXPANSIONS: Record<string, string[]> = {
  打车: ['tag:网约车', 'tag:叫车', 'tag:出租车'],
  叫车: ['tag:网约车', 'tag:叫车'],
  外包: ['tag:财务外包', 'tag:客服外包', 'tag:人事外包'],
}

/** 查询意图要排除的 path（减权或硬过滤，见 B3） */
export const QUERY_PATH_EXCLUSIONS: Record<string, string[]> = {
  打车: ['tag:包车', 'tag:租车', 'tag:自驾租车'],
  租车: ['tag:出租车', 'tag:包车', 'tag:网约车'],
  出租车: ['tag:租车', 'tag:自驾租车'],
}
```

- 扩展只在 `loadPathVocabulary()` 命中时加入 paths
- **禁止**随意双向同义词（已教训：租车↔出租车）

#### B2. 复合 tag 拆挂（解决「外包」类短词）

在 `path-resolver.ts` 的 `resolveInputToPaths` 候选阶段增加：

- 当 segment 无直接命中，尝试 pool 中 tag/kw 满足 `entry.value.endsWith(segment)` 或受控 `includes`
- 短词长度 ≥2
- 命中复合 tag 时 **优先最长匹配**（外包 → 财务外包 优于 客服外包 按 demandCount）
- 维护 `DISTINCT_SUBSTRING_PAIRS` 黑名单（可配置化 JSON）

#### B3. 意图路径与服务子类型

扩展 `resolveIntentPaths`：

1. 先用 `primaryQuerySegments` + expansion 选意图
2. 若 `QUERY_PATH_EXCLUSIONS[segment]` 存在，从候选 paths **剔除** exclusion
3. 可选：SQL 层 `searchByPaths` 增加 `excludePaths?: string[]`

**打车验收标准**：

- `intentPaths` 首选 `tag:网约车` 或 `tag:叫车`（池内有数据后）
- 结果标题不应以「包车半天」为主；若仅有包车供给，UI 显示 **「当前池内暂无叫车类需求，以下为包车服务」** 降级提示

#### B4. 子串 / 分词防护（延续已有）

保留并配置化：

- `DISTINCT_SUBSTRING_PAIRS`（租车|出租车）
- `suppressDistinctSubsegments`（jieba 把出租车切成租车）
- `isEmbeddedDistinctConflict`（南京出租车 不误挂 租车）

迁移到 `server/config/path-substring-rules.json`，单测驱动。

---

### Layer C · 检索层：结果相关性

#### C1. `excludePaths` 参数

`searchByPaths` / `GET /api/path-search` 新增可选 `excludePaths`：

```sql
AND NOT (d.paths && ${excludePaths}::text[])
```

解析 API 返回 `suggestedExclusions` 供前端展示原因。

#### C2. 意图减权（软过滤）

当 `intentMatch=off` 但存在 `intentPaths` 时，对 exclusion 命中项追加排序惩罚分。

#### C3. 供给类型标签（汽车出行）

| 标签 | 含义 | 示例标题 |
|------|------|----------|
| `网约车` / `叫车` / `打车` | 即时单趟 | 「北京网约车早晚高峰接送」 |
| `包车` | 带司机按时/按天 | 「出租车包车半天」 |
| `租车` / `自驾租车` | 用户自驾 | 「轿车日租送车上门」 |

**禁止**跨类型混标。

---

### Layer D · 产品层：降级 UX

#### D1. 解析结果分级

```ts
type ResolveStatus = 'ok' | 'partial' | 'miss'

interface ResolveResponse {
  status: ResolveStatus
  paths: string[]
  facets: string[]
  intentPaths: string[]
  unresolvedSegments: string[]
  suggestions: Array<{ path: string; label: string; demandCount: number }>
  degradation?: { reason: string; action: 'add_keyword' | 'relax_filter' | 'browse_category' }
}
```

| 条件 | status | UX |
|------|--------|-----|
| paths≥1 且 unresolved 空 | ok | 正常检索 |
| paths≥1 且 unresolved 非空 | partial | 检索 + info「部分词未挂上」 |
| paths 空 | miss | 展示 suggestions + 一键添加 chip |

#### D2. suggestions 来源

1. `query-expansion` 配置中路径的池内 demandCount
2. 复合 tag 最长子串匹配
3. `tags-vocabulary.json` 与池的交集，按 demandCount 排序

#### D3. 前端 `PathSearchPage.tsx`

- `paths.length === 0` 时：**仍展示 suggestions 面板**，而非仅 toast
- 结果区：若 intent=打车 且 top 结果含 `包车`，显示 **供给类型提示条**

---

## 4. 数据规范

### 4.1 标签与 paths 一致性

发布/回填时强制：`tagsConfirmed === true` → 每个 tag 必须在 paths 中。

新增 `server/scripts/audit-demand-paths.ts`：扫描 tags 与 paths 不一致、混标的需求。

### 4.2 外包类补种模板（示例）

```ts
const OUTSOURCING_TEMPLATES = [
  { title: '{city}小微企业财务外包', tags: ['财务外包', '代理记账', '报税'] },
  { title: '{city}电商客服外包坐席', tags: ['客服外包', '客服', '电商运营'] },
]
```

### 4.3 叫车类补种模板（示例）

```ts
const RIDE_HAIL_TEMPLATES = [
  { title: '{city}网约车早晚高峰接送', tags: ['网约车', '叫车', '打车'] },
  { title: '{city}机场网约车预约单趟', tags: ['网约车', '机场接送', '叫车'] },
]
```

---

## 5. 实施计划（建议顺序）

### P0 · 止血（1–2 天）

| # | 任务 | 验收 |
|---|------|------|
| 1 | 补种外包类需求 ≥24 条 | `resolve('外包').paths.length≥1`，active≥8 |
| 2 | 补种网约车/叫车 ≥30 条 | `resolve('打车')` 意图含网约车；结果非纯包车 |
| 3 | 配置化子串黑名单 | region-resolver 单测全过 |
| 4 | `query-expansion.ts` 取代随意同义词 | 打车↛租车 |

### P1 · 解析与检索（2–3 天）

| # | 任务 | 验收 |
|---|------|------|
| 5 | 复合 tag 拆挂 | `外包`→`tag:财务外包` |
| 6 | `excludePaths` SQL + API | `打车` 可排除 `tag:包车` |
| 7 | resolve API 返回 suggestions + status | 前端可渲染 |
| 8 | `check-path-coverage.ts` + CI | manifest 全绿 |

### P2 · 治理与 UX（2 天）

| # | 任务 | 验收 |
|---|------|------|
| 9 | `audit-demand-paths.ts` | 无租车+出租车双标 |
| 10 | 前端降级 UX | miss 时展示 suggestions |
| 11 | 供给类型提示条 | 打车命中包车时可见说明 |
| 12 | 高频 query 回归包 50 条 | `npm run test:path-coverage` |

---

## 6. 验收清单

```bash
cd server
pnpm test:path-coverage          # manifest 覆盖门禁
pnpm audit:demand-paths          # tag/paths 一致性审计
npx tsx scripts/_diag-path-pool.ts
npx vitest run path-resolver region-resolver query-expansion
pnpm typecheck
```

CI：`/.github/workflows/ci.yml` → `path-pool-gate` job（db:seed + seed:coverage-gaps + 门禁）。

**必须通过的查询样例**：

| 查询 | paths 含 | intent | active≥ | 结果不应主展示 |
|------|----------|--------|---------|----------------|
| 外包 | tag:财务外包 或 tag:客服外包 | 复合外包 tag | 5 | — |
| 打车 | tag:网约车 或 tag:叫车 | 同上 | 5 | 包车半天（若池有叫车） |
| 租车 | tag:租车 | tag:租车 | 5 | 出租车包车 |
| 出租车 | tag:出租车 | tag:出租车 | 3 | 自驾租车 |
| 南京 租车 | tag:租车 + facet rgn | tag:租车 | 3 | 出租车 |

---

## 7. 文件清单

| 操作 | 路径 |
|------|------|
| 新建 | `docs/specs/TASK-11-path-pool-coverage.md`（本文） |
| 新建 | `seed-data/path-coverage-manifest.json` |
| 新建 | `server/config/path-substring-rules.json` |
| 新建 | `server/src/services/query-expansion.ts` |
| 新建 | `server/scripts/check-path-coverage.ts` |
| 新建 | `server/scripts/seed-coverage-gaps.ts` |
| 新建 | `server/scripts/audit-demand-paths.ts` |
| 修改 | `server/src/services/path-resolver.ts` |
| 修改 | `server/src/services/path-search.ts` |
| 修改 | `server/src/routes/path-search.ts` |
| 修改 | `client-react/src/views/path-search/PathSearchPage.tsx` |
| 修改 | `scripts/generate_massive_seed.py` |
| 保留 | `server/scripts/_diag-path-pool.ts` |

---

## 8. 给实施 AI 的注意事项

1. **先补数据再改解析**：池为空时解析层无法凭空生效。
2. **同义词极度克制**：仅 `query-expansion.ts` 白名单。
3. **子串匹配必须配黑名单**：参考租车/出租车教训。
4. **打车 vs 包车**：靠 excludePaths + 补种，不是再扩同义词。
5. **不要破坏 facet/scoring 分离**。
6. **Windows 桌面 only**。

---

## 附录 A · 当前诊断快照（2026-07-08）

```
外包: pool paths含「外包」= 0, demands with 外包相关 tags = 0
打车: paths=[kw:出租车, tag:出租车], 结果=出租车包车半天, tags=[出租车,包车], 无租车tag
```

## 附录 B · 已完成的局部修复（勿回退）

- 租车 ↔ 出租车 同义词已删除
- `DISTINCT_SUBSTRING_PAIRS` + jieba 后处理 + embedded conflict
- `fix-car-rental-tag-mix.ts` 修正 43 条混标
- `seed-car-rental-supplement.ts` 自驾租车与出租车分包车标签分离

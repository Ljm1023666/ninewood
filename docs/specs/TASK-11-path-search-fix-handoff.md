# TASK-11 路径检索 · 全量修复 Handoff

> **编写**：验收 AI（规划） · **执行**：实施 AI · **日期**：2026-07-09  
> **背景**：7-09 重新评定确认 3 个 P0/P1 缺口 + 2 个 P2 缺口；bkt 数据层健康（勿再改 derivePaths/回填）。

---

## 范围锁定

| 做 | 不做 |
|---|---|
| rgn 前端地区下拉 | 移动端适配 / 触摸事件 |
| `/coverage` facet 统计 | 重写检索排序引擎 |
| bkt 自然语言 resolve | 再跑 backfill / 改种子数据 |
| 单元测试 + 类型检查 | 大范围 UI 改版 |
| （可选 P2）intent 复合词、intentMatch 无 q 降级 | query-expansion 泛化到全词表 |

---

## Task 1 · rgn 前端地区选择器 【P0 · 仅前端】

### 问题

`PathSearchControls` 已有 `pickFacet(facets, 'rgn')` 能力，但 UI 只渲染 attr + bkt。后端 resolve「北京」、筛选均正常。

### 改动文件

| 文件 | 动作 |
|---|---|
| `client-react/src/constants/path-search.ts` | 新增 `REGION_FACET_OPTIONS`；增强 `formatPathDisplay` |
| `client-react/src/views/path-search/PathSearchControls.tsx` | 新增地区 `<select>` |
| `client-react/src/styles/path-search-aurora.css` | 复用 `.psa-controls__pricesel` 样式（必要时加 `.psa-controls__regionsel`） |

### 实现规格

1. **`REGION_FACET_OPTIONS`**（与 `PRICE_FACET_OPTIONS` 同结构）：
   ```ts
   { label: '不限', value: null }
   { label: '北京', value: 'rgn:110000' }
   { label: '上海', value: 'rgn:310000' }
   // … 与 server/region-aliases.ts REGION_ENTRIES 对齐（至少全部市级 id+主名）
   ```
   - 数据来源：复制 `server/src/services/region-aliases.ts` 的 `REGION_ENTRIES`（`names[0]` 作 label，`id` 作 value）。
   - 可用 `<optgroup label="直辖市">` / `<optgroup label="重点城市">` 分组，**不要**加 mobile breakpoint。

2. **`formatPathDisplay` 增强**（同文件内 `PRICE_BUCKET_LABEL` 旁加 `REGION_ID_LABEL`）：
   - `rgn:110000` → `地区 · 北京`（勿显示裸 id）
   - `bkt:price=100_500` → `预算 · ¥100–500`（顺带修，chip 列表更友好）

3. **`PathSearchControls.tsx`**：
   - `const regionFacet = pickFacet(facets, 'rgn')`
   - 在价格档 `<select>` 上方或下方加地区 `<select>`，pattern 与价格档一致：
     ```tsx
     onChange → onFacetsChange(replaceFacetOfType(facets, 'rgn', v))
     ```
   - `aria-label="地区"`，图标可用 `location_on`。

4. **零后端改动**。URL `facets=rgn:110000` 已由 `PathSearchPage` 透传，无需改页面逻辑。

### 验收标准

- [ ] 筛选面板出现「地区」下拉，选项含北京/上海/广州等
- [ ] 选「北京」后 URL 含 `facets=...rgn:110000`，结果条数 < 无地区时的家政基准
- [ ] facet chip 显示 `地区 · 北京` 而非 `地区 · 110000`
- [ ] 选「不限」移除 rgn facet，不影响 attr/bkt
- [ ] `npm run typecheck` 通过

---

## Task 2 · `/coverage` facet 统计 【P1 · 后端】

### 问题

```113:118:server/src/routes/path-search.ts
pathSearchRouter.get('/coverage', async (req: Request, res: Response) => {
  const { scoringPaths } = parseSearchPathInputs(...)  // ← facets 被丢弃
  const coverage = await computePathCoverage(scoringPaths, stage)
```

`computePathCoverage` 内部只 `validateScoringPaths`，facet 路径（rgn/bkt/attr）被丢弃 → 返回 `{}`。

### 改动文件

| 文件 | 动作 |
|---|---|
| `server/src/services/path-search.ts` | 改 `computePathCoverage` |
| `server/src/routes/path-search.ts` | coverage 路由传入 facets |
| `server/src/__tests__/path-search-api.test.ts` | 新增 coverage facet 用例（可 mock prisma 或测纯函数） |

### 实现规格

**方案 A（推荐，最小 diff）**：

```ts
// path-search.ts
export async function computePathCoverage(
  paths: string[],
  stage: 'active' | 'completed' = 'active',
): Promise<Record<string, number>> {
  const split = splitQueryInputs(paths)
  const scoring = split.scoringPaths.length
    ? validateScoringPaths(split.scoringPaths)
    : []
  const facets = validateFacets(split.facets)
  const validated = dedupeStable([...scoring, ...facets])
  if (validated.length === 0) return {}
  // 现有 SQL 不变（p = ANY(validated) 对 facet 同样有效）
}
```

```ts
// path-search.ts route
const { scoringPaths, facets } = parseSearchPathInputs(...)
const coverage = await computePathCoverage([...scoringPaths, ...facets], stage)
```

**注意**：
- 仅 facet、无 scoring 时也应返回统计（如 `coverage?paths=rgn:110000`）。
- `searchByPaths` 内调用的 `computePathCoverage(validated)` **保持只传 scoring 路径**（搜索页 coverage 语义不变）。

### 验收标准

- [ ] `GET /api/path-search/coverage?paths=rgn:110000` → `{ "rgn:110000": N }`，N > 0
- [ ] `GET /api/path-search/coverage?paths=bkt:price=100_500` → `{ "bkt:price=100_500": N }`，N > 0
- [ ] `GET /api/path-search/coverage?paths=cat:家政服务,rgn:110000` → **同时**含 cat 与 rgn 键
- [ ] `GET /api/path-search/coverage?paths=cat:家政服务` 行为与改前一致
- [ ] 现有 `path-codec` / `path-search-api` 测试全绿

---

## Task 3 · bkt 自然语言 resolve 【P1 · 后端】

### 问题

`resolveInputFacets` 处理 rgn/attr，但「预算500」「价格1000以内」不产生 `bkt:price=*`。

### 改动文件

| 文件 | 动作 |
|---|---|
| `server/src/services/price-facet-resolve.ts` | **新建** 纯函数模块 |
| `server/src/services/path-resolver.ts` | 在 `resolveInputFacets` 调用 |
| `server/src/__tests__/price-facet-resolve.test.ts` | **新建** |
| `server/src/__tests__/path-resolver.test.ts` | 补集成用例 |

### 实现规格

**`price-facet-resolve.ts`**（无 IO，可单测）：

```ts
import { priceToBucket } from './path-codec.js'

/** 从 token/segment 提取金额并映射 bkt facet；无匹配返回 null */
export function priceFacetFromText(text: string): string | null

/** 生成标准 facet raw：bkt:price=100_500 */
export function priceFacetRaw(amount: number): string
```

**识别规则**（按优先级，命中即返回，用 `priceToBucket(amount)`）：

| 输入示例 | 提取金额 | 输出 facet |
|---|---|---|
| `预算500` / `预算500元` / `预算 500` | 500 | `bkt:price=100_500` |
| `500块` / `500元` | 500 | `bkt:price=100_500` |
| `价格1000以内` / `1000以内` / `一千以内` | 1000 | `bkt:price=500_1000` |
| `budget 500` / `Budget500` | 500 | `bkt:price=100_500` |
| 显式 `bkt:price=500_1000` | — | 原样 parsePath |

**集成点**（`resolveInputFacets`）：
1. token 循环：在 `tryRegionFacet` 之后调 `priceFacetFromText(token)`
2. segment 循环：对每个 segment 同样尝试
3. **不做** vocab 池校验（bkt 桶是确定性的，与 derivePaths 一致）
4. 与 rgn 共存：`北京 预算500` → `facets=['rgn:110000','bkt:price=100_500']`

**边界**：
- 金额范围 1–999999（与 demand minPrice 一致），超出忽略
- 中文数字「一千」可选支持，至少覆盖阿拉伯数字
- 不要把价格数字误当 scoring path

### 验收标准

- [ ] `GET /api/path-search/resolve?q=预算500` → `facets` 含 `bkt:price=100_500`
- [ ] `resolve?q=北京+预算500`（或 `北京 预算500`）→ facets 同时含 rgn + bkt
- [ ] `resolve?q=预算500元` / `500块` / `价格1000以内` 均产出 bkt
- [ ] `resolve?q=家政` → facets 不含 bkt（无回归）
- [ ] 新测试文件 ≥ 8 个 case，全绿

---

## Task 4 · intent 复合意图偏置 【P2 · 可选，时间不够可跳过】

### 问题

「王者荣耀代练」整段作单一 segment 时，intent 可能只命中 `tag:王者荣耀`，漏 `代练`。

### 建议方案（小步）

在 `resolveIntentPaths` 或 `primaryQuerySegments` 中：
- 对长度 ≥4 的中文复合 segment，若 jieba 分词结果含 ≥2 个池内 tag/kw 命中，则各取 top-1 作 intent（上限仍受 `PATH_LIMITS.perQuery` 约束）
- 或：对已知游戏名后缀模式（`…代练`/`…陪玩`）拆出动作后缀再 resolve

### 验收标准（若做）

- [ ] `resolveIntentPaths('王者荣耀代练', GAME_VOCAB)` 同时含 `tag:王者荣耀` 与 `tag:代练`（或 kw:代练）
- [ ] 现有 `path-resolver.test.ts` 用例不回归

---

## Task 5 · intentMatch 无 q 降级 【P2 · 可选】

### 问题

`GET /api/path-search?paths=tag:test&intentMatch=any` → 400。

### 实现

`server/src/services/path-search-query.ts` 的 `parseSearchQuery`：当 `intentMatch !== 'off'` 且 `!q?.trim()` 时，降级为 `intentMatch: 'off'`（或路由层静默处理）。

### 验收标准

- [ ] 上述请求返回 200，`meta.intentMatch === 'off'`
- [ ] 有 q 时行为不变

---

## 实施顺序

```
Task 1 (前端 rgn)  ─┐
Task 2 (coverage)  ─┼─ 可并行
Task 3 (bkt NL)    ─┘
Task 4、5          ─── Task 1–3 完成后再做
```

---

## 实施完成后的自检命令

```bash
# 根目录
npm run typecheck

# 后端单测
npm run test -w server -- --run path-codec path-resolver path-search-api price-facet-resolve region-resolver

# 后端需在跑（验收 AI 会执行）
# Python 实测见下方「验收 AI 脚本」
```

---

## 验收 AI 验收清单（实施 AI 勿删本节）

验收 AI 将执行以下检查（**必须全部通过**）：

### A. 自动化

| # | 命令 | 期望 |
|---|---|---|
| A1 | `npm run typecheck` | exit 0 |
| A2 | `npm run test -w server -- --run path-codec path-resolver path-search-api price-facet-resolve region-resolver` | 全绿 |
| A3 | `npm run lint -w client-react`（若改了前端） | 无新增 error |

### B. API 实测（Python urllib → localhost:3001）

| # | 请求 | 期望 |
|---|---|---|
| B1 | `resolve?q=预算500` | `facets` 含 `bkt:price=100_500` |
| B2 | `resolve?q=北京+家政` | `facets` 含 `rgn:110000`，paths 含 `cat:家政服务` |
| B3 | `search?paths=cat:家政服务&facets=rgn:110000&limit=1` | `total` > 0 且 < 家政无 rgn 基准 |
| B4 | `search?paths=cat:家政服务&facets=bkt:price=100_500&limit=1` | `total` > 0 |
| B5 | `coverage?paths=rgn:110000` | `coverage['rgn:110000']` > 0 |
| B6 | `coverage?paths=bkt:price=100_500` | `coverage['bkt:price=100_500']` > 0 |
| B7 | `coverage?paths=cat:家政服务,rgn:110000` | 同时含 cat 与 rgn 键 |

### C. 前端目检（Electron 或浏览器 `/path-search`）

| # | 操作 | 期望 |
|---|---|---|
| C1 | 打开筛选面板 | 可见「地区」下拉 |
| C2 | 选北京 + 搜家政 | 结果减少，chip 显示 `地区 · 北京` |
| C3 | 输入「预算500」搜索 | resolve 后自动带上预算 facet 或可被用户看到 |

### D. 回归禁区

| # | 检查 | 期望 |
|---|---|---|
| D1 | `resolve?q=打车` | 仍有 query-expansion，excludePaths 非空 |
| D2 | bkt 路径格式 | 仍为 `bkt:price=*`，勿引入 `bkt:0-500` 旧格式 |
| D3 | 无 mobile CSS | diff 中无 `max-width:768` / touch 事件 |

---

## 提交建议

单个 PR，commit 可分 3 个：
1. `feat(path-search): add region facet selector in controls`
2. `fix(path-search): coverage endpoint counts facet paths`
3. `feat(path-search): resolve budget phrases to bkt facets`

PR 描述附 `path-search-retrieval-report.md` 链接，注明 bkt 数据层无需改动。

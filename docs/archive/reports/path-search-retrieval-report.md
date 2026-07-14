# 路径检索（path-search）检索能力测试报告

> **首测 / 重测**：2026-07-08 14:55（Python + urllib 打后端，绕开 curl 中文二次编码）
> **重新评定**：2026-07-09 18:42（全链路重读 + Python urllib 实测）
> **全量修复验收**：2026-07-09 19:12（按 `docs/specs/TASK-11-path-search-fix-handoff.md` 验收，A–D 全绿）
> 环境：前端 `localhost:5174/path-search`（Vite 代理 `/api` → 后端 `localhost:3001` Express）
> 测试脚本：`scripts/test-path-search-retrieval.py` · 验收脚本：`scripts/_accept-path-search-fix.py`

---

## 一句话结论（7-09 全量修复后）

**三个老缺口已全部闭合**：rgn 前端地区下拉、`/coverage` facet 统计、bkt 自然语言 resolve 均已落地并通过实测验收。此前 **bkt「死维度」为误诊**（探测格式写错）；池内数据与筛选一直健康。检索引擎现具备 query-expansion、excludePaths、resolve 状态机、复合意图拆分、intentMatch 无 q 降级等能力。

---

## 状态速览（7-08 → 7-09 重评 → 7-09 修复后）

| 维度 | 7-08 重测 | 7-09 重评 | 7-09 修复后 | 变化 |
|---|---|---|---|---|
| 解析 resolve | ✅ 强 | ✅ + 状态机 | ✅ + bkt 预算短语 | 增强 |
| 检索 search | ✅ | ✅ + excludePaths | ✅ | 无变化 |
| attr 筛选 | ✅ | ✅ | ✅ | 无变化 |
| **rgn 数据+筛选** | ✅ 复活 | ✅（家政+北京 16） | ✅ | 无变化 |
| **rgn 前端 UI** | （未验） | 🔴 无选择器 | **✅ 地区下拉** | **已修** |
| **bkt 数据+筛选** | 🔴 误判死 | ✅ 健康 | ✅ | 误诊已澄清 |
| **bkt resolve 自然语言** | 🔴 不识别 | 🟡 未修 | **✅ 预算500 等** | **已修** |
| **/coverage 端点** | 🐛 facet 空 | 🐛 仍在 | **✅ facet 有数** | **已修** |
| query-expansion | 无 | ✅ | ✅ | 无变化 |
| excludePaths | 无 | ✅ | ✅ | 无变化 |
| **复合意图** | 🟡 偏置 | 🟡 未修 | **✅ 代练后缀拆分** | **已修** |
| intentMatch 无 q | 🟢 400 | 🟢 未修 | **✅ 降级 off** | **已修** |
| 测试覆盖 | 几乎无 | 8 文件 | **+price-facet-resolve** 等 | 持续补强 |

---

## 一、解析能力 `resolve` ✅ 强

| 输入 | 解析结果 | 评价 |
|---|---|---|
| `家政` | `cat:家政服务` (intent) | ✅ |
| `技术开发` | 6 路径，intent `cat:技术开发` | ✅ |
| `王者荣耀代练` | 意图含 `tag:王者荣耀` + `tag:代练`（复合拆分） | ✅ 7-09 修复 |
| `我想找个设计师帮我做logo` | 8 路径，intent `cat:设计` | ✅ |
| `线上 翻译` | 8 路径 + facet `attr:servicetype=online` | ✅ |
| `React Vue 前端` | 6 路径，intent 3 | ✅ |
| `北京 预算500` | `facets=['rgn:110000','bkt:price=100_500']` + paths 含家政 | ✅ 7-09 修复 |
| `预算500`（仅预算） | `facets=['bkt:price=100_500']`，`paths=[]`，`status=miss` | ✅ facet 正确；无 scoring 路径时 miss 属预期 |
| `打车` | query-expansion → 网约车+叫车，exclude 出租车/包车 | ✅ |
| `xyzqwerty随机词不存在` | 0 路径 | ✅ |
| 空查询 | `400` | ✅ |

**预算短语识别**（`price-facet-resolve.ts`）：`预算500` / `500块` / `价格1000以内` / `一千以内` / `budget 500` / `八千以内` → `bkt:price=${priceToBucket}`。

---

## 二、检索能力 `search` ✅ 核心可用

- 交叉命中 `any/all/custom` 正常。
- 7 种排序全部生效。
- `intentMatch` 带 `q` 生效；**无 q 时降级为 `off`**（不再 400）。
- 分页 / attr / rgn / bkt 筛选均正确。
- `excludePaths` 检索层 NOT 过滤（如打车排除出租车）。

**7-09 验收实测**：

| 查询 | total |
|---|---|
| `paths=cat:家政服务`（基准） | 627 |
| `+ facets=rgn:110000` | 16 |
| `+ facets=bkt:price=100_500` | 421 |

---

## 三、地区维度（rgn）—— 全链路通 ✅

### 后端 ✅

1. **解析**：`resolve "北京 家政"` → `paths=['cat:家政服务'] facets=['rgn:110000']`。
2. **筛选**：家政 + `rgn:110000` → **16 条**（基准 627）。
3. **数据**：池内多城市 `rgn:*` 路径广泛存在。

### 前端 ✅（7-09 修复）

- `PathSearchControls` 新增**地区下拉**（`REGION_FACET_OPTIONS`，对齐 server `REGION_ENTRIES`）。
- chip 显示：`rgn:110000` → `地区 · 北京`（`formatPathDisplay` + `REGION_ID_LABEL`）。
- 用户可通过 UI 或自然语言双入口设置地区 facet。

---

## 四、预算维度（bkt）—— 数据+筛选+resolve 全通 ✅

### 7-08 误判（已推翻）

| 错误探测 | 正确格式 |
|---|---|
| `bkt:0-500` | `bkt:price=100_500` |
| `bkt:500-1000` | `bkt:price=500_1000` |

### 数据分布（家政 627 条）

| 档位 | 条数 |
|---|---|
| `bkt:price=0_100` | 6 |
| `bkt:price=100_500` | 421 |
| `bkt:price=500_1000` | 114 |
| `bkt:price=1000_5000` | 53 |
| `bkt:price=5000_20000` | 33 |
| `bkt:price=20000_plus` | 0 |

### 自然语言 resolve ✅（7-09 修复）

- `resolve?q=预算500` → `facets=['bkt:price=100_500']`。
- 仍可通过右侧 **PRICE_FACET_OPTIONS 下拉**手动选档。
- 路径格式恒为 `bkt:price=*`，未引入 `bkt:0-500` 等旧格式。

---

## 五、检索引擎能力清单

| 能力 | 说明 | 状态 |
|---|---|---|
| `query-expansion.ts` | 打车/外包等白名单扩展 + excludePaths | ✅ |
| `excludePaths` | 检索层 NOT 过滤 | ✅ |
| resolve 状态机 | hit / partial / miss + suggestions | ✅ |
| `region-aliases.ts` | 城市/区县别名 → rgn | ✅ |
| `price-facet-resolve.ts` | 预算自然语言 → bkt facet | ✅ 7-09 新增 |
| `jieba-segment.ts` | 中文分词 | ✅ |
| 复合意图 | 「王者荣耀代练」拆后缀取池内 tag/kw | ✅ 7-09 新增 |
| intentMatch 降级 | 无 q 时 `off`，不 400 | ✅ 7-09 新增 |
| 运维脚本 | backfill / audit / seed-coverage-gaps | ✅ |
| 测试 | path-codec / resolver / search-api / price-facet-resolve / region-resolver 等 | ✅ 78 用例 |

---

## 六、`/coverage` 端点 ✅ 已修

**7-09 修复前**：facet 路径（rgn/bkt/attr）返回 `{}`。

**7-09 修复后实测**：

| 请求 | 结果 |
|---|---|
| `coverage?paths=cat:家政服务` | `{'cat:家政服务': 627}` ✅ |
| `coverage?paths=rgn:110000` | `{'rgn:110000': 282}` ✅ |
| `coverage?paths=bkt:price=100_500` | `{'bkt:price=100_500': 3739}` ✅ |
| `coverage?paths=cat:家政服务,rgn:110000` | 同时含 cat 与 rgn 键 ✅ |

**修法**：`computePathCoverage` 内 `splitQueryInputs` 合并 scoring + facets 再 COUNT；路由传入 `[...scoringPaths, ...facets]`。`searchByPaths` 内部 coverage 仍只计 scoring 路径（语义不变）。

---

## 七、仍存在的低优先级问题

1. 🟢 **segment 噪声**：自然语言拆段偶泄漏停用短语（`我想`/`找个`），不影响结果。
2. 🟡 **仅预算无类目**：`resolve?q=预算500` 产出 bkt facet 但 `paths=[]`、`status=miss`——用户需配合类目词或手动补路径。
3. 🟡 **query-expansion 覆盖有限**：仅白名单词（打车/外包等），未泛化到全词表。

---

## 八、待办（7-09 修复后）

~~1. rgn 前端地区选择器~~ ✅  
~~2. `/coverage` facet 统计~~ ✅  
~~3. bkt 自然语言 resolve~~ ✅  
~~4. 复合意图偏置~~ ✅  
~~5. intentMatch 无 q 降级~~ ✅  

**后续可选**：
1. 🟢 segment 噪声裁剪。
2. 🟡 仅预算查询 UX 优化（无 scoring 路径时给引导而非 miss）。
3. 🟡 query-expansion 白名单扩展。

---

## 附录：测试注意事项

- **中文查询**：用 Python `urllib` 直接打 `localhost:3001`，勿用 curl（Vite 代理会二次编码中文乱码）。
- **bkt 路径格式**：`bkt:price={bucket}`，如 `100_500`、`500_1000`、`20000_plus`。
- **验收复跑**：`python scripts/_accept-path-search-fix.py`（B+D 类，需后端+DB 运行）。
- **数据基准**：家政 627、北京家政 16（seed/backfill 调整后稳定值）。

测试脚本见 `scripts/test-path-search-retrieval.py`，可重复跑。

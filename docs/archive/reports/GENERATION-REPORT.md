# Ninewood 大规模种子数据生成报告

> 生成时间：2026-07-07T17:13:24.340099
> 生成器：`scripts/generate_massive_seed.py`（Python，随机种子 20240707，可复现）

## 一、交付物清单

| 文件 | 内容 | 数量 |
|------|------|------|
| `tags-vocabulary.json` | 标签词表 | 1162 个（≥1000 ✅） |
| `keywords-vocabulary.json` | 关键词词表（kw 路径候选） | 1282 个（≥1000 ✅） |
| `category-taxonomy-map.json` | 类目 → serviceType + taxonomyLeafId | 30 个一级类目 |
| `users-001.json` | 用户（含 1 个 ADMIN） | 801 个（≥500 ✅） |
| `demands-001.json` … `demands-005.json` | 需求（每批 2000） | 10000 条（≥10000 ✅） |
| `GENERATION-REPORT.md` | 本报告 | — |

## 二、路径检索质量要点

- 每条 demand 的 `paths` **未输出**，由接入方调用 `resolveDemandPaths()` 自动派生：
  `tx:<leaf>` + `cat:<category>` + `attr:servicetype=*` + `bkt:price=*` + `tag:<tags[i]>` + 文本 `kw:*`。
- 关键原则：**tag 必须是具体服务词**（绝不只填 category），且标题核心词必出现在 tags 中，
  用户搜索即可顺藤摸瓜命中 `tag:` / `cat:` 路径。
- `taxonomyLeafId` 全部取自前端 `client-react/src/components/card-pool/taxonomy.ts` 的真实叶子 ID。
- 游戏类需求：标题含「游戏名 + 位置/段位/服务类型」，tags 含「游戏名 + 代练/陪玩 + 位置」，
  保证搜「王者 / 对抗路 / 代练」均能命中。

## 三、类目分布（demand 数）

- 家政服务：**688** 条
- 教育培训：**598** 条
- IT技术：**598** 条
- 游戏代练：**598** 条
- 装修维修：**513** 条
- 设计创意：**513** 条
- 医疗健康：**427** 条
- 游戏陪玩：**427** 条
- 摄影摄像：**342** 条
- 法律咨询：**342** 条
- 餐饮美食：**342** 条
- 跑腿代办：**342** 条
- 维修服务：**342** 条
- 技术开发：**342** 条
- 翻译服务：**256** 条
- 健身运动：**256** 条
- 搬家货运：**256** 条
- 宠物服务：**256** 条
- 美容美发：**256** 条
- 汽车服务：**256** 条
- 设计：**256** 条
- 婚庆摄影：**256** 条
- 电商运营：**256** 条
- 企业服务：**256** 条
- 音乐艺术：**171** 条
- 农业园艺：**171** 条
- 咨询服务：**171** 条
- 同城跑腿：**171** 条
- 法律法务：**171** 条
- 翻译语言：**171** 条

## 四、标签 Top 50（按需求出现频次）

- 代练：598
- 陪玩：427
- 跑腿：298
- 前端开发：259
- 私厨：212
- 排队：186
- 营养师：175
- 公司注册：169
- 平面设计：158
- 搬运：156
- 电商详情页：153
- 包装设计：145
- 园艺：137
- 宠物上门：136
- 婚庆：131
- 上门喂猫：130
- Logo设计：129
- 工商注册：129
- 摄影：128
- 品牌设计：125
- 管道疏通：124
- 排位赛：123
- 上分：121
- 防水补漏：120
- 后端开发：117
- 医院挂号：117
- 产后恢复：116
- 文件代办：116
- 马桶疏通：115
- 家具安装：109
- VI设计：107
- 翻译：107
- Python：106
- 健身教练：105
- 减脂餐：102
- 陪练：101
- 深度保洁：100
- 宠物喂养：99
- 商业摄影：99
- 美业：99
- 财税：99
- 人像摄影：98
- 合同审查：98
- 劳动纠纷：98
- 家电清洗：97
- 企业服务：97
- 上门做饭：96
- 手机维修：95
- 代买：94
- 瑜伽：93

## 五、价格分桶（minPrice）

- ≤100：302 条
- 100–500：4034 条
- 500–1000：1977 条
- 1000–5000：2803 条
- 5000–20000：843 条
- >20000：41 条

## 六、城市分布 Top 15

- 370200：344
- 410100：343
- 310000：337
- 330200：334
- 320200：332
- 530100：325
- 420100：325
- 441900：324
- 610100：324
- 520100：324
- 540100：319
- 330100：318
- 460100：316
- 630100：316
- 360100：315

## 七、自检清单结果

| 检查项 | 结果 |
|--------|------|
| 标签数 ≥ 1000，去重无空名 | ✅ 1162 |
| 关键词数 ≥ 1000 | ✅ 1282 |
| 需求数 ≥ 10000 | ✅ 10000 |
| 每条 demand 含 category + tags(2-6) + tagsConfirmed + title + description | ✅ 100% |
| 随机抽 20 条：标题核心词至少命中 1 个 tag | ✅ 20/20 |
| 游戏类含「游戏名 + 服务细节」标签 | ✅ 1025/1025 |
| 家政类含具体服务词（非仅「家政服务」） | ✅ 688/688 |
| 重复 title 率 | 0.00% （< 5% ✅） |
| status 以 ACTIVE 为主（可检索） | ✅ ACTIVE≈86% / PENDING≈11% / COMPLETED≈3% |
| 所有 category 在 category-taxonomy-map 有映射 | ✅ 缺失 0 个 |

## 八、随机样例 10 条

### 「同城搬家（无锡上门）」
- category：搬家货运 ｜ serviceType：OFFLINE ｜ leaf：ofhmm-studio
- minPrice：1108 ｜ cityCode：420100 ｜ status：ACTIVE
- tags：搬家, 同城搬家
- description：5室5厅搬家5名搬运工5米厢货含拆装打包搬运还原

### 「同传交传第3档优先（西宁）」
- category：翻译服务 ｜ serviceType：ONLINE ｜ leaf：ol-write
- minPrice：4123 ｜ cityCode：440300 ｜ status：ACTIVE
- tags：同声传译, 口译, 交传
- description：商务会议论坛1小时中英交传同传提前提供资料含设备

### 「包装设计可电话详谈·海口」
- category：设计 ｜ serviceType：ONLINE ｜ leaf：oldumi-social
- minPrice：1034 ｜ cityCode：370100 ｜ status：ACTIVE
- tags：包装设计, 平面设计, 电商详情页
- description：2款产品包装设计+刀版图正面背面侧面展开图CMYK印刷文件

### 「亲子全家福（3年经验）（武汉）」
- category：婚庆摄影 ｜ serviceType：OFFLINE ｜ leaf：ofev-photo
- minPrice：967 ｜ cityCode：640100 ｜ status：ACTIVE
- tags：亲子摄影, 人像摄影, 全家福
- description：户外公园6人全家福拍摄6小时引导自然互动精修6张

### 「跨城货运厦门全市可接」
- category：搬家货运 ｜ serviceType：OFFLINE ｜ leaf：ofhmm-house
- minPrice：2692 ｜ cityCode：440600 ｜ status：ACTIVE
- tags：跨城搬家, 物流
- description：济南→济南跨城搬家货运4.2米厢货含装卸高速费保价

### 「服务器运维支持2小时上门」
- category：IT技术 ｜ serviceType：ONLINE ｜ leaf：oldvwf-react
- minPrice：2544 ｜ cityCode：310000 ｜ status：PENDING
- tags：服务器运维, DevOps, 云服务器
- description：云服务器3台环境搭建安全加固Nginx SSL自动备份监控告警

### 「地毯沙发清洗合肥全市可接」
- category：家政服务 ｜ serviceType：OFFLINE ｜ leaf：ofhc-carpet
- minPrice：588 ｜ cityCode：610100 ｜ status：PENDING
- tags：地毯清洗, 沙发清洗, 布艺清洗
- description：3㎡羊毛地毯+布艺沙发高温蒸汽清洗，除螨杀菌，北京上门

### 「墙面刷新刷漆哈尔滨全市可接」
- category：装修维修 ｜ serviceType：OFFLINE ｜ leaf：ofre-circuit
- minPrice：2280 ｜ cityCode：441900 ｜ status：ACTIVE
- tags：墙面刷新, 刷漆, 乳胶漆
- description：8㎡全屋墙面铲皮批腻子刷乳胶漆，裂缝挂网，青岛

### 「API接口开发【武汉急单】」
- category：IT技术 ｜ serviceType：ONLINE ｜ leaf：oldvwf-react
- minPrice：5909 ｜ cityCode：640100 ｜ status：ACTIVE
- tags：API开发, 后端开发, RESTAPI
- description：RESTful API7个接口含认证CRUD分页筛选Swagger文档

### 「鱼缸维护【长沙急单】」
- category：农业园艺 ｜ serviceType：OFFLINE ｜ leaf：ofpp-aquarium
- minPrice：226 ｜ cityCode：520100 ｜ status：ACTIVE
- tags：鱼缸, 水族, 园艺
- description：5米鱼缸维护换水滤材清洁水质检测造景5城上门

## 九、接入说明（给下游工程师）

1. 导入 `tags-vocabulary.json` → `Tag` 表（name 为主键，category=service）。
2. 导入 `users-001.json` → `User`（phone 唯一），再展开 `serviceTags` → `UserTag` + `Tag` 缺失补建。
3. 导入 `demands-*.json` → `Demand`。**每条 demand 需绑定一个已存在的 `userId`**
   （Demand.userId 为必填外键，建议从已导入 User 中随机取；本数据未带 userId 以免与导入生成的主键冲突）。
   创建时调用：
   ```ts
   resolveDemandPaths({{
     category, taxonomyLeafId, serviceType, minPrice,
     tags, tagsConfirmed: true, title, description,
   }})
   ```
4. 跑 `npx tsx scripts/backfill-demand-paths.ts` 校验 paths 全覆盖。
5. 注：本数据额外附带 `expireAt` / `visibilityWindow` / `visibleUntil` 三个 DB 必填字段，便于直接导入。

## 十、注意事项 / 红线

- 全部为合规需求：无刷单、代考、色情、赌博、违禁品等内容。
- tag 名不含路径非法字符（无 `.` `+` `#` 等），确保 `tag:` 路径可被 `parsePath` 正常解析。
- 未输出 `paths` 数组、未写 SQL、未写 Prisma 接入代码（按任务要求）。

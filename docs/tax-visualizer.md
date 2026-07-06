# 税务可视化模块

> 答疑解惑式交互页面,帮助自由职业者(九木核心用户)直观看到"什么时候交税、交多少"。

## 入口

- 路由:`/tax-visualizer`(无需登录)
- 侧栏:左侧导航"帮助"下方新增"税务可视化"

## 三大税种

| 税种 | 关键展示 |
|---|---|
| 个人所得税 | 综合所得七级累进 / 工资薪金月扣 / 经营所得五级累进 |
| 增值税 | 小规模月销 10 万免税 / 一般纳税人销项-进项 |
| 企业所得税 | 标准 25% / 小型微利 5% / 高新 15% |

## 四类主体(可对比)

- 个人 · 工资薪金
- 个人 · 自由职业者(劳务 / 经营)— **九木典型用户**
- 小规模纳税人 / 个体工商户
- 一般企业 / 一般纳税人

## 两种视图

- **单主体**:左控件 / 中图表 / 右公式与金额
- **对比模式**:同一税种下两个主体并排,差异高亮

## 文件结构

```
client-react/src/
├── data/tax-rules/          # 纯数据与计算函数(可单测,可审核)
│   ├── personal-income.ts   # 个税 7 档 + 经营 5 档
│   ├── vat.ts               # 增值税税率/免征额
│   ├── corporate-income.ts  # 企税及小微优惠
│   ├── subjects.ts          # 4 类主体
│   ├── presets.ts           # 11 个一键场景
│   └── __tests__/           # 57 个单测
├── views/tax-visualizer/
│   ├── TaxVisualizerPage.tsx
│   ├── TaxTypeTabs.tsx
│   ├── TaxSubjectPicker.tsx
│   ├── modes/
│   │   ├── SingleMode.tsx
│   │   └── CompareMode.tsx
│   ├── scenarios/
│   │   ├── PersonalIncomeTax.tsx
│   │   ├── VatTax.tsx
│   │   └── CorporateIncomeTax.tsx
│   ├── charts/              # 4 个 Recharts 图表
│   └── panels/              # 公式卡 / 常见疑问
├── components/tax-ui/
│   ├── TaxSlider.tsx
│   └── TaxAmountDisplay.tsx
├── stores/tax-visualizer.ts
└── constants/tax-visualizer.ts
```

## 法规数据基准

- 数据基准日:**2026-06**
- 法规来源:中华人民共和国个人所得税法、企业所得税法、增值税暂行条例
- 注:本工具仅供科普参考,不构成税务建议。

## 后续维护

- 法规调整 → 修改 `data/tax-rules/*.ts` 单文件,单测会自动覆盖
- 新增税种 → 在 `views/tax-visualizer/scenarios/` 加文件,改 `TaxTypeTabs` 和 `SingleMode`
- 新增主体 → 在 `data/tax-rules/subjects.ts` 加 `SubjectId` 类型和 `SUBJECTS` 数组

## 命令

```bash
pnpm run typecheck                 # TypeScript 检查(必须通过)
pnpm --filter client-react run lint # ESLint
pnpm --filter client-react exec vitest run src/data/tax-rules # 57 个单测
pnpm run dev:client                # http://localhost:5174/tax-visualizer
```

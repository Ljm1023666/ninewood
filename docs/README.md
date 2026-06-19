# Ninewood 文档索引

| 文档 | 读者 | 说明 |
|------|------|------|
| [../README.md](../README.md) | 全员 | 项目介绍、环境搭建、常用命令、测试账号 |
| [ENGINEERING_OVERVIEW.md](./ENGINEERING_OVERVIEW.md) | 开发者 | 仓库结构、技术栈、模块划分 |
| [LLM-CONFIG.md](./LLM-CONFIG.md) | 开发者 / 运维 | 大模型提供商、环境变量、BYOK |
| [FEATURE_SPECIFICATIONS.md](./FEATURE_SPECIFICATIONS.md) | 产品 / 开发 | 功能规格与业务规则 |
| [ENGINEERING-ROADMAP.md](./ENGINEERING-ROADMAP.md) | 开发 | 工程路线图 |
| [REPORT-九木平台技术实现报告.md](./REPORT-九木平台技术实现报告.md) | 技术评审 | 实现报告 |

## 用户向帮助（应用内）

以下内容维护在代码中，修改后需重新构建前端：

| 入口 | 路径 | 数据源 |
|------|------|--------|
| 帮助中心（智能跳转） | `/help` | `client-react/src/views/Help.tsx` |
| 帮助文档（FAQ 全文） | `/help/docs` | `client-react/src/views/help-faq-data.ts` |

更新产品功能时，请同步修改 `help-faq-data.ts` 中对应 FAQ 条目，并在 `Help.tsx` 的页面注册表中核对跳转路径。

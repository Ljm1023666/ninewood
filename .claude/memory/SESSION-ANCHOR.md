# SESSION ANCHOR

## Current Intent（2026-07-29 · 圈子 UI 整页对齐参考）

将兴趣圈子广场 / 我的 / 详情（讨论区+信息）对齐 requirement-docking-system 骨架；Hub 降为次要入口。

### 已完成

- `/circles` Bento 广场（推荐大卡、分类/排序、热门讨论、创建 CTA）
- `/circles/mine` 我的圈子列表
- `/circles/:id` 默认兴趣详情（粉调 hero + 讨论区/圈子信息）；Hub 子路径保留
- Prisma `CirclePost` / `Like` / `Reply` + `/api/circles/:id/posts*`；`POST leave`
- 本地 migrate `20260729100000_circle_posts`；typecheck / 定向 eslint 通过

### Next

1. 桌面手测：广场筛选加入、详情发帖点赞回复、我的圈子、Hub 次要链
2. 若 `prisma generate` EPERM：停本地 server 后再 generate（DLL 被占用）
3. 未要求则不提交、不上云

### Do NOT

- 不要把 `/circles/:id` 默认再重定向回 Hub community
- 不要移植参考项目移动断点 / 绿主色

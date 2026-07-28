# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY server/package.json ./server/
COPY client-react/package.json ./client-react/
RUN pnpm fetch
COPY . .
RUN pnpm install --prefer-offline --frozen-lockfile
RUN pnpm --filter server run build

# Stage 2: Production — 保持 workspace 布局，避免根 package.json 覆盖 server 依赖
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/client-react/package.json ./client-react/
RUN pnpm install --filter server --prod --frozen-lockfile --prefer-offline

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma

WORKDIR /app/server
RUN npx prisma generate

EXPOSE 3001
# 容器统一用轻量 /api/health/live，不依赖 Windows sc / Vite / 分类器
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]

# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY pnpm-lock.yaml ./
COPY package.json ./
RUN pnpm fetch
COPY . .
RUN pnpm install --prefer-offline
RUN pnpm --filter server run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/server/prisma ./prisma
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/package.json ./
RUN pnpm install --prod --prefer-offline
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/index.js"]

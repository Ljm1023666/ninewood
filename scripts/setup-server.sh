#!/bin/bash
set -e

echo "============================================"
echo "  Ninewood Server Setup"
echo "  Target: tothetomorrow.com (121.40.158.46)"
echo "============================================"

# ── 1. 系统更新 + 基础工具 ──
echo "[1/8] Updating system..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# ── 2. 安装 Node.js 22 ──
echo "[2/8] Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# ── 3. 安装 PostgreSQL ──
echo "[3/8] Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# 创建数据库和用户
su - postgres -c "psql -c \"CREATE USER ninewood WITH PASSWORD 'CHANGE_THIS_PASSWORD';\""
su - postgres -c "psql -c \"CREATE DATABASE nine_db OWNER ninewood;\""
su - postgres -c "psql -c \"ALTER USER ninewood CREATEDB;\""

# ── 4. 安装 pnpm ──
echo "[4/8] Installing pnpm..."
npm install -g pnpm pm2

# ── 5. 配置防火墙 ──
echo "[5/8] Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw allow 3001
ufw --force enable

# ── 6. 创建应用目录 ──
echo "[6/8] Creating app directory..."
mkdir -p /opt/ninewood
chown -R $USER:$USER /opt/ninewood

echo ""
echo "============================================"
echo "  Server setup complete!"
echo "============================================"
echo ""
echo "  Next steps:"
echo "  1. scp your project to /opt/ninewood"
echo "  2. Copy .env to /opt/ninewood/server/.env"
echo "  3. Update DATABASE_URL in .env:"
echo "     postgresql://ninewood:CHANGE_THIS_PASSWORD@localhost:5432/nine_db?schema=public"
echo "  4. npm install -w server && npm run build -w server"
echo "  5. pm2 start npm --name ninewood -- run dev -w server"
echo "  6. Run: certbot --nginx -d tothetomorrow.com -d www.tothetomorrow.com"
echo ""

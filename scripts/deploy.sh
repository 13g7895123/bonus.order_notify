#!/bin/bash

# ===========================================
# Order Notify - Full Deployment Script
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "======================================"
echo "  Order Notify - 完整部署"
echo "======================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ 已載入 .env 環境變數"
else
    echo "⚠ .env 不存在，複製範本..."
    cp .env.example .env
    export $(cat .env | grep -v '^#' | xargs)
fi

# Step 1: Stop existing containers
echo ""
echo "► 步驟 1: 停止現有容器..."
echo "-------------------------------------------"
docker compose down --remove-orphans 2>/dev/null || true

# Step 2: Build all services
echo ""
echo "► 步驟 2: 建置所有服務..."
echo "-------------------------------------------"
docker compose build

# Step 3: Start all services
echo ""
echo "► 步驟 3: 啟動服務..."
echo "-------------------------------------------"
docker compose up -d

# Step 4: Wait for services
echo ""
echo "► 步驟 4: 等待服務就緒..."
echo "-------------------------------------------"
sleep 10

# Step 5: Run migrations
echo ""
echo "► 步驟 5: 執行資料庫遷移..."
echo "-------------------------------------------"
docker compose exec -T php php spark migrate 2>/dev/null || echo "⚠ 遷移失敗或已是最新"

# Step 6: Show status
echo ""
echo "► 服務狀態:"
echo "-------------------------------------------"
docker compose ps

echo ""
echo "======================================"
echo "  ✓ 部署完成!"
echo "======================================"
echo ""
echo "服務端口:"
echo "  - Frontend: http://localhost:${FRONTEND_PORT:-8080}"
echo "  - Backend API: http://localhost:${BACKEND_PORT:-8081}"
echo "  - phpMyAdmin: http://localhost:${PMA_PORT:-8082}"
echo ""
echo "藍綠部署:"
echo "  - 部署新版本: ./scripts/deploy-frontend.sh"
echo "  - 回滾: ./scripts/rollback.sh"
echo ""

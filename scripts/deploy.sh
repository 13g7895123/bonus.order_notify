#!/bin/bash

# ===========================================
# Order Notify System - Deployment Script
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "======================================"
echo "  Order Notify - Deployment Script"
echo "======================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ 已載入 .env 環境變數"
else
    echo "⚠ 警告: .env 檔案不存在，使用預設值"
fi

# Define container prefix
CONTAINER_PREFIX="order_notify"

echo ""
echo "► 步驟 1: 檢查並停止現有容器..."
echo "-------------------------------------------"

# Get all containers with our prefix
EXISTING_CONTAINERS=$(docker ps -a --filter "name=${CONTAINER_PREFIX}" --format "{{.Names}}" 2>/dev/null || true)

if [ -n "$EXISTING_CONTAINERS" ]; then
    echo "發現以下容器:"
    echo "$EXISTING_CONTAINERS"
    echo ""
    echo "正在停止容器..."
    docker compose down --remove-orphans 2>/dev/null || true
    echo "✓ 容器已停止"
else
    echo "✓ 無現有容器需要移除"
fi

echo ""
echo "► 步驟 2: 清理舊映像 (可選)..."
echo "-------------------------------------------"

# Remove dangling images
DANGLING=$(docker images -f "dangling=true" -q 2>/dev/null || true)
if [ -n "$DANGLING" ]; then
    echo "清理懸空映像..."
    docker rmi $DANGLING 2>/dev/null || true
    echo "✓ 清理完成"
else
    echo "✓ 無需清理"
fi

echo ""
echo "► 步驟 3: 重新建置並啟動容器..."
echo "-------------------------------------------"

docker compose up -d --build

echo ""
echo "► 步驟 4: 等待服務啟動..."
echo "-------------------------------------------"

sleep 5

# Check if containers are running
echo ""
echo "容器狀態:"
docker compose ps

echo ""
echo "► 步驟 5: 執行資料庫遷移..."
echo "-------------------------------------------"

# Wait for DB to be ready
echo "等待資料庫就緒..."
sleep 10

docker exec ${CONTAINER_PREFIX}-php-1 php spark migrate 2>/dev/null || echo "⚠ 遷移失敗或已是最新"

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

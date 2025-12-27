#!/bin/bash

# ===========================================
# Order Notify System - Database Migrate Script
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

CONTAINER_PREFIX="order_notify"

echo "======================================"
echo "  Order Notify - 資料庫遷移"
echo "======================================"
echo ""

# Check if PHP container is running
if ! docker ps --format "{{.Names}}" | grep -q "${CONTAINER_PREFIX}-php-1"; then
    echo "✗ 錯誤: PHP 容器未運行，請先執行 deploy.sh"
    exit 1
fi

echo "執行遷移..."
docker exec ${CONTAINER_PREFIX}-php-1 php spark migrate

echo ""
echo "✓ 遷移完成"

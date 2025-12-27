#!/bin/bash

# ===========================================
# Order Notify System - Stop Script
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "======================================"
echo "  Order Notify - 停止服務"
echo "======================================"
echo ""

echo "正在停止所有容器..."
docker compose down --remove-orphans

echo ""
echo "✓ 所有服務已停止"

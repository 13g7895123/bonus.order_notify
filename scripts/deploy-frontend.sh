#!/bin/bash

# ===========================================
# Blue-Green Deployment Script
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "======================================"
echo "  藍綠部署 (Blue-Green Deployment)"
echo "======================================"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✓ 已載入 .env 環境變數"
else
    echo "✗ 錯誤: .env 檔案不存在"
    exit 1
fi

PROXY_CONF="./docker/nginx/proxy.conf"

# Determine current active color
get_current_color() {
    if grep -q "server frontend-blue:80" "$PROXY_CONF" 2>/dev/null; then
        echo "blue"
    else
        echo "green"
    fi
}

CURRENT_COLOR=$(get_current_color)

if [ "$CURRENT_COLOR" = "blue" ]; then
    NEW_COLOR="green"
    OLD_COLOR="blue"
else
    NEW_COLOR="blue"
    OLD_COLOR="green"
fi

echo "目前運行: $OLD_COLOR"
echo "即將部署: $NEW_COLOR"
echo ""

# Step 1: Build new version
echo "► 步驟 1: 建置新版本 (frontend-$NEW_COLOR)..."
echo "-------------------------------------------"
docker compose build frontend-$NEW_COLOR

# Step 2: Start new container
echo ""
echo "► 步驟 2: 啟動新容器..."
echo "-------------------------------------------"
docker compose up -d frontend-$NEW_COLOR

# Step 3: Wait for health check
echo ""
echo "► 步驟 3: 等待新容器就緒..."
echo "-------------------------------------------"
sleep 5

# Check if new container is healthy
if docker compose ps frontend-$NEW_COLOR | grep -q "Up"; then
    echo "✓ frontend-$NEW_COLOR 已就緒"
else
    echo "✗ frontend-$NEW_COLOR 啟動失敗"
    exit 1
fi

# Step 4: Switch proxy to new color
echo ""
echo "► 步驟 4: 切換流量至 $NEW_COLOR..."
echo "-------------------------------------------"

cat > "$PROXY_CONF" << EOF
# Blue-Green Deployment Proxy Config
# Active: $NEW_COLOR (Updated: $(date))

upstream frontend {
    server frontend-$NEW_COLOR:80;
}

upstream backend {
    server backend-nginx:80;
}

server {
    listen 80;
    server_name localhost;

    # API requests go to backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;
        
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
            add_header 'Access-Control-Max-Age' 86400;
            add_header 'Content-Length' 0;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            return 204;
        }
    }

    # Frontend requests
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Reload proxy
docker compose exec -T proxy nginx -s reload

echo "✓ 流量已切換至 $NEW_COLOR"

# Step 5: Optionally stop old container
echo ""
echo "► 步驟 5: 保留舊版本供回滾..."
echo "-------------------------------------------"
echo "舊版本 frontend-$OLD_COLOR 仍在運行，可使用以下命令回滾："
echo "  ./scripts/rollback.sh"
echo ""

echo "======================================"
echo "  ✓ 部署完成!"
echo "======================================"
echo ""
echo "服務端口: http://localhost:${FRONTEND_PORT:-8080}"
echo "目前運行版本: $NEW_COLOR"
echo ""

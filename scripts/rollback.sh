#!/bin/bash

# ===========================================
# Rollback Script - Switch back to previous version
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

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
    ROLLBACK_TO="green"
else
    ROLLBACK_TO="blue"
fi

echo "======================================"
echo "  回滾 (Rollback)"
echo "======================================"
echo ""
echo "目前版本: $CURRENT_COLOR"
echo "回滾至: $ROLLBACK_TO"
echo ""

# Check if rollback target is running
if ! docker compose ps frontend-$ROLLBACK_TO | grep -q "Up"; then
    echo "✗ 錯誤: frontend-$ROLLBACK_TO 未運行，無法回滾"
    exit 1
fi

# Switch proxy
cat > "$PROXY_CONF" << EOF
# Blue-Green Deployment Proxy Config
# Active: $ROLLBACK_TO (Rollback: $(date))

upstream frontend {
    server frontend-$ROLLBACK_TO:80;
}

upstream backend {
    server backend-nginx:80;
}

server {
    listen 80;
    server_name localhost;

    # 前面還有 Nginx Proxy Manager（NPM）。信任來自內網/docker 網段的 X-Real-IP，
    # 讓 \$remote_addr 還原成真實客戶端 IP，再透過下方 X-Real-IP 傳給後端。
    # NPM 預設會以 \$remote_addr 覆寫 X-Real-IP，客戶端無法偽造。
    set_real_ip_from 10.0.0.0/8;
    set_real_ip_from 172.16.0.0/12;
    set_real_ip_from 192.168.0.0/16;
    set_real_ip_from 127.0.0.1;
    real_ip_header X-Real-IP;

    # API requests go to backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 大量發送是同步逐筆呼叫 LINE API（約 0.3 秒/筆），預設 60 秒不夠
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;

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

docker compose exec -T proxy nginx -s reload

echo ""
echo "✓ 已回滾至 $ROLLBACK_TO"
echo ""

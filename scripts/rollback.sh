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

server {
    listen 80;
    server_name localhost;

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

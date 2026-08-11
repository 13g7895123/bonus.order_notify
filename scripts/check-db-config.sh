#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SHOW_SECRETS=0

usage() {
    cat <<'USAGE'
用法：
  ./scripts/check-db-config.sh [--show-secrets]

說明：
  唯讀檢查目前 Docker Compose、PHP 容器與 MySQL 容器的資料庫設定。
  預設會遮罩密碼；只有在需要時才使用 --show-secrets。
USAGE
}

for arg in "$@"; do
    case "$arg" in
        --show-secrets|-s)
            SHOW_SECRETS=1
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "未知參數：$arg" >&2
            usage >&2
            exit 2
            ;;
    esac
done

cd "$PROJECT_DIR"

if ! command -v docker >/dev/null 2>&1; then
    echo "錯誤：找不到 docker 指令。" >&2
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "錯誤：目前 Docker 未提供 docker compose。" >&2
    exit 1
fi

if [[ ! -f docker-compose.yml ]]; then
    echo "錯誤：找不到 $PROJECT_DIR/docker-compose.yml。" >&2
    exit 1
fi

mask_secrets() {
    if [[ "$SHOW_SECRETS" == "1" ]]; then
        cat
        return
    fi

    awk '
        {
            line = $0
            lower = tolower(line)
            if (lower ~ /(password|secret|token)/) {
                if (line ~ /:/) {
                    sub(/:.*/, ": ********", line)
                } else if (line ~ /=/) {
                    sub(/=.*/, "=********", line)
                }
            }
            print line
        }
    '
}

service_block() {
    local service="$1"

    printf '%s\n' "$COMPOSE_CONFIG" | awk -v service="$service" '
        $0 == "  " service ":" { found = 1 }
        found && $0 != "  " service ":" && $0 ~ /^  [^[:space:]][^:]*:/ { exit }
        found { print }
    '
}

echo "======================================"
echo "  Order Notify - DB 連線資訊檢查"
echo "======================================"
echo "專案目錄：$PROJECT_DIR"
if [[ "$SHOW_SECRETS" == "1" ]]; then
    echo "注意：已啟用 --show-secrets，請勿將輸出貼到公開頻道。"
else
    echo "密碼：已遮罩（需要時使用 --show-secrets）"
fi
echo

if [[ -f .env ]]; then
    echo "[1] 根目錄 .env"
    echo "  狀態：存在（Compose 會使用它進行變數替換）"
else
    echo "[1] 根目錄 .env"
    echo "  狀態：不存在（Compose 將使用預設值或 shell 環境變數）"
fi

if [[ -f backend/.env ]]; then
    echo "  backend/.env：存在"
else
    echo "  backend/.env：不存在"
fi
echo

echo "[2] Docker Compose 實際解析設定"
if ! COMPOSE_CONFIG="$(docker compose config 2>&1)"; then
    echo "$COMPOSE_CONFIG" >&2
    echo "錯誤：無法解析 Docker Compose 設定。" >&2
    exit 1
fi

echo "  db service："
service_block db | mask_secrets | sed 's/^/    /'
echo "  php service："
service_block php | mask_secrets | sed 's/^/    /'
echo

echo "[3] 目前容器狀態"
docker compose ps || true
echo

PHP_CONTAINER_ID="$(docker compose ps -q php 2>/dev/null || true)"
DB_CONTAINER_ID="$(docker compose ps -q db 2>/dev/null || true)"

if [[ -n "$PHP_CONTAINER_ID" ]] && [[ "$(docker inspect -f '{{.State.Running}}' "$PHP_CONTAINER_ID" 2>/dev/null || true)" == "true" ]]; then
    echo "[4] PHP 容器內的有效環境"

    PHP_ENV_OUTPUT="$(docker compose exec -T php sh -c '
        for key in CI_ENVIRONMENT DB_HOST DB_PORT DB_NAME DB_DATABASE DB_USER DB_USERNAME DB_PASSWORD DB_ROOT_PASSWORD; do
            value="$(printenv "$key" 2>/dev/null || true)"
            if [ -n "$value" ]; then
                printf "%s=%s\n" "$key" "$value"
            fi
        done
    ' 2>&1 || true)"

    if [[ -n "$PHP_ENV_OUTPUT" ]]; then
        printf '%s\n' "$PHP_ENV_OUTPUT" | mask_secrets | sed 's/^/  /'
    else
        echo "  沒有找到 CI_ENVIRONMENT 或 DB_* 環境變數。"
    fi

    echo "  CodeIgniter environment："
    if SPARK_ENV_OUTPUT="$(docker compose exec -T php php spark env 2>&1)"; then
        printf '%s\n' "$SPARK_ENV_OUTPUT" | sed 's/^/    /'
    else
        printf '%s\n' "$SPARK_ENV_OUTPUT" | sed 's/^/    /'
        echo "    無法執行 php spark env，請確認 Composer dependencies 已安裝。"
    fi

    echo "  backend/.env 中的 CodeIgniter DB 設定："
    BACKEND_ENV_OUTPUT="$(docker compose exec -T php sh -c '
        if [ -f /var/www/html/.env ]; then
            grep -E "^[[:space:]]*(CI_ENVIRONMENT|database\\.(default|tests)\\.(hostname|port|database|username|DBDriver|password))[[:space:]]*=" /var/www/html/.env || true
        else
            echo "(不存在 /var/www/html/.env)"
        fi
    ' 2>&1 || true)"
    printf '%s\n' "$BACKEND_ENV_OUTPUT" | mask_secrets | sed 's/^/    /'

    echo "  PHP 容器到 db:3306 的網路連通性："
    if PHP_DB_NETWORK_OUTPUT="$(docker compose exec -T php php -r '
        $socket = @fsockopen("db", 3306, $errno, $errstr, 2);
        if ($socket === false) {
            fwrite(STDERR, "失敗：$errstr ($errno)\n");
            exit(1);
        }
        fclose($socket);
        echo "成功：db:3306 可連線\n";
    ' 2>&1)"; then
        printf '%s\n' "$PHP_DB_NETWORK_OUTPUT" | sed 's/^/    /'
    else
        printf '%s\n' "$PHP_DB_NETWORK_OUTPUT" | sed 's/^/    /'
    fi
else
    echo "[4] PHP 容器內的有效環境"
    echo "  PHP 容器目前未執行，無法查詢容器內設定。"
fi
echo

if [[ -n "$DB_CONTAINER_ID" ]] && [[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER_ID" 2>/dev/null || true)" == "true" ]]; then
    echo "[5] MySQL 容器健康檢查"
    if DB_PROBE_OUTPUT="$(docker compose exec -T db sh -c '
        database="${MYSQL_DATABASE:-}"
        if [ -z "$database" ]; then
            echo "MYSQL_DATABASE 未設定" >&2
            exit 1
        fi
        mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD:-}" "$database" -NBe "SELECT DATABASE(), @@hostname, @@port, VERSION();"
    ' 2>&1)"; then
        echo "  MySQL 查詢成功（資料庫 / hostname / port / version）："
        printf '%s\n' "$DB_PROBE_OUTPUT" | sed 's/^/    /'
    else
        echo "  MySQL 查詢失敗："
        printf '%s\n' "$DB_PROBE_OUTPUT" | mask_secrets | sed 's/^/    /'
    fi
else
    echo "[5] MySQL 容器健康檢查"
    echo "  db 容器目前未執行，無法實際查詢 MySQL。"
fi

echo
echo "檢查完成。"

#!/bin/bash

# 使用者詳細資料 API 測試腳本
# 使用方式: ./test-user-details-api.sh [user_id]

# 設定
API_BASE_URL="http://localhost:8081/api"
USER_ID=${1:-1}  # 預設使用者 ID 為 1

echo "======================================"
echo "使用者詳細資料 API 測試"
echo "======================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試函數
test_api() {
    local type=$1
    local description=$2
    
    echo -e "${YELLOW}測試: ${description}${NC}"
    echo "URL: ${API_BASE_URL}/users/${USER_ID}/details?type=${type}&page=1&limit=10"
    
    response=$(curl -s -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -b cookies.txt \
        "${API_BASE_URL}/users/${USER_ID}/details?type=${type}&page=1&limit=10")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ 成功 (HTTP $http_code)${NC}"
        echo "回應資料:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ 失敗 (HTTP $http_code)${NC}"
        echo "錯誤訊息:"
        echo "$body"
    fi
    
    echo ""
    echo "--------------------------------------"
    echo ""
}

# 檢查 jq 是否安裝
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}注意: 未安裝 jq，JSON 輸出將不會格式化${NC}"
    echo "安裝方式: sudo apt-get install jq"
    echo ""
fi

# 檢查是否已登入
if [ ! -f cookies.txt ]; then
    echo -e "${YELLOW}未找到 cookies.txt，嘗試登入...${NC}"
    echo "請輸入管理員帳號:"
    read -p "使用者名稱: " username
    read -sp "密碼: " password
    echo ""
    
    login_response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -c cookies.txt \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
        "${API_BASE_URL}/auth/login")
    
    login_code=$(echo "$login_response" | tail -n1)
    
    if [ "$login_code" -eq 200 ]; then
        echo -e "${GREEN}✓ 登入成功${NC}"
        echo ""
    else
        echo -e "${RED}✗ 登入失敗${NC}"
        echo "$login_response" | sed '$d'
        exit 1
    fi
fi

# 執行測試
echo "開始測試使用者 ID: $USER_ID"
echo ""

test_api "customers" "客戶資料"
test_api "templates" "範本資料"
test_api "messages" "訊息記錄"
test_api "line_users" "LINE 使用者"
test_api "activity_logs" "活動日誌"

echo "======================================"
echo "測試完成"
echo "======================================"

# 清理
echo ""
read -p "是否要登出並刪除 cookies? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    curl -s -X POST -b cookies.txt "${API_BASE_URL}/auth/logout" > /dev/null
    rm -f cookies.txt
    echo -e "${GREEN}已登出並清理 cookies${NC}"
fi

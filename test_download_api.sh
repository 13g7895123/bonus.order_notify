#!/bin/bash

# 測試下載未匹配客戶 API
# 使用方法: ./test_download_api.sh

echo "=== 測試下載未匹配客戶 API ==="
echo ""

# 設定 API URL (請根據實際情況修改)
API_URL="${1:-http://localhost/api}"

# 測試資料
TEST_DATA='{
  "headers": ["客戶名稱", "獎金金額", "發放日期"],
  "not_found": ["測試客戶A", "測試客戶B"]
}'

echo "API URL: $API_URL/notifications/download-not-found"
echo "測試資料:"
echo "$TEST_DATA" | jq '.' 2>/dev/null || echo "$TEST_DATA"
echo ""

# 發送請求
echo "發送請求..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "$API_URL/notifications/download-not-found" \
  -H "Content-Type: application/json" \
  -H "Cookie: ci_session=YOUR_SESSION_COOKIE_HERE" \
  -d "$TEST_DATA")

# 分離 HTTP 狀態碼和回應內容
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP 狀態碼: $HTTP_CODE"
echo "回應內容:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 測試成功！"
else
    echo "❌ 測試失敗！"
    echo ""
    echo "請檢查:"
    echo "1. 是否已登入（需要有效的 session cookie）"
    echo "2. API URL 是否正確"
    echo "3. 後端日誌: docker logs notification-backend-1 --tail 50"
fi

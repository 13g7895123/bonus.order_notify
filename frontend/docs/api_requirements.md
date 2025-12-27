# API 需求文件

## 1. 認證 (Auth)

### 1.1 登入
- **POST** `/api/auth/login`
- **Request**:
  ```json
  {
    "username": "admin",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "token": "bearer_token_here",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "Admin User"
    }
  }
  ```

### 1.2 登出
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  { "message": "Logged out" }
  ```

## 2. 通知範本 (Templates)

### 2.1 取得列表
- **GET** `/api/templates`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "name": "訂單確認",
      "content": "嗨 {{name}}, 您的訂單金額為 {{price}} 元...",
      "variables": "{\"price\": \"金額\", \"date\": \"日期\"}",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```
- **說明**:
  - `variables`: JSON 字串，儲存變數與預設 Excel 欄位對應

### 2.2 建立範本
- **POST** `/api/templates`
- **Request**:
  ```json
  {
    "name": "新範本",
    "content": "內容 {{variable}}...",
    "variables": {"variable": "Excel欄位名"}
  }
  ```

### 2.3 更新範本
- **PUT** `/api/templates/{id}`

### 2.4 刪除範本
- **DELETE** `/api/templates/{id}`

## 3. 客戶管理 (Customers)

### 3.1 取得客戶列表
- **GET** `/api/customers`
- **Query Params**: `?search=keyword`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "line_uid": "U1234567890abcdef",
      "custom_name": "王小明（VIP）",
      "line_display_name": "LINE暱稱",
      "picture_url": "https://profile.line-scdn.net/...",
      "status_message": "LINE狀態訊息",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```
- **說明**:
  - 自動 JOIN `line_users` 表，返回 LINE 頭像與暱稱
  - 搜尋支援 `custom_name`、`line_uid`、`line_display_name`

### 3.2 建立/更新客戶
- **POST** `/api/customers`
- **Request**:
  ```json
  {
    "id": null,
    "line_uid": "U1234567890abcdef",
    "custom_name": "王小明（VIP）"
  }
  ```
- **說明**:
  - `id`: 若為 null 則新增，否則更新
  - `line_uid`: LINE User ID（從 LINE Webhook 取得）
  - `custom_name`: 自定義名稱（可選）

### 3.3 刪除客戶
- **DELETE** `/api/customers/{id}`

## 4. LINE 使用者 (LINE Users)

### 4.1 Webhook 接收
- **POST** `/api/line/webhook`
- **說明**: 
  - LINE 平台呼叫，自動記錄使用者 UID 到 `line_users` 表
  - **新功能**: 同步自動在 `customers` 表建立客戶（`custom_name` 預設為 LINE 暱稱）

### 4.2 取得 LINE 使用者列表
- **GET** `/api/line/users`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "line_uid": "U1234567890abcdef",
      "display_name": "LINE顯示名稱",
      "picture_url": "https://...",
      "linked_customer_name": "王小明",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

## 5. 發送通知 (Notifications)

### 5.1 發送訊息
- **POST** `/api/notifications/send`
- **Request (新格式 - 支援個人化變數)**:
  ```json
  {
    "template_id": 1,
    "recipients": [
      {
        "id": 1,
        "variables": { "price": "1500", "date": "2024-01-15" }
      },
      {
        "id": 2,
        "variables": { "price": "2000", "date": "2024-01-16" }
      }
    ],
    "variables": { "default_value": "預設值" }
  }
  ```
- **Request (舊格式 - 向下相容)**:
  ```json
  {
    "template_id": 1,
    "customer_ids": [1, 2, 3]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "sent_count": 3,
    "message": "成功發送給 3 位客戶",
    "errors": []
  }
  ```
- **說明**:
  - `recipients`: 每位客戶可有獨立的變數值（從 Excel 匯入）
  - `variables`: 全域變數（當 recipient 無特定值時使用）

### 5.2 Excel 匯入預覽
- **POST** `/api/notifications/import-preview`
- **Body**: `multipart/form-data` (file 欄位)
- **Response**:
  ```json
  {
    "headers": ["姓名", "金額", "日期"],
    "matched": [
      {
        "id": 1,
        "custom_name": "王小明",
        "line_uid": "U...",
        "row_data": { "姓名": "王小明", "金額": "1500", "日期": "2024-01-15" }
      }
    ],
    "not_found": ["林宏仁"]
  }
  ```
- **說明**:
  - 讀取 XLS/XLSX 檔案，第一列為標題
  - 比對 A 欄與 `customers.custom_name`
  - `headers`: 返回標題列供前端變數對應
  - `row_data`: 每位客戶的完整資料列

## 6. 訊息記錄 (Messages)

### 6.1 取得最近訊息
- **GET** `/api/messages`

### 6.2 取得客戶訊息歷史
- **GET** `/api/messages/history/{customer_id}`

## 7. 系統設定 (Settings)

### 7.1 取得設定
- **GET** `/api/settings`
- **Response**:
  ```json
  {
    "line_channel_secret": "...",
    "line_channel_access_token": "...",
    "message_quota": "200"
  }
  ```

### 7.2 更新設定
- **POST** `/api/settings`
- **Request**:
  ```json
  {
    "line_channel_secret": "your_channel_secret",
    "line_channel_access_token": "your_channel_access_token",
    "message_quota": "200"
  }
  ```
- **說明**:
  - `message_quota`: 每月訊息配額上限（預設 200）

## 8. 儀表板統計 (Stats)

### 8.1 取得統計資料
- **GET** `/api/stats`
- **Response**:
  ```json
  {
    "templates": 5,
    "customers": 120,
    "messages": {
      "sent_this_month": 85,
      "quota": 200,
      "remaining": 115,
      "period": "2024年01月"
    }
  }
  ```
- **說明**:
  - `templates`: 範本總數
  - `customers`: 客戶總數
  - `messages.sent_this_month`: 本月已發送訊息數（系統發送）
  - `messages.quota`: 配額上限（從 settings 讀取）
  - `messages.remaining`: 剩餘可發送數量
  - `messages.period`: 統計期間（當月）

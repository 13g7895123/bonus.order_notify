# Backend API Documentation

Base URL: `/api`

## Authentication

### Login
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- **Response**:
  ```json
  {
    "token": "...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "Admin User",
      "role": "admin",
      "webhook_key": "abc123..."
    }
  }
  ```
- **說明**:
  - `role`: 使用者角色 (admin/user)
  - `webhook_key`: 該使用者的專屬 Webhook Key

### Logout
- **Endpoint**: `POST /auth/logout`
- **Headers**: `Authorization: Bearer <token>`

## Templates

### List Templates
- **Endpoint**: `GET /templates`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "name": "訂單確認",
      "content": "嗨 {{name}}, 您的金額為 {{price}} 元",
      "variables": "{\"price\": \"金額\"}",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```
- **說明**: `variables` 為 JSON 字串，儲存變數與預設 Excel 欄位對應

### Create Template
- **Endpoint**: `POST /templates`
- **Body**: 
  ```json
  {
    "name": "...",
    "content": "...",
    "variables": {"var_name": "Excel欄位名"}
  }
  ```

### Update Template
- **Endpoint**: `PUT /templates/{id}`
- **Body**: `{ "name": "...", "content": "...", "variables": {...} }`

### Delete Template
- **Endpoint**: `DELETE /templates/{id}`

## Customers

### List Customers
- **Endpoint**: `GET /customers?search={keyword}`
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
  - 自動 JOIN `line_users` 表返回 LINE 頭像與暱稱
  - 搜尋支援 `custom_name`、`line_uid`、`line_display_name`

### Create/Update Customer
- **Endpoint**: `POST /customers`
- **Body**:
  ```json
  {
    "id": null,
    "line_uid": "U1234567890abcdef",
    "custom_name": "王小明（VIP）"
  }
  ```
- **說明**:
  - `id`: null 為新增，有值為更新
  - `line_uid`: LINE User ID（必填）
  - `custom_name`: 自定義名稱（選填）

### Delete Customer
- **Endpoint**: `DELETE /customers/{id}`

## LINE Webhook & Users

### Webhook Endpoint (for LINE Developers Console)
- **Endpoint**: `POST /line/webhook`
- **Description**: 
  - LINE 平台呼叫此端點，自動記錄使用者 UID 到 `line_users` 表
  - **自動建立客戶**: 同步在 `customers` 表建立記錄，`custom_name` 預設為 LINE 暱稱

### List LINE Users
- **Endpoint**: `GET /line/users`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "line_uid": "U1234...",
      "display_name": "使用者名稱",
      "picture_url": "https://...",
      "linked_customer_name": "王小明",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

### Debug Logs (開發用)
- **Endpoint**: `GET /line/webhook-logs`
- **Description**: 查看今日 LINE Webhook 相關 Log

## Notifications

### Send Notification
- **Endpoint**: `POST /notifications/send`
- **Body (新格式 - 支援個人化變數)**:
  ```json
  {
    "template_id": 1,
    "recipients": [
      { "id": 1, "variables": { "price": "1500" } },
      { "id": 2, "variables": { "price": "2000" } }
    ],
    "variables": { "fallback": "預設值" }
  }
  ```
- **Body (舊格式 - 向下相容)**:
  ```json
  {
    "template_id": 1,
    "customer_ids": [1, 2]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "sent_count": 2,
    "message": "成功發送給 2 位客戶",
    "errors": []
  }
  ```
- **說明**:
  - `recipients`: 每位客戶可有獨立變數值（從 Excel 匯入）
  - `variables`: 全域變數（當 recipient 無特定值時使用）

### Import Notification List from XLS
- **Endpoint**: `POST /notifications/import-preview`
- **Body**: `multipart/form-data` (file: .xls/.xlsx)
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
    "not_found": ["陳大文"]
  }
  ```
- **說明**: 
  - 讀取 XLS 檔案，第一列為標題
  - 比對 A 欄與 `customers.custom_name`
  - `headers`: 返回標題列供前端變數對應
  - `row_data`: 每位客戶的完整資料列

## Messages (History)

### Recent Messages
- **Endpoint**: `GET /messages`

### Customer History
- **Endpoint**: `GET /messages/history/{customer_id}`

## Settings

### Get Settings
- **Endpoint**: `GET /settings`
- **Response**:
  ```json
  {
    "line_channel_secret": "...",
    "line_channel_access_token": "...",
    "message_quota": "200"
  }
  ```

### Update Settings
- **Endpoint**: `POST /settings`
- **Body**:
  ```json
  {
    "line_channel_secret": "your_channel_secret",
    "line_channel_access_token": "your_channel_access_token",
    "message_quota": "200"
  }
  ```
- **說明**: `message_quota` 為每月訊息配額上限（預設 200）

## Stats (Dashboard)

### Get Statistics
- **Endpoint**: `GET /stats`
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
  - `messages.sent_this_month`: 本月已發送訊息數（sender=system）
  - `messages.quota`: 配額上限（從 settings 讀取，預設 200）
  - `messages.remaining`: 剩餘可發送數量
  - `messages.period`: 統計期間（當月）

## Users (Admin Only)

### List Users
- **Endpoint**: `GET /users`
- **Response**:
  ```json
  [
    {
      "id": 1,
      "username": "admin",
      "name": "Admin User",
      "role": "admin",
      "webhook_key": "abc123...",
      "is_active": 1,
      "has_line_config": true,
      "message_quota": 200,
      "stats": {
        "customers": 50,
        "templates": 5,
        "messages_this_month": 85,
        "line_users": 45,
        "remaining_quota": 115
      },
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

### Get Current User
- **Endpoint**: `GET /users/me`
- **Response**: Single user object (same structure as above)

### Create User
- **Endpoint**: `POST /users`
- **Body**:
  ```json
  {
    "username": "newuser",
    "password": "password123",
    "name": "New User",
    "role": "user",
    "line_channel_secret": "...",
    "line_channel_access_token": "...",
    "message_quota": 200
  }
  ```
- **說明**:
  - `role`: admin or user
  - System auto-generates `webhook_key`

### Update User
- **Endpoint**: `PUT /users/{id}`
- **Body**:
  ```json
  {
    "name": "Updated Name",
    "role": "user",
    "is_active": true,
    "line_channel_secret": "...",
    "line_channel_access_token": "...",
    "message_quota": 500,
    "password": "newpassword"
  }
  ```
- **說明**: All fields optional

### Delete User
- **Endpoint**: `DELETE /users/{id}`
- **說明**: Deletes user and all associated data (customers, templates, messages)

### Regenerate Webhook Key
- **Endpoint**: `POST /users/{id}/regenerate-webhook`
- **Response**:
  ```json
  {
    "id": 1,
    "webhook_key": "new_webhook_key_here"
  }
  ```

## Multi-Tenant Webhook

### LINE Webhook (Multi-tenant)
- **Endpoint**: `POST /line/webhook?key={webhook_key}`
- **說明**:
  - Each user has their own Webhook URL
  - `key` parameter identifies the user
  - Configure this URL in LINE Developers Console
  - Example: `https://your-domain.com/api/line/webhook?key=abc123...`

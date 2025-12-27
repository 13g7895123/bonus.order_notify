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
      "name": "Admin User"
    }
  }
  ```

### Logout
- **Endpoint**: `POST /auth/logout`
- **Headers**: `Authorization: Bearer <token>`

## Templates

### List Templates
- **Endpoint**: `GET /templates`

### Create Template
- **Endpoint**: `POST /templates`
- **Body**: `{ "name": "...", "content": "..." }`

### Update Template
- **Endpoint**: `PUT /templates/{id}`
- **Body**: `{ "name": "...", "content": "..." }`

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
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

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
- **Description**: LINE 平台呼叫此端點，自動記錄使用者 UID。

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
      "linked_customer_name": null,
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

## Notifications

### Send Notification
- **Endpoint**: `POST /notifications/send`
- **Body**:
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

### Import Notification List from XLS
- **Endpoint**: `POST /notifications/import-preview`
- **Body**: `multipart/form-data` (file: .xls/.xlsx)
- **Response**:
  ```json
  {
    "matched": [
      { "id": 1, "custom_name": "王小明", "line_uid": "U..." }
    ],
    "not_found": ["陳大文"]
  }
  ```
- **說明**: 讀取 XLS 檔案 A 欄（從 A2 開始），比對 `customers.custom_name`。

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
    "line_channel_access_token": "..."
  }
  ```

### Update Settings
- **Endpoint**: `POST /settings`
- **Body**:
  ```json
  {
    "line_channel_secret": "your_channel_secret",
    "line_channel_access_token": "your_channel_access_token"
  }
  ```

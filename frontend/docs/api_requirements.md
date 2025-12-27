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
      "content": "嗨 {{name}}...",
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

### 2.2 建立範本
- **POST** `/api/templates`
- **Request**:
  ```json
  { "name": "新範本", "content": "內容..." }
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
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

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
- **說明**: LINE 平台呼叫，自動記錄使用者 UID

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
      "created_at": "2024-01-01 10:00:00"
    }
  ]
  ```

## 5. 發送通知 (Notifications)

### 5.1 發送訊息
- **POST** `/api/notifications/send`
- **Request**:
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
    "line_channel_access_token": "..."
  }
  ```

### 7.2 更新設定
- **POST** `/api/settings`
- **Request**:
  ```json
  {
    "line_channel_secret": "your_channel_secret",
    "line_channel_access_token": "your_channel_access_token"
  }
  ```

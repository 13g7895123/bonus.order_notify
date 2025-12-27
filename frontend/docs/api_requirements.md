# API 需求文件

## 1. 認證 (Auth)

### 1.1 登入
- **POST** `/api/auth/login`
- **Request**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "token": "jwt_token_here",
    "user": {
      "id": 1,
      "name": "Admin",
      "email": "user@example.com"
    }
  }
  ```

### 1.2 登出
- **POST** `/api/auth/logout`
- **Request**: Bearer Token
- **Response**:
  ```json
  { "message": "Successfully logged out" }
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

### 3.2 建立/更新客戶
- **POST** `/api/customers`
- **Request**:
  ```json
  { "name": "Alice", "line_id": "U12345" }
  ```

### 3.3 刪除客戶
- **DELETE** `/api/customers/{id}`

## 4. 發送通知 (Notifications)

### 4.1 發送訊息
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
    "sent_count": 3
  }
  ```

## 5. 系統設定 (Settings)

### 5.1 取得設定
- **GET** `/api/settings`

### 5.2 更新設定
- **POST** `/api/settings`
- **Request**:
  ```json
  {
    "line_channel_access_token": "..."
  }
  ```

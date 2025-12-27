# Backend API Documentation

Base URL: `http://localhost:8081/api`

## Authentication

### Login
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password"
  }
  ```
- **Response**:
  ```json
  {
    "token": "...",
    "user": { ... }
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

### Create/Update Customer
- **Endpoint**: `POST /customers`
- **Body**: `{ "id": 1, "name": "...", "line_id": "..." }` (ID optional for create)

### Delete Customer
- **Endpoint**: `DELETE /customers/{id}`

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

## LINE Webhook & Users

### Webhook Endpoint (for LINE Developers Console)
- **Endpoint**: `POST /line/webhook`
- **Description**: LINE 平台會呼叫此端點，當使用者加入 Bot 或傳送訊息時自動記錄 UID。

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


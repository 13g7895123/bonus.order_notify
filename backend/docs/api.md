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

### Update Settings
- **Endpoint**: `POST /settings`
- **Body**: `{ "key": "value" }`

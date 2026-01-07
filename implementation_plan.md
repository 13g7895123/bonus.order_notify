# 使用者詳細資料查看功能 - 實作計劃

## 功能概述
在管理者功能的使用者管理頁面中，新增查看每個使用者底下各項資料的功能。

## 實作內容

### 1. 後端 API 開發

#### 1.1 新增 API Endpoint
- **路徑**: `GET /api/users/:id/details`
- **檔案**: `/backend/app/Controllers/Api/Users.php`
- **方法**: `details($id)`
- **權限**: 僅管理員可存取
- **參數**:
  - `id`: 使用者 ID (路徑參數)
  - `type`: 資料類型 (查詢參數) - customers, templates, messages, line_users, activity_logs
  - `page`: 頁碼 (查詢參數，預設 1)
  - `limit`: 每頁筆數 (查詢參數，預設 10)

#### 1.2 回傳資料結構
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "name": "管理員",
    "role": "admin",
    ...
  },
  "stats": {
    "customers": 10,
    "templates": 5,
    "messages_total": 100,
    "messages_this_month": 20,
    "line_users": 8,
    "activity_logs": 150
  },
  "data": [...],
  "total": 10,
  "page": 1,
  "limit": 10,
  "type": "customers"
}
```

#### 1.3 路由設定
- **檔案**: `/backend/app/Config/Routes.php`
- **新增路由**: `$routes->get('users/(:num)/details', 'Users::details/$1');`

### 2. 前端開發

#### 2.1 API 服務層
- **檔案**: `/frontend/src/services/api.js`
- **新增方法**: `users.details(id, type, page, limit)`

#### 2.2 使用者管理頁面更新
- **檔案**: `/frontend/src/pages/UserManagement.jsx`

##### 2.2.1 新增狀態管理
- `showDetails`: 控制模態視窗顯示
- `selectedUser`: 當前選中的使用者
- `detailsType`: 當前查看的資料類型
- `detailsData`: 詳細資料列表
- `detailsStats`: 統計資料
- `detailsPage`: 當前頁碼
- `detailsTotal`: 總筆數
- `detailsLimit`: 每頁筆數
- `loadingDetails`: 載入狀態

##### 2.2.2 新增功能函數
- `handleViewDetails(user)`: 開啟詳細資料模態視窗
- `loadUserDetails(userId, type, page)`: 載入使用者詳細資料
- `handleDetailsTypeChange(type)`: 切換資料類型
- `handleDetailsPageChange(newPage)`: 切換頁碼

##### 2.2.3 UI 元件
1. **查看詳細按鈕**: 在每個使用者卡片的操作區域新增眼睛圖示按鈕
2. **詳細資料模態視窗**:
   - 標題區域：顯示使用者名稱和帳號
   - 統計概覽：以卡片形式展示各項資料統計
   - 類型選擇器：5 個按鈕切換不同資料類型
   - 資料內容區：根據類型顯示對應的資料列表
   - 分頁控制：當資料超過 10 筆時顯示分頁按鈕

### 3. 支援的資料類型

#### 3.1 客戶 (customers)
- 顯示欄位：客戶名稱、LINE UID、建立時間
- 排序：依建立時間降序

#### 3.2 範本 (templates)
- 顯示欄位：範本名稱、內容、建立時間
- 排序：依建立時間降序

#### 3.3 訊息記錄 (messages)
- 顯示欄位：客戶名稱、訊息內容、發送者類型、發送時間
- 排序：依建立時間降序
- 特殊處理：JOIN customers 表以顯示客戶名稱

#### 3.4 LINE 使用者 (line_users)
- 顯示欄位：顯示名稱、LINE UID、建立時間
- 排序：依建立時間降序

#### 3.5 活動日誌 (activity_logs)
- 顯示欄位：HTTP 方法、端點、回應碼、IP 位址、時間
- 排序：依建立時間降序
- 特殊處理：根據回應碼顯示不同顏色（成功/失敗）

## 技術特點

### 1. 分頁機制
- 後端使用 SQL LIMIT 和 OFFSET 實現分頁
- 前端顯示當前頁碼、總筆數、頁碼控制按鈕
- 每頁固定顯示 10 筆資料

### 2. 效能優化
- 使用分頁避免一次載入過多資料
- 切換類型時重置頁碼為 1
- 僅在需要時載入資料

### 3. 使用者體驗
- 模態視窗設計，不離開當前頁面
- 統計資料一目了然
- 類型切換按鈕清晰易用
- 載入狀態提示
- 空資料狀態提示

### 4. 安全性
- 僅管理員可存取此功能
- 後端驗證使用者權限
- 使用 AuthTrait 確保身份驗證

## 檔案清單

### 後端
1. `/backend/app/Controllers/Api/Users.php` - 新增 details() 方法
2. `/backend/app/Config/Routes.php` - 新增路由設定

### 前端
1. `/frontend/src/services/api.js` - 新增 API 呼叫方法
2. `/frontend/src/pages/UserManagement.jsx` - 新增 UI 和邏輯

## 測試建議

### 功能測試
1. 測試各種資料類型的顯示
2. 測試分頁功能
3. 測試空資料狀態
4. 測試載入狀態
5. 測試權限控制（非管理員無法存取）

### UI 測試
1. 模態視窗開關
2. 類型切換動畫
3. 分頁按鈕狀態（第一頁/最後一頁）
4. 響應式設計

### 資料測試
1. 大量資料的分頁
2. 不同使用者的資料隔離
3. 資料排序正確性

## 未來擴展建議

1. **搜尋功能**: 在詳細資料中加入搜尋框
2. **匯出功能**: 允許匯出使用者的所有資料
3. **圖表視覺化**: 將統計資料以圖表呈現
4. **時間範圍篩選**: 允許篩選特定時間範圍的資料
5. **批次操作**: 在詳細資料中支援批次刪除等操作

# 訂單通知系統實作計畫

## 1. 專案初始化
- [x] 使用 Vite 建立 React 專案
- [x] 安裝必要套件: `react-router-dom`, `lucide-react`
- [x] 設定全域樣式 (Dark Mode, 變數)

## 2. 核心組件開發
- [x] UI Library: Button, Input, Card
- [x] Layout: 側邊欄導航 (Sidebar), 主版面 (Layout)
- [x] Routing: 設定 React Router

## 3. 功能模組
### 3.1 通知範本管理 (Templates)
- [x] 建立範本列表視圖
- [x] 實作 CRUD (新增、編輯、刪除)
- [x] 支援變數語法 (如 `{{name}}`)
- [x] 使用 LocalStorage 進行資料持久化 (Mock)

### 3.2 客戶名單管理 (Customers)
- [x] 建立客戶列表視圖
- [x] 實作 CRUD (新增、編輯、刪除)
- [x] 實作客戶名稱與 LINE User ID 的對應編輯
- [x] 搜尋過濾功能

### 3.3 傳送通知 (Send Notification)
- [x] 選擇範本介面
- [x] 選擇目標客戶介面
- [x] 預覽通知內容
- [x] 模擬傳送 API 呼叫與狀態回饋

### 3.4 設定 (Settings)
- [x] LINE Channel Access Token 設定與儲存

## 4. 系統整合與優化
- [x] Dashboard 概覽頁面
- [x] 確保整體 UI 風格一致 (Premium Dark Theme)

## 備註
- 目前 XLS 讀取功能依需求暫緩，由後端處理。
- 資料存儲目前使用 Browser LocalStorage 進行演示，未來需串接後端 API。

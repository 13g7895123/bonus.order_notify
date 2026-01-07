# 管理者模擬使用者登入功能 - 技術說明文件

## 功能概述

模擬使用者登入（Impersonation）功能讓管理員可以暫時以其他使用者的身份操作系統，用於排查問題或協助使用者。這個功能的核心設計是**保留原始管理員的 Token**，以便隨時恢復身份。

---

## 架構圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                        正常登入流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [管理員] ──登入──> [access_token Cookie] ──> [系統辨識為管理員]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        模擬登入流程                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1. 管理員點擊「模擬登入」                                            │
│                                                                     │
│   2. 系統保存原始 Token:                                              │
│      [原始 access_token] ──儲存到──> [original_admin_token Cookie]    │
│                                                                     │
│   3. 系統生成新 Token:                                                │
│      [新 access_token] ──屬於目標使用者──> [access_token Cookie]       │
│                                                                     │
│   4. 前端刷新頁面，系統辨識為「目標使用者」                              │
│                                                                     │
│   5. 管理員點擊「恢復身份」:                                           │
│      [original_admin_token] ──恢復到──> [access_token Cookie]         │
│      [original_admin_token Cookie] ──清除──> ∅                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cookie 狀態說明

### 正常狀態（管理員登入）
| Cookie 名稱 | 值 | 說明 |
|------------|-----|------|
| `access_token` | admin_token_xxx | 管理員的存取 Token |
| `refresh_token` | admin_refresh_xxx | 管理員的刷新 Token |
| `original_admin_token` | (不存在) | - |

### 模擬狀態（以使用者 A 身份操作）
| Cookie 名稱 | 值 | 說明 |
|------------|-----|------|
| `access_token` | user_a_token_xxx | **使用者 A** 的存取 Token |
| `refresh_token` | user_a_refresh_xxx | **使用者 A** 的刷新 Token |
| `original_admin_token` | admin_token_xxx | **管理員的原始 Token**（用於恢復） |

---

## 後端 API 實作

### 1. 模擬登入 API

**端點**: `POST /api/auth/impersonate/:userId`

**權限**: 僅管理員可使用

**流程**:

```php
public function impersonate($userId = null)
{
    // 1. 驗證當前使用者是否為管理員
    $currentUser = $this->getCurrentUser();
    if (!$currentUser || $currentUser['role'] !== 'admin') {
        return $this->failForbidden('只有管理員可以使用此功能');
    }

    // 2. 不能模擬自己
    if ($currentUser['id'] == $userId) {
        return $this->failValidationErrors('無法模擬自己');
    }

    // 3. 查找目標使用者
    $targetUser = $db->table('users')->where('id', $userId)->get()->getRowArray();
    if (!$targetUser) {
        return $this->failNotFound('使用者不存在');
    }

    // 4. 保存原始管理員 Token（關鍵步驟！）
    $originalToken = $_COOKIE['access_token'] ?? null;

    // 5. 為目標使用者生成新的 access_token
    $accessToken = bin2hex(random_bytes(32));
    $db->table('user_tokens')->insert([
        'user_id' => $targetUser['id'],
        'token' => $accessToken,
        'created_at' => date('Y-m-d H:i:s')
    ]);

    // 6. 為目標使用者生成新的 refresh_token
    $refreshToken = bin2hex(random_bytes(32));
    $db->table('refresh_tokens')->insert([
        'user_id' => $targetUser['id'],
        'token' => $refreshToken,
        'expires_at' => date('Y-m-d H:i:s', time() + self::REFRESH_TOKEN_EXPIRY),
        'created_at' => date('Y-m-d H:i:s')
    ]);

    // 7. 設定新的認證 Cookie（目標使用者的 Token）
    $this->setAuthCookies($accessToken, $refreshToken);

    // 8. 將原始管理員 Token 存入單獨的 Cookie
    if ($originalToken) {
        setcookie('original_admin_token', $originalToken, [
            'expires' => time() + 3600, // 1 小時有效期
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }

    // 9. 回傳成功訊息和目標使用者資料
    return $this->respond([
        'success' => true,
        'message' => '已切換至 ' . $targetUser['name'] . ' 的身份',
        'user' => [
            'id' => $targetUser['id'],
            'username' => $targetUser['username'],
            'name' => $targetUser['name'],
            'role' => $targetUser['role'],
            'impersonating' => true  // 標記為模擬狀態
        ]
    ]);
}
```

### 2. 停止模擬 API

**端點**: `POST /api/auth/stop-impersonate`

**流程**:

```php
public function stopImpersonate()
{
    // 1. 檢查是否有原始管理員 Token
    $originalToken = $_COOKIE['original_admin_token'] ?? null;
    if (!$originalToken) {
        return $this->failValidationErrors('您目前不在模擬狀態');
    }

    // 2. 驗證原始 Token 是否仍然有效
    $tokenRecord = $db->table('user_tokens')
        ->where('token', $originalToken)
        ->get()->getRowArray();
    
    if (!$tokenRecord) {
        // Token 已失效，清除 Cookie 並要求重新登入
        $this->clearAuthCookies();
        setcookie('original_admin_token', '', ['expires' => time() - 3600, 'path' => '/']);
        return $this->failUnauthorized('原始登入已過期，請重新登入');
    }

    // 3. 取得原始管理員資料
    $adminUser = $db->table('users')
        ->where('id', $tokenRecord['user_id'])
        ->get()->getRowArray();

    // 4. 驗證原始使用者確實是管理員
    if (!$adminUser || $adminUser['role'] !== 'admin') {
        return $this->failForbidden('原始使用者不是管理員');
    }

    // 5. 刪除目前模擬使用者的 Token（清理）
    $currentToken = $_COOKIE['access_token'] ?? null;
    if ($currentToken) {
        $db->table('user_tokens')->where('token', $currentToken)->delete();
    }
    $currentRefreshToken = $_COOKIE['refresh_token'] ?? null;
    if ($currentRefreshToken) {
        $db->table('refresh_tokens')->where('token', $currentRefreshToken)->delete();
    }

    // 6. 恢復原始管理員 Token
    setcookie('access_token', $originalToken, [
        'expires' => time() + self::ACCESS_TOKEN_EXPIRY,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    // 7. 清除 original_admin_token Cookie
    setcookie('original_admin_token', '', [
        'expires' => time() - 3600,
        'path' => '/'
    ]);

    // 8. 回傳管理員資料
    return $this->respond([
        'success' => true,
        'message' => '已恢復管理員身份',
        'user' => [
            'id' => $adminUser['id'],
            'username' => $adminUser['username'],
            'name' => $adminUser['name'],
            'role' => $adminUser['role'],
            'impersonating' => false
        ]
    ]);
}
```

### 3. 取得當前使用者資訊 API

**端點**: `GET /api/auth/me`

**修改**: 新增 `impersonating` 欄位來標示模擬狀態

```php
public function me()
{
    $currentUser = $this->getCurrentUser();

    if (!$currentUser) {
        return $this->failUnauthorized('Not authenticated');
    }

    return $this->respond([
        'id' => $currentUser['id'],
        'username' => $currentUser['username'],
        'name' => $currentUser['name'],
        'role' => $currentUser['role'],
        'webhook_key' => $currentUser['webhook_key'],
        'can_create_users' => (bool)$currentUser['can_create_users'],
        // 透過檢查 original_admin_token Cookie 是否存在來判斷模擬狀態
        'impersonating' => isset($_COOKIE['original_admin_token']) && $_COOKIE['original_admin_token']
    ]);
}
```

---

## 前端實作

### 1. API 服務層 (`api.js`)

```javascript
auth: {
    // ... 其他方法 ...
    
    // 模擬登入
    impersonate: async (userId) => {
        const res = await fetchWithAuth(`${API_URL}/auth/impersonate/${userId}`, { 
            method: 'POST' 
        });
        return res.json();
    },
    
    // 停止模擬
    stopImpersonate: async () => {
        const res = await fetchWithAuth(`${API_URL}/auth/stop-impersonate`, { 
            method: 'POST' 
        });
        return res.json();
    }
}
```

### 2. 使用者管理頁面 (`UserManagement.jsx`)

```jsx
// 模擬登入處理函數
const handleImpersonate = async (user) => {
    // 確認對話框
    if (!confirm(`確定要以「${user.name || user.username}」的身份登入嗎？\n\n您可以從側邊欄恢復管理員身份。`)) {
        return;
    }
    
    try {
        const result = await api.auth.impersonate(user.id);
        if (result.success) {
            alert(`已切換至「${user.name || user.username}」的身份`);
            // 刷新頁面，重新載入使用者上下文
            window.location.href = '/';
        } else {
            alert(result.messages?.error || '模擬登入失敗');
        }
    } catch (e) {
        console.error('Impersonate failed', e);
        alert('模擬登入失敗');
    }
};

// 在使用者卡片中顯示模擬登入按鈕（非管理員才顯示）
{user.role !== 'admin' && (
    <button 
        onClick={() => handleImpersonate(user)} 
        title="以此使用者身份登入"
        style={{ color: '#f59e0b' }}
    >
        <LogIn size={18} />
    </button>
)}
```

### 3. 側邊欄 (`Sidebar.jsx`)

```jsx
const Sidebar = () => {
    const { logout, user, setUser } = useAuth();
    const [isStoppingImpersonate, setIsStoppingImpersonate] = useState(false);

    // 停止模擬處理函數
    const handleStopImpersonate = async () => {
        setIsStoppingImpersonate(true);
        try {
            const result = await api.auth.stopImpersonate();
            if (result.success) {
                setUser(result.user);  // 更新使用者狀態
                window.location.href = '/users';  // 導向使用者管理頁面
            } else {
                alert(result.messages?.error || '恢復身份失敗');
            }
        } catch (e) {
            console.error('Stop impersonate failed', e);
            alert('恢復身份失敗');
        }
        setIsStoppingImpersonate(false);
    };

    return (
        <div>
            {/* 模擬狀態警告橫幅 */}
            {user?.impersonating && (
                <div style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '1rem'
                }}>
                    <div style={{ color: '#f59e0b', fontWeight: '600' }}>
                        <UserX size={16} /> 模擬登入中
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                        您目前正以其他使用者的身份操作。
                    </div>
                    <button onClick={handleStopImpersonate} disabled={isStoppingImpersonate}>
                        {isStoppingImpersonate ? '恢復中...' : '恢復管理員身份'}
                    </button>
                </div>
            )}
            
            {/* 導航選單：模擬狀態下隱藏管理員功能 */}
            <nav>
                {/* ... 一般功能選單 ... */}
                
                {/* 管理員專用功能（不在模擬狀態時才顯示） */}
                {user?.role === 'admin' && !user?.impersonating && (
                    <>
                        <NavLink to="/users">使用者管理</NavLink>
                        <NavLink to="/activity-logs">操作紀錄</NavLink>
                    </>
                )}
            </nav>
        </div>
    );
};
```

---

## 安全性考量

### 1. 權限驗證
- 只有 `role === 'admin'` 的使用者可以執行模擬登入
- 管理員不能模擬自己（防止混淆）

### 2. Token 時效
- `original_admin_token` Cookie 有效期為 1 小時
- 超過時效後，管理員需要重新登入

### 3. Token 清理
- 停止模擬時，會刪除被模擬使用者的 Token
- 避免 Token 堆積造成安全風險

### 4. HttpOnly Cookie
- 所有 Token Cookie 都設為 `httponly: true`
- 防止 JavaScript 直接讀取，降低 XSS 風險

### 5. 模擬狀態限制
- 模擬狀態下，隱藏管理員專用功能
- 防止管理員在模擬狀態下進行敏感操作

---

## 資料庫表格

此功能不需要新增資料庫表格，使用既有的表格：

### `user_tokens` 表
儲存 access_token

| 欄位 | 類型 | 說明 |
|-----|------|------|
| id | INT | 主鍵 |
| user_id | INT | 使用者 ID |
| token | VARCHAR(64) | 存取 Token |
| created_at | DATETIME | 建立時間 |

### `refresh_tokens` 表
儲存 refresh_token

| 欄位 | 類型 | 說明 |
|-----|------|------|
| id | INT | 主鍵 |
| user_id | INT | 使用者 ID |
| token | VARCHAR(64) | 刷新 Token |
| expires_at | DATETIME | 過期時間 |
| created_at | DATETIME | 建立時間 |

---

## 使用流程

### 開始模擬

1. 管理員進入「使用者管理」頁面
2. 找到要模擬的使用者，點擊橘色「登入」圖示
3. 確認對話框後，系統切換身份
4. 頁面刷新，側邊欄顯示橘色警告橫幅

### 結束模擬

1. 點擊側邊欄的「恢復管理員身份」按鈕
2. 系統恢復原始管理員 Token
3. 頁面導向「使用者管理」頁面

---

## 路由設定

```php
// backend/app/Config/Routes.php

$routes->group('api', function ($routes) {
    // Auth 相關
    $routes->post('auth/impersonate/(:num)', 'Auth::impersonate/$1');
    $routes->post('auth/stop-impersonate', 'Auth::stopImpersonate');
});
```

---

## 測試建議

### 功能測試
1. ✅ 管理員可以模擬一般使用者
2. ✅ 模擬狀態下，系統顯示被模擬使用者的資料
3. ✅ 模擬狀態下，管理員功能被隱藏
4. ✅ 可以成功恢復管理員身份
5. ✅ 恢復後，管理員功能重新顯示

### 邊界測試
1. ❌ 非管理員無法使用模擬功能
2. ❌ 管理員無法模擬自己
3. ❌ 無法模擬不存在的使用者
4. ⚠️ 原始 Token 過期時，提示重新登入

### 安全測試
1. Cookie 確實設為 HttpOnly
2. 停止模擬後，舊 Token 確實被刪除
3. 無法偽造 original_admin_token

---

## 相關檔案清單

| 檔案 | 說明 |
|------|------|
| `backend/app/Controllers/Api/Auth.php` | 後端 API 控制器 |
| `backend/app/Config/Routes.php` | 路由設定 |
| `frontend/src/services/api.js` | 前端 API 服務 |
| `frontend/src/pages/UserManagement.jsx` | 使用者管理頁面 |
| `frontend/src/components/Sidebar.jsx` | 側邊欄組件 |
| `frontend/src/context/AuthContext.jsx` | 認證上下文 |

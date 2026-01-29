# Webhook 连通性测试功能

## 功能说明

已成功添加 Webhook 连通性测试功能，类似 LINE 官方后台的测试按钮。

## 实现内容

### 1. 后端 API (LineWebhook.php)

**路由**: `POST /api/line/webhook/test/:userId`

**功能**:
- ✅ 检查帐号状态（is_active）
- ✅ 检查 Webhook Key 设定
- ✅ 检查 Channel Secret 设定
- ✅ 模拟 LINE 发送测试请求到 Webhook URL
- ✅ 验证签章（Signature）计算和验证
- ✅ 检查 Webhook 请求记录功能
- ✅ 返回详细的诊断信息

**测试内容**:
1. **帐号状态检查** - 确认用户帐号已启用
2. **Webhook Key 检查** - 确认 Webhook Key 已设定
3. **Channel Secret 检查** - 确认 Channel Secret 已设定（影响签章验证）
4. **Webhook 请求测试** - 实际发送 HTTP 请求到 Webhook endpoint
5. **Webhook 记录检查** - 确认测试请求被正确记录到数据库

### 2. 前端 API (api.js)

```javascript
line: {
    testWebhook: async (userId) => (await fetchWithAuth(`${API_URL}/line/webhook/test/${userId}`, { method: 'POST' })).json()
}
```

### 3. 前端 UI (WebhookLogs.jsx)

**新增功能**:
- ✅ "测试 Webhook" 按钮（在页面顶部）
- ✅ 测试模态框（Modal）
- ✅ 用户选择下拉菜单
- ✅ 测试说明信息
- ✅ 测试结果显示（成功/警告/错误）
- ✅ 详细测试项目展开/收起
- ✅ 重新测试和更新记录按钮

**测试结果显示**:
- 整体状态卡片（绿色=成功，黄色=警告，红色=错误）
- 各项检查结果列表
- 详细信息展开功能
- 实时处理时间和 HTTP 状态码

## 使用方法

1. 进入 "Webhook 请求记录" 页面
2. 点击右上角的 "测试 Webhook" 按钮
3. 在弹出的模态框中选择要测试的用户
4. 点击 "开始测试" 按钮
5. 查看测试结果，包括：
   - 帐号状态检查
   - Webhook Key 检查
   - Channel Secret 检查
   - Webhook 请求测试（实际 HTTP 调用）
   - Webhook 记录检查

## 测试流程

```
用户点击测试
    ↓
选择用户 → 前端调用 API
    ↓
后端检查配置
    ↓
模拟 LINE 发送请求
    ↓
实际调用 Webhook endpoint
    ↓
验证签章和响应
    ↓
检查数据库记录
    ↓
返回详细诊断结果
    ↓
前端展示结果
```

## 特点

- 🎯 **完整模拟** - 真实模拟 LINE 服务器的 Webhook 请求
- 🔒 **签章验证** - 测试 Channel Secret 的签章计算是否正确
- 📊 **详细诊断** - 提供每个检查项的详细状态和信息
- 🔄 **实时测试** - 实际发送 HTTP 请求，验证端到端连通性
- 📝 **自动记录** - 测试请求会被记录到 webhook_logs 表
- 🎨 **友好界面** - 清晰的视觉反馈和详细信息展开

## 相关文件

- Backend: `backend/app/Controllers/Api/LineWebhook.php` (testWebhook 方法)
- Routes: `backend/app/Config/Routes.php`
- Frontend API: `frontend/src/services/api.js`
- Frontend UI: `frontend/src/pages/WebhookLogs.jsx`

## 测试结果示例

### 成功情况
```json
{
  "user": {
    "id": 1,
    "username": "user1",
    "name": "测试用户",
    "is_active": true
  },
  "tests": {
    "user_active": {
      "name": "帐号状态检查",
      "status": "success",
      "message": "帐号已启用"
    },
    "webhook_key": {
      "name": "Webhook Key 检查",
      "status": "success",
      "message": "Webhook Key 已设定 (64 字元)"
    },
    "channel_secret": {
      "name": "Channel Secret 检查",
      "status": "success",
      "message": "Channel Secret 已设定 (32 字元)"
    },
    "webhook_request": {
      "name": "Webhook 请求测试",
      "status": "success",
      "message": "Webhook 回应成功 (HTTP 200)",
      "details": {
        "url": "http://localhost/api/line/webhook?key=...",
        "http_code": 200,
        "processing_time_ms": 45
      }
    },
    "webhook_logging": {
      "name": "Webhook 记录检查",
      "status": "success",
      "message": "测试请求已成功记录到数据库"
    }
  },
  "overall_status": "success"
}
```

## 下一步建议

可以继续扩展以下功能：
1. ✨ 发送实际测试消息到 LINE 用户
2. ✨ 测试 Flex Message 和 Template Message
3. ✨ 批量测试所有用户的 Webhook 配置
4. ✨ 定期自动健康检查
5. ✨ Webhook 性能压力测试

## 注意事项

- 测试会实际调用 Webhook endpoint，会产生记录
- 测试请求会被标记为 `is_test_request = 1`
- 需要管理员权限才能执行测试
- 测试会验证真实的签章计算

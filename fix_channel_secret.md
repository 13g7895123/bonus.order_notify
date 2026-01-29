# 修复 Channel Secret 签章验证失败问题

## 问题
LINE 后台测试 Webhook 时返回 401 错误，签章验证失败

用户：梧棲總店 (@bro171)
错误：Signature verification failed

## 解决步骤

### 步骤 1: 获取正确的 Channel Secret

1. 登入 LINE Developers Console
   https://developers.line.biz/console/

2. 选择你的 Provider

3. 选择对应的 Messaging API Channel

4. 进入 「Basic settings」（基本设定）标签

5. 找到 「Channel secret」
   - 点击 「Show」显示完整的 secret
   - 复制这个值（应该是 32 字元的字串）

### 步骤 2: 更新系统中的 Channel Secret

#### 方法 A: 通过管理界面更新

1. 登入你的系统管理后台
2. 进入「用户管理」
3. 找到「梧棲總店 (@bro171)」
4. 点击「编辑」按钮
5. 在「LINE Channel Secret」字段贴上刚才复制的值
6. 点击「保存」

#### 方法 B: 直接更新数据库（需要数据库访问权限）

```sql
-- 先查看当前的值（部分显示）
SELECT 
    id, 
    username, 
    name,
    LEFT(line_channel_secret, 10) as secret_preview,
    LENGTH(line_channel_secret) as secret_length
FROM users 
WHERE username = 'bro171';

-- 更新为正确的 Channel Secret
UPDATE users 
SET line_channel_secret = '你从LINE后台复制的正确值'
WHERE username = 'bro171';
```

### 步骤 3: 验证设定

使用系统的 Webhook 测试功能：

1. 进入「Webhook 请求记录」页面
2. 点击「测试 Webhook」按钮
3. 选择「梧棲總店 (@bro171)」
4. 点击「开始测试」
5. 查看测试结果：
   - ✅ Channel Secret 检查应该显示「已设定」
   - ✅ Webhook 请求测试应该返回 HTTP 200
   - ✅ 签章验证应该通过

### 步骤 4: 在 LINE 后台再次测试

1. 回到 LINE Developers Console
2. 进入你的 Channel
3. 点击「Messaging API」标签
4. 找到「Webhook settings」
5. 点击「Verify」（验证）按钮
6. 应该看到「Success」✅

## 常见问题

### Q: 我确定 Channel Secret 是对的，为什么还是失败？

A: 检查以下几点：
- Channel Secret 前后是否有多余的空格
- 是否复制了完整的 32 字元
- 确认是从正确的 Channel 复制的（如果有多个 Channel）
- 检查是否有特殊字符被转义

### Q: 更新后还是失败怎么办？

A: 尝试以下步骤：
1. 清除浏览器缓存
2. 重启后端服务（如果使用 Docker）
3. 查看后端日志，找到详细的错误信息：
   ```bash
   tail -f backend/writable/logs/log-*.log | grep "LINE Webhook"
   ```

### Q: 如何知道 LINE 实际发送的签章值？

A: 查看 webhook_logs 表中的 signature 字段：
```sql
SELECT 
    created_at,
    user_id,
    signature,
    signature_valid,
    error_message,
    request_body
FROM webhook_logs 
WHERE user_id = (SELECT id FROM users WHERE username = 'bro171')
ORDER BY created_at DESC 
LIMIT 5;
```

## 技术说明

### 签章计算方式

LINE 使用 HMAC-SHA256 算法：
```php
$signature = base64_encode(hash_hmac('sha256', $requestBody, $channelSecret, true));
```

### 验证流程

1. LINE 后台使用它的 Channel Secret 计算签章
2. 将签章放在 `X-Line-Signature` header 中
3. 你的服务器收到请求
4. 用你设定的 Channel Secret 重新计算签章
5. 比对两个签章是否一致
6. 一致 → 验证通过 ✅
7. 不一致 → 验证失败 ❌（就是你现在的情况）

## 预防措施

1. **记录 Channel Secret**: 将正确的 Channel Secret 保存在安全的地方
2. **定期测试**: 每次修改 LINE 设定后都要测试
3. **监控告警**: 设定告警，当出现大量 401 错误时通知管理员
4. **文档化**: 记录每个用户对应的 LINE Channel 信息

## 相关资源

- LINE Messaging API 文档: https://developers.line.biz/en/docs/messaging-api/
- Webhook 签章验证说明: https://developers.line.biz/en/docs/messaging-api/receiving-messages/#verifying-signatures

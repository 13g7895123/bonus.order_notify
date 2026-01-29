#!/bin/bash

# Webhook 连通性测试 - 手动测试脚本
# 用于测试新添加的 Webhook 连通性测试功能

echo "======================================"
echo "  Webhook 连通性测试 - 测试脚本"
echo "======================================"
echo ""

# 检查后端文件
echo "✓ 检查后端文件..."
if [ -f "backend/app/Controllers/Api/LineWebhook.php" ]; then
    if grep -q "testWebhook" backend/app/Controllers/Api/LineWebhook.php; then
        echo "  ✅ LineWebhook.php - testWebhook 方法已添加"
    else
        echo "  ❌ LineWebhook.php - 缺少 testWebhook 方法"
    fi
else
    echo "  ❌ LineWebhook.php 文件不存在"
fi

# 检查路由配置
echo ""
echo "✓ 检查路由配置..."
if [ -f "backend/app/Config/Routes.php" ]; then
    if grep -q "line/webhook/test" backend/app/Config/Routes.php; then
        echo "  ✅ Routes.php - Webhook 测试路由已添加"
    else
        echo "  ❌ Routes.php - 缺少 Webhook 测试路由"
    fi
else
    echo "  ❌ Routes.php 文件不存在"
fi

# 检查前端 API
echo ""
echo "✓ 检查前端 API..."
if [ -f "frontend/src/services/api.js" ]; then
    if grep -q "testWebhook" frontend/src/services/api.js; then
        echo "  ✅ api.js - testWebhook 方法已添加"
    else
        echo "  ❌ api.js - 缺少 testWebhook 方法"
    fi
else
    echo "  ❌ api.js 文件不存在"
fi

# 检查前端 UI
echo ""
echo "✓ 检查前端 UI..."
if [ -f "frontend/src/pages/WebhookLogs.jsx" ]; then
    if grep -q "showTestModal" frontend/src/pages/WebhookLogs.jsx; then
        echo "  ✅ WebhookLogs.jsx - 测试模态框已添加"
    else
        echo "  ❌ WebhookLogs.jsx - 缺少测试模态框"
    fi
    if grep -q "handleTestWebhook" frontend/src/pages/WebhookLogs.jsx; then
        echo "  ✅ WebhookLogs.jsx - 测试处理函数已添加"
    else
        echo "  ❌ WebhookLogs.jsx - 缺少测试处理函数"
    fi
else
    echo "  ❌ WebhookLogs.jsx 文件不存在"
fi

echo ""
echo "======================================"
echo "  代码检查完成！"
echo "======================================"
echo ""
echo "下一步："
echo "1. 启动 Docker 容器: docker-compose up -d"
echo "2. 访问前端: http://localhost"
echo "3. 登录管理员帐号"
echo "4. 进入 'Webhook 请求记录' 页面"
echo "5. 点击 '测试 Webhook' 按钮"
echo "6. 选择用户并执行测试"
echo ""
echo "预期结果："
echo "- 显示测试模态框"
echo "- 可以选择用户"
echo "- 点击测试后显示详细的诊断结果"
echo "- 各项检查结果清晰显示（成功/警告/错误）"
echo ""

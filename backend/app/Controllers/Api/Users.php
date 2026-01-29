<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Users extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    /**
     * List all users (admin only)
     */
    public function index()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();

        $users = $db->table('users')
            ->select('users.id, users.username, users.name, users.role, users.webhook_key, users.is_active, users.can_create_users, users.line_channel_secret, users.message_quota, users.created_at')
            ->get()->getResultArray();

        // Add statistics for each user
        foreach ($users as &$user) {
            $user['stats'] = [
                'customers' => $db->table('customers')->where('user_id', $user['id'])->countAllResults(),
                'templates' => $db->table('templates')->where('user_id', $user['id'])->countAllResults(),
                'messages_this_month' => $db->table('messages')
                    ->where('user_id', $user['id'])
                    ->where('sender', 'system')
                    ->where('created_at >=', date('Y-m-01 00:00:00'))
                    ->where('created_at <=', date('Y-m-t 23:59:59'))
                    ->countAllResults(),
                'line_users' => $db->table('line_users')->where('user_id', $user['id'])->countAllResults()
            ];
            $user['stats']['remaining_quota'] = max(0, ($user['message_quota'] ?? 200) - $user['stats']['messages_this_month']);

            // Hide sensitive data
            $user['has_line_config'] = !empty($user['line_channel_secret']);
            unset($user['line_channel_secret']);
        }

        return $this->respond($users);
    }

    /**
     * Create new user (admin only)
     */
    public function create()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $json = $this->request->getJSON();
        if (!$json || !isset($json->username) || !isset($json->password)) {
            return $this->failValidationErrors('username 和 password 為必填');
        }

        $db = \Config\Database::connect();

        // Check if username exists
        $existing = $db->table('users')->where('username', $json->username)->get()->getRowArray();
        if ($existing) {
            return $this->failValidationErrors('使用者名稱已存在');
        }

        // Generate webhook key
        $webhookKey = bin2hex(random_bytes(32));

        $data = [
            'username' => $json->username,
            'password' => password_hash($json->password, PASSWORD_DEFAULT),
            'name' => $json->name ?? $json->username,
            'role' => $json->role ?? 'user',
            'webhook_key' => $webhookKey,
            'line_channel_secret' => $json->line_channel_secret ?? null,
            'line_channel_access_token' => $json->line_channel_access_token ?? null,
            'message_quota' => $json->message_quota ?? 200,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];

        $db->table('users')->insert($data);
        $id = $db->insertID();

        // Create default template for the new user
        $db->table('templates')->insert([
            'user_id' => $id,
            'name' => '出貨通知',
            'content' => '親愛的 {{name}}，您的訂單已經出貨。',
            'variables' => null,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respondCreated([
            'id' => $id,
            'username' => $data['username'],
            'name' => $data['name'],
            'role' => $data['role'],
            'webhook_key' => $webhookKey
        ]);
    }

    /**
     * Update user (admin only)
     */
    public function update($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$id) return $this->failNotFound();

        $json = $this->request->getJSON();
        $db = \Config\Database::connect();

        $data = ['updated_at' => date('Y-m-d H:i:s')];

        if (isset($json->name)) $data['name'] = $json->name;
        if (isset($json->role)) $data['role'] = $json->role;
        if (isset($json->is_active)) $data['is_active'] = $json->is_active ? 1 : 0;
        if (isset($json->can_create_users)) $data['can_create_users'] = $json->can_create_users ? 1 : 0;
        if (isset($json->line_channel_secret)) $data['line_channel_secret'] = $json->line_channel_secret;
        if (isset($json->line_channel_access_token)) $data['line_channel_access_token'] = $json->line_channel_access_token;
        if (isset($json->message_quota)) $data['message_quota'] = (int)$json->message_quota;

        // If password provided, hash it
        if (isset($json->password) && !empty($json->password)) {
            $data['password'] = password_hash($json->password, PASSWORD_DEFAULT);
        }

        $db->table('users')->where('id', $id)->update($data);

        return $this->respond(['id' => $id, 'success' => true]);
    }

    /**
     * Regenerate webhook key (admin only)
     */
    public function regenerateWebhook($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$id) return $this->failNotFound();

        $db = \Config\Database::connect();
        $newKey = bin2hex(random_bytes(32));

        $db->table('users')->where('id', $id)->update([
            'webhook_key' => $newKey,
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond(['id' => $id, 'webhook_key' => $newKey]);
    }

    /**
     * Delete user (admin only)
     */
    public function delete($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$id) return $this->failNotFound();

        // Prevent deleting self
        if ($currentUser['id'] == $id) {
            return $this->failValidationErrors('無法刪除自己的帳號');
        }

        $db = \Config\Database::connect();

        // Delete user's data
        $db->table('messages')->where('user_id', $id)->delete();
        $db->table('customers')->where('user_id', $id)->delete();
        $db->table('templates')->where('user_id', $id)->delete();
        $db->table('line_users')->where('user_id', $id)->delete();
        $db->table('user_tokens')->where('user_id', $id)->delete();
        $db->table('users')->where('id', $id)->delete();

        return $this->respondDeleted(['id' => $id]);
    }

    /**
     * Get current user's own profile
     */
    public function me()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser) {
            return $this->failUnauthorized();
        }

        $db = \Config\Database::connect();

        // Get stats
        $stats = [
            'customers' => $db->table('customers')->where('user_id', $currentUser['id'])->countAllResults(),
            'templates' => $db->table('templates')->where('user_id', $currentUser['id'])->countAllResults(),
            'messages_this_month' => $db->table('messages')
                ->where('user_id', $currentUser['id'])
                ->where('sender', 'system')
                ->where('created_at >=', date('Y-m-01 00:00:00'))
                ->where('created_at <=', date('Y-m-t 23:59:59'))
                ->countAllResults(),
        ];
        $stats['remaining_quota'] = max(0, ($currentUser['message_quota'] ?? 200) - $stats['messages_this_month']);

        return $this->respond([
            'id' => $currentUser['id'],
            'username' => $currentUser['username'],
            'name' => $currentUser['name'],
            'role' => $currentUser['role'],
            'webhook_key' => $currentUser['webhook_key'],
            'has_line_config' => !empty($currentUser['line_channel_secret']),
            'message_quota' => $currentUser['message_quota'] ?? 200,
            'can_create_users' => (bool)($currentUser['can_create_users'] ?? false),
            'stats' => $stats
        ]);
    }

    /**
     * Update current user's own profile (password, LINE settings)
     */
    public function updateProfile()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser) {
            return $this->failUnauthorized();
        }

        $json = $this->request->getJSON();
        $db = \Config\Database::connect();

        $data = ['updated_at' => date('Y-m-d H:i:s')];

        // Allow updating name
        if (isset($json->name) && !empty($json->name)) {
            $data['name'] = $json->name;
        }

        // Allow updating password
        if (isset($json->password) && !empty($json->password)) {
            // Optionally verify current password
            if (isset($json->current_password)) {
                if (!password_verify($json->current_password, $currentUser['password'])) {
                    return $this->failValidationErrors('目前密碼不正確');
                }
            }
            $data['password'] = password_hash($json->password, PASSWORD_DEFAULT);
        }

        // Allow updating LINE settings
        if (isset($json->line_channel_secret)) {
            $data['line_channel_secret'] = $json->line_channel_secret;
        }
        if (isset($json->line_channel_access_token)) {
            $data['line_channel_access_token'] = $json->line_channel_access_token;
        }

        // Allow updating message quota
        if (isset($json->message_quota)) {
            $data['message_quota'] = max(0, (int)$json->message_quota);
        }

        $db->table('users')->where('id', $currentUser['id'])->update($data);

        return $this->respond(['success' => true, 'message' => '個人資料已更新']);
    }

    /**
     * Get detailed information about a specific user (admin only)
     */
    public function details($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$id) return $this->failNotFound();

        $db = \Config\Database::connect();

        // Get user basic info
        $user = $db->table('users')
            ->select('id, username, name, role, webhook_key, is_active, can_create_users, message_quota, created_at')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if (!$user) {
            return $this->failNotFound('使用者不存在');
        }

        // Get pagination parameters
        $page = $this->request->getGet('page') ?? 1;
        $limit = $this->request->getGet('limit') ?? 10;
        $offset = ($page - 1) * $limit;
        $type = $this->request->getGet('type') ?? 'customers'; // customers, templates, messages, line_users, activity_logs

        $result = [
            'user' => $user,
            'stats' => [
                'customers' => $db->table('customers')->where('user_id', $id)->countAllResults(),
                'templates' => $db->table('templates')->where('user_id', $id)->countAllResults(),
                'messages_total' => $db->table('messages')->where('user_id', $id)->countAllResults(),
                'messages_this_month' => $db->table('messages')
                    ->where('user_id', $id)
                    ->where('sender', 'system')
                    ->where('created_at >=', date('Y-m-01 00:00:00'))
                    ->where('created_at <=', date('Y-m-t 23:59:59'))
                    ->countAllResults(),
                'line_users' => $db->table('line_users')->where('user_id', $id)->countAllResults(),
                'activity_logs' => $db->table('activity_logs')->where('user_id', $id)->countAllResults(),
            ]
        ];

        // Get detailed data based on type
        switch ($type) {
            case 'customers':
                $result['data'] = $db->table('customers')
                    ->where('user_id', $id)
                    ->orderBy('created_at', 'DESC')
                    ->limit($limit, $offset)
                    ->get()
                    ->getResultArray();
                $result['total'] = $result['stats']['customers'];
                break;

            case 'templates':
                $result['data'] = $db->table('templates')
                    ->where('user_id', $id)
                    ->orderBy('created_at', 'DESC')
                    ->limit($limit, $offset)
                    ->get()
                    ->getResultArray();
                $result['total'] = $result['stats']['templates'];
                break;

            case 'messages':
                $result['data'] = $db->table('messages')
                    ->select('messages.*, customers.custom_name, customers.line_uid')
                    ->join('customers', 'customers.id = messages.customer_id', 'left')
                    ->where('messages.user_id', $id)
                    ->orderBy('messages.created_at', 'DESC')
                    ->limit($limit, $offset)
                    ->get()
                    ->getResultArray();
                $result['total'] = $result['stats']['messages_total'];
                break;

            case 'line_users':
                $result['data'] = $db->table('line_users')
                    ->where('user_id', $id)
                    ->orderBy('created_at', 'DESC')
                    ->limit($limit, $offset)
                    ->get()
                    ->getResultArray();
                $result['total'] = $result['stats']['line_users'];
                break;

            case 'activity_logs':
                $result['data'] = $db->table('activity_logs')
                    ->where('user_id', $id)
                    ->orderBy('created_at', 'DESC')
                    ->limit($limit, $offset)
                    ->get()
                    ->getResultArray();
                $result['total'] = $result['stats']['activity_logs'];
                break;

            default:
                $result['data'] = [];
                $result['total'] = 0;
        }

        $result['page'] = (int)$page;
        $result['limit'] = (int)$limit;
        $result['type'] = $type;

        return $this->respond($result);
    }

    /**
     * Test LINE configuration for a specific user (admin only)
     * This will validate the channel secret and access token
     */
    public function testLineConfig($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$id) return $this->failNotFound();

        $db = \Config\Database::connect();

        // Get user
        $user = $db->table('users')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if (!$user) {
            return $this->failNotFound('使用者不存在');
        }

        $result = [
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'is_active' => (bool)$user['is_active'],
                'webhook_key' => $user['webhook_key']
            ],
            'checks' => [],
            'overall_status' => 'success'
        ];

        // Check 1: User is active
        $result['checks']['user_active'] = [
            'name' => '帳號狀態',
            'status' => $user['is_active'] ? 'success' : 'error',
            'message' => $user['is_active'] ? '帳號已啟用' : '帳號已停用，Webhook 將無法運作'
        ];
        if (!$user['is_active']) {
            $result['overall_status'] = 'error';
        }

        // Check 2: Webhook key exists
        $hasWebhookKey = !empty($user['webhook_key']);
        $result['checks']['webhook_key'] = [
            'name' => 'Webhook Key',
            'status' => $hasWebhookKey ? 'success' : 'error',
            'message' => $hasWebhookKey ? 'Webhook Key 已設定 (' . strlen($user['webhook_key']) . ' 字元)' : 'Webhook Key 未設定'
        ];
        if (!$hasWebhookKey) {
            $result['overall_status'] = 'error';
        }

        // Check 3: Channel Secret exists
        $hasChannelSecret = !empty($user['line_channel_secret']);
        $result['checks']['channel_secret'] = [
            'name' => 'Channel Secret',
            'status' => $hasChannelSecret ? 'success' : 'error',
            'message' => $hasChannelSecret ? 'Channel Secret 已設定 (' . strlen($user['line_channel_secret']) . ' 字元)' : 'Channel Secret 未設定，無法驗證 Webhook 簽章'
        ];
        if (!$hasChannelSecret) {
            $result['overall_status'] = 'error';
        }

        // Check 4: Access Token exists and is valid
        $hasAccessToken = !empty($user['line_channel_access_token']);
        if (!$hasAccessToken) {
            $result['checks']['access_token'] = [
                'name' => 'Access Token',
                'status' => 'error',
                'message' => 'Access Token 未設定，無法發送訊息或取得用戶資料'
            ];
            $result['overall_status'] = 'error';
        } else {
            // Test the access token by calling LINE API
            $ch = curl_init('https://api.line.me/v2/bot/info');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $user['line_channel_access_token']
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                $result['checks']['access_token'] = [
                    'name' => 'Access Token',
                    'status' => 'error',
                    'message' => '網路錯誤: ' . $curlError
                ];
                $result['overall_status'] = 'error';
            } elseif ($httpCode === 200) {
                $botInfo = json_decode($response, true);
                $result['checks']['access_token'] = [
                    'name' => 'Access Token',
                    'status' => 'success',
                    'message' => 'Access Token 有效',
                    'bot_info' => [
                        'displayName' => $botInfo['displayName'] ?? 'N/A',
                        'userId' => $botInfo['userId'] ?? 'N/A',
                        'pictureUrl' => $botInfo['pictureUrl'] ?? null
                    ]
                ];
            } elseif ($httpCode === 401) {
                $error = json_decode($response, true);
                $result['checks']['access_token'] = [
                    'name' => 'Access Token',
                    'status' => 'error',
                    'message' => 'Access Token 無效: ' . ($error['message'] ?? 'Unauthorized')
                ];
                $result['overall_status'] = 'error';
            } else {
                $result['checks']['access_token'] = [
                    'name' => 'Access Token',
                    'status' => 'warning',
                    'message' => '未知回應 (HTTP ' . $httpCode . ')'
                ];
                if ($result['overall_status'] === 'success') {
                    $result['overall_status'] = 'warning';
                }
            }
        }

        // Check 5: Signature verification simulation
        if ($hasChannelSecret) {
            $testBody = '{"events":[]}';
            $signature = base64_encode(hash_hmac('sha256', $testBody, $user['line_channel_secret'], true));
            $result['checks']['signature_test'] = [
                'name' => '簽章驗證',
                'status' => 'success',
                'message' => '簽章產生功能正常',
                'sample_signature' => substr($signature, 0, 20) . '...'
            ];
        } else {
            $result['checks']['signature_test'] = [
                'name' => '簽章驗證',
                'status' => 'skipped',
                'message' => '無法測試 - 需要 Channel Secret'
            ];
        }

        // Check 6: Data statistics
        $lineUsersCount = $db->table('line_users')->where('user_id', $user['id'])->countAllResults();
        $customersCount = $db->table('customers')->where('user_id', $user['id'])->countAllResults();
        $messagesCount = $db->table('messages')->where('user_id', $user['id'])->countAllResults();

        $result['checks']['data_stats'] = [
            'name' => '資料統計',
            'status' => 'info',
            'message' => "LINE 使用者: {$lineUsersCount}, 客戶: {$customersCount}, 訊息: {$messagesCount}",
            'details' => [
                'line_users' => $lineUsersCount,
                'customers' => $customersCount,
                'messages' => $messagesCount
            ]
        ];

        // Generate webhook URL
        $result['webhook_url'] = '/api/line/webhook?key=' . $user['webhook_key'];

        return $this->respond($result);
    }
}

<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Users extends ResourceController
{
    protected $format = 'json';

    /**
     * Get current user info from token
     */
    private function getCurrentUser()
    {
        // For now, get from session or decode token
        // This is simplified - in production, use proper JWT validation
        $authHeader = $this->request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $db = \Config\Database::connect();
            $userToken = $db->table('user_tokens')->where('token', $token)->get()->getRowArray();
            if ($userToken) {
                return $db->table('users')->where('id', $userToken['user_id'])->get()->getRowArray();
            }
        }
        return null;
    }

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
            ->select('users.id, users.username, users.name, users.role, users.webhook_key, users.is_active, users.line_channel_secret, users.message_quota, users.created_at')
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

        $db->table('users')->where('id', $currentUser['id'])->update($data);

        return $this->respond(['success' => true, 'message' => '個人資料已更新']);
    }
}

<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class UserApplications extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    /**
     * Register with invite code (public - no auth required)
     * Creates user directly if invite code is valid
     */
    public function apply()
    {
        $json = $this->request->getJSON();

        if (!$json || !isset($json->username) || !isset($json->password) || !isset($json->name)) {
            return $this->failValidationErrors('username, password 和 name 為必填');
        }

        if (!isset($json->invite_code) || empty($json->invite_code)) {
            return $this->failValidationErrors('邀請碼為必填');
        }

        $db = \Config\Database::connect();

        // Validate invite code
        $inviteCodeSetting = $db->table('settings')->where('key', 'invite_code')->get()->getRowArray();
        $validCode = $inviteCodeSetting['value'] ?? '';

        if (empty($validCode) || $json->invite_code !== $validCode) {
            return $this->failValidationErrors('邀請碼錯誤');
        }

        // Check if username already exists in users table
        $existingUser = $db->table('users')->where('username', $json->username)->get()->getRowArray();
        if ($existingUser) {
            return $this->failValidationErrors('使用者名稱已被使用');
        }

        // Create user directly (no pending approval needed with valid invite code)
        $webhookKey = bin2hex(random_bytes(32));
        $db->table('users')->insert([
            'username' => $json->username,
            'password' => password_hash($json->password, PASSWORD_DEFAULT),
            'name' => $json->name,
            'role' => 'user',
            'webhook_key' => $webhookKey,
            'message_quota' => 200,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        $userId = $db->insertID();

        // Create default template for the new user
        $db->table('templates')->insert([
            'user_id' => $userId,
            'name' => '出貨通知',
            'content' => '親愛的 {{name}}，您的訂單已經出貨。',
            'variables' => null,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respondCreated([
            'success' => true,
            'message' => '註冊成功！請使用您的帳號登入'
        ]);
    }

    /**
     * List all applications (admin only)
     */
    public function index()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $status = $this->request->getGet('status');

        $builder = $db->table('user_applications');
        if ($status) {
            $builder->where('status', $status);
        }

        $applications = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();

        return $this->respond($applications);
    }

    /**
     * Get pending count (admin only)
     */
    public function pendingCount()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $count = $db->table('user_applications')->where('status', 'pending')->countAllResults();

        return $this->respond(['count' => $count]);
    }

    /**
     * Approve an application (admin only)
     */
    public function approve($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $application = $db->table('user_applications')->where('id', $id)->get()->getRowArray();

        if (!$application) {
            return $this->failNotFound('申請不存在');
        }

        if ($application['status'] !== 'pending') {
            return $this->failValidationErrors('此申請已被處理');
        }

        // Check if username is still available
        $existingUser = $db->table('users')->where('username', $application['username'])->get()->getRowArray();
        if ($existingUser) {
            return $this->failValidationErrors('使用者名稱已被使用');
        }

        // Create the user
        $webhookKey = bin2hex(random_bytes(32));
        $db->table('users')->insert([
            'username' => $application['username'],
            'password' => $application['password'], // Already hashed
            'name' => $application['name'],
            'role' => 'user',
            'webhook_key' => $webhookKey,
            'message_quota' => 200,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        $userId = $db->insertID();

        // Create default template for the new user
        $db->table('templates')->insert([
            'user_id' => $userId,
            'name' => '出貨通知',
            'content' => '親愛的 {{name}}，您的訂單已經出貨。',
            'variables' => null,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Update application status
        $db->table('user_applications')->where('id', $id)->update([
            'status' => 'approved',
            'reviewed_by' => $currentUser['id'],
            'reviewed_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond([
            'success' => true,
            'message' => '已核准申請，使用者帳號已建立',
            'user_id' => $userId
        ]);
    }

    /**
     * Reject an application (admin only)
     */
    public function reject($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $json = $this->request->getJSON();
        $reason = $json->reason ?? null;

        $db = \Config\Database::connect();
        $application = $db->table('user_applications')->where('id', $id)->get()->getRowArray();

        if (!$application) {
            return $this->failNotFound('申請不存在');
        }

        if ($application['status'] !== 'pending') {
            return $this->failValidationErrors('此申請已被處理');
        }

        // Update application status
        $db->table('user_applications')->where('id', $id)->update([
            'status' => 'rejected',
            'reviewed_by' => $currentUser['id'],
            'reviewed_at' => date('Y-m-d H:i:s'),
            'reject_reason' => $reason
        ]);

        return $this->respond([
            'success' => true,
            'message' => '已拒絕申請'
        ]);
    }

    /**
     * Create users (for logged-in users)
     */
    public function inviteUsers()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser) {
            return $this->failUnauthorized();
        }

        $json = $this->request->getJSON();

        if (!$json || !isset($json->users) || !is_array($json->users)) {
            return $this->failValidationErrors('請提供使用者資料陣列');
        }

        $db = \Config\Database::connect();
        $created = [];
        $errors = [];

        foreach ($json->users as $index => $userData) {
            $username = $userData->username ?? null;
            $password = $userData->password ?? null;
            $name = $userData->name ?? null;
            $lineChannelSecret = $userData->line_channel_secret ?? null;
            $lineChannelAccessToken = $userData->line_channel_access_token ?? null;

            if (!$username || !$password || !$name) {
                $errors[] = "第 " . ($index + 1) . " 筆：帳號、密碼、顯示名稱 皆為必填";
                continue;
            }

            // Check if username exists
            $existing = $db->table('users')->where('username', $username)->get()->getRowArray();
            if ($existing) {
                $errors[] = "第 " . ($index + 1) . " 筆：使用者名稱 '{$username}' 已被使用";
                continue;
            }

            // Create user
            $webhookKey = bin2hex(random_bytes(32));
            $userData = [
                'username' => $username,
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'name' => $name,
                'role' => 'user',
                'webhook_key' => $webhookKey,
                'message_quota' => 200,
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s')
            ];

            // Add LINE settings if provided
            if (!empty($lineChannelSecret)) {
                $userData['line_channel_secret'] = $lineChannelSecret;
            }
            if (!empty($lineChannelAccessToken)) {
                $userData['line_channel_access_token'] = $lineChannelAccessToken;
            }

            $db->table('users')->insert($userData);
            $userId = $db->insertID();

            // Create default template
            $db->table('templates')->insert([
                'user_id' => $userId,
                'name' => '出貨通知',
                'content' => '親愛的 {{name}}，您的訂單已經出貨。',
                'variables' => null,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $created[] = [
                'id' => $userId,
                'username' => $username,
                'name' => $name
            ];
        }

        return $this->respond([
            'success' => count($errors) === 0,
            'created' => $created,
            'errors' => $errors,
            'message' => '成功建立 ' . count($created) . ' 個帳號' . (count($errors) > 0 ? '，' . count($errors) . ' 個失敗' : '')
        ]);
    }

    /**
     * Get invite code (admin only)
     */
    public function getInviteCode()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $setting = $db->table('settings')->where('key', 'invite_code')->get()->getRowArray();

        return $this->respond([
            'invite_code' => $setting['value'] ?? ''
        ]);
    }

    /**
     * Update invite code (admin only)
     */
    public function updateInviteCode()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $json = $this->request->getJSON();
        if (!$json || !isset($json->invite_code)) {
            return $this->failValidationErrors('請提供邀請碼');
        }

        $db = \Config\Database::connect();
        $existing = $db->table('settings')->where('key', 'invite_code')->get()->getRowArray();

        if ($existing) {
            $db->table('settings')->where('key', 'invite_code')->update([
                'value' => $json->invite_code,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } else {
            $db->table('settings')->insert([
                'key' => 'invite_code',
                'value' => $json->invite_code,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        return $this->respond([
            'success' => true,
            'message' => '邀請碼已更新'
        ]);
    }
}

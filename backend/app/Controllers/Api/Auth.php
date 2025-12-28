<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Auth extends ResourceController
{
    protected $format = 'json';

    public function login()
    {
        $db = \Config\Database::connect();
        $json = $this->request->getJSON();

        if (!$json || !isset($json->username) || !isset($json->password)) {
            return $this->failValidationErrors('請輸入帳號與密碼');
        }

        $user = $db->table('users')->where('username', $json->username)->get()->getRowArray();

        if (!$user || !password_verify($json->password, $user['password'])) {
            return $this->failUnauthorized('帳號或密碼錯誤');
        }

        // Check if user is active
        if (isset($user['is_active']) && !$user['is_active']) {
            return $this->failUnauthorized('帳號已停用');
        }

        // Generate simple token
        $token = bin2hex(random_bytes(32));
        $db->table('user_tokens')->insert([
            'user_id' => $user['id'],
            'token' => $token,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'role' => $user['role'] ?? 'user',
                'webhook_key' => $user['webhook_key'] ?? null,
                'can_create_users' => (bool)($user['can_create_users'] ?? false)
            ]
        ]);
    }

    public function logout()
    {
        $authHeader = $this->request->getHeaderLine('Authorization');
        $token = str_replace('Bearer ', '', $authHeader);

        if ($token) {
            $db = \Config\Database::connect();
            $db->table('user_tokens')->where('token', $token)->delete();
        }

        return $this->respond(['message' => 'Logged out']);
    }
}

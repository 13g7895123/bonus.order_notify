<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Models\UserModel;

class Auth extends ResourceController
{
    protected $modelName = 'App\Models\UserModel';
    protected $format    = 'json';

    public function login()
    {
        $db = \Config\Database::connect();
        $json = $this->request->getJSON();

        if (!$json || !isset($json->email) || !isset($json->password)) {
            return $this->failValidationError('Missing email or password');
        }

        $user = $db->table('users')->where('email', $json->email)->get()->getRowArray();

        if (!$user || !password_verify($json->password, $user['password'])) {
            return $this->failUnauthorized('Invalid credentials');
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
                'name' => $user['name'],
                'email' => $user['email']
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

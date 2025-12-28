<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Auth extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    // Token expiration times
    private const ACCESS_TOKEN_EXPIRY = 900; // 15 minutes
    private const REFRESH_TOKEN_EXPIRY = 604800; // 7 days

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

        // Generate access token
        $accessToken = bin2hex(random_bytes(32));
        $db->table('user_tokens')->insert([
            'user_id' => $user['id'],
            'token' => $accessToken,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Generate refresh token
        $refreshToken = bin2hex(random_bytes(32));
        $db->table('refresh_tokens')->insert([
            'user_id' => $user['id'],
            'token' => $refreshToken,
            'expires_at' => date('Y-m-d H:i:s', time() + self::REFRESH_TOKEN_EXPIRY),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Set HttpOnly cookies
        $this->setAuthCookies($accessToken, $refreshToken);

        return $this->respond([
            'success' => true,
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
        $db = \Config\Database::connect();

        // Get tokens from cookies
        $accessToken = $_COOKIE['access_token'] ?? null;
        $refreshToken = $_COOKIE['refresh_token'] ?? null;

        if ($accessToken) {
            $db->table('user_tokens')->where('token', $accessToken)->delete();
        }

        if ($refreshToken) {
            $db->table('refresh_tokens')->where('token', $refreshToken)->delete();
        }

        // Clear cookies
        $this->clearAuthCookies();

        return $this->respond(['success' => true, 'message' => 'Logged out']);
    }

    public function refresh()
    {
        $db = \Config\Database::connect();

        $refreshToken = $_COOKIE['refresh_token'] ?? null;

        if (!$refreshToken) {
            return $this->failUnauthorized('Refresh token not found');
        }

        // Find valid refresh token
        $tokenRecord = $db->table('refresh_tokens')
            ->where('token', $refreshToken)
            ->where('expires_at >', date('Y-m-d H:i:s'))
            ->get()
            ->getRowArray();

        if (!$tokenRecord) {
            $this->clearAuthCookies();
            return $this->failUnauthorized('Invalid or expired refresh token');
        }

        // Get user
        $user = $db->table('users')->where('id', $tokenRecord['user_id'])->get()->getRowArray();

        if (!$user || (isset($user['is_active']) && !$user['is_active'])) {
            $this->clearAuthCookies();
            return $this->failUnauthorized('User not found or inactive');
        }

        // Delete old access tokens for this user (cleanup)
        $db->table('user_tokens')->where('user_id', $user['id'])->delete();

        // Generate new access token
        $newAccessToken = bin2hex(random_bytes(32));
        $db->table('user_tokens')->insert([
            'user_id' => $user['id'],
            'token' => $newAccessToken,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Set new access token cookie
        $this->setAccessTokenCookie($newAccessToken);

        return $this->respond([
            'success' => true,
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
            'role' => $currentUser['role'] ?? 'user',
            'webhook_key' => $currentUser['webhook_key'] ?? null,
            'can_create_users' => (bool)($currentUser['can_create_users'] ?? false)
        ]);
    }

    private function setAuthCookies(string $accessToken, string $refreshToken): void
    {
        $secure = ENVIRONMENT === 'production';
        $domain = '';

        // Access token cookie
        setcookie('access_token', $accessToken, [
            'expires' => time() + self::ACCESS_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => $domain,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        // Refresh token cookie
        setcookie('refresh_token', $refreshToken, [
            'expires' => time() + self::REFRESH_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => $domain,
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }

    private function setAccessTokenCookie(string $accessToken): void
    {
        $secure = ENVIRONMENT === 'production';

        setcookie('access_token', $accessToken, [
            'expires' => time() + self::ACCESS_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }

    private function clearAuthCookies(): void
    {
        setcookie('access_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        setcookie('refresh_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }
}

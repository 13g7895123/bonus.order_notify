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

        // Auto-suspend if usage period has expired
        $user = $this->applyExpiryIfNeeded($user, $db);

        // Update last login time
        $db->table('users')->where('id', $user['id'])->update([
            'last_login_at' => date('Y-m-d H:i:s')
        ]);

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
            'can_create_users' => (bool)($currentUser['can_create_users'] ?? false),
            'impersonating' => $_COOKIE['original_admin_token'] ?? null ? true : false
        ]);
    }

    /**
     * Impersonate another user (admin only)
     */
    public function impersonate($userId = null)
    {
        $currentUser = $this->getCurrentUser();

        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以使用此功能');
        }

        if (!$userId) {
            return $this->failValidationErrors('請指定使用者 ID');
        }

        // Cannot impersonate self
        if ($currentUser['id'] == $userId) {
            return $this->failValidationErrors('無法模擬自己');
        }

        $db = \Config\Database::connect();

        // Find target user
        $targetUser = $db->table('users')->where('id', $userId)->get()->getRowArray();

        if (!$targetUser) {
            return $this->failNotFound('使用者不存在');
        }

        // Store original admin token for later restoration
        $originalToken = $_COOKIE['access_token'] ?? null;

        // Generate new access token for target user
        $accessToken = bin2hex(random_bytes(32));
        $db->table('user_tokens')->insert([
            'user_id' => $targetUser['id'],
            'token' => $accessToken,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Generate new refresh token for target user
        $refreshToken = bin2hex(random_bytes(32));
        $db->table('refresh_tokens')->insert([
            'user_id' => $targetUser['id'],
            'token' => $refreshToken,
            'expires_at' => date('Y-m-d H:i:s', time() + self::REFRESH_TOKEN_EXPIRY),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Set cookies for impersonated user
        $this->setAuthCookies($accessToken, $refreshToken);

        // Store original admin token in a separate cookie for restoration
        if ($originalToken) {
            $isProduction = ENVIRONMENT === 'production';
            setcookie('original_admin_token', $originalToken, [
                'expires' => time() + 3600, // 1 hour
                'path' => '/',
                'domain' => '',
                'secure' => $isProduction,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
        }

        return $this->respond([
            'success' => true,
            'message' => '已切換至 ' . ($targetUser['name'] ?? $targetUser['username']) . ' 的身份',
            'user' => [
                'id' => $targetUser['id'],
                'username' => $targetUser['username'],
                'name' => $targetUser['name'],
                'role' => $targetUser['role'] ?? 'user',
                'webhook_key' => $targetUser['webhook_key'] ?? null,
                'can_create_users' => (bool)($targetUser['can_create_users'] ?? false),
                'impersonating' => true
            ]
        ]);
    }

    /**
     * Stop impersonating and restore original admin session
     */
    public function stopImpersonate()
    {
        $originalToken = $_COOKIE['original_admin_token'] ?? null;

        if (!$originalToken) {
            return $this->failValidationErrors('您目前不在模擬狀態');
        }

        $db = \Config\Database::connect();

        // Verify original token still valid
        $tokenRecord = $db->table('user_tokens')->where('token', $originalToken)->get()->getRowArray();

        if (!$tokenRecord) {
            // Clear cookies and redirect to login
            $this->clearAuthCookies();
            setcookie('original_admin_token', '', ['expires' => time() - 3600, 'path' => '/']);
            return $this->failUnauthorized('原始登入已過期，請重新登入');
        }

        // Get original admin user
        $adminUser = $db->table('users')->where('id', $tokenRecord['user_id'])->get()->getRowArray();

        if (!$adminUser || $adminUser['role'] !== 'admin') {
            $this->clearAuthCookies();
            setcookie('original_admin_token', '', ['expires' => time() - 3600, 'path' => '/']);
            return $this->failForbidden('原始使用者不是管理員');
        }

        // Delete current impersonated user's token
        $currentToken = $_COOKIE['access_token'] ?? null;
        if ($currentToken) {
            $db->table('user_tokens')->where('token', $currentToken)->delete();
        }
        $currentRefreshToken = $_COOKIE['refresh_token'] ?? null;
        if ($currentRefreshToken) {
            $db->table('refresh_tokens')->where('token', $currentRefreshToken)->delete();
        }

        // Restore original admin token
        $isProduction = ENVIRONMENT === 'production';
        setcookie('access_token', $originalToken, [
            'expires' => time() + self::ACCESS_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => '',
            'secure' => $isProduction,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

        // Clear original_admin_token cookie
        setcookie('original_admin_token', '', ['expires' => time() - 3600, 'path' => '/']);

        return $this->respond([
            'success' => true,
            'message' => '已恢復管理員身份',
            'user' => [
                'id' => $adminUser['id'],
                'username' => $adminUser['username'],
                'name' => $adminUser['name'],
                'role' => $adminUser['role'],
                'webhook_key' => $adminUser['webhook_key'] ?? null,
                'can_create_users' => (bool)($adminUser['can_create_users'] ?? false),
                'impersonating' => false
            ]
        ]);
    }

    /**
     * Debug endpoint to check cookie/token status
     */
    public function debug()
    {
        $db = \Config\Database::connect();

        // Check all ways to read cookie
        $cookieFromGlobal = $_COOKIE['access_token'] ?? 'NOT_FOUND';
        $cookieFromRequest = $this->request->getCookie('access_token') ?? 'NOT_FOUND';
        $authHeader = $this->request->getHeaderLine('Authorization');

        // Check if token exists in database
        $tokenInDb = null;
        if ($cookieFromGlobal !== 'NOT_FOUND') {
            $tokenInDb = $db->table('user_tokens')->where('token', $cookieFromGlobal)->get()->getRowArray();
        }

        // All cookies received
        $allCookies = $_COOKIE;

        return $this->respond([
            'cookie_from_global' => substr($cookieFromGlobal, 0, 20) . '...',
            'cookie_from_request' => substr($cookieFromRequest, 0, 20) . '...',
            'auth_header' => $authHeader ? 'Present' : 'Not present',
            'token_found_in_db' => $tokenInDb ? true : false,
            'all_cookies_keys' => array_keys($allCookies),
            'http_cookie_header' => $_SERVER['HTTP_COOKIE'] ?? 'NOT_SET',
            'current_user' => $this->getCurrentUser() ? 'Found' : 'Not found'
        ]);
    }

    private function setAuthCookies(string $accessToken, string $refreshToken): void
    {
        // In development, ports differ but same host - use Lax
        // For cross-origin (different domains), would need SameSite=None with Secure=true
        $isProduction = ENVIRONMENT === 'production';
        $sameSite = 'Lax';
        $secure = $isProduction;

        // Access token cookie
        setcookie('access_token', $accessToken, [
            'expires' => time() + self::ACCESS_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite
        ]);

        // Refresh token cookie
        setcookie('refresh_token', $refreshToken, [
            'expires' => time() + self::REFRESH_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => $sameSite
        ]);
    }

    private function setAccessTokenCookie(string $accessToken): void
    {
        $isProduction = ENVIRONMENT === 'production';

        setcookie('access_token', $accessToken, [
            'expires' => time() + self::ACCESS_TOKEN_EXPIRY,
            'path' => '/',
            'domain' => '',
            'secure' => $isProduction,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
    }

    private function clearAuthCookies(): void
    {
        $cookieOptions = [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ];

        setcookie('access_token', '', $cookieOptions);
        setcookie('refresh_token', '', $cookieOptions);
    }
}

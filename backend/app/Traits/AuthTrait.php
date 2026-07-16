<?php

namespace App\Traits;

trait AuthTrait
{
    /**
     * Get current authenticated user from cookie or header
     */
    protected function getCurrentUser(): ?array
    {
        $db = \Config\Database::connect();
        $token = null;

        // First try to get token from HttpOnly cookie
        // Use multiple methods to ensure we can read the cookie
        if (isset($_COOKIE['access_token']) && !empty($_COOKIE['access_token'])) {
            $token = $_COOKIE['access_token'];
        }

        // Try CodeIgniter's cookie helper
        if (!$token && function_exists('get_cookie')) {
            $token = get_cookie('access_token');
        }

        // Try from request if available
        if (!$token && isset($this->request)) {
            $token = $this->request->getCookie('access_token');
        }

        // Fallback to Authorization header (for API compatibility)
        if (!$token && isset($this->request)) {
            $authHeader = $this->request->getHeaderLine('Authorization');
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }

        if ($token) {
            $userToken = $db->table('user_tokens')->where('token', $token)->get()->getRowArray();
            if ($userToken) {
                $user = $db->table('users')->where('id', $userToken['user_id'])->get()->getRowArray();
                if ($user) {
                    $user = $this->applyExpiryIfNeeded($user, $db);
                }
                if ($user && (!isset($user['is_active']) || $user['is_active'])) {
                    return $user;
                }
            }
        }

        return null;
    }

    /**
     * If the user has an expiration date that has passed and is not yet suspended,
     * automatically mark them as suspended with the configured default notice.
     */
    protected function applyExpiryIfNeeded(array $user, $db = null): array
    {
        if (empty($user['expires_at']) || !empty($user['is_suspended'])) {
            return $user;
        }

        if (strtotime($user['expires_at']) > time()) {
            return $user;
        }

        $db = $db ?? \Config\Database::connect();

        $notice = $db->table('settings')->where('key', 'expiry_default_notice')->get()->getRowArray();
        $noticeText = $notice['value'] ?? '您的帳號使用期限已到期，請聯絡管理員續期。';

        $db->table('users')->where('id', $user['id'])->update([
            'is_suspended' => 1,
            'suspend_notice' => $noticeText,
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        $user['is_suspended'] = 1;
        $user['suspend_notice'] = $noticeText;

        return $user;
    }

    /**
     * Get current user ID
     */
    protected function getCurrentUserId(): ?int
    {
        $user = $this->getCurrentUser();
        return $user ? (int)$user['id'] : null;
    }

    /**
     * Check if current user is admin
     */
    protected function isAdmin(): bool
    {
        $user = $this->getCurrentUser();
        return $user && ($user['role'] ?? '') === 'admin';
    }
}

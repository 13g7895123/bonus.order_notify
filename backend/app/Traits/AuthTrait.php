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
                if ($user && (!isset($user['is_active']) || $user['is_active'])) {
                    return $user;
                }
            }
        }

        return null;
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

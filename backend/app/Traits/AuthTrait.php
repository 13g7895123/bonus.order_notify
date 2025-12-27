<?php

namespace App\Traits;

trait AuthTrait
{
    /**
     * Get current authenticated user from token
     */
    protected function getCurrentUser(): ?array
    {
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

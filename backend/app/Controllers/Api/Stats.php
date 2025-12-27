<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Stats extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    /**
     * Get dashboard statistics for current user
     */
    public function index()
    {
        $user = $this->getCurrentUser();
        if (!$user) {
            return $this->failUnauthorized();
        }

        $userId = (int)$user['id'];
        $db = \Config\Database::connect();

        // Count templates for this user
        $templateCount = $db->table('templates')->where('user_id', $userId)->countAllResults();

        // Count customers for this user
        $customerCount = $db->table('customers')->where('user_id', $userId)->countAllResults();

        // Count messages sent this month for this user
        $startOfMonth = date('Y-m-01 00:00:00');
        $endOfMonth = date('Y-m-t 23:59:59');
        $messagesThisMonth = $db->table('messages')
            ->where('user_id', $userId)
            ->where('sender', 'system')
            ->where('created_at >=', $startOfMonth)
            ->where('created_at <=', $endOfMonth)
            ->countAllResults();

        // Get message quota from user's settings
        $messageQuota = (int)($user['message_quota'] ?? 200);

        // Calculate remaining
        $remaining = max(0, $messageQuota - $messagesThisMonth);

        return $this->respond([
            'templates' => $templateCount,
            'customers' => $customerCount,
            'messages' => [
                'sent_this_month' => $messagesThisMonth,
                'quota' => $messageQuota,
                'remaining' => $remaining,
                'period' => date('Y年m月')
            ]
        ]);
    }
}

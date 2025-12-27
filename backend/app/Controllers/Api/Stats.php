<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Stats extends ResourceController
{
    protected $format = 'json';

    /**
     * Get dashboard statistics
     */
    public function index()
    {
        $db = \Config\Database::connect();

        // Count templates
        $templateCount = $db->table('templates')->countAllResults();

        // Count customers
        $customerCount = $db->table('customers')->countAllResults();

        // Count messages sent this month
        $startOfMonth = date('Y-m-01 00:00:00');
        $endOfMonth = date('Y-m-t 23:59:59');
        $messagesThisMonth = $db->table('messages')
            ->where('sender', 'system')
            ->where('created_at >=', $startOfMonth)
            ->where('created_at <=', $endOfMonth)
            ->countAllResults();

        // Get message quota from settings (default 200)
        $quotaSetting = $db->table('settings')->where('key', 'message_quota')->get()->getRowArray();
        $messageQuota = (int)($quotaSetting['value'] ?? 200);

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

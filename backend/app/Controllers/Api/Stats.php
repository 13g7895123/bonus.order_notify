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

    /**
     * Get all users' send statistics (admin only)
     * Query params:
     *   mode      = last_month | month | last30 | all (default: last_month)
     *   month     = YYYY-MM (used when mode=month)
     *   show_all  = 0|1 (0 = only show users who sent last month, default: 0)
     */
    public function adminUserStats()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $mode    = $this->request->getGet('mode') ?? 'last_month';
        $month   = $this->request->getGet('month') ?? '';
        $showAll = $this->request->getGet('show_all') === '1';

        $db = \Config\Database::connect();

        // Determine last month boundaries (used for filter & default mode)
        $lastMonthStart = date('Y-m-01 00:00:00', strtotime('first day of last month'));
        $lastMonthEnd   = date('Y-m-t 23:59:59',  strtotime('last day of last month'));

        // Base: all non-admin users
        $usersQuery = $db->table('users')
            ->select('id, username, name, is_active, is_suspended, suspend_notice')
            ->where('role !=', 'admin');

        if (!$showAll) {
            // Only users who sent last month
            $activeRows = $db->table('messages')
                ->select('DISTINCT user_id')
                ->where('sender', 'system')
                ->where('created_at >=', $lastMonthStart)
                ->where('created_at <=', $lastMonthEnd)
                ->get()->getResultArray();
            $activeIds = array_column($activeRows, 'user_id');
            if (empty($activeIds)) {
                return $this->respond([
                    'users'        => [],
                    'period_label' => date('Y年m月', strtotime('first day of last month')),
                    'mode'         => $mode,
                    'show_all'     => $showAll
                ]);
            }
            $usersQuery->whereIn('id', $activeIds);
        }

        $users = $usersQuery->orderBy('name', 'ASC')->get()->getResultArray();

        // Compute stats per user
        foreach ($users as &$user) {
            $uid = (int)$user['id'];

            if ($mode === 'all') {
                $user['send_count'] = $db->table('messages')
                    ->where('user_id', $uid)
                    ->where('sender', 'system')
                    ->countAllResults();
                $user['period_label'] = '全部時間';

            } elseif ($mode === 'month' && preg_match('/^\d{4}-\d{2}$/', $month)) {
                $start = $month . '-01 00:00:00';
                $end   = date('Y-m-t 23:59:59', strtotime($start));
                $user['send_count'] = $db->table('messages')
                    ->where('user_id', $uid)
                    ->where('sender', 'system')
                    ->where('created_at >=', $start)
                    ->where('created_at <=', $end)
                    ->countAllResults();
                $user['period_label'] = date('Y年m月', strtotime($start));

            } elseif ($mode === 'last30') {
                $last30 = $db->table('messages')
                    ->select('id, created_at')
                    ->where('user_id', $uid)
                    ->where('sender', 'system')
                    ->orderBy('created_at', 'DESC')
                    ->limit(30)
                    ->get()->getResultArray();
                $user['send_count']     = count($last30);
                $user['last30_newest']  = !empty($last30) ? $last30[0]['created_at'] : null;
                $user['last30_oldest']  = !empty($last30) ? end($last30)['created_at'] : null;
                $user['period_label']   = '最近30次';

            } else {
                // Default: last_month
                $user['send_count'] = $db->table('messages')
                    ->where('user_id', $uid)
                    ->where('sender', 'system')
                    ->where('created_at >=', $lastMonthStart)
                    ->where('created_at <=', $lastMonthEnd)
                    ->countAllResults();
                $user['period_label'] = date('Y年m月', strtotime('first day of last month'));
            }

            // Last send time (always)
            $lastMsg = $db->table('messages')
                ->select('created_at')
                ->where('user_id', $uid)
                ->where('sender', 'system')
                ->orderBy('created_at', 'DESC')
                ->limit(1)
                ->get()->getRowArray();
            $user['last_send_at'] = $lastMsg ? $lastMsg['created_at'] : null;

            // Did user send last month? (for UI badge)
            $user['sent_last_month'] = $db->table('messages')
                ->where('user_id', $uid)
                ->where('sender', 'system')
                ->where('created_at >=', $lastMonthStart)
                ->where('created_at <=', $lastMonthEnd)
                ->countAllResults() > 0;

            $user['is_active']    = (bool)$user['is_active'];
            $user['is_suspended'] = (bool)($user['is_suspended'] ?? false);
        }

        // Overall period label
        $periodLabel = 'last_month';
        if ($mode === 'all') {
            $periodLabel = '全部時間';
        } elseif ($mode === 'month' && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $periodLabel = date('Y年m月', strtotime($month . '-01'));
        } elseif ($mode === 'last30') {
            $periodLabel = '最近30次';
        } else {
            $periodLabel = date('Y年m月', strtotime('first day of last month'));
        }

        return $this->respond([
            'users'        => $users,
            'period_label' => $periodLabel,
            'mode'         => $mode,
            'show_all'     => $showAll
        ]);
    }
}

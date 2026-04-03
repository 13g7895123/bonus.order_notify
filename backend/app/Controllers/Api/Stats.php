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
     *   show_all  = 0|1 (0 = only show users who sent in the selected period, default: 0)
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

        // Determine last month boundaries (used for last_month mode)
        $lastMonthStart = date('Y-m-01 00:00:00', strtotime('first day of last month'));
        $lastMonthEnd   = date('Y-m-t 23:59:59',  strtotime('last day of last month'));

        // Compute period label early (used in empty-state response too)
        if ($mode === 'all') {
            $periodLabel = '全部時間';
        } elseif ($mode === 'month' && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $periodLabel = date('Y年m月', strtotime($month . '-01'));
        } elseif ($mode === 'last30') {
            $periodLabel = '最近30次';
        } else {
            $periodLabel = date('Y年m月', strtotime('first day of last month'));
        }

        // Base: all non-admin users
        $usersQuery = $db->table('users')
            ->select('id, username, name, is_active, is_suspended, suspend_notice')
            ->where('role !=', 'admin');

        if (!$showAll) {
            // Filter: only users who sent messages in the selected period
            $filterQuery = $db->table('messages')
                ->select('DISTINCT user_id')
                ->where('sender', 'system');

            if ($mode === 'last_month') {
                $filterQuery->where('created_at >=', $lastMonthStart)
                            ->where('created_at <=', $lastMonthEnd);
            } elseif ($mode === 'month' && preg_match('/^\d{4}-\d{2}$/', $month)) {
                $filterStart = $month . '-01 00:00:00';
                $filterEnd   = date('Y-m-t 23:59:59', strtotime($filterStart));
                $filterQuery->where('created_at >=', $filterStart)
                            ->where('created_at <=', $filterEnd);
            }
            // For 'last30' and 'all': no date filter — show any user who ever sent

            $activeRows = $filterQuery->get()->getResultArray();
            $activeIds  = array_column($activeRows, 'user_id');

            if (empty($activeIds)) {
                return $this->respond([
                    'users'        => [],
                    'period_label' => $periodLabel,
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

        return $this->respond([
            'users'        => $users,
            'period_label' => $periodLabel,
            'mode'         => $mode,
            'show_all'     => $showAll
        ]);
    }

    /**
     * Get detailed send logs for a specific user (admin only)
     * GET admin/user-send-detail/{userId}?mode=...&month=...&page=1
     */
    public function userSendDetail($userId = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$userId) return $this->failNotFound();

        $db = \Config\Database::connect();

        $targetUser = $db->table('users')
            ->select('id, username, name')
            ->where('id', $userId)
            ->get()->getRowArray();
        if (!$targetUser) return $this->failNotFound('使用者不存在');

        $mode  = $this->request->getGet('mode')  ?? 'last_month';
        $month = $this->request->getGet('month') ?? '';
        $page  = max(1, (int)($this->request->getGet('page') ?? 1));
        $limit = 10;
        $offset = ($page - 1) * $limit;

        // Determine date range
        $start = null;
        $end   = null;
        if ($mode === 'last_month') {
            $start = date('Y-m-01 00:00:00', strtotime('first day of last month'));
            $end   = date('Y-m-t 23:59:59',  strtotime('last day of last month'));
        } elseif ($mode === 'month' && preg_match('/^\d{4}-\d{2}$/', $month)) {
            $start = $month . '-01 00:00:00';
            $end   = date('Y-m-t 23:59:59', strtotime($start));
        }
        // last30 / all: no date filter

        $query = $db->table('send_logs')->where('user_id', $userId);
        if ($start) {
            $query->where('created_at >=', $start)->where('created_at <=', $end);
        }

        $total = $query->countAllResults(false);
        $logs  = $query->orderBy('created_at', 'DESC')->limit($limit, $offset)->get()->getResultArray();

        foreach ($logs as &$log) {
            // Decode JSON fields
            $log['variable_defaults']     = json_decode($log['variable_defaults_json'] ?? '{}', true) ?: (object)[];
            $log['xls_not_found_names_arr'] = json_decode($log['xls_not_found_names'] ?? '[]', true) ?: [];

            // Load recipients
            $recipients = $db->table('send_log_recipients')
                ->where('send_log_id', $log['id'])
                ->orderBy('id', 'ASC')
                ->get()->getResultArray();
            foreach ($recipients as &$r) {
                $r['final_variables'] = json_decode($r['final_variables_json'] ?? '{}', true) ?: (object)[];
                $r['is_xls_matched']  = (bool)$r['is_xls_matched'];
                $r['sent_success']    = (bool)$r['sent_success'];
            }
            $log['recipients']       = $recipients;
            $log['has_xls_import']   = (bool)$log['has_xls_import'];

            // Cleanup raw JSON fields from response
            unset($log['variable_defaults_json'], $log['xls_not_found_names']);
        }

        return $this->respond([
            'user'  => $targetUser,
            'logs'  => $logs,
            'total' => $total,
            'page'  => $page,
            'limit' => $limit,
        ]);
    }
}

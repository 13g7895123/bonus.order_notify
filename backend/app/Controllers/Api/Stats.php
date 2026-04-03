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
                ->select('DISTINCT user_id', false)
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

    /**
     * Get aggregated statistics for admin dashboard (admin only)
     */
    public function adminDashboard()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();

        $startOfMonth = date('Y-m-01 00:00:00');
        $endOfMonth   = date('Y-m-t 23:59:59');
        $today        = date('Y-m-d 00:00:00');
        $lastMonthStart = date('Y-m-01 00:00:00', strtotime('first day of last month'));
        $lastMonthEnd   = date('Y-m-t 23:59:59',  strtotime('last day of last month'));

        // ── Platform totals ──────────────────────────────────────────────────
        $totalUsers = $db->table('users')->where('role !=', 'admin')->countAllResults();
        $activeUsers = $db->table('users')->where('role !=', 'admin')->where('is_active', 1)->where('is_suspended', 0)->countAllResults();
        $suspendedUsers = $db->table('users')->where('role !=', 'admin')->where('is_suspended', 1)->countAllResults();
        $onlineUsers = $db->query(
            "SELECT COUNT(DISTINCT user_id) AS cnt FROM user_tokens WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')"
        )->getRow()->cnt;

        $totalCustomers  = $db->table('customers')->countAllResults();
        $totalTemplates  = $db->table('templates')->countAllResults();

        // Messages this month vs last month
        $msgsThisMonth = $db->table('messages')
            ->where('sender', 'system')
            ->where('created_at >=', $startOfMonth)
            ->where('created_at <=', $endOfMonth)
            ->countAllResults();

        $msgsLastMonth = $db->table('messages')
            ->where('sender', 'system')
            ->where('created_at >=', $lastMonthStart)
            ->where('created_at <=', $lastMonthEnd)
            ->countAllResults();

        $msgsToday = $db->table('messages')
            ->where('sender', 'system')
            ->where('created_at >=', $today)
            ->countAllResults();

        // ── Top senders this month ──────────────────────────────────────────
        $topSenders = $db->query("
            SELECT u.id, u.username, u.name, COUNT(m.id) AS sent_count
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.sender = 'system'
              AND m.created_at >= ?
              AND m.created_at <= ?
              AND u.role != 'admin'
            GROUP BY u.id, u.username, u.name
            ORDER BY sent_count DESC
            LIMIT 5
        ", [$startOfMonth, $endOfMonth])->getResultArray();

        // ── Per-user stats (non-admin) ───────────────────────────────────────
        $users = $db->table('users')
            ->select('id, username, name, is_active, is_suspended, message_quota, last_login_at')
            ->where('role !=', 'admin')
            ->orderBy('name', 'ASC')
            ->get()->getResultArray();

        foreach ($users as &$u) {
            $uid = (int)$u['id'];
            $u['is_online']      = (bool)$db->table('user_tokens')->where('user_id', $uid)->countAllResults();
            $u['is_active']      = (bool)$u['is_active'];
            $u['is_suspended']   = (bool)$u['is_suspended'];
            $u['customers']      = $db->table('customers')->where('user_id', $uid)->countAllResults();
            $u['templates']      = $db->table('templates')->where('user_id', $uid)->countAllResults();
            $u['msgs_this_month'] = $db->table('messages')
                ->where('user_id', $uid)->where('sender', 'system')
                ->where('created_at >=', $startOfMonth)->where('created_at <=', $endOfMonth)
                ->countAllResults();
            $u['msgs_last_month'] = $db->table('messages')
                ->where('user_id', $uid)->where('sender', 'system')
                ->where('created_at >=', $lastMonthStart)->where('created_at <=', $lastMonthEnd)
                ->countAllResults();
            $u['quota']           = (int)($u['message_quota'] ?? 200);
            $u['quota_remaining'] = max(0, $u['quota'] - $u['msgs_this_month']);
            unset($u['message_quota']);
        }

        // Filter: only show users who sent this month or last month
        $users = array_values(array_filter($users, function ($u) {
            return $u['msgs_this_month'] > 0 || $u['msgs_last_month'] > 0;
        }));

        // ── Send trend: users who have ever sent messages ────────────────────
        $trendUsers = $db->query("
            SELECT DISTINCT u.id, u.name, u.username
            FROM messages m
            JOIN users u ON u.id = m.user_id
            WHERE m.sender = 'system'
              AND u.role != 'admin'
            ORDER BY u.name ASC
        ")->getResultArray();
        foreach ($trendUsers as &$tu) { $tu['id'] = (int)$tu['id']; }
        unset($tu);

        // Helper: build empty series skeleton (total + one per user)
        $buildSeries = function () use ($trendUsers) {
            $s = [['user_id' => 'total', 'label' => '全部', 'data' => []]];
            foreach ($trendUsers as $u) {
                $s[] = ['user_id' => (int)$u['id'], 'label' => $u['name'] ?: $u['username'], 'data' => []];
            }
            return $s;
        };

        // ── Daily (this month) ───────────────────────────────────────────────
        $dailyRows = $db->query("
            SELECT DATE(created_at) AS `date`, user_id, COUNT(*) AS `count`
            FROM messages
            WHERE sender = 'system'
              AND created_at >= ? AND created_at <= ?
            GROUP BY DATE(created_at), user_id
            ORDER BY `date` ASC
        ", [$startOfMonth, $endOfMonth])->getResultArray();

        $daysInMonth = (int)date('t');
        $dailyLabels = [];
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dailyLabels[] = ['fmt' => str_pad($d, 2, '0', STR_PAD_LEFT)];
        }

        $dailyIdx = [];
        foreach ($dailyRows as $row) {
            $dailyIdx[$row['date']][(int)$row['user_id']] = (int)$row['count'];
        }

        $dailySeries = $buildSeries();
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = date('Y-m-') . str_pad($d, 2, '0', STR_PAD_LEFT);
            $dayData = $dailyIdx[$dateStr] ?? [];
            $dailySeries[0]['data'][] = array_sum($dayData);
            foreach ($trendUsers as $idx => $u) {
                $dailySeries[$idx + 1]['data'][] = $dayData[(int)$u['id']] ?? 0;
            }
        }

        // ── Weekly (this month) ──────────────────────────────────────────────
        $weeklyRows = $db->query("
            SELECT YEARWEEK(created_at, 1) AS yw,
                   MIN(DATE(created_at)) AS week_start,
                   MAX(DATE(created_at)) AS week_end,
                   user_id, COUNT(*) AS `count`
            FROM messages
            WHERE sender = 'system'
              AND created_at >= ? AND created_at <= ?
            GROUP BY YEARWEEK(created_at, 1), user_id
            ORDER BY yw ASC
        ", [$startOfMonth, $endOfMonth])->getResultArray();

        $weeklyInfo  = [];
        $weeklyIdx   = [];
        $weeklyOrder = [];
        foreach ($weeklyRows as $row) {
            $yw  = $row['yw'];
            $uid = (int)$row['user_id'];
            if (!in_array($yw, $weeklyOrder)) $weeklyOrder[] = $yw;
            $weeklyIdx[$yw][$uid] = (int)$row['count'];
            if (!isset($weeklyInfo[$yw])) {
                $weeklyInfo[$yw] = ['week_start' => $row['week_start'], 'week_end' => $row['week_end']];
            } else {
                if ($row['week_start'] < $weeklyInfo[$yw]['week_start']) $weeklyInfo[$yw]['week_start'] = $row['week_start'];
                if ($row['week_end']   > $weeklyInfo[$yw]['week_end'])   $weeklyInfo[$yw]['week_end']   = $row['week_end'];
            }
        }
        sort($weeklyOrder);

        $weeklyLabels = [];
        foreach ($weeklyOrder as $i => $yw) {
            $info = $weeklyInfo[$yw];
            $weeklyLabels[] = [
                'label'     => 'W' . ($i + 1),
                'fmt_range' => date('m/d', strtotime($info['week_start'])) . '~' . date('m/d', strtotime($info['week_end'])),
            ];
        }

        $weeklySeries = $buildSeries();
        foreach ($weeklyOrder as $yw) {
            $ywData = $weeklyIdx[$yw] ?? [];
            $weeklySeries[0]['data'][] = array_sum($ywData);
            foreach ($trendUsers as $idx => $u) {
                $weeklySeries[$idx + 1]['data'][] = $ywData[(int)$u['id']] ?? 0;
            }
        }

        // ── Monthly (last 12 months) ─────────────────────────────────────────
        $twelveMonthsAgo = date('Y-m-01 00:00:00', strtotime('-11 months'));
        $monthlyRows = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS `month`, user_id, COUNT(*) AS `count`
            FROM messages
            WHERE sender = 'system'
              AND created_at >= ?
            GROUP BY DATE_FORMAT(created_at, '%Y-%m'), user_id
            ORDER BY `month` ASC
        ", [$twelveMonthsAgo])->getResultArray();

        $monthlyIdx   = [];
        $monthlyOrder = [];
        foreach ($monthlyRows as $row) {
            $mo  = $row['month'];
            $uid = (int)$row['user_id'];
            if (!in_array($mo, $monthlyOrder)) $monthlyOrder[] = $mo;
            $monthlyIdx[$mo][$uid] = (int)$row['count'];
        }
        sort($monthlyOrder);

        $monthlyLabels = array_map(fn($mo) => ['label' => $mo, 'fmt' => $mo], $monthlyOrder);
        $monthlySeries = $buildSeries();
        foreach ($monthlyOrder as $mo) {
            $moData = $monthlyIdx[$mo] ?? [];
            $monthlySeries[0]['data'][] = array_sum($moData);
            foreach ($trendUsers as $idx => $u) {
                $monthlySeries[$idx + 1]['data'][] = $moData[(int)$u['id']] ?? 0;
            }
        }

        return $this->respond([
            'period'    => date('Y年m月'),
            'platform'  => [
                'total_users'     => (int)$totalUsers,
                'active_users'    => (int)$activeUsers,
                'suspended_users' => (int)$suspendedUsers,
                'online_users'    => (int)$onlineUsers,
                'total_customers' => (int)$totalCustomers,
                'total_templates' => (int)$totalTemplates,
            ],
            'messages'  => [
                'this_month' => (int)$msgsThisMonth,
                'last_month' => (int)$msgsLastMonth,
                'today'      => (int)$msgsToday,
            ],
            'top_senders' => $topSenders,
            'users'        => $users,
            'send_trend'   => [
                'users'   => $trendUsers,
                'daily'   => ['labels' => $dailyLabels,   'series' => $dailySeries],
                'weekly'  => ['labels' => $weeklyLabels,  'series' => $weeklySeries],
                'monthly' => ['labels' => $monthlyLabels, 'series' => $monthlySeries],
            ],
        ]);
    }
}

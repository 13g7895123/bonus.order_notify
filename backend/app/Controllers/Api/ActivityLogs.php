<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class ActivityLogs extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    /**
     * Get activity logs (admin only)
     */
    public function index()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();

        $page = (int)$this->request->getGet('page') ?: 1;
        $perPage = (int)$this->request->getGet('per_page') ?: 50;
        $offset = ($page - 1) * $perPage;

        // Filters
        $userId = $this->request->getGet('user_id');
        $method = $this->request->getGet('method');
        $endpoint = $this->request->getGet('endpoint');
        $dateFrom = $this->request->getGet('date_from');
        $dateTo = $this->request->getGet('date_to');

        $builder = $db->table('activity_logs');

        if ($userId) {
            $builder->where('user_id', $userId);
        }
        if ($method) {
            $builder->where('method', $method);
        }
        if ($endpoint) {
            $builder->like('endpoint', $endpoint);
        }
        if ($dateFrom) {
            $builder->where('created_at >=', $dateFrom . ' 00:00:00');
        }
        if ($dateTo) {
            $builder->where('created_at <=', $dateTo . ' 23:59:59');
        }

        // Get total count
        $total = $builder->countAllResults(false);

        // Get paginated results
        $logs = $builder
            ->orderBy('created_at', 'DESC')
            ->limit($perPage, $offset)
            ->get()->getResultArray();

        return $this->respond([
            'data' => $logs,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage)
            ]
        ]);
    }

    /**
     * Get log statistics
     */
    public function stats()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();

        // Today's count
        $today = $db->table('activity_logs')
            ->where('created_at >=', date('Y-m-d 00:00:00'))
            ->countAllResults();

        // This hour
        $thisHour = $db->table('activity_logs')
            ->where('created_at >=', date('Y-m-d H:00:00'))
            ->countAllResults();

        // By method
        $byMethod = $db->table('activity_logs')
            ->select('method, COUNT(*) as count')
            ->where('created_at >=', date('Y-m-d 00:00:00'))
            ->groupBy('method')
            ->get()->getResultArray();

        // Top users today
        $topUsers = $db->table('activity_logs')
            ->select('username, COUNT(*) as count')
            ->where('created_at >=', date('Y-m-d 00:00:00'))
            ->where('username IS NOT NULL')
            ->groupBy('username')
            ->orderBy('count', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        return $this->respond([
            'today' => $today,
            'this_hour' => $thisHour,
            'by_method' => $byMethod,
            'top_users' => $topUsers
        ]);
    }

    /**
     * Clear old logs
     */
    public function clear()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $days = (int)$this->request->getGet('days') ?: 30;
        $cutoffDate = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        $db = \Config\Database::connect();
        $deleted = $db->table('activity_logs')
            ->where('created_at <', $cutoffDate)
            ->delete();

        return $this->respond([
            'success' => true,
            'message' => "已清除 {$days} 天前的紀錄",
            'deleted_count' => $db->affectedRows()
        ]);
    }
}

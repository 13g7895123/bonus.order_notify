<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class UserApplications extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    /**
     * Submit a new application (public - no auth required)
     */
    public function apply()
    {
        $json = $this->request->getJSON();

        if (!$json || !isset($json->username) || !isset($json->password) || !isset($json->name)) {
            return $this->failValidationErrors('username, password 和 name 為必填');
        }

        $db = \Config\Database::connect();

        // Check if username already exists in users table
        $existingUser = $db->table('users')->where('username', $json->username)->get()->getRowArray();
        if ($existingUser) {
            return $this->failValidationErrors('使用者名稱已被使用');
        }

        // Check if there's a pending application with same username
        $existingApp = $db->table('user_applications')
            ->where('username', $json->username)
            ->where('status', 'pending')
            ->get()->getRowArray();
        if ($existingApp) {
            return $this->failValidationErrors('此使用者名稱已有待審核的申請');
        }

        // Create application
        $db->table('user_applications')->insert([
            'username' => $json->username,
            'password' => password_hash($json->password, PASSWORD_DEFAULT),
            'name' => $json->name,
            'email' => $json->email ?? null,
            'reason' => $json->reason ?? null,
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respondCreated([
            'success' => true,
            'message' => '申請已送出，請等待管理員審核'
        ]);
    }

    /**
     * List all applications (admin only)
     */
    public function index()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $status = $this->request->getGet('status');

        $builder = $db->table('user_applications');
        if ($status) {
            $builder->where('status', $status);
        }

        $applications = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();

        return $this->respond($applications);
    }

    /**
     * Get pending count (admin only)
     */
    public function pendingCount()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $count = $db->table('user_applications')->where('status', 'pending')->countAllResults();

        return $this->respond(['count' => $count]);
    }

    /**
     * Approve an application (admin only)
     */
    public function approve($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        $application = $db->table('user_applications')->where('id', $id)->get()->getRowArray();

        if (!$application) {
            return $this->failNotFound('申請不存在');
        }

        if ($application['status'] !== 'pending') {
            return $this->failValidationErrors('此申請已被處理');
        }

        // Check if username is still available
        $existingUser = $db->table('users')->where('username', $application['username'])->get()->getRowArray();
        if ($existingUser) {
            return $this->failValidationErrors('使用者名稱已被使用');
        }

        // Create the user
        $webhookKey = bin2hex(random_bytes(32));
        $db->table('users')->insert([
            'username' => $application['username'],
            'password' => $application['password'], // Already hashed
            'name' => $application['name'],
            'role' => 'user',
            'webhook_key' => $webhookKey,
            'message_quota' => 200,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        $userId = $db->insertID();

        // Create default template for the new user
        $db->table('templates')->insert([
            'user_id' => $userId,
            'name' => '出貨通知',
            'content' => '親愛的 {{name}}，您的訂單已經出貨。',
            'variables' => null,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Update application status
        $db->table('user_applications')->where('id', $id)->update([
            'status' => 'approved',
            'reviewed_by' => $currentUser['id'],
            'reviewed_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond([
            'success' => true,
            'message' => '已核准申請，使用者帳號已建立',
            'user_id' => $userId
        ]);
    }

    /**
     * Reject an application (admin only)
     */
    public function reject($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $json = $this->request->getJSON();
        $reason = $json->reason ?? null;

        $db = \Config\Database::connect();
        $application = $db->table('user_applications')->where('id', $id)->get()->getRowArray();

        if (!$application) {
            return $this->failNotFound('申請不存在');
        }

        if ($application['status'] !== 'pending') {
            return $this->failValidationErrors('此申請已被處理');
        }

        // Update application status
        $db->table('user_applications')->where('id', $id)->update([
            'status' => 'rejected',
            'reviewed_by' => $currentUser['id'],
            'reviewed_at' => date('Y-m-d H:i:s'),
            'reject_reason' => $reason
        ]);

        return $this->respond([
            'success' => true,
            'message' => '已拒絕申請'
        ]);
    }
}

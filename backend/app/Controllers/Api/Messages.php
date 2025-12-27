<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Messages extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    public function index()
    {
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return $this->failUnauthorized();
        }

        // Recent messages for this user
        $db = \Config\Database::connect();
        $msgs = $db->table('messages')
            ->select('messages.*, customers.custom_name as customer_name')
            ->join('customers', 'customers.id = messages.customer_id', 'left')
            ->where('messages.user_id', $userId)
            ->orderBy('messages.created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();
        return $this->respond($msgs);
    }

    public function history($customerId = null)
    {
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return $this->failUnauthorized();
        }

        if (!$customerId) return $this->failValidationErrors('Customer ID required');

        $db = \Config\Database::connect();

        // Verify customer belongs to this user
        $customer = $db->table('customers')->where('id', $customerId)->where('user_id', $userId)->get()->getRowArray();
        if (!$customer) {
            return $this->failNotFound('Customer not found');
        }

        $msgs = $db->table('messages')
            ->where('customer_id', $customerId)
            ->where('user_id', $userId)
            ->orderBy('created_at', 'ASC')
            ->get()->getResultArray();
        return $this->respond($msgs);
    }
}

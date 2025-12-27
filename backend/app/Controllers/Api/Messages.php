<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Messages extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        // Recent messages
        $db = \Config\Database::connect();
        $msgs = $db->table('messages')
            ->select('messages.*, customers.name as customer_name')
            ->join('customers', 'customers.id = messages.customer_id', 'left')
            ->orderBy('created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();
        return $this->respond($msgs);
    }

    public function history($customerId = null)
    {
        if (!$customerId) return $this->failValidationError('Customer ID required');

        $db = \Config\Database::connect();
        $msgs = $db->table('messages')
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'ASC')
            ->get()->getResultArray();
        return $this->respond($msgs);
    }
}

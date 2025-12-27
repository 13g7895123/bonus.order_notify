<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Customers extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('customers');

        // Join with line_users to get LINE profile data
        $builder->select('customers.*, line_users.display_name as line_display_name, line_users.picture_url, line_users.status_message');
        $builder->join('line_users', 'line_users.line_uid = customers.line_uid', 'left');

        $search = $this->request->getGet('search');
        if ($search) {
            $builder->groupStart()
                ->like('customers.custom_name', $search)
                ->orLike('customers.line_uid', $search)
                ->orLike('line_users.display_name', $search)
                ->groupEnd();
        }

        $customers = $builder->orderBy('customers.created_at', 'DESC')->get()->getResultArray();
        return $this->respond($customers);
    }

    public function create()
    {
        $json = $this->request->getJSON();
        if (!$json || !isset($json->line_uid)) {
            return $this->failValidationErrors('line_uid is required');
        }

        $db = \Config\Database::connect();

        // Check if update or create
        if (isset($json->id) && $json->id) {
            $data = [
                'line_uid' => $json->line_uid,
                'custom_name' => $json->custom_name ?? null,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            $db->table('customers')->where('id', $json->id)->update($data);
            return $this->respond(['id' => $json->id, ...$data]);
        } else {
            $data = [
                'line_uid' => $json->line_uid,
                'custom_name' => $json->custom_name ?? null,
                'created_at' => date('Y-m-d H:i:s')
            ];
            $db->table('customers')->insert($data);
            $id = $db->insertID();
            return $this->respondCreated(['id' => $id, ...$data]);
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        $db->table('customers')->where('id', $id)->delete();
        return $this->respondDeleted(['id' => $id]);
    }
}

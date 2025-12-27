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

        $search = $this->request->getGet('search');
        if ($search) {
            $builder->like('name', $search)->orLike('line_id', $search);
        }

        $customers = $builder->get()->getResultArray();
        return $this->respond($customers);
    }

    public function create()
    {
        $json = $this->request->getJSON();
        if (!$json || !isset($json->name)) {
            return $this->failValidationError('Name is required');
        }

        $db = \Config\Database::connect();

        // Check if update or create
        if (isset($json->id)) {
            $data = [
                'name' => $json->name,
                'line_id' => $json->line_id ?? '',
                'updated_at' => date('Y-m-d H:i:s')
            ];
            $db->table('customers')->where('id', $json->id)->update($data);
            return $this->respond(['id' => $json->id, ...$data]);
        } else {
            $data = [
                'name' => $json->name,
                'line_id' => $json->line_id ?? '',
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

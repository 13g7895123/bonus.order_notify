<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Templates extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $templates = $db->table('templates')->get()->getResultArray();
        return $this->respond($templates);
    }

    public function create()
    {
        $json = $this->request->getJSON();
        if (!$json || !isset($json->name)) {
            return $this->failValidationErrors('Name is required');
        }

        $db = \Config\Database::connect();
        $data = [
            'name' => $json->name,
            'content' => $json->content ?? '',
            'variables' => isset($json->variables) ? json_encode($json->variables) : null,
            'created_at' => date('Y-m-d H:i:s')
        ];
        $db->table('templates')->insert($data);
        $id = $db->insertID();

        return $this->respondCreated(['id' => $id, ...$data]);
    }

    public function update($id = null)
    {
        if (!$id) return $this->failNotFound();

        $json = $this->request->getJSON();
        $db = \Config\Database::connect();

        $data = [
            'updated_at' => date('Y-m-d H:i:s')
        ];
        if (isset($json->name)) $data['name'] = $json->name;
        if (isset($json->content)) $data['content'] = $json->content;
        if (isset($json->variables)) $data['variables'] = json_encode($json->variables);

        $db->table('templates')->where('id', $id)->update($data);

        return $this->respond(['id' => $id, 'success' => true]);
    }

    public function delete($id = null)
    {
        if (!$id) return $this->failNotFound();

        $db = \Config\Database::connect();
        $db->table('templates')->where('id', $id)->delete();

        return $this->respondDeleted(['id' => $id]);
    }
}

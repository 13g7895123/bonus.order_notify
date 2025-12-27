<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Templates extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    public function index()
    {
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return $this->failUnauthorized();
        }

        $db = \Config\Database::connect();
        $templates = $db->table('templates')
            ->where('user_id', $userId)
            ->get()->getResultArray();
        return $this->respond($templates);
    }

    public function create()
    {
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return $this->failUnauthorized();
        }

        $json = $this->request->getJSON();
        if (!$json || !isset($json->name)) {
            return $this->failValidationErrors('Name is required');
        }

        $db = \Config\Database::connect();
        $data = [
            'user_id' => $userId,
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
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return $this->failUnauthorized();
        }

        if (!$id) return $this->failNotFound();

        $db = \Config\Database::connect();

        // Verify ownership
        $existing = $db->table('templates')->where('id', $id)->where('user_id', $userId)->get()->getRowArray();
        if (!$existing) {
            return $this->failNotFound('Template not found');
        }

        $json = $this->request->getJSON();

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
        $userId = $this->getCurrentUserId();
        if (!$userId) {
            return $this->failUnauthorized();
        }

        if (!$id) return $this->failNotFound();

        $db = \Config\Database::connect();

        // Verify ownership
        $existing = $db->table('templates')->where('id', $id)->where('user_id', $userId)->get()->getRowArray();
        if (!$existing) {
            return $this->failNotFound('Template not found');
        }

        $db->table('templates')->where('id', $id)->delete();

        return $this->respondDeleted(['id' => $id]);
    }
}

<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Settings extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    public function index()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser) {
            return $this->failUnauthorized();
        }

        $db = \Config\Database::connect();
        $settings = $db->table('settings')->get()->getResultArray();

        $kv = [];
        foreach ($settings as $s) {
            $kv[$s['key']] = $s['value'];
        }

        return $this->respond($kv);
    }

    public function update($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser) {
            return $this->failUnauthorized();
        }

        // Ideally only admin should update settings, checking role
        if (($currentUser['role'] ?? '') !== 'admin') {
            return $this->failForbidden('Only admin can update settings');
        }

        $json = $this->request->getJSON(true); // as array
        if (!$json) return $this->failValidationErrors('Invalid data');

        $db = \Config\Database::connect();

        foreach ($json as $key => $value) {
            // Check existence
            $exists = $db->table('settings')->where('key', $key)->countAllResults() > 0;
            if ($exists) {
                $db->table('settings')->where('key', $key)->update([
                    'value' => $value,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            } else {
                $db->table('settings')->insert([
                    'key' => $key,
                    'value' => $value,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }
        }

        return $this->respond(['success' => true]);
    }
}

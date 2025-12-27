<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Settings extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
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
        // $id is ignored as this is a singular resource endpoint actually
        $json = $this->request->getJSON(true); // as array
        if (!$json) return $this->failValidationError('Invalid data');

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

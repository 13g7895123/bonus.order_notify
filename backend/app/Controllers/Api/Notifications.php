<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Notifications extends ResourceController
{
    protected $format = 'json';

    public function send()
    {
        $json = $this->request->getJSON();
        if (!$json || !isset($json->template_id) || !isset($json->customer_ids)) {
            return $this->failValidationError('template_id and customer_ids are required');
        }

        $db = \Config\Database::connect();
        $template = $db->table('templates')->where('id', $json->template_id)->get()->getRowArray();

        if (!$template) return $this->failNotFound('Template not found');

        $customerIds = $json->customer_ids;
        $sentCount = 0;

        foreach ($customerIds as $cid) {
            $customer = $db->table('customers')->where('id', $cid)->get()->getRowArray();
            if ($customer) {
                // Mock sending: In production, call LINE API here
                // Replace variables
                $content = $template['content'];
                $content = str_replace('{{name}}', $customer['name'], $content);
                // ... mock other vars

                // Log Message
                $db->table('messages')->insert([
                    'customer_id' => $customer['id'],
                    'sender' => 'system',
                    'content' => $content,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                $sentCount++;
            }
        }

        return $this->respond([
            'success' => true,
            'sent_count' => $sentCount,
            'message' => "Successfully sent to $sentCount customers"
        ]);
    }
}

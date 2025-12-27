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
            return $this->failValidationErrors('template_id and customer_ids are required');
        }

        $db = \Config\Database::connect();

        // Validate LINE API settings exist
        $channelSecret = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
        $channelAccessToken = $db->table('settings')->where('key', 'line_channel_access_token')->get()->getRowArray();

        if (!$channelSecret || !$channelAccessToken || empty($channelSecret['value']) || empty($channelAccessToken['value'])) {
            return $this->fail('LINE API 尚未設定，請先至系統設定頁面填寫 Channel Secret 與 Access Token', 400);
        }

        $template = $db->table('templates')->where('id', $json->template_id)->get()->getRowArray();

        if (!$template) return $this->failNotFound('Template not found');

        $customerIds = $json->customer_ids;
        $sentCount = 0;
        $errors = [];

        foreach ($customerIds as $cid) {
            $customer = $db->table('customers')->where('id', $cid)->get()->getRowArray();
            if ($customer) {
                // Replace variables
                $content = $template['content'];
                $content = str_replace('{{name}}', $customer['name'], $content);
                // ... more variable replacements can be added

                // Call LINE Message API
                $lineResult = $this->sendLineMessage($channelAccessToken['value'], $customer['line_id'], $content);

                // Log Message
                $db->table('messages')->insert([
                    'customer_id' => $customer['id'],
                    'sender' => 'system',
                    'content' => $content,
                    'created_at' => date('Y-m-d H:i:s')
                ]);

                if ($lineResult['success']) {
                    $sentCount++;
                } else {
                    $errors[] = "Failed to send to {$customer['name']}: {$lineResult['error']}";
                }
            }
        }

        return $this->respond([
            'success' => $sentCount > 0,
            'sent_count' => $sentCount,
            'message' => "成功發送給 $sentCount 位客戶",
            'errors' => $errors
        ]);
    }

    /**
     * Send message via LINE Messaging API
     */
    private function sendLineMessage(string $accessToken, string $userId, string $message): array
    {
        $url = 'https://api.line.me/v2/bot/message/push';

        $data = [
            'to' => $userId,
            'messages' => [
                [
                    'type' => 'text',
                    'text' => $message
                ]
            ]
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $accessToken
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            return ['success' => true];
        } else {
            $errorBody = json_decode($response, true);
            return ['success' => false, 'error' => $errorBody['message'] ?? 'Unknown error'];
        }
    }
}

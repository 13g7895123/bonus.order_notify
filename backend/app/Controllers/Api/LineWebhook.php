<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class LineWebhook extends ResourceController
{
    protected $format = 'json';

    /**
     * LINE Webhook endpoint
     * Receives events from LINE and stores user information
     */
    public function receive()
    {
        $db = \Config\Database::connect();

        // Get Channel Secret for signature verification
        $channelSecretRow = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
        $channelSecret = $channelSecretRow['value'] ?? '';

        // Get request body
        $body = file_get_contents('php://input');

        // Verify signature (optional but recommended for production)
        $signature = $this->request->getHeaderLine('X-Line-Signature');
        if ($channelSecret && $signature) {
            $hash = base64_encode(hash_hmac('sha256', $body, $channelSecret, true));
            if ($hash !== $signature) {
                return $this->failUnauthorized('Invalid signature');
            }
        }

        $events = json_decode($body, true);

        if (!$events || !isset($events['events'])) {
            return $this->respond(['status' => 'ok']);
        }

        foreach ($events['events'] as $event) {
            $userId = $event['source']['userId'] ?? null;
            $eventType = $event['type'] ?? '';

            if ($userId) {
                // Check if user already exists in line_users table
                $existing = $db->table('line_users')->where('line_uid', $userId)->get()->getRowArray();

                if (!$existing) {
                    // Get user profile from LINE
                    $profile = $this->getLineUserProfile($userId);

                    $db->table('line_users')->insert([
                        'line_uid' => $userId,
                        'display_name' => $profile['displayName'] ?? '',
                        'picture_url' => $profile['pictureUrl'] ?? '',
                        'status_message' => $profile['statusMessage'] ?? '',
                        'event_type' => $eventType,
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }

                // If it's a message event, log the message
                if ($eventType === 'message' && isset($event['message']['text'])) {
                    // Find linked customer
                    $customer = $db->table('customers')->where('line_id', $userId)->get()->getRowArray();

                    $db->table('messages')->insert([
                        'customer_id' => $customer['id'] ?? null,
                        'sender' => 'user',
                        'content' => $event['message']['text'],
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }
        }

        return $this->respond(['status' => 'ok']);
    }

    /**
     * Get all LINE users (for linking to customers)
     */
    public function listUsers()
    {
        $db = \Config\Database::connect();
        $users = $db->table('line_users')
            ->select('line_users.*, customers.name as linked_customer_name')
            ->join('customers', 'customers.line_id = line_users.line_uid', 'left')
            ->orderBy('created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond($users);
    }

    /**
     * Get LINE user profile
     */
    private function getLineUserProfile(string $userId): array
    {
        $db = \Config\Database::connect();
        $tokenRow = $db->table('settings')->where('key', 'line_channel_access_token')->get()->getRowArray();
        $accessToken = $tokenRow['value'] ?? '';

        if (!$accessToken) {
            return [];
        }

        $url = "https://api.line.me/v2/bot/profile/{$userId}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true) ?? [];
    }
}

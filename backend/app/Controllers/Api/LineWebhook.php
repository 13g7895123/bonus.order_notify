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

        // Log request start
        log_message('info', '[LINE Webhook] Request received');

        // Get Channel Secret for signature verification
        $channelSecretRow = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
        $channelSecret = $channelSecretRow['value'] ?? '';

        // Get request body
        $body = file_get_contents('php://input');

        // Detailed Logging of Headers and Body
        log_message('debug', '[LINE Webhook] Headers: ' . json_encode($this->request->getHeaders()));
        log_message('debug', '[LINE Webhook] Body: ' . $body);

        // Verify signature
        $signature = $this->request->getHeaderLine('X-Line-Signature');
        if ($channelSecret && $signature) {
            $hash = base64_encode(hash_hmac('sha256', $body, $channelSecret, true));
            if ($hash !== $signature) {
                log_message('error', '[LINE Webhook] Signature verification failed. Expected: ' . $hash . ', Received: ' . $signature);
                return $this->failUnauthorized('Invalid signature');
            }
            log_message('info', '[LINE Webhook] Signature verified');
        } else {
            log_message('warning', '[LINE Webhook] Skipping signature verification (Missing secret or signature header)');
        }

        $events = json_decode($body, true);

        if (!$events || !isset($events['events'])) {
            log_message('info', '[LINE Webhook] No events found in request');
            return $this->respond(['status' => 'ok']);
        }

        log_message('info', '[LINE Webhook] Processing ' . count($events['events']) . ' events');

        foreach ($events['events'] as $index => $event) {
            log_message('debug', "[LINE Webhook] Event #{$index}: " . json_encode($event));

            $userId = $event['source']['userId'] ?? null;
            $eventType = $event['type'] ?? '';

            if ($userId) {
                // Check if user already exists
                $existing = $db->table('line_users')->where('line_uid', $userId)->get()->getRowArray();

                // Get user profile from LINE
                $profile = $this->getLineUserProfile($userId);
                log_message('debug', "[LINE Webhook] Profile fetch result for {$userId}: " . json_encode($profile));

                if (!$existing) {
                    log_message('info', "[LINE Webhook] Creating new user: " . $userId);
                    $db->table('line_users')->insert([
                        'line_uid' => $userId,
                        'display_name' => $profile['displayName'] ?? '',
                        'picture_url' => $profile['pictureUrl'] ?? '',
                        'status_message' => $profile['statusMessage'] ?? '',
                        'email' => $profile['email'] ?? null,
                        'event_type' => $eventType,
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                } else {
                    log_message('info', "[LINE Webhook] Updating existing user: " . $userId);
                    $db->table('line_users')->where('line_uid', $userId)->update([
                        'display_name' => $profile['displayName'] ?? $existing['display_name'],
                        'picture_url' => $profile['pictureUrl'] ?? $existing['picture_url'],
                        'status_message' => $profile['statusMessage'] ?? $existing['status_message'],
                        'email' => $profile['email'] ?? $existing['email'],
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }

                // Auto-create customer if not exists
                $existingCustomer = $db->table('customers')->where('line_uid', $userId)->get()->getRowArray();
                if (!$existingCustomer) {
                    $displayName = $profile['displayName'] ?? '';
                    log_message('info', "[LINE Webhook] Auto-creating customer for: " . $userId . " with name: " . $displayName);
                    $db->table('customers')->insert([
                        'line_uid' => $userId,
                        'custom_name' => $displayName, // Use LINE display_name as initial custom_name
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }

                // Log text messages
                if ($eventType === 'message' && isset($event['message']['text'])) {
                    $customer = $db->table('customers')->where('line_uid', $userId)->get()->getRowArray();
                    log_message('info', "[LINE Webhook] New message from " . ($customer ? "Customer #{$customer['id']}" : "Unknown User"));

                    $db->table('messages')->insert([
                        'customer_id' => $customer['id'] ?? null,
                        'sender' => 'user',
                        'content' => $event['message']['text'],
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            } else {
                log_message('warning', "[LINE Webhook] Event #{$index} missing userId source");
            }
        }

        return $this->respond(['status' => 'ok']);
    }

    /**
     * Get recent logs for LINE webhook
     */
    public function debugLogs()
    {
        $logFile = WRITEPATH . 'logs/log-' . date('Y-m-d') . '.log';
        if (!file_exists($logFile)) {
            return $this->respond(['message' => 'No logs for today yet.', 'lines' => []]);
        }

        // Read last 100 lines and filter for LINE Webhook entries
        $content = file_get_contents($logFile);
        $lines = explode("\n", $content);
        $filtered = array_filter($lines, function ($line) {
            return strpos($line, '[LINE Webhook]') !== false;
        });

        // Return the latest first
        return $this->respond([
            'file' => basename($logFile),
            'logs' => array_values(array_slice(array_reverse($filtered), 0, 100))
        ]);
    }

    /**
     * Get all LINE users (for linking to customers)
     */
    public function listUsers()
    {
        $db = \Config\Database::connect();
        $users = $db->table('line_users')
            ->select('line_users.*, customers.custom_name as linked_customer_name')
            ->join('customers', 'customers.line_uid = line_users.line_uid', 'left')
            ->orderBy('line_users.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond($users);
    }

    /**
     * Get LINE user profile from LINE API
     */
    private function getLineUserProfile(string $userId): array
    {
        $db = \Config\Database::connect();
        $tokenRow = $db->table('settings')->where('key', 'line_channel_access_token')->get()->getRowArray();
        $accessToken = $tokenRow['value'] ?? '';

        if (!$accessToken) {
            log_message('warning', '[LINE Webhook] Cannot fetch profile: Access Token missing');
            return [];
        }

        $url = "https://api.line.me/v2/bot/profile/{$userId}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            log_message('error', "[LINE Webhook] Failed to fetch profile for {$userId}. HTTP: {$httpCode}, Response: {$response}");
            return [];
        }

        return json_decode($response, true) ?? [];
    }
}

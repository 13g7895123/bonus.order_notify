<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class LineWebhook extends ResourceController
{
    protected $format = 'json';

    /**
     * LINE Webhook endpoint
     * Receives events from LINE and stores user information
     * Supports multi-tenant via API key: /api/line/webhook?key={webhook_key}
     */
    public function receive()
    {
        $db = \Config\Database::connect();

        // Log request start
        log_message('info', '[LINE Webhook] Request received');

        // Get webhook key from query parameter
        $webhookKey = $this->request->getGet('key');
        $user = null;

        if ($webhookKey) {
            // Multi-tenant mode: find user by webhook key
            // Check for active users (is_active = 1 or NULL for backward compatibility)
            $user = $db->table('users')
                ->where('webhook_key', $webhookKey)
                ->groupStart()
                ->where('is_active', 1)
                ->orWhere('is_active IS NULL')
                ->groupEnd()
                ->get()->getRowArray();

            if (!$user) {
                // Try without is_active check for debugging
                $anyUser = $db->table('users')->where('webhook_key', $webhookKey)->get()->getRowArray();
                if ($anyUser) {
                    log_message('error', '[LINE Webhook] User found but is_active = ' . ($anyUser['is_active'] ?? 'NULL') . ' for key: ' . $webhookKey);
                } else {
                    log_message('error', '[LINE Webhook] No user found with webhook key: ' . $webhookKey);
                }
                return $this->failUnauthorized('Invalid webhook key');
            }
            log_message('info', '[LINE Webhook] User identified: ' . $user['username'] . ' (ID: ' . $user['id'] . ')');
            $channelSecret = $user['line_channel_secret'] ?? '';
        } else {
            // Legacy mode: use global settings (for backward compatibility)
            log_message('info', '[LINE Webhook] No key parameter, using legacy mode');
            $channelSecretRow = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
            $channelSecret = $channelSecretRow['value'] ?? '';
            // Try to get admin user as fallback
            $user = $db->table('users')->where('role', 'admin')->get()->getRowArray();
        }

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

        // Get user_id for multi-tenant support
        $ownerId = $user['id'] ?? null;

        foreach ($events['events'] as $index => $event) {
            log_message('debug', "[LINE Webhook] Event #{$index}: " . json_encode($event));

            $userId = $event['source']['userId'] ?? null;
            $eventType = $event['type'] ?? '';

            if ($userId) {
                // Check if line_user already exists for this owner
                $existingQuery = $db->table('line_users')->where('line_uid', $userId);
                if ($ownerId) {
                    $existingQuery->where('user_id', $ownerId);
                }
                $existing = $existingQuery->get()->getRowArray();

                // Get user profile from LINE (use owner's access token if available)
                $profile = $this->getLineUserProfile($userId, $user);
                log_message('debug', "[LINE Webhook] Profile fetch result for {$userId}: " . json_encode($profile));

                if (!$existing) {
                    log_message('info', "[LINE Webhook] Creating new user: " . $userId);
                    try {
                        $result = $db->table('line_users')->insert([
                            'user_id' => $ownerId,
                            'line_uid' => $userId,
                            'display_name' => $profile['displayName'] ?? '',
                            'picture_url' => $profile['pictureUrl'] ?? '',
                            'status_message' => $profile['statusMessage'] ?? '',
                            'email' => $profile['email'] ?? null,
                            'event_type' => $eventType,
                            'created_at' => date('Y-m-d H:i:s')
                        ]);
                        if ($result) {
                            log_message('info', "[LINE Webhook] Insert successful, ID: " . $db->insertID());
                        } else {
                            log_message('error', "[LINE Webhook] Insert failed, DB error: " . json_encode($db->error()));
                        }
                    } catch (\Exception $e) {
                        log_message('error', "[LINE Webhook] Insert exception: " . $e->getMessage());
                    }
                } else {
                    log_message('info', "[LINE Webhook] Updating existing user: " . $userId);
                    $db->table('line_users')->where('id', $existing['id'])->update([
                        'display_name' => $profile['displayName'] ?? $existing['display_name'],
                        'picture_url' => $profile['pictureUrl'] ?? $existing['picture_url'],
                        'status_message' => $profile['statusMessage'] ?? $existing['status_message'],
                        'email' => $profile['email'] ?? $existing['email'],
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                }

                // Auto-create customer if not exists for this owner
                $customerQuery = $db->table('customers')->where('line_uid', $userId);
                if ($ownerId) {
                    $customerQuery->where('user_id', $ownerId);
                }
                $existingCustomer = $customerQuery->get()->getRowArray();

                if (!$existingCustomer) {
                    $displayName = $profile['displayName'] ?? '';
                    log_message('info', "[LINE Webhook] Auto-creating customer for: " . $userId . " with name: " . $displayName);
                    $db->table('customers')->insert([
                        'user_id' => $ownerId,
                        'line_uid' => $userId,
                        'custom_name' => $displayName,
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                    $existingCustomer = $db->table('customers')->where('line_uid', $userId)->where('user_id', $ownerId)->get()->getRowArray();
                }

                // Log text messages
                if ($eventType === 'message' && isset($event['message']['text'])) {
                    log_message('info', "[LINE Webhook] New message from " . ($existingCustomer ? "Customer #{$existingCustomer['id']}" : "Unknown User"));

                    $db->table('messages')->insert([
                        'user_id' => $ownerId,
                        'customer_id' => $existingCustomer['id'] ?? null,
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
     * Get all LINE users (for linking to customers) - filtered by current user
     */
    public function listUsers()
    {
        // Get current user for filtering
        $authHeader = $this->request->getHeaderLine('Authorization');
        $userId = null;
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
            $db = \Config\Database::connect();
            $userToken = $db->table('user_tokens')->where('token', $token)->get()->getRowArray();
            if ($userToken) {
                $userId = $userToken['user_id'];
            }
        }

        if (!$userId) {
            return $this->failUnauthorized();
        }

        $db = \Config\Database::connect();
        $users = $db->table('line_users')
            ->select('line_users.*, customers.custom_name as linked_customer_name')
            ->join('customers', 'customers.line_uid = line_users.line_uid AND customers.user_id = line_users.user_id', 'left')
            ->where('line_users.user_id', $userId)
            ->orderBy('line_users.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond($users);
    }

    /**
     * Get LINE user profile from LINE API
     */
    private function getLineUserProfile(string $lineUserId, ?array $owner = null): array
    {
        // Use owner's access token if available, otherwise fall back to global settings
        if ($owner && !empty($owner['line_channel_access_token'])) {
            $accessToken = $owner['line_channel_access_token'];
        } else {
            $db = \Config\Database::connect();
            $tokenRow = $db->table('settings')->where('key', 'line_channel_access_token')->get()->getRowArray();
            $accessToken = $tokenRow['value'] ?? '';
        }

        if (!$accessToken) {
            log_message('warning', '[LINE Webhook] Cannot fetch profile: Access Token missing');
            return [];
        }

        $url = "https://api.line.me/v2/bot/profile/{$lineUserId}";

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            log_message('error', "[LINE Webhook] Failed to fetch profile for {$lineUserId}. HTTP: {$httpCode}, Response: {$response}");
            return [];
        }

        return json_decode($response, true) ?? [];
    }
}

<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class LineWebhook extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    /**
     * LINE Webhook endpoint
     * Receives events from LINE and stores user information
     * Supports multi-tenant via API key: /api/line/webhook?key={webhook_key}
     */
    public function receive()
    {
        $startTime = microtime(true);
        $db = \Config\Database::connect();
        
        $logData = [
            'request_method' => $this->request->getMethod(),
            'ip_address' => $this->request->getIPAddress(),
            'user_agent' => $this->request->getUserAgent(),
            'created_at' => date('Y-m-d H:i:s'),
        ];

        // Log request start
        log_message('info', '[LINE Webhook] Request received from ' . $logData['ip_address']);

        // Get webhook key from query parameter
        $webhookKey = $this->request->getGet('key');
        $logData['webhook_key'] = $webhookKey;
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
                    $logData['error_message'] = 'User account is inactive (is_active=' . ($anyUser['is_active'] ?? 'NULL') . ')';
                } else {
                    log_message('error', '[LINE Webhook] No user found with webhook key: ' . $webhookKey);
                    $logData['error_message'] = 'Invalid webhook key - no user found';
                }
                
                // Record the failed request
                $logData['response_status'] = 401;
                $logData['response_body'] = json_encode(['message' => $logData['error_message']]);
                $logData['processing_time_ms'] = (int)((microtime(true) - $startTime) * 1000);
                $db->table('webhook_logs')->insert($logData);
                
                return $this->failUnauthorized('Invalid webhook key');
            }
            log_message('info', '[LINE Webhook] User identified: ' . $user['username'] . ' (ID: ' . $user['id'] . ')');
            $logData['user_id'] = $user['id'];
            $channelSecret = $user['line_channel_secret'] ?? '';
        } else {
            // Legacy mode: use global settings (for backward compatibility)
            log_message('info', '[LINE Webhook] No key parameter, using legacy mode');
            $channelSecretRow = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
            $channelSecret = $channelSecretRow['value'] ?? '';
            // Try to get admin user as fallback
            $user = $db->table('users')->where('role', 'admin')->get()->getRowArray();
            if ($user) {
                $logData['user_id'] = $user['id'];
            }
        }

        // Get request body - use CodeIgniter's request body (can be read multiple times)
        $body = $this->request->getBody();
        $logData['request_body'] = $body;
        
        // Capture request headers
        $headers = [];
        foreach ($this->request->getHeaders() as $key => $value) {
            $headers[$key] = $value->getValue();
        }
        $logData['request_headers'] = json_encode($headers);

        // Detailed Logging of Headers and Body
        log_message('debug', '[LINE Webhook] Headers: ' . json_encode($headers));
        log_message('debug', '[LINE Webhook] Body: ' . $body);

        // Verify signature
        $signature = $this->request->getHeaderLine('X-Line-Signature');
        $logData['signature'] = $signature;
        $signatureValid = null;
        
        if ($channelSecret && $signature) {
            $hash = base64_encode(hash_hmac('sha256', $body, $channelSecret, true));
            if ($hash !== $signature) {
                log_message('error', '[LINE Webhook] Signature verification failed. Expected: ' . $hash . ', Received: ' . $signature);
                $signatureValid = 0;
                $logData['signature_valid'] = 0;
                $logData['error_message'] = 'Signature verification failed';
                $logData['response_status'] = 401;
                $logData['response_body'] = json_encode(['message' => 'Invalid signature']);
                $logData['processing_time_ms'] = (int)((microtime(true) - $startTime) * 1000);
                $db->table('webhook_logs')->insert($logData);
                
                return $this->failUnauthorized('Invalid signature');
            }
            log_message('info', '[LINE Webhook] Signature verified');
            $signatureValid = 1;
            $logData['signature_valid'] = 1;
        } else {
            log_message('warning', '[LINE Webhook] Skipping signature verification (Missing secret or signature header)');
            $logData['signature_valid'] = null; // Skipped
        }

        $events = json_decode($body, true);
        
        // Handle LINE test requests (usually empty events array or no events key)
        $isTestRequest = false;
        if (!$events || !isset($events['events']) || empty($events['events'])) {
            log_message('info', '[LINE Webhook] Test request or no events found - responding with 200 OK');
            $isTestRequest = true;
            $logData['is_test_request'] = 1;
            $logData['events_count'] = 0;
            $logData['response_status'] = 200;
            $logData['response_body'] = json_encode(['status' => 'ok', 'message' => 'Webhook is working']);
            $logData['processing_time_ms'] = (int)((microtime(true) - $startTime) * 1000);
            $db->table('webhook_logs')->insert($logData);
            
            return $this->respond(['status' => 'ok', 'message' => 'Webhook is working']);
        }

        log_message('info', '[LINE Webhook] Processing ' . count($events['events']) . ' events');
        $logData['events_count'] = count($events['events']);
        $eventTypes = [];

        // Get user_id for multi-tenant support
        $ownerId = $user['id'] ?? null;

        foreach ($events['events'] as $index => $event) {
            log_message('debug', "[LINE Webhook] Event #{$index}: " . json_encode($event));

            $userId = $event['source']['userId'] ?? null;
            $eventType = $event['type'] ?? '';
            $eventTypes[] = $eventType;

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
        
        // Record successful webhook processing
        $logData['event_types'] = implode(',', array_unique($eventTypes));
        $logData['response_status'] = 200;
        $logData['response_body'] = json_encode(['status' => 'ok']);
        $logData['processing_time_ms'] = (int)((microtime(true) - $startTime) * 1000);
        $db->table('webhook_logs')->insert($logData);

        return $this->respond(['status' => 'ok']);
    }

    /**
     * Get recent logs for LINE webhook (legacy - kept for compatibility)
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
     * Get webhook logs from database (Admin only)
     * Supports filtering by user_id, date range, status
     */
    public function getWebhookLogs()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        
        // Parse query parameters
        $userId = $this->request->getGet('user_id');
        $startDate = $this->request->getGet('start_date');
        $endDate = $this->request->getGet('end_date');
        $status = $this->request->getGet('status'); // 'success', 'error', 'test'
        $page = (int)($this->request->getGet('page') ?? 1);
        $limit = (int)($this->request->getGet('limit') ?? 50);
        $offset = ($page - 1) * $limit;

        // Build query
        $builder = $db->table('webhook_logs')
            ->select('webhook_logs.*, users.username, users.name as user_name')
            ->join('users', 'users.id = webhook_logs.user_id', 'left')
            ->orderBy('webhook_logs.created_at', 'DESC');

        // Apply filters
        if ($userId) {
            $builder->where('webhook_logs.user_id', $userId);
        }
        
        if ($startDate) {
            $builder->where('webhook_logs.created_at >=', $startDate . ' 00:00:00');
        }
        
        if ($endDate) {
            $builder->where('webhook_logs.created_at <=', $endDate . ' 23:59:59');
        }
        
        if ($status === 'success') {
            $builder->where('webhook_logs.response_status', 200);
        } elseif ($status === 'error') {
            $builder->whereIn('webhook_logs.response_status', [401, 403, 500]);
        } elseif ($status === 'test') {
            $builder->where('webhook_logs.is_test_request', 1);
        }

        // Get total count
        $totalQuery = clone $builder;
        $total = $totalQuery->countAllResults(false);

        // Get paginated results
        $logs = $builder->limit($limit, $offset)->get()->getResultArray();

        // Parse JSON fields for display
        foreach ($logs as &$log) {
            if ($log['request_headers']) {
                $log['request_headers'] = json_decode($log['request_headers'], true);
            }
            if ($log['response_body']) {
                $log['response_body'] = json_decode($log['response_body'], true);
            }
        }

        return $this->respond([
            'data' => $logs,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => ceil($total / $limit)
            ]
        ]);
    }

    /**
     * Get webhook log statistics (Admin only)
     */
    public function getWebhookStats()
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        $db = \Config\Database::connect();
        
        // Get stats for last 7 days
        $stats = [
            'total_requests' => $db->table('webhook_logs')->countAllResults(),
            'successful_requests' => $db->table('webhook_logs')->where('response_status', 200)->countAllResults(),
            'failed_requests' => $db->table('webhook_logs')->whereIn('response_status', [401, 403, 500])->countAllResults(),
            'test_requests' => $db->table('webhook_logs')->where('is_test_request', 1)->countAllResults(),
            'last_7_days' => [],
        ];

        // Daily stats for last 7 days
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $dayStats = [
                'date' => $date,
                'total' => $db->table('webhook_logs')
                    ->where('DATE(created_at)', $date)
                    ->countAllResults(),
                'success' => $db->table('webhook_logs')
                    ->where('DATE(created_at)', $date)
                    ->where('response_status', 200)
                    ->countAllResults(),
                'failed' => $db->table('webhook_logs')
                    ->where('DATE(created_at)', $date)
                    ->whereIn('response_status', [401, 403, 500])
                    ->countAllResults(),
            ];
            $stats['last_7_days'][] = $dayStats;
        }

        // Average processing time
        $avgTime = $db->query("SELECT AVG(processing_time_ms) as avg_time FROM webhook_logs WHERE processing_time_ms IS NOT NULL")->getRowArray();
        $stats['avg_processing_time_ms'] = (int)($avgTime['avg_time'] ?? 0);

        return $this->respond($stats);
    }

    /**
     * Get all LINE users (for linking to customers) - filtered by current user
     */
    public function listUsers()
    {
        // Use AuthTrait to get current user (supports both cookie and header)
        $currentUser = $this->getCurrentUser();

        if (!$currentUser) {
            return $this->failUnauthorized();
        }

        $userId = $currentUser['id'];

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

    /**
     * Test webhook connectivity for a specific user
     * This simulates a LINE webhook request to test the configuration
     */
    public function testWebhook($id = null)
    {
        $currentUser = $this->getCurrentUser();
        if (!$currentUser || $currentUser['role'] !== 'admin') {
            return $this->failForbidden('只有管理員可以存取');
        }

        if (!$id) {
            return $this->failNotFound('請指定使用者 ID');
        }

        $db = \Config\Database::connect();

        // Get user
        $user = $db->table('users')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if (!$user) {
            return $this->failNotFound('使用者不存在');
        }

        $result = [
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'name' => $user['name'],
                'is_active' => (bool)$user['is_active']
            ],
            'tests' => [],
            'overall_status' => 'success'
        ];

        // Test 1: Check if user is active
        if (!$user['is_active']) {
            $result['tests']['user_active'] = [
                'name' => '帳號狀態檢查',
                'status' => 'error',
                'message' => '帳號已停用，Webhook 將會被拒絕'
            ];
            $result['overall_status'] = 'error';
        } else {
            $result['tests']['user_active'] = [
                'name' => '帳號狀態檢查',
                'status' => 'success',
                'message' => '帳號已啟用'
            ];
        }

        // Test 2: Check webhook key
        if (empty($user['webhook_key'])) {
            $result['tests']['webhook_key'] = [
                'name' => 'Webhook Key 檢查',
                'status' => 'error',
                'message' => 'Webhook Key 未設定'
            ];
            $result['overall_status'] = 'error';
            return $this->respond($result); // Can't proceed without webhook key
        } else {
            $result['tests']['webhook_key'] = [
                'name' => 'Webhook Key 檢查',
                'status' => 'success',
                'message' => 'Webhook Key 已設定 (' . strlen($user['webhook_key']) . ' 字元)',
                'webhook_key' => substr($user['webhook_key'], 0, 8) . '...' // Show first 8 chars only
            ];
        }

        // Test 3: Check channel secret
        $hasChannelSecret = !empty($user['line_channel_secret']);
        if (!$hasChannelSecret) {
            $result['tests']['channel_secret'] = [
                'name' => 'Channel Secret 檢查',
                'status' => 'warning',
                'message' => 'Channel Secret 未設定，簽章驗證將被跳過'
            ];
            if ($result['overall_status'] === 'success') {
                $result['overall_status'] = 'warning';
            }
        } else {
            $result['tests']['channel_secret'] = [
                'name' => 'Channel Secret 檢查',
                'status' => 'success',
                'message' => 'Channel Secret 已設定 (' . strlen($user['line_channel_secret']) . ' 字元)'
            ];
        }

        // Test 4: Simulate webhook request
        $webhookUrl = base_url("/api/line/webhook?key=" . $user['webhook_key']);
        $testPayload = json_encode([
            'destination' => 'Uxxxxxxxxxxxxx',
            'events' => []
        ]);

        // Calculate signature
        $signature = '';
        if ($hasChannelSecret) {
            $signature = base64_encode(hash_hmac('sha256', $testPayload, $user['line_channel_secret'], true));
        }

        // Make the webhook request
        $ch = curl_init($webhookUrl);
        $headers = [
            'Content-Type: application/json',
            'User-Agent: LineBotWebhook/2.0'
        ];
        if ($signature) {
            $headers[] = 'X-Line-Signature: ' . $signature;
        }

        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $testPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local testing
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

        $startTime = microtime(true);
        $response = curl_exec($ch);
        $processingTime = (int)((microtime(true) - $startTime) * 1000);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            $result['tests']['webhook_request'] = [
                'name' => 'Webhook 請求測試',
                'status' => 'error',
                'message' => 'Webhook 請求失敗: ' . $curlError,
                'details' => [
                    'url' => $webhookUrl,
                    'error' => $curlError
                ]
            ];
            $result['overall_status'] = 'error';
        } elseif ($httpCode === 200) {
            $responseData = json_decode($response, true);
            $result['tests']['webhook_request'] = [
                'name' => 'Webhook 請求測試',
                'status' => 'success',
                'message' => 'Webhook 回應成功 (HTTP 200)',
                'details' => [
                    'url' => $webhookUrl,
                    'http_code' => $httpCode,
                    'processing_time_ms' => $processingTime,
                    'response' => $responseData
                ]
            ];
        } elseif ($httpCode === 401) {
            $result['tests']['webhook_request'] = [
                'name' => 'Webhook 請求測試',
                'status' => 'error',
                'message' => 'Webhook 驗證失敗 (HTTP 401) - 可能是 Key 或簽章錯誤',
                'details' => [
                    'url' => $webhookUrl,
                    'http_code' => $httpCode,
                    'response' => $response
                ]
            ];
            $result['overall_status'] = 'error';
        } else {
            $result['tests']['webhook_request'] = [
                'name' => 'Webhook 請求測試',
                'status' => 'error',
                'message' => "Webhook 回應異常 (HTTP {$httpCode})",
                'details' => [
                    'url' => $webhookUrl,
                    'http_code' => $httpCode,
                    'response' => $response
                ]
            ];
            $result['overall_status'] = 'error';
        }

        // Test 5: Check if test request was logged
        $latestLog = $db->table('webhook_logs')
            ->where('user_id', $user['id'])
            ->where('is_test_request', 1)
            ->orderBy('created_at', 'DESC')
            ->limit(1)
            ->get()
            ->getRowArray();

        if ($latestLog) {
            $timeDiff = time() - strtotime($latestLog['created_at']);
            if ($timeDiff < 10) { // Within last 10 seconds
                $result['tests']['webhook_logging'] = [
                    'name' => 'Webhook 記錄檢查',
                    'status' => 'success',
                    'message' => '測試請求已成功記錄到資料庫',
                    'details' => [
                        'log_id' => $latestLog['id'],
                        'response_status' => $latestLog['response_status'],
                        'processing_time_ms' => $latestLog['processing_time_ms'],
                        'signature_valid' => $latestLog['signature_valid']
                    ]
                ];
            } else {
                $result['tests']['webhook_logging'] = [
                    'name' => 'Webhook 記錄檢查',
                    'status' => 'warning',
                    'message' => '找到舊的測試記錄，但可能不是剛才的測試',
                    'details' => [
                        'last_log_time' => $latestLog['created_at']
                    ]
                ];
            }
        } else {
            $result['tests']['webhook_logging'] = [
                'name' => 'Webhook 記錄檢查',
                'status' => 'info',
                'message' => '尚未找到測試請求記錄'
            ];
        }

        return $this->respond($result);
    }
}

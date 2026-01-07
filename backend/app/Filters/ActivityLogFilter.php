<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ActivityLogFilter implements FilterInterface
{
    /**
     * Static property to store log data between before() and after() calls.
     * This avoids PHP 8.2+ deprecation warning for dynamic properties.
     */
    private static ?array $logData = null;

    public function before(RequestInterface $request, $arguments = null)
    {
        // Store request data for logging after response (using static property)
        self::$logData = [
            'method' => $request->getMethod(),
            'endpoint' => $request->getUri()->getPath(),
            'request_body' => $this->sanitizeRequestBody($request),
            'ip_address' => $request->getIPAddress(),
            'user_agent' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
            'start_time' => microtime(true)
        ];

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Skip if no log data
        if (self::$logData === null) {
            return;
        }

        $logData = self::$logData;
        self::$logData = null; // Reset for next request

        // Skip logging for certain endpoints
        $endpoint = $logData['endpoint'];
        $skipPatterns = [
            '/api/activity-logs',  // Don't log the logs endpoint itself
            '/api/stats',          // Skip frequent stats calls
        ];
        foreach ($skipPatterns as $pattern) {
            if (strpos($endpoint, $pattern) === 0) {
                return;
            }
        }

        // Get user from token or webhook key
        $userId = null;
        $username = null;

        // First try: check for Bearer token (regular API calls)
        $token = null;

        // 1. Try cookie
        if (isset($_COOKIE['access_token'])) {
            $token = $_COOKIE['access_token'];
        }

        // 2. Try header if no cookie
        if (!$token) {
            $authHeader = $request->getHeaderLine('Authorization');
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }

        if ($token) {
            $db = \Config\Database::connect();
            $userToken = $db->table('user_tokens')->where('token', $token)->get()->getRowArray();
            if ($userToken) {
                $user = $db->table('users')->where('id', $userToken['user_id'])->get()->getRowArray();
                if ($user) {
                    $userId = $user['id'];
                    $username = $user['username'];
                }
            }
        }

        // Second try: check for webhook key (LINE webhook calls)
        if (!$userId && strpos($endpoint, '/api/line/webhook') !== false) {
            // Get key from query string
            $webhookKey = $_GET['key'] ?? null;
            if ($webhookKey) {
                $db = \Config\Database::connect();
                $user = $db->table('users')->where('webhook_key', $webhookKey)->get()->getRowArray();
                if ($user) {
                    $userId = $user['id'];
                    $username = $user['username'] . ' (webhook)';
                }
            }
        }

        // Log to database
        $db = \Config\Database::connect();
        $db->table('activity_logs')->insert([
            'user_id' => $userId,
            'username' => $username,
            'method' => $logData['method'],
            'endpoint' => $logData['endpoint'],
            'request_body' => $logData['request_body'],
            'response_code' => $response->getStatusCode(),
            'ip_address' => $logData['ip_address'],
            'user_agent' => $logData['user_agent'],
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Sanitize request body (hide sensitive data)
     */
    private function sanitizeRequestBody(RequestInterface $request): ?string
    {
        $body = $request->getBody();
        if (empty($body)) {
            return null;
        }

        // Try to parse as JSON
        $data = json_decode($body, true);
        if (is_array($data)) {
            // Hide sensitive fields
            $sensitiveFields = ['password', 'current_password', 'line_channel_secret', 'line_channel_access_token'];
            foreach ($sensitiveFields as $field) {
                if (isset($data[$field])) {
                    $data[$field] = '***HIDDEN***';
                }
            }
            return json_encode($data, JSON_UNESCAPED_UNICODE);
        }

        // Return truncated body if not JSON
        return substr($body, 0, 1000);
    }
}

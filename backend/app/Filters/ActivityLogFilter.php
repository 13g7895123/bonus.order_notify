<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class ActivityLogFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        // Store request data for logging after response
        $request->activityLogData = [
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
        if (!isset($request->activityLogData)) {
            return;
        }

        // Skip logging for certain endpoints
        $endpoint = $request->activityLogData['endpoint'];
        $skipPatterns = [
            '/api/activity-logs',  // Don't log the logs endpoint itself
            '/api/stats',          // Skip frequent stats calls
        ];
        foreach ($skipPatterns as $pattern) {
            if (strpos($endpoint, $pattern) === 0) {
                return;
            }
        }

        // Get user from token
        $userId = null;
        $username = null;
        $authHeader = $request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            $token = $matches[1];
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

        // Log to database
        $db = \Config\Database::connect();
        $db->table('activity_logs')->insert([
            'user_id' => $userId,
            'username' => $username,
            'method' => $request->activityLogData['method'],
            'endpoint' => $request->activityLogData['endpoint'],
            'request_body' => $request->activityLogData['request_body'],
            'response_code' => $response->getStatusCode(),
            'ip_address' => $request->activityLogData['ip_address'],
            'user_agent' => $request->activityLogData['user_agent'],
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

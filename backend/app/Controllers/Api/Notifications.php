<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

class Notifications extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    public function send()
    {
        $user = $this->getCurrentUser();
        if (!$user) {
            return $this->failUnauthorized();
        }

        $userId = (int)$user['id'];

        $json = $this->request->getJSON();
        if (!$json || !isset($json->template_id)) {
            return $this->failValidationErrors('template_id is required');
        }

        // Backward compatibility for simple array of IDs
        if (isset($json->customer_ids) && is_array($json->customer_ids)) {
            $recipients = [];
            foreach ($json->customer_ids as $cid) {
                $recipients[] = ['id' => $cid];
            }
        } elseif (isset($json->recipients) && is_array($json->recipients)) {
            $recipients = $json->recipients;
        } else {
            return $this->failValidationErrors('recipients or customer_ids are required');
        }

        $db = \Config\Database::connect();

        // Use user's LINE settings instead of global settings
        $accessToken = $user['line_channel_access_token'] ?? '';

        if (empty($accessToken)) {
            return $this->fail('LINE API 尚未設定，請先至個人設定頁面填寫 Channel Access Token', 400);
        }

        // Verify template belongs to this user
        $template = $db->table('templates')->where('id', $json->template_id)->where('user_id', $userId)->get()->getRowArray();

        if (!$template) return $this->failNotFound('Template not found');

        $sentCount = 0;
        $errors = [];

        // Global variables from request
        $globalVariables = $json->variables ?? [];

        foreach ($recipients as $recipient) {
            $cid = $recipient->id ?? $recipient['id'] ?? null;
            if (!$cid) continue;

            // Per-recipient variables
            $recipientVariables = $recipient->variables ?? $recipient['variables'] ?? [];

            // Merge variables: Recipient overrides Global
            $finalVariables = array_merge((array)$globalVariables, (array)$recipientVariables);

            // Verify customer belongs to this user
            $customer = $db->table('customers')->where('id', $cid)->where('user_id', $userId)->get()->getRowArray();
            if ($customer) {
                // Replace variables - use custom_name or get display_name from line_users
                $lineUser = $db->table('line_users')->where('line_uid', $customer['line_uid'])->where('user_id', $userId)->get()->getRowArray();
                $displayName = $customer['custom_name'] ?: ($lineUser['display_name'] ?? 'Customer');

                $content = $template['content'];

                // 1. Replace System Variable {{name}}
                $content = str_replace('{{name}}', $displayName, $content);

                // 2. Replace User Variables
                foreach ($finalVariables as $key => $value) {
                    $content = str_replace('{{' . $key . '}}', $value, $content);
                }

                // Call LINE Message API
                $lineResult = $this->sendLineMessage($accessToken, $customer['line_uid'], $content);

                // Log Message with user_id
                $db->table('messages')->insert([
                    'user_id' => $userId,
                    'customer_id' => $customer['id'],
                    'sender' => 'system',
                    'content' => $content,
                    'created_at' => date('Y-m-d H:i:s')
                ]);

                if ($lineResult['success']) {
                    $sentCount++;
                } else {
                    $errors[] = "Failed to send to {$customer['custom_name']}: {$lineResult['error']}";
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


    public function importPreview()
    {
        $userId = $this->getCurrentUserId();

        log_message('info', '[Import XLS] ========== Import Preview Started ==========');
        log_message('info', '[Import XLS] User ID: ' . ($userId ?? 'NULL'));

        if (!$userId) {
            log_message('error', '[Import XLS] FAILED: Unauthorized - No valid user ID');
            return $this->failUnauthorized();
        }

        // Log request info
        log_message('debug', '[Import XLS] Request Method: ' . $this->request->getMethod());
        log_message('debug', '[Import XLS] Content-Type: ' . $this->request->getHeaderLine('Content-Type'));

        $file = $this->request->getFile('file');

        // Detailed file validation logging
        if (!$file) {
            log_message('error', '[Import XLS] FAILED: No file in request. Available files: ' . json_encode(array_keys($this->request->getFiles() ?? [])));
            return $this->failValidationErrors('請上傳有效的檔案');
        }

        log_message('info', '[Import XLS] File received: ' . json_encode([
            'name' => $file->getName(),
            'originalName' => $file->getClientName(),
            'size' => $file->getSize(),
            'mimeType' => $file->getMimeType(),
            'extension' => $file->getExtension(),
            'tempPath' => $file->getTempName(),
            'isValid' => $file->isValid(),
            'error' => $file->getError(),
            'errorString' => $file->getErrorString()
        ], JSON_UNESCAPED_UNICODE));

        if (!$file->isValid()) {
            log_message('error', '[Import XLS] FAILED: File validation failed - Error: ' . $file->getErrorString() . ' (Code: ' . $file->getError() . ')');
            return $this->failValidationErrors('檔案上傳失敗：' . $file->getErrorString());
        }

        // Check file extension
        $allowedExtensions = ['xls', 'xlsx'];
        $extension = strtolower($file->getExtension());
        if (!in_array($extension, $allowedExtensions)) {
            log_message('error', '[Import XLS] FAILED: Invalid file extension: ' . $extension);
            return $this->failValidationErrors('請上傳 XLS 或 XLSX 格式的檔案');
        }

        try {
            log_message('debug', '[Import XLS] Loading spreadsheet from: ' . $file->getTempName());

            // Explicitly set reader if possible to avoid detection issues with temp files
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getTempName());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            log_message('info', '[Import XLS] Spreadsheet loaded successfully. Total rows: ' . count($rows));

            if (empty($rows)) {
                log_message('error', '[Import XLS] FAILED: Spreadsheet is empty');
                return $this->failValidationErrors('檔案為空');
            }

            // Row 0 is Headers
            $headers = $rows[0];
            log_message('info', '[Import XLS] Headers detected: ' . json_encode($headers, JSON_UNESCAPED_UNICODE));

            $db = \Config\Database::connect();
            $matched = [];
            $notFound = [];
            $emptyRows = 0;

            // Loop from row 1
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                $name = trim($row[0] ?? ''); // Column A is name

                if (empty($name)) {
                    $emptyRows++;
                    continue;
                }

                // Only match customers belonging to this user
                $customer = $db->table('customers')
                    ->where('custom_name', $name)
                    ->where('user_id', $userId)
                    ->get()->getRowArray();

                if ($customer) {
                    // Create an associated array for this row using headers
                    $rowData = [];
                    foreach ($headers as $index => $header) {
                        // Skip empty headers
                        if (!empty($header)) {
                            $rowData[$header] = $row[$index] ?? '';
                        }
                    }

                    $matched[] = [
                        'id' => $customer['id'],
                        'custom_name' => $customer['custom_name'],
                        'line_uid' => $customer['line_uid'],
                        'row_data' => $rowData // Include raw data for variable mapping
                    ];
                } else {
                    $notFound[] = $name;
                }
            }

            log_message('info', '[Import XLS] Processing complete: ' . json_encode([
                'total_rows' => count($rows) - 1,
                'empty_rows' => $emptyRows,
                'matched_count' => count($matched),
                'not_found_count' => count(array_unique($notFound)),
                'not_found_names' => array_values(array_unique($notFound))
            ], JSON_UNESCAPED_UNICODE));

            log_message('info', '[Import XLS] ========== Import Preview Completed Successfully ==========');

            return $this->respond([
                'headers' => array_filter($headers), // Return headers for frontend selection
                'matched' => $matched,
                'not_found' => array_values(array_unique($notFound))
            ]);
        } catch (\PhpOffice\PhpSpreadsheet\Reader\Exception $e) {
            log_message('error', '[Import XLS] Spreadsheet Reader Error: ' . $e->getMessage());
            log_message('error', '[Import XLS] Stack trace: ' . $e->getTraceAsString());
            return $this->fail('無法讀取檔案格式：' . $e->getMessage(), 400);
        } catch (\Throwable $e) {
            log_message('error', '[Import XLS] Unexpected Error: ' . $e->getMessage());
            log_message('error', '[Import XLS] Exception class: ' . get_class($e));
            log_message('error', '[Import XLS] Stack trace: ' . $e->getTraceAsString());
            return $this->fail('讀取檔案出錯：' . $e->getMessage(), 400);
        }
    }

    /**
     * Send message via LINE Messaging API
     */
    private function sendLineMessage(string $accessToken, string $lineUserId, string $message): array
    {
        $url = 'https://api.line.me/v2/bot/message/push';

        $data = [
            'to' => $lineUserId,
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

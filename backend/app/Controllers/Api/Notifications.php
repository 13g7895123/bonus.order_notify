<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class Notifications extends ResourceController
{
    protected $format = 'json';

    public function send()
    {
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

        // Validate LINE API settings exist
        $channelSecret = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
        $channelAccessToken = $db->table('settings')->where('key', 'line_channel_access_token')->get()->getRowArray();

        if (!$channelSecret || !$channelAccessToken || empty($channelSecret['value']) || empty($channelAccessToken['value'])) {
            return $this->fail('LINE API 尚未設定，請先至系統設定頁面填寫 Channel Secret 與 Access Token', 400);
        }

        $template = $db->table('templates')->where('id', $json->template_id)->get()->getRowArray();

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

            $customer = $db->table('customers')->where('id', $cid)->get()->getRowArray();
            if ($customer) {
                // Replace variables - use custom_name or get display_name from line_users
                $lineUser = $db->table('line_users')->where('line_uid', $customer['line_uid'])->get()->getRowArray();
                $displayName = $customer['custom_name'] ?: ($lineUser['display_name'] ?? 'Customer');

                $content = $template['content'];

                // 1. Replace System Variable {{name}}
                $content = str_replace('{{name}}', $displayName, $content);

                // 2. Replace User Variables
                foreach ($finalVariables as $key => $value) {
                    $content = str_replace('{{' . $key . '}}', $value, $content);
                }

                // Call LINE Message API
                $lineResult = $this->sendLineMessage($channelAccessToken['value'], $customer['line_uid'], $content);

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
        log_message('debug', 'Notifications::importPreview started');
        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->failValidationErrors('請上傳有效的檔案');
        }

        try {
            // Explicitly set reader if possible to avoid detection issues with temp files
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file->getTempName());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            if (empty($rows)) {
                return $this->failValidationErrors('檔案為空');
            }

            // Row 0 is Headers
            $headers = $rows[0];

            // A2 is (1, 0) index. Member Name is column A.
            // But now we essentially want to map rows to customers and return the data.

            $db = \Config\Database::connect();
            $matched = [];
            $notFound = [];

            // Loop from row 1
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                $name = trim($row[0] ?? ''); // Column A is name

                if (empty($name)) continue;

                $customer = $db->table('customers')
                    ->where('custom_name', $name)
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

            return $this->respond([
                'headers' => array_filter($headers), // Return headers for frontend selection
                'matched' => $matched,
                'not_found' => array_values(array_unique($notFound))
            ]);
        } catch (\Throwable $e) {
            log_message('error', 'Import XLS failed: ' . $e->getMessage());
            return $this->fail('讀取檔案出錯：' . $e->getMessage());
        }
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

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

        // Check if user is suspended
        if (!empty($user['is_suspended'])) {
            $notice = !empty($user['suspend_notice'])
                ? $user['suspend_notice']
                : '您的帳號目前已被暫停使用，請聯絡管理員。';
            return $this->response->setStatusCode(403)->setJSON([
                'status'    => 403,
                'error'     => 403,
                'suspended' => true,
                'notice'    => $notice,
                'messages'  => ['error' => $notice]
            ]);
        }

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

        $sentCount     = 0;
        $skippedCount  = 0;
        $errors        = [];
        $logRecipients = [];
        $duplicateLogs = [];

        // Global variables from request
        $globalVariables = $json->variables ?? [];

        // Today's boundaries for deduplication
        $todayStart = date('Y-m-d 00:00:00');
        $todayEnd   = date('Y-m-d 23:59:59');

        foreach ($recipients as $recipient) {
            $cid = $recipient->id ?? $recipient['id'] ?? null;
            if (!$cid) continue;

            // Per-recipient variables
            $recipientVariables = $recipient->variables ?? $recipient['variables'] ?? [];
            $isFromXls          = (bool)($recipient->is_from_xls ?? $recipient['is_from_xls'] ?? false);

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

                // ── Deduplication check ─────────────────────────────────────
                // If the same customer already received the same content today, skip
                $existingMsg = $db->table('messages')
                    ->select('id, created_at')
                    ->where('user_id', $userId)
                    ->where('customer_id', $customer['id'])
                    ->where('content', $content)
                    ->where('sender', 'system')
                    ->where('created_at >=', $todayStart)
                    ->where('created_at <=', $todayEnd)
                    ->limit(1)
                    ->get()->getRowArray();

                if ($existingMsg) {
                    $skippedCount++;
                    $duplicateLogs[] = [
                        'user_id'          => $userId,
                        'send_log_id'      => null, // will back-fill after send_log insert
                        'customer_id'      => $customer['id'],
                        'customer_name'    => $displayName,
                        'line_uid'         => $customer['line_uid'],
                        'template_name'    => $template['name'],
                        'message_content'  => $content,
                        'original_sent_at' => $existingMsg['created_at'],
                        'created_at'       => date('Y-m-d H:i:s'),
                    ];
                    continue; // skip sending
                }
                // ───────────────────────────────────────────────────────────

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

                $success = $lineResult['success'];
                if ($success) {
                    $sentCount++;
                } else {
                    $errors[] = "Failed to send to {$customer['custom_name']}: {$lineResult['error']}";
                }

                // Collect data for send_log_recipients
                $logRecipients[] = [
                    'customer_id'          => $customer['id'],
                    'customer_name'        => $displayName,
                    'line_uid'             => $customer['line_uid'],
                    'final_variables_json' => json_encode((array)$recipientVariables, JSON_UNESCAPED_UNICODE),
                    'is_xls_matched'       => $isFromXls ? 1 : 0,
                    'message_content'      => $content,
                    'sent_success'         => $success ? 1 : 0,
                    'created_at'           => date('Y-m-d H:i:s'),
                ];
            }
        }

        // Create send_log record
        $xlsImport = $json->xls_import ?? null;
        $db->table('send_logs')->insert([
            'user_id'               => $userId,
            'template_id'           => $template['id'],
            'template_name'         => $template['name'],
            'template_content'      => $template['content'],
            'variable_defaults_json' => json_encode((array)$globalVariables, JSON_UNESCAPED_UNICODE),
            'recipients_selected'   => count($recipients),
            'recipients_sent'       => $sentCount,
            'recipients_skipped'    => $skippedCount,
            'has_xls_import'        => ($xlsImport && !empty($xlsImport->has_import)) ? 1 : 0,
            'xls_matched_count'     => (int)($xlsImport->matched_count ?? 0),
            'xls_not_matched_count' => (int)($xlsImport->not_matched_customer_count ?? 0),
            'xls_not_found_count'   => (int)($xlsImport->not_found_count ?? 0),
            'xls_not_found_names'   => json_encode($xlsImport->not_found_names ?? [], JSON_UNESCAPED_UNICODE),
            'created_at'            => date('Y-m-d H:i:s'),
        ]);
        $sendLogId = $db->insertID();

        // Batch insert send_log_recipients
        if (!empty($logRecipients)) {
            foreach ($logRecipients as &$r) {
                $r['send_log_id'] = $sendLogId;
            }
            $db->table('send_log_recipients')->insertBatch($logRecipients);
        }

        // Batch insert duplicate logs (back-fill send_log_id)
        if (!empty($duplicateLogs)) {
            foreach ($duplicateLogs as &$dl) {
                $dl['send_log_id'] = $sendLogId;
            }
            $db->table('send_duplicate_logs')->insertBatch($duplicateLogs);
        }

        $message = "成功發送給 $sentCount 位客戶";
        if ($skippedCount > 0) {
            $message .= "，略過 $skippedCount 筆（今日已發送相同內容）";
        }

        return $this->respond([
            'success'        => $sentCount > 0 || $skippedCount > 0,
            'sent_count'     => $sentCount,
            'skipped_count'  => $skippedCount,
            'message'        => $message,
            'errors'         => $errors
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
     * Download not found customers as Excel file
     */
    public function downloadNotFoundCustomers()
    {
        $userId = $this->getCurrentUserId();

        log_message('info', '[Download Not Found] ========== Download Started ==========');
        log_message('info', '[Download Not Found] User ID: ' . ($userId ?? 'NULL'));

        if (!$userId) {
            log_message('error', '[Download Not Found] FAILED: Unauthorized - No valid user ID');
            return $this->failUnauthorized();
        }

        $json = $this->request->getJSON();

        // Log the received data for debugging
        log_message('debug', '[Download Not Found] Received JSON: ' . json_encode($json, JSON_UNESCAPED_UNICODE));

        if (!$json) {
            log_message('error', '[Download Not Found] FAILED: No JSON data received');
            return $this->failValidationErrors('未收到資料');
        }

        if (!isset($json->headers) || !isset($json->not_found)) {
            log_message('error', '[Download Not Found] FAILED: Missing required data. Headers: ' . (isset($json->headers) ? 'OK' : 'MISSING') . ', NotFound: ' . (isset($json->not_found) ? 'OK' : 'MISSING'));
            return $this->failValidationErrors('缺少必要資料');
        }

        $headers = $json->headers;
        $notFoundNames = $json->not_found;

        if (empty($notFoundNames)) {
            log_message('error', '[Download Not Found] FAILED: No not found names provided');
            return $this->failValidationErrors('沒有未匹配的客戶');
        }

        try {
            log_message('info', '[Download Not Found] Creating spreadsheet with ' . count($notFoundNames) . ' not found customers');

            // Create new spreadsheet
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $worksheet = $spreadsheet->getActiveSheet();

            // Set headers (first row)
            $columnIndex = 1;
            foreach ($headers as $header) {
                $columnLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($columnIndex);
                $cellCoordinate = $columnLetter . '1';

                // Set value
                $worksheet->setCellValue($cellCoordinate, $header);

                // Style header row
                $worksheet->getStyle($cellCoordinate)->getFont()->setBold(true);
                $worksheet->getStyle($cellCoordinate)->getFill()
                    ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFE0E0E0');

                $columnIndex++;
            }

            // Add not found customer names (starting from row 2)
            $rowIndex = 2;
            foreach ($notFoundNames as $name) {
                $worksheet->setCellValue('A' . $rowIndex, $name);
                $rowIndex++;
            }

            // Auto-size columns
            foreach (range(1, count($headers)) as $col) {
                $columnLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col);
                $worksheet->getColumnDimension($columnLetter)->setAutoSize(true);
            }

            // Generate filename with timestamp
            $filename = '未匹配客戶_' . date('YmdHis') . '.xlsx';
            $encodedFilename = rawurlencode($filename);

            log_message('info', '[Download Not Found] Spreadsheet created successfully. Filename: ' . $filename);

            // Set headers for download
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            // Use both filename (fallback) and filename* (UTF-8 support)
            header('Content-Disposition: attachment; filename="' . $encodedFilename . '"; filename*=UTF-8\'\'' . $encodedFilename);
            header('Cache-Control: max-age=0');
            header('Access-Control-Expose-Headers: Content-Disposition'); // Ensure frontend can read this header

            // Write to output
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');

            log_message('info', '[Download Not Found] ========== Download Completed Successfully ==========');
            exit;
        } catch (\Throwable $e) {
            log_message('error', '[Download Not Found] Unexpected Error: ' . $e->getMessage());
            log_message('error', '[Download Not Found] Exception class: ' . get_class($e));
            log_message('error', '[Download Not Found] Stack trace: ' . $e->getTraceAsString());
            return $this->fail('生成檔案出錯：' . $e->getMessage(), 400);
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

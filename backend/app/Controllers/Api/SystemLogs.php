<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

/**
 * Read-only operational log API, protected by a static token.
 *
 * Token: set LOG_API_TOKEN (>= 32 chars) in backend/.env (or the php container env).
 * Send it as header  "X-Log-Token: <token>"  or  "Authorization: Bearer <token>".
 * If LOG_API_TOKEN is not set the whole API is disabled (503).
 *
 * Endpoints:
 *   GET /api/system/logs/files                     list log files
 *   GET /api/system/logs                           parsed log entries (newest first)
 *       ?date=YYYY-MM-DD   (default today; "all" = every file, newest first)
 *       ?level=error,critical   filter levels (comma separated)
 *       ?q=keyword             substring filter (case-insensitive)
 *       ?since_minutes=60      only entries newer than N minutes
 *       ?limit=200             max entries (1..2000)
 *   GET /api/system/diagnostics                    env / migrations / schema / recent sends
 */
class SystemLogs extends ResourceController
{
    protected $format = 'json';

    private const MIN_TOKEN_LENGTH = 32;
    private const MAX_LIMIT        = 2000;
    private const MAX_READ_BYTES   = 20 * 1024 * 1024; // per file

    private function authorize(): ?\CodeIgniter\HTTP\ResponseInterface
    {
        $expected = (string) (env('LOG_API_TOKEN') ?: getenv('LOG_API_TOKEN') ?: '');
        if (strlen($expected) < self::MIN_TOKEN_LENGTH) {
            return $this->response->setStatusCode(503)->setJSON([
                'status'  => 503,
                'message' => 'Log API disabled: LOG_API_TOKEN not configured (min ' . self::MIN_TOKEN_LENGTH . ' chars).',
            ]);
        }

        $given = $this->request->getHeaderLine('X-Log-Token');
        if ($given === '') {
            $auth = $this->request->getHeaderLine('Authorization');
            if (stripos($auth, 'Bearer ') === 0) {
                $given = trim(substr($auth, 7));
            }
        }

        if ($given === '' || !hash_equals($expected, $given)) {
            log_message('warning', '[SystemLogs] Invalid token from ' . $this->request->getIPAddress());
            return $this->response->setStatusCode(401)->setJSON(['status' => 401, 'message' => 'Invalid log token']);
        }

        return null;
    }

    private function logDir(): string
    {
        return rtrim(WRITEPATH, '/') . '/logs/';
    }

    public function files()
    {
        if ($resp = $this->authorize()) return $resp;

        $files = [];
        foreach (glob($this->logDir() . 'log-*.log') ?: [] as $f) {
            $files[] = [
                'name'     => basename($f),
                'size'     => filesize($f),
                'modified' => date('Y-m-d H:i:s', filemtime($f)),
            ];
        }
        usort($files, fn($a, $b) => strcmp($b['name'], $a['name']));

        return $this->respond(['log_dir' => $this->logDir(), 'files' => $files]);
    }

    public function index()
    {
        if ($resp = $this->authorize()) return $resp;

        $date         = (string) ($this->request->getGet('date') ?? date('Y-m-d'));
        $levels       = array_filter(array_map('strtoupper', array_map('trim', explode(',', (string) $this->request->getGet('level')))));
        $q            = (string) ($this->request->getGet('q') ?? '');
        $sinceMinutes = (int) ($this->request->getGet('since_minutes') ?? 0);
        $limit        = max(1, min(self::MAX_LIMIT, (int) ($this->request->getGet('limit') ?? 200)));
        $sinceTs      = $sinceMinutes > 0 ? time() - $sinceMinutes * 60 : null;

        if ($date === 'all') {
            $paths = glob($this->logDir() . 'log-*.log') ?: [];
            rsort($paths);
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $paths = [$this->logDir() . "log-{$date}.log"];
        } else {
            return $this->failValidationErrors('date must be YYYY-MM-DD or "all"');
        }

        $result    = [];
        $scanned   = 0;
        $truncated = false;

        foreach ($paths as $path) {
            if (!is_file($path)) continue;

            foreach (array_reverse($this->parseFile($path, $truncated)) as $entry) {
                $scanned++;
                if ($levels && !in_array($entry['level'], $levels, true)) continue;
                if ($sinceTs !== null && strtotime($entry['time']) < $sinceTs) continue;
                if ($q !== '' && stripos($entry['message'], $q) === false) continue;

                $result[] = $entry;
                if (count($result) >= $limit) break 2;
            }
        }

        $levelCount = [];
        foreach ($result as $e) {
            $levelCount[$e['level']] = ($levelCount[$e['level']] ?? 0) + 1;
        }

        return $this->respond([
            'server_time'  => date('Y-m-d H:i:s'),
            'filters'      => compact('date', 'levels', 'q', 'sinceMinutes', 'limit'),
            'scanned'      => $scanned,
            'returned'     => count($result),
            'level_count'  => $levelCount,
            'file_truncated' => $truncated,
            'entries'      => $result,
        ]);
    }

    /**
     * Parse a CodeIgniter log file: "LEVEL - YYYY-MM-DD HH:MM:SS --> message"
     * Continuation lines (stack traces) are appended to the previous entry.
     */
    private function parseFile(string $path, bool &$truncated): array
    {
        $size = filesize($path);
        $fh   = fopen($path, 'rb');
        if (!$fh) return [];

        if ($size > self::MAX_READ_BYTES) {
            fseek($fh, $size - self::MAX_READ_BYTES);
            fgets($fh); // drop partial line
            $truncated = true;
        }

        $entries = [];
        $current = null;
        while (($line = fgets($fh)) !== false) {
            $line = rtrim($line, "\r\n");
            if (preg_match('/^([A-Z]+) - (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) --> (.*)$/s', $line, $m)) {
                if ($current) $entries[] = $current;
                $current = ['level' => $m[1], 'time' => $m[2], 'message' => $m[3], 'file' => basename($path)];
            } elseif ($current !== null && $line !== '') {
                $current['message'] .= "\n" . $line;
            }
        }
        if ($current) $entries[] = $current;
        fclose($fh);

        return $entries;
    }

    public function diagnostics()
    {
        if ($resp = $this->authorize()) return $resp;

        $out = [
            'server_time'  => date('Y-m-d H:i:s'),
            'timezone'     => date_default_timezone_get(),
            'environment'  => ENVIRONMENT,
            'php'          => [
                'version'            => PHP_VERSION,
                'max_execution_time' => ini_get('max_execution_time'),
                'memory_limit'       => ini_get('memory_limit'),
            ],
            'log_threshold' => config('Logger')->threshold,
            'disk_free_mb'  => @disk_free_space(WRITEPATH) !== false ? (int) (disk_free_space(WRITEPATH) / 1048576) : null,
        ];

        try {
            $db = \Config\Database::connect();

            $out['migrations_latest'] = $db->table('migrations')
                ->select('version, class, batch, time')
                ->orderBy('id', 'DESC')->limit(5)->get()->getResultArray();
            foreach ($out['migrations_latest'] as &$mg) {
                $mg['time'] = date('Y-m-d H:i:s', (int) $mg['time']);
            }
            unset($mg);

            // Migrations present in code but not yet applied
            $applied = array_column($db->table('migrations')->select('version')->get()->getResultArray(), 'version');
            $pending = [];
            foreach (glob(APPPATH . 'Database/Migrations/*.php') ?: [] as $f) {
                $version = explode('_', basename($f, '.php'))[0];
                if (!in_array($version, $applied, true)) $pending[] = basename($f);
            }
            $out['migrations_pending'] = $pending;

            $out['schema_check'] = [
                'send_log_recipients' => $db->getFieldNames('send_log_recipients'),
            ];

            $out['recent_send_logs'] = $db->table('send_logs')
                ->select('id, user_id, template_name, recipients_selected, recipients_sent, recipients_skipped, created_at')
                ->orderBy('id', 'DESC')->limit(10)->get()->getResultArray();

            $out['messages_last_hour'] = $db->table('messages')
                ->select('user_id, COUNT(*) AS cnt, MIN(created_at) AS first_at, MAX(created_at) AS last_at')
                ->where('sender', 'system')
                ->where('created_at >=', date('Y-m-d H:i:s', time() - 3600))
                ->groupBy('user_id')->get()->getResultArray();
        } catch (\Throwable $e) {
            $out['db_error'] = $e->getMessage();
        }

        return $this->respond($out);
    }
}

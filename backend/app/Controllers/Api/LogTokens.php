<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\AuthTrait;

/**
 * Admin-only management of tokens for the log API (/api/system/*).
 * The plaintext token is returned ONLY in the create/refresh response; the DB keeps a SHA-256 hash.
 */
class LogTokens extends ResourceController
{
    use AuthTrait;

    protected $format = 'json';

    public const TOKEN_PREFIX = 'nlog_';

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Token 只在建立當天有效：建立日之後的任何時間都視為過期。
     * 過期的 token 以「建立日隔天 00:00:00」補上 revoked_at（revoked_by 留空代表系統自動註銷）。
     */
    public static function expireStale($db = null): void
    {
        $db = $db ?? \Config\Database::connect();
        $db->table('log_api_tokens')
            ->where('revoked_at', null)
            ->where('created_at <', date('Y-m-d 00:00:00'))
            ->set('revoked_at', 'DATE_ADD(DATE(created_at), INTERVAL 1 DAY)', false)
            ->update();
        $n = $db->affectedRows();
        if ($n > 0) {
            log_message('notice', "[LogTokens] auto-revoked {$n} token(s) past midnight");
        }
    }

    public static function expiresAt(?string $createdAt): ?string
    {
        return $createdAt ? date('Y-m-d 00:00:00', strtotime($createdAt . ' +1 day')) : null;
    }

    private function requireAdmin(): array|\CodeIgniter\HTTP\ResponseInterface
    {
        $user = $this->getCurrentUser();
        if (!$user) return $this->failUnauthorized();
        if (($user['role'] ?? '') !== 'admin' || !empty($user['impersonating'])) {
            return $this->failForbidden('僅管理員可管理 Log API Token');
        }
        return $user;
    }

    private function generate(): array
    {
        $token = self::TOKEN_PREFIX . bin2hex(random_bytes(24));
        return [$token, self::hashToken($token), substr($token, 0, strlen(self::TOKEN_PREFIX) + 6)];
    }

    private function present(array $row): array
    {
        unset($row['token_hash']);
        $row['status']     = $row['revoked_at'] ? 'revoked' : 'active';
        $row['expires_at'] = self::expiresAt($row['created_at']);
        // 系統過午夜自動註銷時 revoked_by 為空
        $row['auto_revoked'] = $row['revoked_at'] && !$row['revoked_by'];
        return $row;
    }

    public function index()
    {
        $admin = $this->requireAdmin();
        if (!is_array($admin)) return $admin;

        $db = \Config\Database::connect();
        self::expireStale($db);

        $rows = $db->table('log_api_tokens t')
            ->select('t.*, uc.username AS created_by_name, ur.username AS revoked_by_name, uf.username AS refreshed_by_name')
            ->join('users uc', 'uc.id = t.created_by', 'left')
            ->join('users ur', 'ur.id = t.revoked_by', 'left')
            ->join('users uf', 'uf.id = t.refreshed_by', 'left')
            ->orderBy('t.revoked_at IS NULL', 'DESC', false)
            ->orderBy('t.id', 'DESC')
            ->get()->getResultArray();

        return $this->respond(['tokens' => array_map([$this, 'present'], $rows)]);
    }

    public function create()
    {
        $admin = $this->requireAdmin();
        if (!is_array($admin)) return $admin;

        // 未填名稱時預設為當天日期（token 也只在當天有效）
        $name = trim((string) ($this->request->getJSON()->name ?? ''));
        if ($name === '') {
            $name = date('Y-m-d');
        }
        if (mb_strlen($name) > 100) {
            return $this->failValidationErrors('名稱最多 100 字');
        }

        [$token, $hash, $prefix] = $this->generate();
        $db = \Config\Database::connect();
        $db->table('log_api_tokens')->insert([
            'name'         => $name,
            'token_hash'   => $hash,
            'token_prefix' => $prefix,
            'created_by'   => $admin['id'],
            'created_at'   => date('Y-m-d H:i:s'),
        ]);
        $id = $db->insertID();

        log_message('notice', "[LogTokens] created id={$id} name={$name} prefix={$prefix} by admin_id={$admin['id']}");

        return $this->respondCreated([
            'id'         => $id,
            'token'      => $token,
            'expires_at' => self::expiresAt(date('Y-m-d H:i:s')),
            'message'    => 'Token 已建立，明文只會顯示這一次，請立即複製保存。今日午夜後自動註銷',
        ]);
    }

    public function refresh($id = null)
    {
        $admin = $this->requireAdmin();
        if (!is_array($admin)) return $admin;

        $db = \Config\Database::connect();
        self::expireStale($db);
        $row = $db->table('log_api_tokens')->where('id', (int) $id)->get()->getRowArray();
        if (!$row) return $this->failNotFound('Token 不存在');
        if ($row['revoked_at']) return $this->fail('已註銷的 Token 無法刷新，請另行建立', 409);

        [$token, $hash, $prefix] = $this->generate();
        $db->table('log_api_tokens')->where('id', $row['id'])->update([
            'token_hash'   => $hash,
            'token_prefix' => $prefix,
            'refreshed_by' => $admin['id'],
            'refreshed_at' => date('Y-m-d H:i:s'),
        ]);

        log_message('notice', "[LogTokens] refreshed id={$row['id']} old_prefix={$row['token_prefix']} new_prefix={$prefix} by admin_id={$admin['id']}");

        return $this->respond([
            'id'      => (int) $row['id'],
            'token'   => $token,
            'message' => 'Token 已刷新，舊值立即失效。新值只會顯示這一次',
        ]);
    }

    public function revoke($id = null)
    {
        $admin = $this->requireAdmin();
        if (!is_array($admin)) return $admin;

        $db = \Config\Database::connect();
        self::expireStale($db);
        $row = $db->table('log_api_tokens')->where('id', (int) $id)->get()->getRowArray();
        if (!$row) return $this->failNotFound('Token 不存在');
        if ($row['revoked_at']) return $this->respond(['message' => 'Token 已是註銷狀態']);

        $db->table('log_api_tokens')->where('id', $row['id'])->update([
            'revoked_by' => $admin['id'],
            'revoked_at' => date('Y-m-d H:i:s'),
        ]);

        log_message('notice', "[LogTokens] revoked id={$row['id']} prefix={$row['token_prefix']} by admin_id={$admin['id']}");

        return $this->respond(['message' => 'Token 已註銷']);
    }
}

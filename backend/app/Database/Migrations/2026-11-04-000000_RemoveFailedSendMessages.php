<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 以前發送失敗（例如 LINE 429 月額度用完）也會寫入 messages，
 * 導致同一天補發時被去重檢查判定為「今日已發送相同內容」而全數略過。
 * 程式已改為只記錄成功的訊息；這裡清掉 2026-11-04 起由失敗發送留下的 messages，
 * 讓受影響的使用者當天就能重發。只刪「同客戶、同內容、同秒附近、且該筆明細為失敗」的系統訊息。
 */
class RemoveFailedSendMessages extends Migration
{
    public function up()
    {
        $p = $this->db->DBPrefix;

        $this->db->query("
            DELETE m FROM {$p}messages m
            JOIN {$p}send_log_recipients r
              ON r.customer_id = m.customer_id
             AND r.message_content = m.content
             AND r.sent_success = 0
             AND ABS(TIMESTAMPDIFF(SECOND, m.created_at, r.created_at)) <= 5
            JOIN {$p}send_logs s
              ON s.id = r.send_log_id
             AND s.user_id = m.user_id
            WHERE m.sender = 'system'
              AND m.created_at >= '2026-11-04 00:00:00'
        ");

        log_message('notice', '[Migration] RemoveFailedSendMessages deleted ' . $this->db->affectedRows() . ' messages rows');
    }

    public function down()
    {
        // 刪除的是錯誤寫入的紀錄，無法也不需還原
    }
}

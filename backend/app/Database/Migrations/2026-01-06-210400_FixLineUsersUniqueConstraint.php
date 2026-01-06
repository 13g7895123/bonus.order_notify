<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * 修正 line_users 表的唯一約束
 * 
 * 問題：原本 line_uid 是單一唯一約束，但在 Multi-Tenant 架構下，
 *       不同使用者（user_id）可能共用同一個 LINE Bot，
 *       導致相同的 LINE 終端使用者（line_uid）需要分別記錄給不同的 user_id。
 * 
 * 解決方案：將單一唯一約束改為複合唯一約束 (line_uid, user_id)
 */
class FixLineUsersUniqueConstraint extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        // 1. 先移除舊的 line_uid 唯一索引
        // CodeIgniter 的 forge 不支援直接刪除唯一索引，需要用原生 SQL
        try {
            $db->query('ALTER TABLE `line_users` DROP INDEX `line_uid`');
            log_message('info', '[Migration] Dropped unique index on line_uid');
        } catch (\Exception $e) {
            // 索引可能不存在，忽略錯誤
            log_message('warning', '[Migration] Could not drop line_uid index: ' . $e->getMessage());
        }

        // 2. 新增複合唯一索引 (line_uid, user_id)
        try {
            $db->query('ALTER TABLE `line_users` ADD UNIQUE INDEX `line_uid_user_id_unique` (`line_uid`, `user_id`)');
            log_message('info', '[Migration] Added composite unique index on (line_uid, user_id)');
        } catch (\Exception $e) {
            log_message('error', '[Migration] Failed to add composite unique index: ' . $e->getMessage());
            throw $e;
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();

        // 1. 移除複合唯一索引
        try {
            $db->query('ALTER TABLE `line_users` DROP INDEX `line_uid_user_id_unique`');
        } catch (\Exception $e) {
            log_message('warning', '[Migration] Could not drop composite index: ' . $e->getMessage());
        }

        // 2. 恢復原本的 line_uid 單一唯一索引
        try {
            $db->query('ALTER TABLE `line_users` ADD UNIQUE INDEX `line_uid` (`line_uid`)');
        } catch (\Exception $e) {
            log_message('error', '[Migration] Failed to restore line_uid unique index: ' . $e->getMessage());
            throw $e;
        }
    }
}

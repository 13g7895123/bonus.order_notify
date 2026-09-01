<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDiagnosticsToSendLogRecipients extends Migration
{
    public function up()
    {
        // Add diagnostic columns so a failed send (sent_success = 0) records WHY it failed.
        if (!$this->db->fieldExists('http_code', 'send_log_recipients')) {
            $this->db->query("ALTER TABLE `send_log_recipients` ADD COLUMN `http_code` INT NULL AFTER `sent_success`");
        }
        if (!$this->db->fieldExists('error_message', 'send_log_recipients')) {
            $this->db->query("ALTER TABLE `send_log_recipients` ADD COLUMN `error_message` VARCHAR(500) NULL AFTER `http_code`");
        }
        if (!$this->db->fieldExists('error_detail', 'send_log_recipients')) {
            $this->db->query("ALTER TABLE `send_log_recipients` ADD COLUMN `error_detail` TEXT NULL AFTER `error_message`");
        }
    }

    public function down()
    {
        $this->db->query("ALTER TABLE `send_log_recipients` DROP COLUMN IF EXISTS `error_detail`");
        $this->db->query("ALTER TABLE `send_log_recipients` DROP COLUMN IF EXISTS `error_message`");
        $this->db->query("ALTER TABLE `send_log_recipients` DROP COLUMN IF EXISTS `http_code`");
    }
}

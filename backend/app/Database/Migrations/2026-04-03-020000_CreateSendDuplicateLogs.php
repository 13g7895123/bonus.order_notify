<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSendDuplicateLogs extends Migration
{
    public function up()
    {
        // Duplicate-send log table
        $this->forge->addField([
            'id'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'send_log_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'customer_id'      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'customer_name'    => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'line_uid'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'template_name'    => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'message_content'  => ['type' => 'TEXT', 'null' => true],
            'original_sent_at' => ['type' => 'DATETIME', 'null' => true],
            'created_at'       => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey('send_log_id');
        $this->forge->createTable('send_duplicate_logs', true);

        // Add recipients_skipped column to send_logs (if not already there)
        if (!$this->db->fieldExists('recipients_skipped', 'send_logs')) {
            $this->db->query("ALTER TABLE `send_logs` ADD COLUMN `recipients_skipped` INT NOT NULL DEFAULT 0 AFTER `recipients_sent`");
        }
    }

    public function down()
    {
        $this->forge->dropTable('send_duplicate_logs', true);
        $this->db->query("ALTER TABLE `send_logs` DROP COLUMN IF EXISTS `recipients_skipped`");
    }
}

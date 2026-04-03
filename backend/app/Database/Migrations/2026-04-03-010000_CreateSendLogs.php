<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSendLogs extends Migration
{
    public function up()
    {
        // Record each send operation (one per "確認發送" click)
        $this->forge->addField([
            'id'                      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'user_id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'template_id'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'template_name'           => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'template_content'        => ['type' => 'TEXT', 'null' => true],
            'variable_defaults_json'  => ['type' => 'TEXT', 'null' => true],   // global/manual variable values
            'recipients_selected'     => ['type' => 'INT', 'default' => 0],
            'recipients_sent'         => ['type' => 'INT', 'default' => 0],
            'has_xls_import'          => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'xls_matched_count'       => ['type' => 'INT', 'default' => 0],    // XLS rows matched to customers
            'xls_not_matched_count'   => ['type' => 'INT', 'default' => 0],    // customers selected but NOT in XLS
            'xls_not_found_count'     => ['type' => 'INT', 'default' => 0],    // XLS names that couldn't find customer
            'xls_not_found_names'     => ['type' => 'TEXT', 'null' => true],   // JSON array of those names
            'created_at'              => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->createTable('send_logs', true);

        // Individual recipient records per send operation
        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'send_log_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'customer_id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'customer_name'        => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'line_uid'             => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'final_variables_json' => ['type' => 'TEXT', 'null' => true],   // resolved variables for this recipient
            'is_xls_matched'       => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'message_content'      => ['type' => 'TEXT', 'null' => true],
            'sent_success'         => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addKey('send_log_id');
        $this->forge->createTable('send_log_recipients', true);
    }

    public function down()
    {
        $this->forge->dropTable('send_log_recipients', true);
        $this->forge->dropTable('send_logs', true);
    }
}

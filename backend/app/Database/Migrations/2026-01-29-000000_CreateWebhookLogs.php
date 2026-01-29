<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateWebhookLogs extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'user_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'comment'    => 'User ID (owner of the webhook)',
            ],
            'webhook_key' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'comment'    => 'Webhook key used in request',
            ],
            'request_method' => [
                'type'       => 'VARCHAR',
                'constraint' => 10,
                'null'       => false,
                'default'    => 'POST',
            ],
            'request_headers' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'JSON encoded request headers',
            ],
            'request_body' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'Raw request body',
            ],
            'signature' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => true,
                'comment'    => 'X-Line-Signature header value',
            ],
            'signature_valid' => [
                'type'    => 'TINYINT',
                'constraint' => 1,
                'null'    => true,
                'comment' => '1=valid, 0=invalid, NULL=skipped',
            ],
            'events_count' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
                'comment'    => 'Number of events in request',
            ],
            'event_types' => [
                'type' => 'VARCHAR',
                'constraint' => 500,
                'null' => true,
                'comment' => 'Comma-separated event types',
            ],
            'response_status' => [
                'type'       => 'INT',
                'constraint' => 3,
                'null'       => true,
                'comment'    => 'HTTP response status code',
            ],
            'response_body' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'Response body sent back',
            ],
            'error_message' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'Error message if failed',
            ],
            'processing_time_ms' => [
                'type'       => 'INT',
                'constraint' => 11,
                'null'       => true,
                'comment'    => 'Processing time in milliseconds',
            ],
            'ip_address' => [
                'type'       => 'VARCHAR',
                'constraint' => 45,
                'null'       => true,
                'comment'    => 'Request IP address',
            ],
            'user_agent' => [
                'type' => 'VARCHAR',
                'constraint' => 500,
                'null' => true,
            ],
            'is_test_request' => [
                'type'    => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'comment' => '1 if this is a LINE test request (no events)',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('user_id');
        $this->forge->addKey('webhook_key');
        $this->forge->addKey('created_at');
        $this->forge->addKey('is_test_request');
        
        $this->forge->createTable('webhook_logs');
    }

    public function down()
    {
        $this->forge->dropTable('webhook_logs');
    }
}

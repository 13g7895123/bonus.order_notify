<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateLogApiTokens extends Migration
{
    public function up()
    {
        // Tokens for the read-only log API (/api/system/*). Only the SHA-256 hash is stored.
        $this->forge->addField([
            'id'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'name'         => ['type' => 'VARCHAR', 'constraint' => 100],
            'token_hash'   => ['type' => 'CHAR', 'constraint' => 64],
            'token_prefix' => ['type' => 'VARCHAR', 'constraint' => 16],
            'created_by'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'created_at'   => ['type' => 'DATETIME', 'null' => true],
            'refreshed_by' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'refreshed_at' => ['type' => 'DATETIME', 'null' => true],
            'revoked_by'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'revoked_at'   => ['type' => 'DATETIME', 'null' => true],
            'last_used_at' => ['type' => 'DATETIME', 'null' => true],
            'last_used_ip' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
            'use_count'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'default' => 0],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey('token_hash');
        $this->forge->createTable('log_api_tokens', true);
    }

    public function down()
    {
        $this->forge->dropTable('log_api_tokens', true);
    }
}

<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateRefreshTokens extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true
            ],
            'token' => [
                'type' => 'VARCHAR',
                'constraint' => 255
            ],
            'expires_at' => [
                'type' => 'DATETIME'
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true
            ]
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey('token');
        $this->forge->addKey('user_id');
        $this->forge->createTable('refresh_tokens');
    }

    public function down()
    {
        $this->forge->dropTable('refresh_tokens');
    }
}

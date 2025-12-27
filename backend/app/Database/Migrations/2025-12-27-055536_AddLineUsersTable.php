<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddLineUsersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'line_uid' => ['type' => 'VARCHAR', 'constraint' => 100, 'unique' => true],
            'display_name' => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'picture_url' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'status_message' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'email' => ['type' => 'VARCHAR', 'constraint' => 200, 'null' => true],
            'event_type' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'created_at' => ['type' => 'DATETIME', 'null' => true],
            'updated_at' => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('line_users', true);
    }

    public function down()
    {
        $this->forge->dropTable('line_users', true);
    }
}

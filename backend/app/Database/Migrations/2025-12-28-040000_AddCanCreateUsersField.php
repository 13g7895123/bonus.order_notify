<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCanCreateUsersField extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'can_create_users' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'null' => false,
                'after' => 'is_active'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'can_create_users');
    }
}

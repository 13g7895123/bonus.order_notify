<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSuspendToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'is_suspended' => [
                'type'    => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after'   => 'is_active'
            ],
            'suspend_notice' => [
                'type'    => 'TEXT',
                'null'    => true,
                'after'   => 'is_suspended'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'is_suspended');
        $this->forge->dropColumn('users', 'suspend_notice');
    }
}

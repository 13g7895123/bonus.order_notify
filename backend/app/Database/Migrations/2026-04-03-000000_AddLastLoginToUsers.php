<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddLastLoginToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'last_login_at' => [
                'type'    => 'DATETIME',
                'null'    => true,
                'after'   => 'updated_at'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'last_login_at');
    }
}

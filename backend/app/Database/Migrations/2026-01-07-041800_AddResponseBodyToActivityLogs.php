<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddResponseBodyToActivityLogs extends Migration
{
    public function up()
    {
        $this->forge->addColumn('activity_logs', [
            'response_body' => [
                'type' => 'LONGTEXT',
                'null' => true,
                'after' => 'response_code'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('activity_logs', 'response_body');
    }
}

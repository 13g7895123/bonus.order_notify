<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddVariablesToTemplates extends Migration
{
    public function up()
    {
        $fields = [
            'variables' => [
                'type' => 'TEXT', // For JSON storage
                'null' => true,
                'after' => 'content',
            ],
        ];
        $this->forge->addColumn('templates', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('templates', 'variables');
    }
}

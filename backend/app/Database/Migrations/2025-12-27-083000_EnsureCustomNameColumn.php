<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class EnsureCustomNameColumn extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('name', 'customers') && !$this->db->fieldExists('custom_name', 'customers')) {
            $this->forge->modifyColumn('customers', [
                'name' => [
                    'name' => 'custom_name',
                    'type' => 'VARCHAR',
                    'constraint' => 200,
                    'null' => true,
                ],
            ]);
        } elseif (!$this->db->fieldExists('custom_name', 'customers')) {
            $this->forge->addColumn('customers', [
                'custom_name' => [
                    'type' => 'VARCHAR',
                    'constraint' => 200,
                    'null' => true,
                    'after' => 'line_uid'
                ],
            ]);
        }
    }

    public function down()
    {
        // No need to down this
    }
}

<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class EnsureLineUidColumn extends Migration
{
    public function up()
    {
        // Check and fix 'line_uid' column in 'customers' table
        if ($this->db->fieldExists('line_id', 'customers') && !$this->db->fieldExists('line_uid', 'customers')) {
            // Rename line_id to line_uid if old name exists
            $this->forge->modifyColumn('customers', [
                'line_id' => [
                    'name' => 'line_uid',
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
            ]);
        } elseif (!$this->db->fieldExists('line_uid', 'customers')) {
            // Add line_uid if it doesn't exist
            $this->forge->addColumn('customers', [
                'line_uid' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                    'after' => 'id'
                ],
            ]);
        }
    }

    public function down()
    {
        // No need to down this
    }
}

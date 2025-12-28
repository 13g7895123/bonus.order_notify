<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddInviteCodeSetting extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        // Check if invite_code setting exists
        $existing = $db->table('settings')->where('key', 'invite_code')->get()->getRowArray();
        if (!$existing) {
            $db->table('settings')->insert([
                'key' => 'invite_code',
                'value' => 'NOTIFY2024',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $db->table('settings')->where('key', 'invite_code')->delete();
    }
}

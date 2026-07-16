<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddExpiresAtToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'expires_at' => [
                'type'    => 'DATETIME',
                'null'    => true,
                'after'   => 'suspend_notice'
            ]
        ]);

        $db = \Config\Database::connect();
        $existing = $db->table('settings')->where('key', 'expiry_default_notice')->get()->getRowArray();
        if (!$existing) {
            $db->table('settings')->insert([
                'key' => 'expiry_default_notice',
                'value' => '您的帳號使用期限已到期，請聯絡管理員續期。',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('users', 'expires_at');

        $db = \Config\Database::connect();
        $db->table('settings')->where('key', 'expiry_default_notice')->delete();
    }
}

<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class MultiTenantSupport extends Migration
{
    public function up()
    {
        // 1. Add columns to users table
        $this->forge->addColumn('users', [
            'role' => [
                'type' => 'ENUM',
                'constraint' => ['admin', 'user'],
                'default' => 'user',
                'after' => 'name'
            ],
            'webhook_key' => [
                'type' => 'VARCHAR',
                'constraint' => 64,
                'null' => true,
                'after' => 'role'
            ],
            'line_channel_secret' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
                'after' => 'webhook_key'
            ],
            'line_channel_access_token' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'line_channel_secret'
            ],
            'message_quota' => [
                'type' => 'INT',
                'default' => 200,
                'after' => 'line_channel_access_token'
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
                'after' => 'message_quota'
            ]
        ]);

        // 2. Add user_id to customers table
        $this->forge->addColumn('customers', [
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'id'
            ]
        ]);

        // 3. Add user_id to templates table
        $this->forge->addColumn('templates', [
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'id'
            ]
        ]);

        // 4. Add user_id to messages table
        $this->forge->addColumn('messages', [
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'id'
            ]
        ]);

        // 5. Add user_id to line_users table
        $this->forge->addColumn('line_users', [
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'id'
            ]
        ]);

        // Update existing admin user
        $db = \Config\Database::connect();
        $adminUser = $db->table('users')->where('username', 'admin')->get()->getRowArray();
        if ($adminUser) {
            $db->table('users')->where('id', $adminUser['id'])->update([
                'role' => 'admin',
                'webhook_key' => bin2hex(random_bytes(32))
            ]);

            // Assign all existing data to admin
            $db->table('customers')->update(['user_id' => $adminUser['id']]);
            $db->table('templates')->update(['user_id' => $adminUser['id']]);
            $db->table('messages')->update(['user_id' => $adminUser['id']]);
            $db->table('line_users')->update(['user_id' => $adminUser['id']]);

            // Move global settings to admin user
            $channelSecret = $db->table('settings')->where('key', 'line_channel_secret')->get()->getRowArray();
            $channelToken = $db->table('settings')->where('key', 'line_channel_access_token')->get()->getRowArray();
            $msgQuota = $db->table('settings')->where('key', 'message_quota')->get()->getRowArray();

            $db->table('users')->where('id', $adminUser['id'])->update([
                'line_channel_secret' => $channelSecret['value'] ?? null,
                'line_channel_access_token' => $channelToken['value'] ?? null,
                'message_quota' => (int)($msgQuota['value'] ?? 200)
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['role', 'webhook_key', 'line_channel_secret', 'line_channel_access_token', 'message_quota', 'is_active']);
        $this->forge->dropColumn('customers', ['user_id']);
        $this->forge->dropColumn('templates', ['user_id']);
        $this->forge->dropColumn('messages', ['user_id']);
        $this->forge->dropColumn('line_users', ['user_id']);
    }
}

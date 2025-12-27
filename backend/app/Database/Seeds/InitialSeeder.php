<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class InitialSeeder extends Seeder
{
    public function run()
    {
        // Default User
        $this->db->table('users')->insert([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => password_hash('admin', PASSWORD_DEFAULT),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Sample Templates
        $this->db->table('templates')->insertBatch([
            [
                'name' => '訂單確認通知',
                'content' => '親愛的 {{name}}，您的訂單 {{order_id}} 已經確認。我們會盡快為您出貨。',
                'created_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name' => '出貨通知',
                'content' => '親愛的 {{name}}，您的訂單 {{order_id}} 已經出貨。物流單號：{{tracking_number}}',
                'created_at' => date('Y-m-d H:i:s'),
            ]
        ]);

        // Sample Customers
        $this->db->table('customers')->insertBatch([
            [
                'name' => '王小明',
                'line_id' => 'U1234567890abcdef',
                'created_at' => date('Y-m-d H:i:s'),
            ],
            [
                'name' => '陳大文',
                'line_id' => 'U0987654321fedcba',
                'created_at' => date('Y-m-d H:i:s'),
            ]
        ]);
    }
}

<?php

namespace Tests\Unit;

use CodeIgniter\Test\CIUnitTestCase;
use CodeIgniter\Test\DatabaseTestTrait;
use CodeIgniter\Test\FeatureTestTrait;

class ApiFeatureTest extends CIUnitTestCase
{
    use DatabaseTestTrait, FeatureTestTrait;

    // Use a clean database for each test
    protected $migrate     = true;
    protected $migrateOnce = false;
    protected $refresh     = true;
    protected $seed        = 'App\Database\Seeds\InitialSeeder';
    protected $namespace   = 'App';

    public function testGetCustomers()
    {
        $result = $this->get('api/customers');
        $result->assertStatus(200);

        // InitialSeeder inserts 王小明 as a custom_name
        $data = json_decode($result->getJSON(), true);
        $this->assertEquals('王小明', $data[0]['custom_name']);
    }

    public function testGetLineUsers()
    {
        $result = $this->get('api/line/users');
        $result->assertStatus(200);
        $this->assertIsArray(json_decode($result->getJSON(), true));
    }

    public function testGetSettings()
    {
        $result = $this->get('api/settings');
        $result->assertStatus(200);
        // The mock db or test db might not have the same data as production, 
        // but InitialSeeder should have some settings.
    }

    public function testImportPreviewNoFile()
    {
        $result = $this->post('api/notifications/import-preview');
        // It should return validation error (400)
        $result->assertStatus(400);
    }

    public function testCreateCustomer()
    {
        $payload = [
            'line_uid' => 'U_TEST_NEW',
            'custom_name' => '測試員'
        ];
        $result = $this->withBody(json_encode($payload))
            ->post('api/customers');
        $result->assertStatus(201);

        $this->seeInDatabase('customers', ['line_uid' => 'U_TEST_NEW', 'custom_name' => '測試員']);
    }
}

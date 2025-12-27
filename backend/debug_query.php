<?php
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
$pathsPath = realpath(FCPATH . 'app/Config/Paths.php');
require_once $pathsPath;
$paths = new Config\Paths();
$bootstrap = rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';
require_once $bootstrap;

$db = \Config\Database::connect();
try {
    $query = "SELECT `line_users`.*, `customers`.`custom_name` as `linked_customer_name`
FROM `line_users`
LEFT JOIN `customers` ON `customers`.`line_uid` = `line_users`.`line_uid`
ORDER BY `line_users`.`created_at` DESC";
    $result = $db->query($query);
    echo "Query successful!\n";
    print_r($result->getResultArray());
} catch (\Exception $e) {
    echo "Query failed: " . $e->getMessage() . "\n";
}

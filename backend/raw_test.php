<?php
// Simple mysqli test
$mysqli = new mysqli("db", "user", "password", "order_notify");
if ($mysqli->connect_error) {
    die("Connection failed: " . $mysqli->connect_error);
}

$query = "SELECT line_users.*, customers.custom_name as linked_customer_name FROM line_users LEFT JOIN customers ON customers.line_uid = line_users.line_uid ORDER BY line_users.created_at DESC";
$result = $mysqli->query($query);

if ($result) {
    echo "Query Successful via raw MySQLi!\n";
    while ($row = $result->fetch_assoc()) {
        print_r($row);
    }
} else {
    echo "Query Failed via raw MySQLi: " . $mysqli->error . "\n";
}

$res = $mysqli->query("DESC customers");
echo "\nDESC customers:\n";
while ($row = $res->fetch_assoc()) {
    print_r($row);
}

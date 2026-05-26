<?php
$host      = 'localhost';
$db_name   = 'pasubli';
$username  = 'root';
$password  = '';

// Simulated logged-in lender — change this to test with different lenders
define('CURRENT_LENDER_ID', 100001);   // int, matches lender_id int(11) in DB

function getConnection() {
    global $host, $db_name, $username, $password;
    $conn = new mysqli($host, $username, $password, $db_name);
    if ($conn->connect_error) {
        die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
    }
    $conn->set_charset('utf8');
    return $conn;
}
?>
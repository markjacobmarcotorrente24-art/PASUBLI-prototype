<?php
// lenders.php - Returns list of lenders for the dropdown in the product form
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db_config.php';

$conn = getConnection();
$result = $conn->query("
    SELECT lender_id, CONCAT(lender_first_name, ' ', lender_last_name) AS lender_name
    FROM lender
    ORDER BY lender_first_name ASC
");

$lenders = [];
while ($row = $result->fetch_assoc()) {
    $lenders[] = $row;
}

echo json_encode($lenders);
$conn->close();
?>

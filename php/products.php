<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_config.php';

$method     = $_SERVER['REQUEST_METHOD'];
$lender_id  = CURRENT_LENDER_ID;

switch ($method) {

    case 'GET':
        $conn     = getConnection();
        $search   = isset($_GET['search'])   ? trim($_GET['search'])   : '';
        $category = isset($_GET['category']) ? trim($_GET['category']) : '';
        $id       = isset($_GET['id'])       ? trim($_GET['id'])       : '';

        if ($id !== '') {
            // Get single product — must belong to current lender
            $stmt = $conn->prepare("
                SELECT * FROM product
                WHERE product_id = ? AND lender_id = ?
            ");
            $stmt->bind_param('ss', $id, $lender_id);
            $stmt->execute();
            $result  = $stmt->get_result();
            $product = $result->fetch_assoc();
            echo json_encode($product ? $product : ['error' => 'Product not found']);
            $stmt->close();

        } else {
            // Get all products belonging to current lender only
            $sql    = "SELECT * FROM product WHERE lender_id = ?";
            $params = [$lender_id];
            $types  = 's';

            if ($search !== '') {
                $sql   .= " AND category LIKE ?";
                $like   = '%' . $search . '%';
                $params[] = $like;
                $types   .= 's';
            }
            if ($category !== '') {
                $sql     .= " AND category = ?";
                $params[] = $category;
                $types   .= 's';
            }

            $sql .= " ORDER BY product_id DESC";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);
            $stmt->execute();
            $result = $stmt->get_result();

            $products = [];
            while ($row = $result->fetch_assoc()) {
                $products[] = $row;
            }
            echo json_encode($products);
            $stmt->close();
        }

        $conn->close();
        break;

    case 'POST':
        $data   = json_decode(file_get_contents('php://input'), true);
        $errors = validateProduct($data);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['errors' => $errors]);
            break;
        }

        $conn         = getConnection();
        $product_id   = trim($data['product_id']);
        $category     = trim($data['category']);
        $stock_qty    = intval($data['stock_qty']);
        $rental_price = floatval($data['rental_price']);

        // lender_id comes from hardcoded constant, not from form
        $stmt = $conn->prepare("
            INSERT INTO product (product_id, lender_id, category, stock_qty, rental_price)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('sssid', $product_id, $lender_id, $category, $stock_qty, $rental_price);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $product_id, 'message' => 'Product added successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add product: ' . $conn->error]);
        }

        $stmt->close();
        $conn->close();
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = isset($data['product_id']) ? trim($data['product_id']) : '';

        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid product ID']);
            break;
        }

        $errors = validateProduct($data);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['errors' => $errors]);
            break;
        }

        $conn         = getConnection();
        $category     = trim($data['category']);
        $stock_qty    = intval($data['stock_qty']);
        $rental_price = floatval($data['rental_price']);

        // Only update if product belongs to current lender
        $stmt = $conn->prepare("
            UPDATE product
            SET category = ?, stock_qty = ?, rental_price = ?
            WHERE product_id = ? AND lender_id = ?
        ");
        $stmt->bind_param('sidss', $category, $stock_qty, $rental_price, $id, $lender_id);

        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found or not yours']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update product: ' . $conn->error]);
        }

        $stmt->close();
        $conn->close();
        break;

    case 'DELETE':
        $id = isset($_GET['id']) ? trim($_GET['id']) : '';

        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid product ID']);
            break;
        }

        $conn = getConnection();

        // Only delete if product belongs to current lender
        $stmt = $conn->prepare("DELETE FROM product WHERE product_id = ? AND lender_id = ?");
        $stmt->bind_param('ss', $id, $lender_id);

        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found or not yours']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete product: ' . $conn->error]);
        }

        $stmt->close();
        $conn->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function validateProduct($data) {
    $errors = [];
    if (empty($data['product_id']) || strlen(trim($data['product_id'])) !== 5) {
        $errors[] = 'Product ID must be exactly 5 characters.';
    }
    if (empty($data['category'])) {
        $errors[] = 'Category is required.';
    }
    if (!isset($data['stock_qty']) || intval($data['stock_qty']) < 0) {
        $errors[] = 'Stock must be 0 or greater.';
    }
    if (empty($data['rental_price']) || floatval($data['rental_price']) <= 0) {
        $errors[] = 'Price must be greater than 0.';
    }
    return $errors;
}
?>
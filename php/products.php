<?php
// products.php - Handles all CRUD operations for Product/Item module
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_config.php';

$method = $_SERVER['REQUEST_METHOD'];

// Route requests based on HTTP method
switch ($method) {

    // READ - Get all products or one product
    case 'GET':
        $conn = getConnection();

        // Search/filter support
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';
        $category = isset($_GET['category']) ? trim($_GET['category']) : '';
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

        if ($id > 0) {
            // Get single product
            $stmt = $conn->prepare("
                SELECT p.*, CONCAT(l.lender_first_name, ' ', l.lender_last_name) AS lender_name
                FROM product_item p
                LEFT JOIN lender l ON p.lender_id = l.lender_id
                WHERE p.product_id = ?
            ");
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $product = $result->fetch_assoc();
            echo json_encode($product ? $product : ['error' => 'Product not found']);
            $stmt->close();
        } else {
            // Get all products with optional search and filter
            $sql = "
                SELECT p.*, CONCAT(l.lender_first_name, ' ', l.lender_last_name) AS lender_name
                FROM product_item p
                LEFT JOIN lender l ON p.lender_id = l.lender_id
                WHERE 1=1
            ";
            $params = [];
            $types = '';

            if ($search !== '') {
                $sql .= " AND (p.product_name LIKE ? OR p.description LIKE ?)";
                $like = '%' . $search . '%';
                $params[] = $like;
                $params[] = $like;
                $types .= 'ss';
            }
            if ($category !== '') {
                $sql .= " AND p.category = ?";
                $params[] = $category;
                $types .= 's';
            }

            $sql .= " ORDER BY p.product_id DESC";

            $stmt = $conn->prepare($sql);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
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

    // CREATE - Add new product
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);

        // Basic validation
        $errors = validateProduct($data);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['errors' => $errors]);
            break;
        }

        $conn = getConnection();
        $stmt = $conn->prepare("
            INSERT INTO product_item (lender_id, category, stock, price, product_name, description)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        $lender_id = intval($data['lender_id']);
        $category  = trim($data['category']);
        $stock     = intval($data['stock']);
        $price     = floatval($data['price']);
        $name      = trim($data['product_name']);
        $desc      = isset($data['description']) ? trim($data['description']) : '';

        $stmt->bind_param('isidss', $lender_id, $category, $stock, $price, $name, $desc);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $conn->insert_id, 'message' => 'Product added successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add product']);
        }

        $stmt->close();
        $conn->close();
        break;

    // UPDATE - Edit existing product
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = isset($data['product_id']) ? intval($data['product_id']) : 0;

        if ($id <= 0) {
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

        $conn = getConnection();
        $stmt = $conn->prepare("
            UPDATE product_item
            SET lender_id = ?, category = ?, stock = ?, price = ?, product_name = ?, description = ?
            WHERE product_id = ?
        ");

        $lender_id = intval($data['lender_id']);
        $category  = trim($data['category']);
        $stock     = intval($data['stock']);
        $price     = floatval($data['price']);
        $name      = trim($data['product_name']);
        $desc      = isset($data['description']) ? trim($data['description']) : '';

        $stmt->bind_param('isidssi', $lender_id, $category, $stock, $price, $name, $desc, $id);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update product']);
        }

        $stmt->close();
        $conn->close();
        break;

    // DELETE - Remove a product
    case 'DELETE':
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid product ID']);
            break;
        }

        $conn = getConnection();
        $stmt = $conn->prepare("DELETE FROM product_item WHERE product_id = ?");
        $stmt->bind_param('i', $id);

        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to delete product']);
        }

        $stmt->close();
        $conn->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

// Validation helper
function validateProduct($data) {
    $errors = [];

    if (empty($data['product_name']) || strlen(trim($data['product_name'])) < 2) {
        $errors[] = 'Product name must be at least 2 characters.';
    }
    if (empty($data['category'])) {
        $errors[] = 'Category is required.';
    }
    if (!isset($data['stock']) || intval($data['stock']) < 0) {
        $errors[] = 'Stock must be 0 or greater.';
    }
    if (empty($data['price']) || floatval($data['price']) <= 0) {
        $errors[] = 'Price must be greater than 0.';
    }
    if (empty($data['lender_id']) || intval($data['lender_id']) <= 0) {
        $errors[] = 'Please select a lender.';
    }

    return $errors;
}
?>

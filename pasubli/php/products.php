<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once 'db_config.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    /* ── GET ──────────────────────────────────────────── */
    case 'GET':
        $conn     = getConnection();
        $search   = isset($_GET['search'])   ? trim($_GET['search'])   : '';
        $category = isset($_GET['category']) ? trim($_GET['category']) : '';
        $id       = isset($_GET['id'])       ? (int) $_GET['id']       : 0;

        if ($id !== 0) {
            // Single product fetch
            $stmt = $conn->prepare("SELECT * FROM product WHERE product_id = ?");
            $stmt->bind_param('i', $id);
            $stmt->execute();
            $product = $stmt->get_result()->fetch_assoc();
            echo json_encode($product ?: ['error' => 'Product not found']);
            $stmt->close();

        } else {
            // List all products — with optional search & category filter
            $sql    = "SELECT * FROM product WHERE 1=1";
            $params = [];
            $types  = '';

            if ($search !== '') {
                $sql     .= " AND (product_id LIKE ? OR product_name LIKE ? OR category LIKE ?)";
                $like     = '%' . $search . '%';
                $params[] = $like;
                $params[] = $like;
                $params[] = $like;
                $types   .= 'sss';
            }

            if ($category !== '') {
                $sql     .= " AND category = ?";
                $params[] = $category;
                $types   .= 's';
            }

            $sql .= " ORDER BY product_id DESC";

            $stmt = $conn->prepare($sql);
            if ($types !== '') {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $result   = $stmt->get_result();
            $products = [];
            while ($row = $result->fetch_assoc()) $products[] = $row;
            echo json_encode($products);
            $stmt->close();
        }
        $conn->close();
        break;

    /* ── POST ─────────────────────────────────────────── */
    case 'POST':
        $data   = json_decode(file_get_contents('php://input'), true);
        $errors = validateProduct($data, false);

        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['errors' => $errors]);
            break;
        }

        $conn         = getConnection();
        $product_id   = (int)   $data['product_id'];
        $product_name = trim($data['product_name']);
        $category     = trim($data['category']);
        $stock_qty    = (int)   $data['stock_qty'];
        $rental_price = (float) $data['rental_price'];

        // Duplicate ID check
        $chk = $conn->prepare("SELECT product_id FROM product WHERE product_id = ?");
        $chk->bind_param('i', $product_id);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            http_response_code(400);
            echo json_encode(['errors' => ['This Product ID already exists.']]);
            $chk->close(); $conn->close(); break;
        }
        $chk->close();

        $stmt = $conn->prepare(
            "INSERT INTO product (product_id, product_name, category, stock_qty, rental_price)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->bind_param('issid', $product_id, $product_name, $category, $stock_qty, $rental_price);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'id' => $product_id, 'message' => 'Product added successfully']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to add product: ' . $conn->error]);
        }
        $stmt->close(); $conn->close();
        break;

    /* ── PUT ──────────────────────────────────────────── */
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = isset($data['product_id']) ? (int) $data['product_id'] : 0;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid product ID']);
            break;
        }

        $errors = validateProduct($data, true);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(['errors' => $errors]);
            break;
        }

        $conn         = getConnection();
        $product_name = trim($data['product_name']);
        $category     = trim($data['category']);
        $stock_qty    = (int)   $data['stock_qty'];
        $rental_price = (float) $data['rental_price'];

        $stmt = $conn->prepare(
            "UPDATE product
             SET product_name = ?, category = ?, stock_qty = ?, rental_price = ?
             WHERE product_id = ?"
        );
        $stmt->bind_param('ssidi', $product_name, $category, $stock_qty, $rental_price, $id);

        if ($stmt->execute()) {
            if ($conn->affected_rows > 0) {
                echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to update: ' . $conn->error]);
        }
        $stmt->close(); $conn->close();
        break;

    /* ── DELETE ───────────────────────────────────────── */
    case 'DELETE':
        $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid product ID']);
            break;
        }

        $conn = getConnection();
        $stmt = $conn->prepare("DELETE FROM product WHERE product_id = ?");
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
            echo json_encode(['error' => 'Failed to delete: ' . $conn->error]);
        }
        $stmt->close(); $conn->close();
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

function validateProduct($data, $isEdit) {
    $errors = [];
    if (!$isEdit) {
        $id = isset($data['product_id']) ? trim((string) $data['product_id']) : '';
        if ($id === '' || !preg_match('/^\d{5}$/', $id)) {
            $errors[] = 'Product ID must be exactly 5 digits.';
        }
    }
    if (empty(trim($data['product_name'] ?? ''))) {
        $errors[] = 'Product name is required.';
    }
    if (empty($data['category'])) {
        $errors[] = 'Category is required.';
    }
    if (!isset($data['stock_qty']) || (int) $data['stock_qty'] < 0) {
        $errors[] = 'Stock must be 0 or greater.';
    }
    if (empty($data['rental_price']) || (float) $data['rental_price'] <= 0) {
        $errors[] = 'Price must be greater than 0.';
    }
    return $errors;
}
?>
<?php

namespace App\Controllers;

use App\Models\Product;
use App\Utils\Response;
use App\Utils\Validator;

class ProductController {
    private $productModel;

    public function __construct() {
        $this->productModel = new Product();
    }

    public function index() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
        $offset = ($page - 1) * $perPage;

        $filters = [
            'search' => $_GET['search'] ?? null,
            'category_id' => $_GET['category_id'] ?? null,
            'type_id' => $_GET['type_id'] ?? null,
            'is_active' => isset($_GET['is_active']) ? $_GET['is_active'] : null,
            'limit' => $perPage,
            'offset' => $offset
        ];

        $products = $this->productModel->getProductsWithDetails($filters);
        $total = $this->productModel->countProducts($filters);

        Response::success([
            'data' => $products,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total)
            ]
        ]);
    }

    public function show($id) {
        $product = $this->productModel->findById($id);
        
        if (!$product) {
            Response::notFound('Product not found');
        }

        Response::success($product);
    }

    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['sku', 'name_en', 'unit_price', 'cost_price'])
                  ->numeric('unit_price')
                  ->numeric('cost_price')
                  ->positive('unit_price')
                  ->positive('cost_price');

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        // Check if SKU already exists
        if ($this->productModel->findBySku($data['sku'])) {
            Response::error('SKU already exists', 422);
        }

        $productData = [
            'sku' => $data['sku'],
            'barcode' => $data['barcode'] ?? null,
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'type_id' => $data['type_id'] ?? null,
            'unit_price' => $data['unit_price'],
            'cost_price' => $data['cost_price'],
            'unit' => $data['unit'] ?? 'piece',
            'min_stock_level' => $data['min_stock_level'] ?? 0,
            'is_active' => $data['is_active'] ?? 1
        ];

        $productId = $this->productModel->create($productData);
        $product = $this->productModel->findById($productId);

        Response::success($product, 'Product created successfully', 201);
    }

    public function update($id) {
        $product = $this->productModel->findById($id);
        
        if (!$product) {
            Response::notFound('Product not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['sku', 'name_en', 'unit_price', 'cost_price'])
                  ->numeric('unit_price')
                  ->numeric('cost_price')
                  ->positive('unit_price')
                  ->positive('cost_price');

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        // Check if SKU already exists for another product
        $existingProduct = $this->productModel->findBySku($data['sku']);
        if ($existingProduct && $existingProduct['id'] != $id) {
            Response::error('SKU already exists', 422);
        }

        $productData = [
            'sku' => $data['sku'],
            'barcode' => $data['barcode'] ?? null,
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'type_id' => $data['type_id'] ?? null,
            'unit_price' => $data['unit_price'],
            'cost_price' => $data['cost_price'],
            'unit' => $data['unit'] ?? 'piece',
            'min_stock_level' => $data['min_stock_level'] ?? 0,
            'is_active' => $data['is_active'] ?? 1
        ];

        $this->productModel->update($id, $productData);
        $updatedProduct = $this->productModel->findById($id);

        Response::success($updatedProduct, 'Product updated successfully');
    }

    public function delete($id) {
        $product = $this->productModel->findById($id);
        
        if (!$product) {
            Response::notFound('Product not found');
        }

        $this->productModel->delete($id);
        Response::success(null, 'Product deleted successfully');
    }
}

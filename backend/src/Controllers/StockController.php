<?php

namespace App\Controllers;

use App\Models\Stock;
use App\Models\StockMovement;
use App\Utils\Response;
use App\Utils\Validator;

class StockController {
    private $stockModel;
    private $movementModel;

    public function __construct() {
        $this->stockModel = new Stock();
        $this->movementModel = new StockMovement();
    }

    public function warehouseStock() {
        $stock = $this->stockModel->getWarehouseStock();
        Response::success($stock);
    }

    public function vanStock($vanId) {
        $stock = $this->stockModel->getVanStock($vanId);
        Response::success($stock);
    }

    public function locationStock($locationId) {
        $stock = $this->stockModel->getLocationStock($locationId);
        Response::success($stock);
    }

    public function allStock() {
        $stock = $this->stockModel->getAllStockByLocation();
        Response::success($stock);
    }

    public function movements() {
        $filters = [
            'product_id' => $_GET['product_id'] ?? null,
            'movement_type' => $_GET['movement_type'] ?? null,
            'from_date' => $_GET['from_date'] ?? null,
            'to_date' => $_GET['to_date'] ?? null,
            'limit' => $_GET['limit'] ?? 100
        ];

        $movements = $this->movementModel->getMovementsWithDetails($filters);
        Response::success($movements);
    }

    public function adjustStock() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['product_id', 'location_type', 'quantity'])
                  ->numeric('quantity');

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $productId = $data['product_id'];
        $locationType = $data['location_type']; // 'warehouse' or 'van'
        $locationId = $data['location_id'] ?? 0;
        $quantity = (int)$data['quantity'];
        $notes = $data['notes'] ?? null;

        try {
            // Set stock to exact quantity
            $this->stockModel->setStock($productId, $locationType, $locationId, $quantity);

            // Record stock movement
            $this->movementModel->create([
                'product_id' => $productId,
                'from_location_type' => 'warehouse',
                'from_location_id' => 0,
                'to_location_type' => $locationType,
                'to_location_id' => $locationId,
                'quantity' => $quantity,
                'movement_type' => 'adjustment',
                'notes' => $notes,
                'created_by' => $_SESSION['user_id'] ?? null
            ]);

            Response::success(null, 'Stock adjusted successfully');
        } catch (\Exception $e) {
            Response::error('Failed to adjust stock: ' . $e->getMessage(), 500);
        }
    }

    public function addStock() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['product_id', 'location_id', 'quantity'])
                  ->numeric('quantity')
                  ->positive('quantity');

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $productId = $data['product_id'];
        $locationId = $data['location_id'];
        $quantity = (int)$data['quantity'];
        $notes = $data['notes'] ?? null;

        try {
            // Add to existing stock using location-based approach
            $this->stockModel->updateStock($productId, 'location', $locationId, $quantity);

            // Record stock movement
            $this->movementModel->create([
                'product_id' => $productId,
                'from_location_type' => 'supplier',
                'from_location_id' => 0,
                'to_location_type' => 'location',
                'to_location_id' => $locationId,
                'quantity' => $quantity,
                'movement_type' => 'adjustment',
                'notes' => $notes,
                'created_by' => $_SESSION['user_id'] ?? null
            ]);

            Response::success(null, 'Stock added successfully');
        } catch (\Exception $e) {
            Response::error('Failed to add stock: ' . $e->getMessage(), 500);
        }
    }
}

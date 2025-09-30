<?php

namespace App\Controllers;

use App\Models\Stock;
use App\Models\StockMovement;
use App\Utils\Response;

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
}

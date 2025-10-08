<?php

namespace App\Controllers;

use App\Models\Transfer;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Utils\Response;
use App\Utils\Validator;
use PDO;

class TransferController {
    private $transferModel;
    private $stockModel;
    private $movementModel;

    public function __construct() {
        $this->transferModel = new Transfer();
        $this->stockModel = new Stock();
        $this->movementModel = new StockMovement();
    }

    public function index() {
        $filters = [
            'status' => $_GET['status'] ?? null,
            'from_date' => $_GET['from_date'] ?? null,
            'to_date' => $_GET['to_date'] ?? null
        ];

        $transfers = $this->transferModel->getTransfersWithDetails($filters);
        Response::success($transfers);
    }

    public function show($id) {
        $transfer = $this->transferModel->getTransferWithItems($id);
        
        if (!$transfer) {
            Response::notFound('Transfer not found');
        }

        Response::success($transfer);
    }

    public function store($user) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $errors = Validator::validate($data, [
                'from_location_id' => 'required|numeric',
                'to_location_id' => 'required|numeric',
                'from_location_type' => 'in:warehouse,van,location',
                'to_location_type' => 'in:warehouse,van,location',
                'items' => 'required|array',
                'items.*.product_id' => 'required|numeric',
                'items.*.quantity' => 'required|numeric|min:1'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            if (empty($data['items']) || !is_array($data['items'])) {
                Response::error('Transfer must have at least one item', 422);
                return;
            }

            try {
                $db = $this->transferModel->getDb();
                $db->beginTransaction();

                // Validate stock availability from source location
                $fromLocationType = $data['from_location_type'] ?? 'location';
                $fromLocationId = $data['from_location_id'];
                
                foreach ($data['items'] as $item) {
                    $stock = $this->stockModel->getProductStock(
                        $item['product_id'],
                        $fromLocationType,
                        $fromLocationId
                    );

                    if (!$stock || $stock['quantity'] < $item['quantity']) {
                        throw new \Exception("Insufficient stock for product ID {$item['product_id']}");
                    }
                }

                // Create transfer
                $transferData = [
                    'from_location_type' => $data['from_location_type'] ?? 'location',
                    'from_location_id' => $data['from_location_id'],
                    'to_location_type' => $data['to_location_type'] ?? 'location',
                    'to_location_id' => $data['to_location_id'],
                    'status' => 'completed',
                    'notes' => $data['notes'] ?? null,
                    'created_by' => $user['id']
                ];

                $transferId = $this->transferModel->create($transferData);

                // Create transfer items and update stock
                foreach ($data['items'] as $item) {
                    // Insert transfer item
                    $db->prepare("INSERT INTO transfer_items (transfer_id, product_id, quantity) VALUES (?, ?, ?)")
                       ->execute([$transferId, $item['product_id'], $item['quantity']]);

                    // Reduce source location stock
                    $this->stockModel->updateStock(
                        $item['product_id'], 
                        $fromLocationType, 
                        $fromLocationId, 
                        -$item['quantity']
                    );

                    // Increase destination location stock
                    $this->stockModel->updateStock(
                        $item['product_id'],
                        $data['to_location_type'] ?? 'location',
                        $data['to_location_id'],
                        $item['quantity']
                    );

                    // Record stock movement
                    $this->movementModel->create([
                        'product_id' => $item['product_id'],
                        'from_location_type' => $fromLocationType,
                        'from_location_id' => $fromLocationId,
                        'to_location_type' => $data['to_location_type'] ?? 'location',
                        'to_location_id' => $data['to_location_id'],
                        'quantity' => $item['quantity'],
                        'movement_type' => 'transfer',
                        'reference_id' => $transferId,
                        'created_by' => $user['id']
                    ]);
                }

                $db->commit();

                $transfer = $this->transferModel->getTransferWithItems($transferId);
                Response::success($transfer, 'Transfer completed successfully', 201);

            } catch (\Exception $e) {
                if (isset($db)) {
                    $db->rollBack();
                }
                Response::error($e->getMessage(), 500);
            }

        } catch (\Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }
}
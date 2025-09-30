<?php

namespace App\Controllers;

use App\Models\Invoice;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Utils\Response;
use App\Utils\Validator;

class InvoiceController {
    private $invoiceModel;
    private $stockModel;
    private $movementModel;

    public function __construct() {
        $this->invoiceModel = new Invoice();
        $this->stockModel = new Stock();
        $this->movementModel = new StockMovement();
    }

    public function index() {
        $filters = [
            'invoice_type' => $_GET['invoice_type'] ?? null,
            'payment_status' => $_GET['payment_status'] ?? null,
            'customer_id' => $_GET['customer_id'] ?? null,
            'van_id' => $_GET['van_id'] ?? null,
            'from_date' => $_GET['from_date'] ?? null,
            'to_date' => $_GET['to_date'] ?? null,
            'limit' => $_GET['limit'] ?? 50,
            'offset' => $_GET['offset'] ?? 0
        ];

        $invoices = $this->invoiceModel->getInvoicesWithDetails($filters);
        Response::success($invoices);
    }

    public function show($id) {
        $invoice = $this->invoiceModel->getInvoiceWithItems($id);
        
        if (!$invoice) {
            Response::notFound('Invoice not found');
        }

        Response::success($invoice);
    }

    public function createPurchase($user) {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['items']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        if (empty($data['items']) || !is_array($data['items'])) {
            Response::error('Invoice must have at least one item', 422);
        }

        try {
            $db = $this->invoiceModel->db;
            $db->beginTransaction();

            // Calculate totals
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $itemTotal -= $itemTotal * ($item['discount_percent'] ?? 0) / 100;
                $subtotal += $itemTotal;
            }

            $taxAmount = $subtotal * ($data['tax_percent'] ?? 0) / 100;
            $discountAmount = $data['discount_amount'] ?? 0;
            $totalAmount = $subtotal + $taxAmount - $discountAmount;

            // Create invoice
            $invoiceData = [
                'invoice_number' => $this->invoiceModel->generateInvoiceNumber('purchase'),
                'invoice_type' => 'purchase',
                'customer_id' => $data['customer_id'] ?? null,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'payment_status' => $this->calculatePaymentStatus($totalAmount, $data['paid_amount'] ?? 0),
                'notes' => $data['notes'] ?? null,
                'created_by' => $user['id']
            ];

            $invoiceId = $this->invoiceModel->create($invoiceData);

            // Create invoice items and update stock
            foreach ($data['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $itemTotal -= $itemTotal * ($item['discount_percent'] ?? 0) / 100;
                $itemTotal += $itemTotal * ($item['tax_percent'] ?? 0) / 100;

                // Insert invoice item
                $db->prepare("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)")
                   ->execute([
                       $invoiceId,
                       $item['product_id'],
                       $item['quantity'],
                       $item['unit_price'],
                       $item['discount_percent'] ?? 0,
                       $item['tax_percent'] ?? 0,
                       $itemTotal
                   ]);

                // Add to warehouse stock
                $this->stockModel->updateStock($item['product_id'], 'warehouse', 0, $item['quantity']);

                // Record stock movement
                $this->movementModel->create([
                    'product_id' => $item['product_id'],
                    'from_location_type' => 'supplier',
                    'from_location_id' => 0,
                    'to_location_type' => 'warehouse',
                    'to_location_id' => 0,
                    'quantity' => $item['quantity'],
                    'movement_type' => 'purchase',
                    'reference_type' => 'invoice',
                    'reference_id' => $invoiceId,
                    'created_by' => $user['id']
                ]);
            }

            $db->commit();

            $invoice = $this->invoiceModel->getInvoiceWithItems($invoiceId);
            Response::success($invoice, 'Purchase invoice created successfully', 201);

        } catch (\Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }

    public function createSales($user) {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['van_id', 'items']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        if (empty($data['items']) || !is_array($data['items'])) {
            Response::error('Invoice must have at least one item', 422);
        }

        try {
            $db = $this->invoiceModel->db;
            $db->beginTransaction();

            // Validate van stock
            foreach ($data['items'] as $item) {
                $stock = $this->stockModel->getProductStock(
                    $item['product_id'],
                    'van',
                    $data['van_id']
                );

                if (!$stock || $stock['quantity'] < $item['quantity']) {
                    throw new \Exception("Insufficient van stock for product ID {$item['product_id']}");
                }
            }

            // Calculate totals
            $subtotal = 0;
            foreach ($data['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $itemTotal -= $itemTotal * ($item['discount_percent'] ?? 0) / 100;
                $subtotal += $itemTotal;
            }

            $taxAmount = $subtotal * ($data['tax_percent'] ?? 0) / 100;
            $discountAmount = $data['discount_amount'] ?? 0;
            $totalAmount = $subtotal + $taxAmount - $discountAmount;

            // Create invoice
            $invoiceData = [
                'invoice_number' => $this->invoiceModel->generateInvoiceNumber('sales'),
                'invoice_type' => 'sales',
                'customer_id' => $data['customer_id'] ?? null,
                'van_id' => $data['van_id'],
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'payment_status' => $this->calculatePaymentStatus($totalAmount, $data['paid_amount'] ?? 0),
                'notes' => $data['notes'] ?? null,
                'created_by' => $user['id']
            ];

            $invoiceId = $this->invoiceModel->create($invoiceData);

            // Create invoice items and update stock
            foreach ($data['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $itemTotal -= $itemTotal * ($item['discount_percent'] ?? 0) / 100;
                $itemTotal += $itemTotal * ($item['tax_percent'] ?? 0) / 100;

                // Insert invoice item
                $db->prepare("INSERT INTO invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)")
                   ->execute([
                       $invoiceId,
                       $item['product_id'],
                       $item['quantity'],
                       $item['unit_price'],
                       $item['discount_percent'] ?? 0,
                       $item['tax_percent'] ?? 0,
                       $itemTotal
                   ]);

                // Reduce van stock
                $this->stockModel->updateStock($item['product_id'], 'van', $data['van_id'], -$item['quantity']);

                // Record stock movement
                $this->movementModel->create([
                    'product_id' => $item['product_id'],
                    'from_location_type' => 'van',
                    'from_location_id' => $data['van_id'],
                    'to_location_type' => 'customer',
                    'to_location_id' => $data['customer_id'] ?? 0,
                    'quantity' => $item['quantity'],
                    'movement_type' => 'sale',
                    'reference_type' => 'invoice',
                    'reference_id' => $invoiceId,
                    'created_by' => $user['id']
                ]);
            }

            $db->commit();

            $invoice = $this->invoiceModel->getInvoiceWithItems($invoiceId);
            Response::success($invoice, 'Sales invoice created successfully', 201);

        } catch (\Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }

    private function calculatePaymentStatus($total, $paid) {
        if ($paid <= 0) return 'unpaid';
        if ($paid >= $total) return 'paid';
        return 'partial';
    }
}

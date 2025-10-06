<?php

namespace App\Controllers;

use App\Models\PurchaseInvoice;
use App\Models\SalesInvoice;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Payment;
use App\Utils\Response;
use App\Utils\Validator;

class InvoiceController {
    private $purchaseInvoiceModel;
    private $salesInvoiceModel;
    private $stockModel;
    private $movementModel;
    private $paymentModel;

    public function __construct() {
        $this->purchaseInvoiceModel = new PurchaseInvoice();
        $this->salesInvoiceModel = new SalesInvoice();
        $this->stockModel = new Stock();
        $this->movementModel = new StockMovement();
        $this->paymentModel = new Payment();
    }

    public function index() {
        $invoiceType = $_GET['invoice_type'] ?? 'sales';
        
        $filters = [
            'search' => $_GET['search'] ?? null,
            'payment_status' => $_GET['payment_status'] ?? null,
            'customer_id' => $_GET['customer_id'] ?? null,
            'vendor_id' => $_GET['vendor_id'] ?? null,
            'van_id' => $_GET['van_id'] ?? null,
            'from_date' => $_GET['from_date'] ?? null,
            'to_date' => $_GET['to_date'] ?? null,
            'limit' => $_GET['limit'] ?? 10,
            'offset' => $_GET['offset'] ?? 0
        ];

        if ($invoiceType === 'purchase') {
            $invoices = $this->purchaseInvoiceModel->getInvoicesWithDetails($filters);
            $total = $this->purchaseInvoiceModel->getCount($filters);
        } else {
            $invoices = $this->salesInvoiceModel->getInvoicesWithDetails($filters);
            $total = $this->salesInvoiceModel->getCount($filters);
        }
        
        Response::success([
            'data' => $invoices,
            'pagination' => [
                'total' => $total,
                'limit' => (int)$filters['limit'],
                'offset' => (int)$filters['offset'],
                'page' => floor($filters['offset'] / $filters['limit']) + 1,
                'pages' => ceil($total / $filters['limit'])
            ]
        ]);
    }

    public function stats() {
        $purchaseCount = $this->purchaseInvoiceModel->getCount([]);
        $salesCount = $this->salesInvoiceModel->getCount([]);
        
        Response::success([
            'purchase_count' => $purchaseCount,
            'sales_count' => $salesCount
        ]);
    }

    public function show($id) {
        $invoiceType = $_GET['invoice_type'] ?? 'sales';
        
        if ($invoiceType === 'purchase') {
            $invoice = $this->purchaseInvoiceModel->getInvoiceWithItems($id);
        } else {
            $invoice = $this->salesInvoiceModel->getInvoiceWithItems($id);
        }
        
        if (!$invoice) {
            Response::notFound('Invoice not found');
            return;
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
            $db = $this->purchaseInvoiceModel->getDb();
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

            // Create purchase invoice
            $invoiceData = [
                'invoice_number' => $this->purchaseInvoiceModel->generateInvoiceNumber(),
                'vendor_id' => $data['vendor_id'] ?? null,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'paid_amount' => $data['paid_amount'] ?? 0,
                'payment_status' => $this->calculatePaymentStatus($totalAmount, $data['paid_amount'] ?? 0),
                'notes' => $data['notes'] ?? null,
                'created_by' => $user['id']
            ];

            $invoiceId = $this->purchaseInvoiceModel->create($invoiceData);

            // Create purchase invoice items and update stock
            foreach ($data['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $itemTotal -= $itemTotal * ($item['discount_percent'] ?? 0) / 100;
                $itemTotal += $itemTotal * ($item['tax_percent'] ?? 0) / 100;

                // Insert purchase invoice item
                $db->prepare("INSERT INTO purchase_invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total) 
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

                // Add to warehouse stock (purchase invoice adds to warehouse)
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

            // Payment tracking is handled in the invoice paid_amount field
            // Separate payments table is for additional payments only
            // if (isset($data['paid_amount']) && $data['paid_amount'] > 0) {
            //     $this->paymentModel->create([
            //         'invoice_id' => $invoiceId,
            //         'amount' => -$data['paid_amount'],
            //         'payment_method' => $data['payment_method'] ?? 'cash',
            //         'reference_number' => $data['reference_number'] ?? null,
            //         'notes' => 'Initial payment with purchase invoice',
            //         'created_by' => $user['id']
            //     ]);
            // }

            $db->commit();

            $invoice = $this->purchaseInvoiceModel->getInvoiceWithItems($invoiceId);
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
            $db = $this->salesInvoiceModel->getDb();
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

            // Create sales invoice
            $invoiceData = [
                'invoice_number' => $this->salesInvoiceModel->generateInvoiceNumber(),
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

            $invoiceId = $this->salesInvoiceModel->create($invoiceData);

            // Create sales invoice items and update stock
            foreach ($data['items'] as $item) {
                $itemTotal = $item['quantity'] * $item['unit_price'];
                $itemTotal -= $itemTotal * ($item['discount_percent'] ?? 0) / 100;
                $itemTotal += $itemTotal * ($item['tax_percent'] ?? 0) / 100;

                // Insert sales invoice item
                $db->prepare("INSERT INTO sales_invoice_items (invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total) 
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

            // Payment tracking is handled in the invoice paid_amount field
            // Separate payments table is for additional payments only
            // if (isset($data['paid_amount']) && $data['paid_amount'] > 0) {
            //     $this->paymentModel->create([
            //         'invoice_id' => $invoiceId,
            //         'amount' => $data['paid_amount'],
            //         'payment_method' => $data['payment_method'] ?? 'cash',
            //         'reference_number' => $data['reference_number'] ?? null,
            //         'notes' => 'Initial payment with sales invoice',
            //         'created_by' => $user['id']
            //     ]);
            // }

            $db->commit();

            $invoice = $this->salesInvoiceModel->getInvoiceWithItems($invoiceId);
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

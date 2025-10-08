<?php

namespace App\Controllers;

use App\Models\Payment;
use App\Models\PurchaseInvoice;
use App\Models\SalesInvoice;
use App\Utils\Response;
use App\Utils\Validator;

class PaymentController {
    private $paymentModel;
    private $purchaseInvoiceModel;
    private $salesInvoiceModel;

    public function __construct() {
        $this->paymentModel = new Payment();
        $this->purchaseInvoiceModel = new PurchaseInvoice();
        $this->salesInvoiceModel = new SalesInvoice();
    }

    public function index() {
        $invoiceId = $_GET['invoice_id'] ?? null;
        
        if ($invoiceId) {
            $payments = $this->paymentModel->findAll(['invoice_id' => $invoiceId], 'created_at DESC');
        } else {
            $payments = $this->paymentModel->findAll([], 'created_at DESC', 100);
        }

        Response::success($payments);
    }

    public function store($user) {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['invoice_id', 'invoice_type', 'amount', 'payment_method'])
                  ->numeric('amount')
                  ->positive('amount');

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $invoiceType = $data['invoice_type'];
        
        // Get invoice based on type
        if ($invoiceType === 'purchase') {
            $invoice = $this->purchaseInvoiceModel->findById($data['invoice_id']);
        } else {
            $invoice = $this->salesInvoiceModel->findById($data['invoice_id']);
        }
        
        if (!$invoice) {
            Response::notFound('Invoice not found');
        }

        // Check if payment exceeds remaining amount
        $remainingAmount = $invoice['total_amount'] - $invoice['paid_amount'];
        if ($data['amount'] > $remainingAmount) {
            Response::error('Payment amount exceeds remaining balance', 422);
        }

        try {
            $db = $this->paymentModel->getDb();
            $db->beginTransaction();

            // Create payment
            $paymentData = [
                'invoice_id' => $data['invoice_id'],
                'amount' => $data['amount'],
                'payment_method' => $data['payment_method'],
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $user['id']
            ];

            $paymentId = $this->paymentModel->create($paymentData);

            // Update invoice paid amount and status
            $newPaidAmount = $invoice['paid_amount'] + $data['amount'];
            $paymentStatus = 'partial';
            
            if ($newPaidAmount >= $invoice['total_amount']) {
                $paymentStatus = 'paid';
            } elseif ($newPaidAmount <= 0) {
                $paymentStatus = 'unpaid';
            }

            // Update the appropriate invoice model
            if ($invoiceType === 'purchase') {
                $this->purchaseInvoiceModel->update($data['invoice_id'], [
                    'paid_amount' => $newPaidAmount,
                    'payment_status' => $paymentStatus
                ]);
            } else {
                $this->salesInvoiceModel->update($data['invoice_id'], [
                    'paid_amount' => $newPaidAmount,
                    'payment_status' => $paymentStatus
                ]);
            }

            $db->commit();

            $payment = $this->paymentModel->findById($paymentId);
            Response::success($payment, 'Payment recorded successfully', 201);

        } catch (\Exception $e) {
            $db->rollBack();
            Response::error($e->getMessage(), 500);
        }
    }
}

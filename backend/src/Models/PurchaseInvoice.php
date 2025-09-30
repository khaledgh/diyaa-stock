<?php

namespace App\Models;

class PurchaseInvoice extends BaseModel {
    protected $table = 'purchase_invoices';

    public function getInvoicesWithDetails($filters = []) {
        $sql = "SELECT i.*, 
                       c.name as supplier_name,
                       u.full_name as created_by_name
                FROM purchase_invoices i
                LEFT JOIN customers c ON i.supplier_id = c.id
                LEFT JOIN users u ON i.created_by = u.id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['payment_status'])) {
            $sql .= " AND i.payment_status = :payment_status";
            $params['payment_status'] = $filters['payment_status'];
        }

        if (!empty($filters['supplier_id'])) {
            $sql .= " AND i.supplier_id = :supplier_id";
            $params['supplier_id'] = $filters['supplier_id'];
        }

        if (!empty($filters['from_date'])) {
            $sql .= " AND DATE(i.created_at) >= :from_date";
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $sql .= " AND DATE(i.created_at) <= :to_date";
            $params['to_date'] = $filters['to_date'];
        }

        $sql .= " ORDER BY i.created_at DESC";

        if (!empty($filters['limit'])) {
            $sql .= " LIMIT :limit OFFSET :offset";
            $params['limit'] = (int)$filters['limit'];
            $params['offset'] = (int)($filters['offset'] ?? 0);
        }

        return $this->query($sql, $params);
    }

    public function getInvoiceWithItems($id) {
        $sql = "SELECT i.*, 
                       c.name as supplier_name,
                       u.full_name as created_by_name
                FROM purchase_invoices i
                LEFT JOIN customers c ON i.supplier_id = c.id
                LEFT JOIN users u ON i.created_by = u.id
                WHERE i.id = ?";
        
        $invoice = $this->query($sql, [$id]);
        
        if (empty($invoice)) {
            return null;
        }
        
        $invoice = $invoice[0];
        
        // Get invoice items
        $itemsSql = "SELECT ii.*, p.sku, p.name_en, p.name_ar
                     FROM purchase_invoice_items ii
                     JOIN products p ON ii.product_id = p.id
                     WHERE ii.invoice_id = ?";
        
        $invoice['items'] = $this->query($itemsSql, [$id]);
        $invoice['invoice_type'] = 'purchase'; // For compatibility
        
        return $invoice;
    }

    public function generateInvoiceNumber() {
        $prefix = 'PUR-';
        $date = date('Ymd');
        
        $sql = "SELECT invoice_number FROM purchase_invoices 
                WHERE invoice_number LIKE ? 
                ORDER BY invoice_number DESC LIMIT 1";
        
        $result = $this->query($sql, [$prefix . $date . '%']);
        
        if (empty($result)) {
            return $prefix . $date . '-001';
        }
        
        $lastNumber = $result[0]['invoice_number'];
        $lastSequence = (int)substr($lastNumber, -3);
        $newSequence = str_pad($lastSequence + 1, 3, '0', STR_PAD_LEFT);
        
        return $prefix . $date . '-' . $newSequence;
    }

    public function updatePaidAmount($id, $amount) {
        $invoice = $this->findById($id);
        if (!$invoice) {
            return false;
        }

        $newPaidAmount = $invoice['paid_amount'] + $amount;
        $paymentStatus = 'unpaid';
        
        if ($newPaidAmount >= $invoice['total_amount']) {
            $paymentStatus = 'paid';
            $newPaidAmount = $invoice['total_amount'];
        } elseif ($newPaidAmount > 0) {
            $paymentStatus = 'partial';
        }

        $sql = "UPDATE purchase_invoices 
                SET paid_amount = ?, payment_status = ? 
                WHERE id = ?";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$newPaidAmount, $paymentStatus, $id]);
    }
}

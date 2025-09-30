<?php

namespace App\Models;

class Invoice extends BaseModel {
    protected $table = 'invoices';

    public function getInvoicesWithDetails($filters = []) {
        $sql = "SELECT i.*, 
                       c.name as customer_name,
                       v.name as van_name,
                       u.full_name as created_by_name
                FROM invoices i
                LEFT JOIN customers c ON i.customer_id = c.id
                LEFT JOIN vans v ON i.van_id = v.id
                LEFT JOIN users u ON i.created_by = u.id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['invoice_type'])) {
            $sql .= " AND i.invoice_type = :invoice_type";
            $params['invoice_type'] = $filters['invoice_type'];
        }

        if (!empty($filters['payment_status'])) {
            $sql .= " AND i.payment_status = :payment_status";
            $params['payment_status'] = $filters['payment_status'];
        }

        if (!empty($filters['customer_id'])) {
            $sql .= " AND i.customer_id = :customer_id";
            $params['customer_id'] = $filters['customer_id'];
        }

        if (!empty($filters['van_id'])) {
            $sql .= " AND i.van_id = :van_id";
            $params['van_id'] = $filters['van_id'];
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
            $sql .= " LIMIT " . intval($filters['limit']);
            if (!empty($filters['offset'])) {
                $sql .= " OFFSET " . intval($filters['offset']);
            }
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getInvoiceWithItems($invoiceId) {
        $invoice = $this->findById($invoiceId);
        if (!$invoice) return null;

        $sql = "SELECT ii.*, p.name_en, p.name_ar, p.sku, p.unit
                FROM invoice_items ii
                JOIN products p ON ii.product_id = p.id
                WHERE ii.invoice_id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$invoiceId]);
        $invoice['items'] = $stmt->fetchAll();

        // Get customer info
        if ($invoice['customer_id']) {
            $stmt = $this->db->prepare("SELECT * FROM customers WHERE id = ?");
            $stmt->execute([$invoice['customer_id']]);
            $invoice['customer'] = $stmt->fetch();
        }

        // Get van info
        if ($invoice['van_id']) {
            $stmt = $this->db->prepare("SELECT * FROM vans WHERE id = ?");
            $stmt->execute([$invoice['van_id']]);
            $invoice['van'] = $stmt->fetch();
        }

        // Get payments
        $stmt = $this->db->prepare("SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC");
        $stmt->execute([$invoiceId]);
        $invoice['payments'] = $stmt->fetchAll();

        return $invoice;
    }

    public function generateInvoiceNumber($type) {
        $prefix = $type === 'purchase' ? 'PUR' : 'SAL';
        $date = date('Ymd');
        
        $sql = "SELECT COUNT(*) as count FROM invoices 
                WHERE invoice_type = ? AND DATE(created_at) = CURDATE()";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$type]);
        $result = $stmt->fetch();
        
        $sequence = str_pad($result['count'] + 1, 4, '0', STR_PAD_LEFT);
        return "{$prefix}-{$date}-{$sequence}";
    }
}

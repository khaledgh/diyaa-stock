<?php

namespace App\Models;

class Vendor extends BaseModel {
    protected $table = 'vendors';

    public function getActiveVendors() {
        $sql = "SELECT * FROM vendors WHERE is_active = 1 ORDER BY name";
        return $this->query($sql);
    }

    public function getVendorsWithStats() {
        // Check which column exists in purchase_invoices table
        $checkSql = "SHOW COLUMNS FROM purchase_invoices LIKE 'vendor_id'";
        $result = $this->query($checkSql);
        $columnName = !empty($result) ? 'vendor_id' : 'supplier_id';
        
        $sql = "SELECT v.*, 
                       COUNT(DISTINCT pi.id) as total_purchases,
                       COALESCE(SUM(pi.total_amount), 0) as total_amount,
                       COALESCE(SUM(pi.total_amount - pi.paid_amount), 0) as outstanding_balance
                FROM vendors v
                LEFT JOIN purchase_invoices pi ON v.id = pi.$columnName
                WHERE v.is_active = 1
                GROUP BY v.id
                ORDER BY v.name";
        
        return $this->query($sql);
    }
}

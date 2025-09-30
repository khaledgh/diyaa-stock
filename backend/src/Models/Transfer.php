<?php

namespace App\Models;

class Transfer extends BaseModel {
    protected $table = 'transfers';

    public function getTransfersWithDetails($filters = []) {
        $sql = "SELECT t.*, 
                       u.full_name as created_by_name,
                       v.name as to_van_name
                FROM transfers t
                LEFT JOIN users u ON t.created_by = u.id
                LEFT JOIN vans v ON t.to_location_id = v.id AND t.to_location_type = 'van'
                WHERE 1=1";

        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND t.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['from_date'])) {
            $sql .= " AND DATE(t.created_at) >= :from_date";
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $sql .= " AND DATE(t.created_at) <= :to_date";
            $params['to_date'] = $filters['to_date'];
        }

        $sql .= " ORDER BY t.created_at DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTransferWithItems($transferId) {
        $transfer = $this->findById($transferId);
        if (!$transfer) return null;

        $sql = "SELECT ti.*, p.name_en, p.name_ar, p.sku, p.unit
                FROM transfer_items ti
                JOIN products p ON ti.product_id = p.id
                WHERE ti.transfer_id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$transferId]);
        $transfer['items'] = $stmt->fetchAll();

        return $transfer;
    }
}

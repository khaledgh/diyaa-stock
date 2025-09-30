<?php

namespace App\Models;

class StockMovement extends BaseModel {
    protected $table = 'stock_movements';

    public function getMovementsWithDetails($filters = []) {
        $sql = "SELECT sm.*, 
                       p.name_en, p.name_ar, p.sku,
                       u.full_name as created_by_name
                FROM stock_movements sm
                JOIN products p ON sm.product_id = p.id
                LEFT JOIN users u ON sm.created_by = u.id
                WHERE 1=1";

        $params = [];

        if (!empty($filters['product_id'])) {
            $sql .= " AND sm.product_id = :product_id";
            $params['product_id'] = $filters['product_id'];
        }

        if (!empty($filters['movement_type'])) {
            $sql .= " AND sm.movement_type = :movement_type";
            $params['movement_type'] = $filters['movement_type'];
        }

        if (!empty($filters['from_date'])) {
            $sql .= " AND DATE(sm.created_at) >= :from_date";
            $params['from_date'] = $filters['from_date'];
        }

        if (!empty($filters['to_date'])) {
            $sql .= " AND DATE(sm.created_at) <= :to_date";
            $params['to_date'] = $filters['to_date'];
        }

        $sql .= " ORDER BY sm.created_at DESC";

        if (!empty($filters['limit'])) {
            $sql .= " LIMIT " . intval($filters['limit']);
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}

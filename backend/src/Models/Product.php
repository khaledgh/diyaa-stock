<?php

namespace App\Models;

class Product extends BaseModel {
    protected $table = 'products';

    public function getProductsWithDetails($filters = []) {
        $sql = "SELECT p.*, 
                       c.name_en as category_name_en, c.name_ar as category_name_ar,
                       pt.name_en as type_name_en, pt.name_ar as type_name_ar,
                       COALESCE(s.quantity, 0) as warehouse_stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_types pt ON p.type_id = pt.id
                LEFT JOIN stock s ON p.id = s.product_id AND s.location_type = 'warehouse' AND s.location_id = 0
                WHERE 1=1";

        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (p.name_en LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)";
            $searchParam = '%' . $filters['search'] . '%';
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        if (!empty($filters['category_id'])) {
            $sql .= " AND p.category_id = ?";
            $params[] = $filters['category_id'];
        }

        if (!empty($filters['type_id'])) {
            $sql .= " AND p.type_id = ?";
            $params[] = $filters['type_id'];
        }

        if (isset($filters['is_active'])) {
            $sql .= " AND p.is_active = ?";
            $params[] = $filters['is_active'];
        }

        $sql .= " ORDER BY p.created_at DESC";

        // Add pagination
        if (!empty($filters['limit'])) {
            $sql .= " LIMIT ? OFFSET ?";
            $params[] = (int)$filters['limit'];
            $params[] = (int)($filters['offset'] ?? 0);
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function countProducts($filters = []) {
        $sql = "SELECT COUNT(*) as count FROM products p WHERE 1=1";
        $params = [];

        if (!empty($filters['search'])) {
            $sql .= " AND (p.name_en LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)";
            $searchParam = '%' . $filters['search'] . '%';
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }

        if (!empty($filters['category_id'])) {
            $sql .= " AND p.category_id = ?";
            $params[] = $filters['category_id'];
        }

        if (!empty($filters['type_id'])) {
            $sql .= " AND p.type_id = ?";
            $params[] = $filters['type_id'];
        }

        if (isset($filters['is_active'])) {
            $sql .= " AND p.is_active = ?";
            $params[] = $filters['is_active'];
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch()['count'];
    }

    public function findBySku($sku) {
        return $this->findOne(['sku' => $sku]);
    }
}

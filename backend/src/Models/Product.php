<?php

namespace App\Models;

class Product extends BaseModel {
    protected $table = 'products';

    public function getProductsWithDetails($filters = []) {
        $sql = "SELECT p.*, 
                       c.name_en as category_name_en, c.name_ar as category_name_ar,
                       pt.name_en as type_name_en, pt.name_ar as type_name_ar
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_types pt ON p.type_id = pt.id
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
        $products = $stmt->fetchAll();
        
        // Add stock by location for each product
        foreach ($products as &$product) {
            $stockSql = "SELECT s.quantity, l.name as location_name, l.type as location_type
                        FROM stock s
                        JOIN locations l ON s.location_id = l.id
                        WHERE s.product_id = ?
                        ORDER BY l.name";
            $stockStmt = $this->db->prepare($stockSql);
            $stockStmt->execute([$product['id']]);
            $product['stock_by_location'] = $stockStmt->fetchAll();
        }
        
        return $products;
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

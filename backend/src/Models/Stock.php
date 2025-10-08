<?php

namespace App\Models;

class Stock extends BaseModel {
    protected $table = 'stock';

    public function getWarehouseStock() {
        // Get stock from warehouse-type locations
        $sql = "SELECT s.*, p.sku, p.name_en, p.name_ar, p.unit, p.min_stock_level,
                       c.name_en as category_name_en, c.name_ar as category_name_ar,
                       l.name as location_name
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN locations l ON s.location_id = l.id
                WHERE l.type = 'warehouse'
                ORDER BY p.name_en";
        
        return $this->query($sql);
    }

    public function getLocationStock($locationId) {
        $sql = "SELECT s.*, p.sku, p.name_en, p.name_ar, p.unit, p.unit_price,
                       c.name_en as category_name_en, c.name_ar as category_name_ar,
                       l.name as location_name, l.type as location_type
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN locations l ON s.location_id = l.id
                WHERE s.location_id = ?
                ORDER BY p.name_en";
        
        return $this->query($sql, [$locationId]);
    }

    public function getVanStock($vanId) {
        // Get stock from van-type locations or locations linked to a van
        $sql = "SELECT s.*, p.sku, p.name_en, p.name_ar, p.unit, p.unit_price,
                       c.name_en as category_name_en, c.name_ar as category_name_ar,
                       l.name as location_name
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN locations l ON s.location_id = l.id
                WHERE l.van_id = ?
                ORDER BY p.name_en";
        
        return $this->query($sql, [$vanId]);
    }

    public function getProductStock($productId, $locationType, $locationId) {
        $sql = "SELECT * FROM stock 
                WHERE product_id = ? AND location_type = ? AND location_id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$productId, $locationType, $locationId]);
        return $stmt->fetch();
    }

    public function updateStock($productId, $locationType, $locationId, $quantity) {
        $existing = $this->getProductStock($productId, $locationType, $locationId);

        if ($existing) {
            $sql = "UPDATE stock SET quantity = quantity + ? 
                    WHERE product_id = ? AND location_type = ? AND location_id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$quantity, $productId, $locationType, $locationId]);
        } else {
            return $this->create([
                'product_id' => $productId,
                'location_type' => $locationType,
                'location_id' => $locationId,
                'quantity' => $quantity
            ]);
        }
    }

    public function setStock($productId, $locationType, $locationId, $quantity) {
        $existing = $this->getProductStock($productId, $locationType, $locationId);

        if ($existing) {
            $sql = "UPDATE stock SET quantity = ? 
                    WHERE product_id = ? AND location_type = ? AND location_id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$quantity, $productId, $locationType, $locationId]);
        } else {
            return $this->create([
                'product_id' => $productId,
                'location_type' => $locationType,
                'location_id' => $locationId,
                'quantity' => $quantity
            ]);
        }
    }

    public function getAllStockByLocation() {
        $sql = "SELECT 
                    p.id as product_id,
                    p.sku,
                    p.name_en,
                    p.name_ar,
                    p.unit,
                    c.name_en as category_name_en,
                    c.name_ar as category_name_ar,
                    GROUP_CONCAT(
                        CONCAT(l.name, ':', COALESCE(s.quantity, 0), ':', l.type)
                        ORDER BY l.name
                        SEPARATOR '|'
                    ) as location_quantities,
                    COALESCE(SUM(s.quantity), 0) as total_quantity
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN stock s ON p.id = s.product_id
                LEFT JOIN locations l ON s.location_id = l.id AND l.is_active = 1
                WHERE p.is_active = 1
                GROUP BY p.id, p.sku, p.name_en, p.name_ar, p.unit, 
                         c.name_en, c.name_ar
                ORDER BY p.name_en";
        
        return $this->query($sql);
    }
}

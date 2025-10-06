<?php

namespace App\Models;

class Stock extends BaseModel {
    protected $table = 'stock';

    public function getWarehouseStock() {
        $sql = "SELECT s.*, p.sku, p.name_en, p.name_ar, p.unit, p.min_stock_level,
                       c.name_en as category_name_en, c.name_ar as category_name_ar
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE s.location_type = 'warehouse' AND s.location_id = 0
                ORDER BY p.name_en";
        
        return $this->query($sql);
    }

    public function getVanStock($vanId) {
        $sql = "SELECT s.*, p.sku, p.name_en, p.name_ar, p.unit, p.unit_price,
                       c.name_en as category_name_en, c.name_ar as category_name_ar
                FROM stock s
                JOIN products p ON s.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE s.location_type = 'van' AND s.location_id = ?
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
                    COALESCE(warehouse.quantity, 0) as warehouse_quantity,
                    GROUP_CONCAT(
                        CONCAT(v.name, ':', COALESCE(van_stock.quantity, 0))
                        ORDER BY v.name
                        SEPARATOR '|'
                    ) as van_quantities,
                    COALESCE(warehouse.quantity, 0) + COALESCE(SUM(van_stock.quantity), 0) as total_quantity
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN stock warehouse ON p.id = warehouse.product_id 
                    AND warehouse.location_type = 'warehouse' 
                    AND warehouse.location_id = 0
                LEFT JOIN stock van_stock ON p.id = van_stock.product_id 
                    AND van_stock.location_type = 'van'
                LEFT JOIN vans v ON van_stock.location_id = v.id AND v.is_active = 1
                WHERE p.is_active = 1
                GROUP BY p.id, p.sku, p.name_en, p.name_ar, p.unit, 
                         c.name_en, c.name_ar, warehouse.quantity
                ORDER BY p.name_en";
        
        return $this->query($sql);
    }
}

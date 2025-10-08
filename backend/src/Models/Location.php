<?php

namespace App\Models;

class Location extends BaseModel {
    protected $table = 'locations';

    public function __construct() {
        parent::__construct();
    }

    public function getLocationsWithUsers() {
        $sql = "SELECT l.*, v.sales_rep_id as user_id, u.full_name as user_name, u.email as user_email, u.phone as user_phone
                FROM {$this->table} l
                LEFT JOIN vans v ON l.van_id = v.id
                LEFT JOIN users u ON v.sales_rep_id = u.id
                ORDER BY l.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getLocationWithUser($id) {
        $sql = "SELECT l.*, v.sales_rep_id as user_id, u.full_name as user_name, u.email as user_email, u.phone as user_phone
                FROM {$this->table} l
                LEFT JOIN vans v ON l.van_id = v.id
                LEFT JOIN users u ON v.sales_rep_id = u.id
                WHERE l.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }
}

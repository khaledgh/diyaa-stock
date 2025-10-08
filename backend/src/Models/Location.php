<?php

namespace App\Models;

class Location extends BaseModel {
    protected $table = 'locations';

    public function __construct() {
        parent::__construct();
    }

    public function getLocationsWithUsers() {
        $sql = "SELECT l.*, 
                       v.id as van_id_ref,
                       v.name as van_name,
                       v.sales_rep_id as user_id, 
                       u.full_name as user_name, 
                       u.email as user_email, 
                       u.phone as user_phone
                FROM {$this->table} l
                LEFT JOIN vans v ON l.van_id = v.id
                LEFT JOIN users u ON v.sales_rep_id = u.id
                ORDER BY l.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getLocationWithUser($id) {
        $sql = "SELECT l.*, 
                       v.id as van_id_ref,
                       v.name as van_name,
                       v.sales_rep_id as user_id, 
                       u.full_name as user_name, 
                       u.email as user_email, 
                       u.phone as user_phone
                FROM {$this->table} l
                LEFT JOIN vans v ON l.van_id = v.id
                LEFT JOIN users u ON v.sales_rep_id = u.id
                WHERE l.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getFilteredLocations($vanId = null, $type = null) {
        $sql = "SELECT l.*, 
                       v.id as van_id_ref,
                       v.name as van_name,
                       v.sales_rep_id as user_id, 
                       u.full_name as user_name, 
                       u.email as user_email, 
                       u.phone as user_phone
                FROM {$this->table} l
                LEFT JOIN vans v ON l.van_id = v.id
                LEFT JOIN users u ON v.sales_rep_id = u.id
                WHERE 1=1";
        
        $params = [];
        
        if ($vanId !== null) {
            $sql .= " AND l.van_id = ?";
            $params[] = $vanId;
        }
        
        if ($type !== null) {
            $sql .= " AND l.type = ?";
            $params[] = $type;
        }
        
        $sql .= " ORDER BY l.name ASC";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}

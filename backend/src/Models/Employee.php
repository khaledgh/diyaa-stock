<?php

namespace App\Models;

class Employee extends BaseModel {
    protected $table = 'employees';

    public function __construct() {
        parent::__construct();
    }

    public function findWithVan($id) {
        $sql = "SELECT e.*, v.id as van_id, v.name as van_name 
                FROM {$this->table} e 
                LEFT JOIN vans v ON v.employee_id = e.id 
                WHERE e.id = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function findAllWithVans() {
        $sql = "SELECT e.*, v.id as van_id, v.name as van_name 
                FROM {$this->table} e 
                LEFT JOIN vans v ON v.employee_id = e.id 
                ORDER BY e.name ASC";
        $stmt = $this->db->prepare($sql);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}

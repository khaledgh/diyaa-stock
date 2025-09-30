<?php

namespace App\Models;

class Van extends BaseModel {
    protected $table = 'vans';

    public function getVansWithSalesRep() {
        $sql = "SELECT v.*, u.full_name as sales_rep_name, u.email as sales_rep_email,
                       e.name as employee_name, e.phone as employee_phone
                FROM vans v
                LEFT JOIN users u ON v.sales_rep_id = u.id
                LEFT JOIN employees e ON v.employee_id = e.id
                ORDER BY v.name";

        return $this->query($sql);
    }

    public function getVansWithEmployees() {
        $sql = "SELECT v.*, e.name as employee_name, e.phone as employee_phone
                FROM vans v
                LEFT JOIN employees e ON v.employee_id = e.id
                WHERE v.is_active = 1
                ORDER BY v.name";

        return $this->query($sql);
    }
}

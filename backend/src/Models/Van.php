<?php

namespace App\Models;

class Van extends BaseModel {
    protected $table = 'vans';

    public function getVansWithSalesRep() {
        $sql = "SELECT v.*, u.full_name as sales_rep_name, u.email as sales_rep_email
                FROM vans v
                LEFT JOIN users u ON v.sales_rep_id = u.id
                ORDER BY v.name";
        
        return $this->query($sql);
    }
}

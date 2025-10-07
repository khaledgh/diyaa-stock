<?php

namespace App\Models;

class User extends BaseModel {
    protected $table = 'users';

    public function getUserWithRoles($userId) {
        // Get user with van_id if they are assigned as sales rep
        $sql = "SELECT u.*, v.id as van_id, v.name as van_name 
                FROM users u 
                LEFT JOIN vans v ON v.sales_rep_id = u.id AND v.is_active = 1
                WHERE u.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function findByEmail($email) {
        return $this->findOne(['email' => $email]);
    }
}

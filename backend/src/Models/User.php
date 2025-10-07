<?php

namespace App\Models;

class User extends BaseModel {
    protected $table = 'users';

    public function getUserWithRoles($userId) {
        // Get user with van_id if they are assigned as sales rep
        $sql = "SELECT u.*, 
                       v.id as van_id, 
                       v.name as van_name,
                       r.name as role
                FROM users u 
                LEFT JOIN vans v ON v.sales_rep_id = u.id AND v.is_active = 1
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON r.id = ur.role_id
                WHERE u.id = ?
                LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        $result = $stmt->fetch();
        
        // Debug logging
        error_log("User ID: " . $userId);
        error_log("Query result: " . json_encode($result));
        
        return $result;
    }

    public function findByEmail($email) {
        return $this->findOne(['email' => $email]);
    }
}

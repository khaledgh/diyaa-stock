<?php

namespace App\Models;

class User extends BaseModel {
    protected $table = 'users';

    public function getUserWithRoles($userId) {
        $sql = "SELECT u.*, GROUP_CONCAT(r.name) as roles, GROUP_CONCAT(r.permissions) as permissions
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                WHERE u.id = ?
                GROUP BY u.id";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function findByEmail($email) {
        return $this->findOne(['email' => $email]);
    }
}

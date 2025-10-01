<?php

namespace App\Models;

class User extends BaseModel {
    protected $table = 'users';

    public function getUserWithRoles($userId) {
        // Simply get user with role column (no separate roles table)
        $sql = "SELECT u.* FROM users u WHERE u.id = ?";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function findByEmail($email) {
        return $this->findOne(['email' => $email]);
    }
}

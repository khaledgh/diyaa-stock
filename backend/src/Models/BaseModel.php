<?php

namespace App\Models;

use App\Config\Database;
use PDO;

abstract class BaseModel {
    protected $db;
    protected $table;
    protected $primaryKey = 'id';

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getDb() {
        return $this->db;
    }

    public function findAll($conditions = [], $orderBy = null, $limit = null, $offset = null) {
        $sql = "SELECT * FROM {$this->table}";
        
        if (!empty($conditions)) {
            $where = [];
            foreach ($conditions as $key => $value) {
                $where[] = "$key = :$key";
            }
            $sql .= " WHERE " . implode(' AND ', $where);
        }

        if ($orderBy) {
            $sql .= " ORDER BY $orderBy";
        }

        if ($limit) {
            $sql .= " LIMIT $limit";
            if ($offset) {
                $sql .= " OFFSET $offset";
            }
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($conditions);
        return $stmt->fetchAll();
    }

    public function findById($id) {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function findOne($conditions) {
        $sql = "SELECT * FROM {$this->table} WHERE ";
        $where = [];
        foreach ($conditions as $key => $value) {
            $where[] = "$key = :$key";
        }
        $sql .= implode(' AND ', $where) . " LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($conditions);
        return $stmt->fetch();
    }

    public function create($data) {
        $fields = array_keys($data);
        $placeholders = array_map(function($field) { return ":$field"; }, $fields);

        $sql = "INSERT INTO {$this->table} (" . implode(', ', $fields) . ") 
                VALUES (" . implode(', ', $placeholders) . ")";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        foreach ($data as $key => $value) {
            $fields[] = "$key = :$key";
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $fields) . 
               " WHERE {$this->primaryKey} = :id";

        $data['id'] = $id;
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($data);
    }

    public function delete($id) {
        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([$id]);
    }

    public function count($conditions = []) {
        $sql = "SELECT COUNT(*) as count FROM {$this->table}";
        
        if (!empty($conditions)) {
            $where = [];
            foreach ($conditions as $key => $value) {
                $where[] = "$key = :$key";
            }
            $sql .= " WHERE " . implode(' AND ', $where);
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($conditions);
        $result = $stmt->fetch();
        return $result['count'];
    }

    public function query($sql, $params = []) {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function execute($sql, $params = []) {
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    // Transaction support for optimized batch operations
    public function beginTransaction() {
        return $this->db->beginTransaction();
    }

    public function commit() {
        return $this->db->commit();
    }

    public function rollback() {
        return $this->db->rollBack();
    }

    // Optimized batch insert
    public function batchInsert($data) {
        if (empty($data)) {
            return false;
        }

        $fields = array_keys($data[0]);
        $placeholders = '(' . implode(', ', array_fill(0, count($fields), '?')) . ')';
        $allPlaceholders = implode(', ', array_fill(0, count($data), $placeholders));

        $sql = "INSERT INTO {$this->table} (" . implode(', ', $fields) . ") VALUES $allPlaceholders";

        $values = [];
        foreach ($data as $row) {
            foreach ($fields as $field) {
                $values[] = $row[$field];
            }
        }

        $stmt = $this->db->prepare($sql);
        return $stmt->execute($values);
    }
}

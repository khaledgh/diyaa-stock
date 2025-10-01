<?php

namespace App\Controllers;

use App\Models\User;
use App\Utils\Response;
use App\Utils\Validator;
use App\Config\Permissions;

class UserController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    public function index() {
        try {
            $search = $_GET['search'] ?? null;
            
            $db = $this->userModel->getDb();
            
            // Query with role column
            if ($search) {
                $sql = "SELECT id, full_name, email, role, is_active, created_at FROM users 
                        WHERE full_name LIKE ? OR email LIKE ?
                        ORDER BY created_at DESC";
                $stmt = $db->prepare($sql);
                $searchTerm = "%{$search}%";
                $stmt->execute([$searchTerm, $searchTerm]);
                $users = $stmt->fetchAll();
            } else {
                $sql = "SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY created_at DESC";
                $stmt = $db->prepare($sql);
                $stmt->execute();
                $users = $stmt->fetchAll();
            }
            
            Response::success($users);
        } catch (\Exception $e) {
            Response::error('Failed to fetch users: ' . $e->getMessage(), 500);
        }
    }

    public function show($id) {
        $user = $this->userModel->findById($id);
        
        if (!$user) {
            Response::notFound('User not found');
        }

        // Remove password from response
        unset($user['password']);
        Response::success($user);
    }

    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $errors = Validator::validate($data, [
                'full_name' => 'required|string|max:100',
                'email' => 'required|email|max:100',
                'password' => 'required|string|min:6',
                'role' => 'string|in:admin,manager,sales,user'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check if email already exists
            $existingUser = $this->userModel->findByEmail($data['email']);
            if ($existingUser) {
                Response::error('Email already exists', 400);
                return;
            }

            $userData = [
                'full_name' => $data['full_name'],
                'email' => $data['email'],
                'password' => password_hash($data['password'], PASSWORD_DEFAULT),
                'role' => $data['role'] ?? 'user',
                'is_active' => $data['is_active'] ?? 1
            ];

            $userId = $this->userModel->create($userData);

            Response::success(['id' => $userId], 'User created successfully', 201);
        } catch (\Exception $e) {
            Response::error('Failed to create user: ' . $e->getMessage(), 500);
        }
    }

    public function update($id) {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $user = $this->userModel->findById($id);
            if (!$user) {
                Response::notFound('User not found');
                return;
            }

            $rules = [
                'full_name' => 'string|max:100',
                'email' => 'email|max:100',
                'role' => 'string|in:admin,manager,sales,user'
            ];

            if (isset($data['password']) && !empty($data['password'])) {
                $rules['password'] = 'string|min:6';
            }

            $errors = Validator::validate($data, $rules);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            // Check if email already exists for another user
            if (isset($data['email']) && $data['email'] !== $user['email']) {
                $existingUser = $this->userModel->findByEmail($data['email']);
                if ($existingUser && $existingUser['id'] != $id) {
                    Response::error('Email already exists', 400);
                    return;
                }
            }

            $userData = [];
            if (isset($data['full_name'])) $userData['full_name'] = $data['full_name'];
            if (isset($data['email'])) $userData['email'] = $data['email'];
            if (isset($data['role'])) $userData['role'] = $data['role'];
            if (isset($data['is_active'])) $userData['is_active'] = $data['is_active'];
            
            if (isset($data['password']) && !empty($data['password'])) {
                $userData['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            $this->userModel->update($id, $userData);

            Response::success(null, 'User updated successfully');
        } catch (\Exception $e) {
            Response::error('Failed to update user: ' . $e->getMessage(), 500);
        }
    }

    public function delete($id) {
        try {
            $user = $this->userModel->findById($id);
            
            if (!$user) {
                Response::notFound('User not found');
                return;
            }

            // Prevent deleting the last admin user
            if ($user['role'] === 'admin') {
                $db = $this->userModel->getDb();
                $sql = "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1";
                $stmt = $db->prepare($sql);
                $stmt->execute();
                $result = $stmt->fetch();
                
                if ($result['count'] <= 1) {
                    Response::error('Cannot delete the last admin user', 400);
                    return;
                }
            }

            $this->userModel->delete($id);
            Response::success(null, 'User deleted successfully');
        } catch (\Exception $e) {
            Response::error('Failed to delete user: ' . $e->getMessage(), 500);
        }
    }
}

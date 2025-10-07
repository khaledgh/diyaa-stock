<?php

namespace App\Controllers;

use App\Models\User;
use App\Models\Van;
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
            
            // Query with role column and van assignment
            if ($search) {
                $sql = "SELECT u.id, u.full_name, u.email, u.phone, u.position, u.role, u.is_active, u.created_at,
                               v.id as van_id, v.name as van_name
                        FROM users u
                        LEFT JOIN vans v ON v.sales_rep_id = u.id
                        WHERE u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
                        ORDER BY u.created_at DESC";
                $stmt = $db->prepare($sql);
                $searchTerm = "%{$search}%";
                $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
                $users = $stmt->fetchAll();
            } else {
                $sql = "SELECT u.id, u.full_name, u.email, u.phone, u.position, u.role, u.is_active, u.created_at,
                               v.id as van_id, v.name as van_name
                        FROM users u
                        LEFT JOIN vans v ON v.sales_rep_id = u.id
                        ORDER BY u.created_at DESC";
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
                'role' => 'string|in:admin,manager,sales,employee,user',
                'phone' => 'string|max:20',
                'position' => 'string|max:50'
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
                'phone' => $data['phone'] ?? null,
                'position' => $data['position'] ?? null,
                'hire_date' => $data['hire_date'] ?? null,
                'salary' => $data['salary'] ?? null,
                'address' => $data['address'] ?? null,
                'is_active' => $data['is_active'] ?? 1
            ];

            $userId = $this->userModel->create($userData);

            // If van_id is provided, assign user to van
            if (isset($data['van_id']) && $data['van_id']) {
                $db = $this->userModel->getDb();
                $stmt = $db->prepare("UPDATE vans SET sales_rep_id = ? WHERE id = ?");
                $stmt->execute([$userId, $data['van_id']]);
            }

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
                'role' => 'string|in:admin,manager,sales,employee,user',
                'phone' => 'string|max:20',
                'position' => 'string|max:50'
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
            if (isset($data['phone'])) $userData['phone'] = $data['phone'];
            if (isset($data['position'])) $userData['position'] = $data['position'];
            if (isset($data['hire_date'])) $userData['hire_date'] = $data['hire_date'];
            if (isset($data['salary'])) $userData['salary'] = $data['salary'];
            if (isset($data['address'])) $userData['address'] = $data['address'];
            if (isset($data['is_active'])) $userData['is_active'] = $data['is_active'];
            
            if (isset($data['password']) && !empty($data['password'])) {
                $userData['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
            }

            $this->userModel->update($id, $userData);

            // Update van assignment if provided
            if (isset($data['van_id'])) {
                $db = $this->userModel->getDb();
                // First, remove this user from any other van
                $stmt = $db->prepare("UPDATE vans SET sales_rep_id = NULL WHERE sales_rep_id = ?");
                $stmt->execute([$id]);
                
                // Then assign to new van if van_id is not null
                if ($data['van_id']) {
                    $stmt = $db->prepare("UPDATE vans SET sales_rep_id = ? WHERE id = ?");
                    $stmt->execute([$id, $data['van_id']]);
                }
            }

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

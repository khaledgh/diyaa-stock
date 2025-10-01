<?php

namespace App\Controllers;

use App\Models\User;
use App\Utils\Response;
use App\Utils\Validator;
use Firebase\JWT\JWT;
use App\Config\Permissions;

class AuthController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    private function getJWTSecret() {
        $envFile = __DIR__ . '/../../config/.env';
        if (!file_exists($envFile)) {
            $envFile = __DIR__ . '/../../config/.env.example';
        }

        $env = [];
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                list($key, $value) = explode('=', $line, 2);
                $env[trim($key)] = trim($value);
            }
        }
        return $env['JWT_SECRET'] ?? 'default-secret-key';
    }

    private function getJWTExpiry() {
        $envFile = __DIR__ . '/../../config/.env';
        if (!file_exists($envFile)) {
            $envFile = __DIR__ . '/../../config/.env.example';
        }

        $env = [];
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                list($key, $value) = explode('=', $line, 2);
                $env[trim($key)] = trim($value);
            }
        }
        return intval($env['JWT_EXPIRY'] ?? 86400);
    }

    public function login() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['email', 'password'])
                  ->email('email');

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $user = $this->userModel->findByEmail($data['email']);

        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Invalid credentials', 401);
        }

        if (!$user['is_active']) {
            Response::error('Account is inactive', 403);
        }

        // Get user with roles and permissions
        $userWithRoles = $this->userModel->getUserWithRoles($user['id']);

        // Parse permissions
        $permissions = [];
        if ($userWithRoles['permissions']) {
            $permissionSets = explode(',', $userWithRoles['permissions']);
            foreach ($permissionSets as $set) {
                $perms = json_decode($set, true);
                if (is_array($perms)) {
                    $permissions = array_merge($permissions, $perms);
                }
            }
        }

        // Generate JWT token
        $payload = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'iat' => time(),
            'exp' => time() + $this->getJWTExpiry()
        ];

        $token = JWT::encode($payload, $this->getJWTSecret(), 'HS256');

        // Remove password from response
        unset($userWithRoles['password']);
        
        // Get user role and permissions
        $userRole = $userWithRoles['role'] ?? 'user';
        $userPermissions = Permissions::getPermissionsForRole($userRole);
        $allowedNavigation = Permissions::getNavigationForRole($userRole);
        
        $userWithRoles['permissions'] = $userPermissions;
        $userWithRoles['navigation'] = $allowedNavigation;

        Response::success([
            'token' => $token,
            'user' => $userWithRoles
        ], 'Login successful');
    }

    public function me($user) {
        unset($user['password']);
        Response::success($user);
    }
}

<?php

namespace App\Middleware;

use App\Config\Database;
use App\Utils\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class Auth {
    private static function getJWTSecret() {
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

    public static function check() {
        $headers = getallheaders();
        $token = null;

        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $token = $matches[1];
            }
        }

        if (!$token) {
            Response::unauthorized('No token provided');
        }

        try {
            $decoded = JWT::decode($token, new Key(self::getJWTSecret(), 'HS256'));
            
            // Verify token in database
            $db = Database::getInstance()->getConnection();
            $stmt = $db->prepare("
                SELECT u.* 
                FROM users u
                WHERE u.id = ? AND u.is_active = 1
            ");
            $stmt->execute([$decoded->user_id]);
            $user = $stmt->fetch();

            if (!$user) {
                Response::unauthorized('Invalid token');
            }

            // Get permissions based on role
            require_once __DIR__ . '/../Config/Permissions.php';
            $userRole = $user['role'] ?? 'user';
            $user['permissions'] = \App\Config\Permissions::getPermissionsForRole($userRole);
            $user['navigation'] = \App\Config\Permissions::getNavigationForRole($userRole);
            
            unset($user['password']);

            return $user;
        } catch (\Exception $e) {
            Response::unauthorized('Invalid or expired token: ' . $e->getMessage());
        }
    }

    public static function hasPermission($user, $permission) {
        if (in_array('all', $user['permissions'])) {
            return true;
        }
        return in_array($permission, $user['permissions']);
    }

    public static function hasRole($user, $role) {
        return in_array($role, $user['roles']);
    }
}

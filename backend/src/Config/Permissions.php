<?php

namespace App\Config;

class Permissions {
    /**
     * Define permissions for each role
     * Format: 'permission_name' => ['role1', 'role2']
     */
    public static function getRolePermissions() {
        return [
            // Dashboard
            'view_dashboard' => ['admin', 'manager', 'sales', 'user'],
            
            // Products
            'view_products' => ['admin', 'manager', 'sales', 'user'],
            'create_products' => ['admin', 'manager'],
            'edit_products' => ['admin', 'manager'],
            'delete_products' => ['admin'],
            
            // Customers
            'view_customers' => ['admin', 'manager', 'sales'],
            'create_customers' => ['admin', 'manager', 'sales'],
            'edit_customers' => ['admin', 'manager', 'sales'],
            'delete_customers' => ['admin', 'manager'],
            
            // Employees
            'view_employees' => ['admin', 'manager'],
            'create_employees' => ['admin', 'manager'],
            'edit_employees' => ['admin', 'manager'],
            'delete_employees' => ['admin'],
            
            // Users (System Users)
            'view_users' => ['admin'],
            'create_users' => ['admin'],
            'edit_users' => ['admin'],
            'delete_users' => ['admin'],
            
            // Vans
            'view_vans' => ['admin', 'manager', 'sales'],
            'create_vans' => ['admin', 'manager'],
            'edit_vans' => ['admin', 'manager'],
            'delete_vans' => ['admin'],
            
            // Stock
            'view_stock' => ['admin', 'manager', 'sales'],
            'manage_stock' => ['admin', 'manager'],
            
            // Transfers
            'view_transfers' => ['admin', 'manager', 'sales'],
            'create_transfers' => ['admin', 'manager'],
            'approve_transfers' => ['admin', 'manager'],
            
            // Invoices
            'view_invoices' => ['admin', 'manager', 'sales'],
            'create_invoices' => ['admin', 'manager', 'sales'],
            'edit_invoices' => ['admin', 'manager'],
            'delete_invoices' => ['admin'],
            
            // Payments
            'view_payments' => ['admin', 'manager', 'sales'],
            'create_payments' => ['admin', 'manager', 'sales'],
            'edit_payments' => ['admin', 'manager'],
            'delete_payments' => ['admin'],
            
            // Reports
            'view_reports' => ['admin', 'manager'],
            'export_reports' => ['admin', 'manager'],
            
            // Settings
            'view_settings' => ['admin'],
            'edit_settings' => ['admin'],
            
            // POS
            'access_pos' => ['admin', 'manager', 'sales'],
        ];
    }

    /**
     * Check if a role has a specific permission
     */
    public static function hasPermission($role, $permission) {
        $permissions = self::getRolePermissions();
        
        if (!isset($permissions[$permission])) {
            return false;
        }
        
        return in_array($role, $permissions[$permission]);
    }

    /**
     * Get all permissions for a role
     */
    public static function getPermissionsForRole($role) {
        $permissions = self::getRolePermissions();
        $rolePermissions = [];
        
        foreach ($permissions as $permission => $roles) {
            if (in_array($role, $roles)) {
                $rolePermissions[] = $permission;
            }
        }
        
        return $rolePermissions;
    }

    /**
     * Get navigation items based on role
     */
    public static function getNavigationForRole($role) {
        $allNavigation = [
            ['name' => 'dashboard', 'permission' => 'view_dashboard'],
            ['name' => 'pos', 'permission' => 'access_pos'],
            ['name' => 'products', 'permission' => 'view_products'],
            ['name' => 'customers', 'permission' => 'view_customers'],
            ['name' => 'employees', 'permission' => 'view_employees'],
            ['name' => 'users', 'permission' => 'view_users'],
            ['name' => 'vans', 'permission' => 'view_vans'],
            ['name' => 'stock', 'permission' => 'view_stock'],
            ['name' => 'transfers', 'permission' => 'view_transfers'],
            ['name' => 'invoices', 'permission' => 'view_invoices'],
            ['name' => 'payments', 'permission' => 'view_payments'],
            ['name' => 'reports', 'permission' => 'view_reports'],
            ['name' => 'settings', 'permission' => 'view_settings'],
        ];
        
        $allowedNavigation = [];
        foreach ($allNavigation as $item) {
            if (self::hasPermission($role, $item['permission'])) {
                $allowedNavigation[] = $item['name'];
            }
        }
        
        return $allowedNavigation;
    }
}

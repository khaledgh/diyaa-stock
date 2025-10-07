-- ============================================
-- Merge Employees into Users Table
-- This migration adds employee fields to users table
-- and migrates data from employees to users
-- ============================================

-- Step 1: Add employee fields to users table
ALTER TABLE `users` 
ADD COLUMN `phone` VARCHAR(20) NULL AFTER `email`,
ADD COLUMN `position` VARCHAR(50) NULL AFTER `phone`,
ADD COLUMN `hire_date` DATE NULL AFTER `position`,
ADD COLUMN `salary` DECIMAL(10,2) NULL AFTER `hire_date`,
ADD COLUMN `address` TEXT NULL AFTER `salary`,
ADD COLUMN `emergency_contact` VARCHAR(100) NULL AFTER `address`,
ADD COLUMN `emergency_phone` VARCHAR(20) NULL AFTER `emergency_contact`;

-- Step 2: Migrate existing employees to users
-- Create users for employees that don't have user accounts
INSERT INTO `users` (
    `full_name`, 
    `email`, 
    `phone`, 
    `position`, 
    `hire_date`, 
    `salary`, 
    `address`, 
    `emergency_contact`, 
    `emergency_phone`,
    `password`, 
    `role`, 
    `is_active`, 
    `created_at`
)
SELECT 
    e.`name` as full_name,
    COALESCE(e.`email`, CONCAT(LOWER(REPLACE(e.`name`, ' ', '')), '@company.local')) as email,
    e.`phone`,
    e.`position`,
    e.`hire_date`,
    e.`salary`,
    e.`address`,
    e.`emergency_contact`,
    e.`emergency_phone`,
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' as password, -- default: password
    'employee' as role,
    1 as is_active,
    NOW() as created_at
FROM `employees` e
WHERE NOT EXISTS (
    SELECT 1 FROM `users` u 
    WHERE u.`email` = e.`email` 
    OR u.`full_name` = e.`name`
);

-- Step 3: Update vans table to reference users instead of employees
-- First, create a mapping of employee_id to user_id
UPDATE `vans` v
INNER JOIN `employees` e ON v.`employee_id` = e.`id`
INNER JOIN `users` u ON (u.`email` = e.`email` OR u.`full_name` = e.`name`)
SET v.`sales_rep_id` = u.`id`
WHERE v.`employee_id` IS NOT NULL;

-- Step 4: Drop the employee_id column from vans (optional - keep for now for safety)
-- ALTER TABLE `vans` DROP COLUMN `employee_id`;

-- Step 5: Update stock_movements created_by to reference users
-- This should already be using user IDs, but let's verify

-- Step 6: Drop employees table (ONLY after verifying all data is migrated)
-- DROP TABLE IF EXISTS `employees`;

-- ============================================
-- Verification Queries
-- ============================================

-- Check users with employee data
SELECT 
    u.id,
    u.full_name,
    u.email,
    u.phone,
    u.position,
    u.role,
    v.id as van_id,
    v.name as van_name
FROM users u
LEFT JOIN vans v ON v.sales_rep_id = u.id
WHERE u.position IS NOT NULL
ORDER BY u.full_name;

-- Check vans assignment
SELECT 
    v.id,
    v.name as van_name,
    v.employee_id as old_employee_id,
    v.sales_rep_id as user_id,
    u.full_name as sales_rep_name,
    u.email as sales_rep_email
FROM vans v
LEFT JOIN users u ON v.sales_rep_id = u.id
ORDER BY v.name;

-- ============================================
-- Rollback (if needed)
-- ============================================
-- ALTER TABLE `users` 
-- DROP COLUMN `phone`,
-- DROP COLUMN `position`,
-- DROP COLUMN `hire_date`,
-- DROP COLUMN `salary`,
-- DROP COLUMN `address`,
-- DROP COLUMN `emergency_contact`,
-- DROP COLUMN `emergency_phone`;

-- =============================================
-- FIX EXISTING TABLES - UPDATE SCHEMA
-- Use this if you already have purchase_invoices table
-- but it has supplier_id instead of vendor_id
-- =============================================

USE stock_management;

-- =============================================
-- STEP 1: CREATE VENDORS TABLE (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(191),
    address TEXT,
    tax_number VARCHAR(100),
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(10, 2) DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name(191)),
    INDEX idx_company (company_name(191)),
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 2: INSERT SAMPLE VENDORS
-- =============================================

INSERT IGNORE INTO vendors (id, name, company_name, phone, email, address, payment_terms, is_active) VALUES
(1, 'Al-Noor Supplies', 'Al-Noor Trading LLC', '+966501111111', 'info@alnoor.com', 'Industrial Area, Riyadh', 'Net 30', 1),
(2, 'Global Electronics', 'Global Electronics Co.', '+966502222222', 'sales@globalelec.com', 'Tech District, Jeddah', 'Net 15', 1),
(3, 'Fresh Foods Distributor', 'Fresh Foods Ltd.', '+966503333333', 'orders@freshfoods.com', 'Food Market, Dammam', 'COD', 1);

-- =============================================
-- STEP 3: CREATE CUSTOMERS TABLE (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(191),
    address TEXT,
    tax_number VARCHAR(100),
    credit_limit DECIMAL(10, 2) DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name(191)),
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 4: FIX purchase_invoices TABLE
-- Check if supplier_id exists and rename to vendor_id
-- =============================================

-- Check if supplier_id column exists
SET @supplier_id_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'stock_management' 
    AND table_name = 'purchase_invoices' 
    AND column_name = 'supplier_id'
);

-- Check if vendor_id column exists
SET @vendor_id_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'stock_management' 
    AND table_name = 'purchase_invoices' 
    AND column_name = 'vendor_id'
);

-- If supplier_id exists but vendor_id doesn't, rename it
SET @sql = IF(@supplier_id_exists > 0 AND @vendor_id_exists = 0,
    'ALTER TABLE purchase_invoices CHANGE COLUMN supplier_id vendor_id INT',
    'SELECT "Column already correct or table does not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- STEP 5: DROP OLD FOREIGN KEY (IF EXISTS)
-- =============================================

-- Drop old foreign key constraint if it exists
SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE table_schema = 'stock_management'
    AND table_name = 'purchase_invoices'
    AND constraint_name = 'purchase_invoices_ibfk_1'
);

SET @sql = IF(@fk_exists > 0,
    'ALTER TABLE purchase_invoices DROP FOREIGN KEY purchase_invoices_ibfk_1',
    'SELECT "Foreign key does not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- STEP 6: ADD NEW FOREIGN KEY TO VENDORS
-- =============================================

-- Add foreign key to vendors table
SET @fk_to_vendors_exists = (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE table_schema = 'stock_management'
    AND table_name = 'purchase_invoices'
    AND constraint_name = 'fk_purchase_invoices_vendor'
);

SET @sql = IF(@fk_to_vendors_exists = 0,
    'ALTER TABLE purchase_invoices ADD CONSTRAINT fk_purchase_invoices_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL',
    'SELECT "Foreign key to vendors already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- STEP 7: UPDATE INDEX NAME (IF NEEDED)
-- =============================================

-- Drop old index if exists
SET @idx_supplier_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = 'stock_management'
    AND table_name = 'purchase_invoices'
    AND index_name = 'idx_supplier'
);

SET @sql = IF(@idx_supplier_exists > 0,
    'ALTER TABLE purchase_invoices DROP INDEX idx_supplier',
    'SELECT "Index idx_supplier does not exist" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new index for vendor_id
SET @idx_vendor_exists = (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = 'stock_management'
    AND table_name = 'purchase_invoices'
    AND index_name = 'idx_vendor'
);

SET @sql = IF(@idx_vendor_exists = 0,
    'ALTER TABLE purchase_invoices ADD INDEX idx_vendor (vendor_id)',
    'SELECT "Index idx_vendor already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- STEP 8: ADD ROLE COLUMN TO USERS (IF NOT EXISTS)
-- =============================================

SET @role_column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'stock_management' 
    AND table_name = 'users' 
    AND column_name = 'role'
);

SET @sql = IF(@role_column_exists = 0,
    'ALTER TABLE users ADD COLUMN role ENUM(''admin'', ''manager'', ''sales'', ''user'') DEFAULT ''user'' AFTER is_active',
    'SELECT "Column role already exists in users table" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- STEP 9: VERIFY CHANGES
-- =============================================

SELECT 'Migration completed successfully!' as status;

-- Show current structure
SELECT 
    'purchase_invoices' as table_name,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY
FROM information_schema.columns
WHERE table_schema = 'stock_management'
AND table_name = 'purchase_invoices'
AND COLUMN_NAME IN ('vendor_id', 'supplier_id')
ORDER BY ORDINAL_POSITION;

-- Show vendor count
SELECT 
    (SELECT COUNT(*) FROM vendors) as total_vendors,
    (SELECT COUNT(*) FROM customers) as total_customers,
    (SELECT COUNT(*) FROM purchase_invoices) as total_purchase_invoices;

-- =============================================
-- NOTES:
-- =============================================
-- This script will:
-- 1. Create vendors table if it doesn't exist
-- 2. Rename supplier_id to vendor_id in purchase_invoices
-- 3. Update foreign keys to reference vendors table
-- 4. Update indexes
-- 5. Add role column to users table
-- 
-- Safe to run multiple times - all operations check before executing
-- =============================================

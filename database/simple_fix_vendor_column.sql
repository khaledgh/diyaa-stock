-- =============================================
-- SIMPLE FIX - Rename supplier_id to vendor_id
-- Run this step by step to avoid errors
-- =============================================

USE stock_management;

-- =============================================
-- STEP 1: CREATE VENDORS TABLE
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
-- STEP 3: CREATE CUSTOMERS TABLE
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
-- STEP 4: DROP FOREIGN KEYS FROM purchase_invoices
-- (Do this before renaming column)
-- =============================================

-- Drop all foreign keys that might reference supplier_id
ALTER TABLE purchase_invoices DROP FOREIGN KEY IF EXISTS purchase_invoices_ibfk_1;
ALTER TABLE purchase_invoices DROP FOREIGN KEY IF EXISTS fk_purchase_invoices_supplier;
ALTER TABLE purchase_invoices DROP FOREIGN KEY IF EXISTS fk_purchase_invoices_vendor;

-- =============================================
-- STEP 5: DROP OLD INDEX
-- =============================================

ALTER TABLE purchase_invoices DROP INDEX IF EXISTS idx_supplier;
ALTER TABLE purchase_invoices DROP INDEX IF EXISTS idx_vendor;

-- =============================================
-- STEP 6: RENAME COLUMN supplier_id to vendor_id
-- =============================================

ALTER TABLE purchase_invoices 
CHANGE COLUMN supplier_id vendor_id INT;

-- =============================================
-- STEP 7: ADD NEW INDEX
-- =============================================

ALTER TABLE purchase_invoices 
ADD INDEX idx_vendor (vendor_id);

-- =============================================
-- STEP 8: ADD FOREIGN KEY TO VENDORS
-- =============================================

ALTER TABLE purchase_invoices 
ADD CONSTRAINT fk_purchase_invoices_vendor 
FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- =============================================
-- STEP 9: ADD ROLE COLUMN TO USERS (IF NOT EXISTS)
-- =============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role ENUM('admin', 'manager', 'sales', 'user') DEFAULT 'user' AFTER is_active;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Migration completed successfully!' as status;

-- Show the column structure
DESCRIBE purchase_invoices;

-- Show vendor count
SELECT 
    (SELECT COUNT(*) FROM vendors) as total_vendors,
    (SELECT COUNT(*) FROM customers) as total_customers,
    (SELECT COUNT(*) FROM purchase_invoices) as total_purchase_invoices;

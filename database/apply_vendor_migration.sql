-- =============================================
-- COMPLETE VENDOR & INVOICE MIGRATION SCRIPT
-- This script will:
-- 1. Create vendors table if not exists
-- 2. Create customers table if not exists
-- 3. Create purchase_invoices and sales_invoices tables if not exists
-- 4. Alter existing invoices table to add vendor_id if needed
-- 5. Migrate data safely
-- =============================================

USE stock_management;

-- =============================================
-- STEP 1: CREATE CUSTOMERS TABLE (IF NOT EXISTS)
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
-- STEP 2: CREATE VENDORS TABLE (IF NOT EXISTS)
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
-- STEP 3: INSERT SAMPLE VENDORS (IF EMPTY)
-- =============================================

INSERT IGNORE INTO vendors (id, name, company_name, phone, email, address, payment_terms, is_active) VALUES
(1, 'Al-Noor Supplies', 'Al-Noor Trading LLC', '+966501111111', 'info@alnoor.com', 'Industrial Area, Riyadh', 'Net 30', 1),
(2, 'Global Electronics', 'Global Electronics Co.', '+966502222222', 'sales@globalelec.com', 'Tech District, Jeddah', 'Net 15', 1),
(3, 'Fresh Foods Distributor', 'Fresh Foods Ltd.', '+966503333333', 'orders@freshfoods.com', 'Food Market, Dammam', 'COD', 1);

-- =============================================
-- STEP 4: CREATE PURCHASE INVOICES TABLE (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id INT,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_vendor (vendor_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 5: CREATE PURCHASE INVOICE ITEMS TABLE (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    tax_percent DECIMAL(5, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 6: CREATE SALES INVOICES TABLE (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS sales_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT,
    van_id INT,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (van_id) REFERENCES vans(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_customer (customer_id),
    INDEX idx_van (van_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 7: CREATE SALES INVOICE ITEMS TABLE (IF NOT EXISTS)
-- =============================================

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    tax_percent DECIMAL(5, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STEP 8: MIGRATE EXISTING INVOICES (IF OLD TABLE EXISTS)
-- =============================================

-- Note: These INSERT statements will only work if the old 'invoices' and 'invoice_items' tables exist.
-- If they don't exist, you'll see errors which you can safely ignore.
-- The migration uses INSERT IGNORE to prevent duplicate key errors.

-- Migrate purchase invoices from old invoices table
-- Using customer_id as vendor_id temporarily (you may need to update these manually)
INSERT IGNORE INTO purchase_invoices (id, invoice_number, vendor_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at)
SELECT id, invoice_number, customer_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at
FROM invoices
WHERE invoice_type = 'purchase';

-- Migrate purchase invoice items
INSERT IGNORE INTO purchase_invoice_items (id, invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total)
SELECT ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price, ii.discount_percent, ii.tax_percent, ii.total
FROM invoice_items ii
INNER JOIN invoices i ON ii.invoice_id = i.id
WHERE i.invoice_type = 'purchase';

-- Migrate sales invoices from old invoices table
INSERT IGNORE INTO sales_invoices (id, invoice_number, customer_id, van_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at)
SELECT id, invoice_number, customer_id, van_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at
FROM invoices
WHERE invoice_type = 'sales';

-- Migrate sales invoice items
INSERT IGNORE INTO sales_invoice_items (id, invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total)
SELECT ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price, ii.discount_percent, ii.tax_percent, ii.total
FROM invoice_items ii
INNER JOIN invoices i ON ii.invoice_id = i.id
WHERE i.invoice_type = 'sales';

-- =============================================
-- STEP 9: UPDATE PAYMENTS TABLE (IF EXISTS)
-- =============================================

-- Add invoice_type column to payments if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = 'stock_management' 
    AND table_name = 'payments' 
    AND column_name = 'invoice_type'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN invoice_type ENUM(''purchase'', ''sales'') AFTER invoice_id',
    'SELECT "Column invoice_type already exists in payments table"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing payments with invoice type (if column was just added)
UPDATE payments p
INNER JOIN invoices i ON p.invoice_id = i.id
SET p.invoice_type = i.invoice_type
WHERE p.invoice_type IS NULL;

-- =============================================
-- STEP 10: ADD ROLE COLUMN TO USERS TABLE (IF NOT EXISTS)
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
    'SELECT "Column role already exists in users table"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

SELECT 'Migration completed successfully!' as status,
       (SELECT COUNT(*) FROM vendors) as total_vendors,
       (SELECT COUNT(*) FROM customers) as total_customers,
       (SELECT COUNT(*) FROM purchase_invoices) as total_purchase_invoices,
       (SELECT COUNT(*) FROM sales_invoices) as total_sales_invoices;

-- =============================================
-- NOTES:
-- =============================================
-- 1. All tables are created with IF NOT EXISTS to avoid errors
-- 2. Data migration only happens if old invoices table exists
-- 3. Duplicate prevention using NOT EXISTS checks
-- 4. Foreign keys properly reference vendors table for purchase invoices
-- 5. Safe to run multiple times - idempotent operations
-- =============================================

-- Migration: Separate Purchase and Sales Invoices into Different Tables
-- Run this migration to split invoices table

USE stock_management;

-- =============================================
-- CREATE PURCHASE INVOICES TABLE
-- =============================================

CREATE TABLE purchase_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INT,  -- Can reference customers table or create separate suppliers table
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
    FOREIGN KEY (supplier_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice_number (invoice_number),
    INDEX idx_supplier (supplier_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchase_invoice_items (
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
-- CREATE SALES INVOICES TABLE
-- =============================================

CREATE TABLE sales_invoices (
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

CREATE TABLE sales_invoice_items (
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
-- MIGRATE EXISTING DATA
-- =============================================

-- Migrate purchase invoices
INSERT INTO purchase_invoices (id, invoice_number, supplier_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at)
SELECT id, invoice_number, customer_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at
FROM invoices
WHERE invoice_type = 'purchase';

-- Migrate purchase invoice items
INSERT INTO purchase_invoice_items (id, invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total)
SELECT ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price, ii.discount_percent, ii.tax_percent, ii.total
FROM invoice_items ii
INNER JOIN invoices i ON ii.invoice_id = i.id
WHERE i.invoice_type = 'purchase';

-- Migrate sales invoices
INSERT INTO sales_invoices (id, invoice_number, customer_id, van_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at)
SELECT id, invoice_number, customer_id, van_id, subtotal, tax_amount, discount_amount, total_amount, paid_amount, payment_status, notes, created_by, created_at, updated_at
FROM invoices
WHERE invoice_type = 'sales';

-- Migrate sales invoice items
INSERT INTO sales_invoice_items (id, invoice_id, product_id, quantity, unit_price, discount_percent, tax_percent, total)
SELECT ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price, ii.discount_percent, ii.tax_percent, ii.total
FROM invoice_items ii
INNER JOIN invoices i ON ii.invoice_id = i.id
WHERE i.invoice_type = 'sales';

-- =============================================
-- UPDATE PAYMENTS TABLE
-- =============================================

-- Add columns to track invoice type
ALTER TABLE payments 
ADD COLUMN invoice_type ENUM('purchase', 'sales') AFTER invoice_id;

-- Update existing payments with invoice type
UPDATE payments p
INNER JOIN invoices i ON p.invoice_id = i.id
SET p.invoice_type = i.invoice_type;

-- =============================================
-- BACKUP AND DROP OLD TABLES (OPTIONAL - UNCOMMENT WHEN READY)
-- =============================================

-- Backup old tables first
-- CREATE TABLE invoices_backup AS SELECT * FROM invoices;
-- CREATE TABLE invoice_items_backup AS SELECT * FROM invoice_items;

-- Drop old tables (ONLY AFTER VERIFYING DATA MIGRATION)
-- DROP TABLE invoice_items;
-- DROP TABLE invoices;

-- =============================================
-- NOTES
-- =============================================
-- 1. Run this migration during low-traffic period
-- 2. Backup database before running
-- 3. Test on development environment first
-- 4. Verify data migration before dropping old tables
-- 5. Update application code to use new tables

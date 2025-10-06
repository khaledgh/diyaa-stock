-- =============================================
-- FRESH INSTALLATION - VENDOR TABLES ONLY
-- Use this if you DON'T have old invoices to migrate
-- This creates all vendor-related tables from scratch
-- =============================================

USE stock_management;

-- =============================================
-- CREATE CUSTOMERS TABLE
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
-- CREATE VENDORS TABLE
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
-- INSERT SAMPLE VENDORS
-- =============================================

INSERT IGNORE INTO vendors (id, name, company_name, phone, email, address, payment_terms, is_active) VALUES
(1, 'Al-Noor Supplies', 'Al-Noor Trading LLC', '+966501111111', 'info@alnoor.com', 'Industrial Area, Riyadh', 'Net 30', 1),
(2, 'Global Electronics', 'Global Electronics Co.', '+966502222222', 'sales@globalelec.com', 'Tech District, Jeddah', 'Net 15', 1),
(3, 'Fresh Foods Distributor', 'Fresh Foods Ltd.', '+966503333333', 'orders@freshfoods.com', 'Food Market, Dammam', 'COD', 1);

-- =============================================
-- CREATE PURCHASE INVOICES TABLE
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
-- CREATE PURCHASE INVOICE ITEMS TABLE
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
-- CREATE SALES INVOICES TABLE
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
-- CREATE SALES INVOICE ITEMS TABLE
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
-- ADD ROLE COLUMN TO USERS (IF NOT EXISTS)
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
-- COMPLETION MESSAGE
-- =============================================

SELECT 'Fresh installation completed successfully!' as status,
       (SELECT COUNT(*) FROM vendors) as total_vendors,
       (SELECT COUNT(*) FROM customers) as total_customers,
       (SELECT COUNT(*) FROM purchase_invoices) as total_purchase_invoices,
       (SELECT COUNT(*) FROM sales_invoices) as total_sales_invoices;

-- Add Customers and Vendors/Suppliers Tables
-- Run this migration to add missing tables

USE stock_management;

-- =============================================
-- CUSTOMERS TABLE
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
-- VENDORS/SUPPLIERS TABLE
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
-- INSERT SAMPLE DATA
-- =============================================

-- Insert Sample Customers (if not exists)
INSERT IGNORE INTO customers (id, name, phone, email, address, is_active) VALUES
(1, 'ABC Trading Co.', '+1234567893', 'abc@trading.com', '123 Main St, City', 1),
(2, 'XYZ Retail Store', '+1234567894', 'xyz@retail.com', '456 Market St, City', 1);

-- Insert Sample Vendors
INSERT INTO vendors (name, company_name, phone, email, address, payment_terms, is_active) VALUES
('Al-Noor Supplies', 'Al-Noor Trading LLC', '+966501111111', 'info@alnoor.com', 'Industrial Area, Riyadh', 'Net 30', 1),
('Global Electronics', 'Global Electronics Co.', '+966502222222', 'sales@globalelec.com', 'Tech District, Jeddah', 'Net 15', 1),
('Fresh Foods Distributor', 'Fresh Foods Ltd.', '+966503333333', 'orders@freshfoods.com', 'Food Market, Dammam', 'COD', 1);

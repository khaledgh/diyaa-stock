-- Stock & Van Sales Management System Database Schema
-- MySQL 5.7+

CREATE DATABASE IF NOT EXISTS stock_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stock_management;

-- =============================================
-- USERS & ROLES
-- =============================================

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(191) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PRODUCTS & CATEGORIES
-- =============================================

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE product_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL UNIQUE,
    barcode VARCHAR(100),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    category_id INT,
    type_id INT,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(50) DEFAULT 'piece',
    min_stock_level INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (type_id) REFERENCES product_types(id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_barcode (barcode),
    INDEX idx_category (category_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- VANS & STOCK
-- =============================================

CREATE TABLE vans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plate_number VARCHAR(50),
    owner_type ENUM('company', 'rental') DEFAULT 'company',
    sales_rep_id INT,
    employee_id INT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_rep_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    INDEX idx_sales_rep (sales_rep_id),
    INDEX idx_employee (employee_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    location_type ENUM('warehouse', 'van') NOT NULL,
    location_id INT DEFAULT 0, -- 0 for warehouse, van_id for vans
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_location (product_id, location_type, location_id),
    INDEX idx_location (location_type, location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    from_location_type ENUM('warehouse', 'van', 'supplier', 'customer'),
    from_location_id INT DEFAULT 0,
    to_location_type ENUM('warehouse', 'van', 'supplier', 'customer'),
    to_location_id INT DEFAULT 0,
    quantity INT NOT NULL,
    movement_type ENUM('transfer', 'purchase', 'sale', 'adjustment') NOT NULL,
    reference_type VARCHAR(50), -- 'invoice', 'transfer'
    reference_id INT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_product (product_id),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TRANSFERS
-- =============================================

CREATE TABLE transfers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    from_location_type ENUM('warehouse', 'van') NOT NULL,
    from_location_id INT DEFAULT 0,
    to_location_type ENUM('warehouse', 'van') NOT NULL,
    to_location_id INT NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE transfer_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transfer_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- CUSTOMERS
-- =============================================

-- =============================================
-- EMPLOYEES
-- =============================================

CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(191),
    phone VARCHAR(50),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name(191)),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- LOCATIONS
-- =============================================

CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    type ENUM('warehouse', 'branch', 'van') NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name(191)),
    INDEX idx_type (type),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INVOICES
-- =============================================

CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_type ENUM('purchase', 'sales') NOT NULL,
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
    INDEX idx_type (invoice_type),
    INDEX idx_customer (customer_id),
    INDEX idx_van (van_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0.00,
    tax_percent DECIMAL(5, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PAYMENTS
-- =============================================

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'bank_transfer', 'other') DEFAULT 'cash',
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_invoice (invoice_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INVOICE TEMPLATES
-- =============================================

CREATE TABLE invoice_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_type ENUM('a4', 'thermal_80mm', 'thermal_58mm') DEFAULT 'a4',
    html_content TEXT NOT NULL,
    is_default TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SETTINGS
-- =============================================

CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SEED DATA
-- =============================================

-- Insert Roles
INSERT INTO roles (name, display_name, permissions) VALUES
('admin', 'Administrator', '["all"]'),
('stock_manager', 'Stock Manager', '["products.view", "products.create", "products.edit", "stock.view", "stock.transfer", "invoices.purchase"]'),
('sales_rep', 'Sales Representative', '["products.view", "stock.view", "invoices.sales", "customers.view", "customers.create"]');

-- Insert Default Admin User (password: admin123)
INSERT INTO users (email, password, full_name, phone, is_active) VALUES
('admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+1234567890', 1),
('manager@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Stock Manager', '+1234567891', 1),
('sales@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Sales Representative', '+1234567892', 1);

-- Assign Roles to Users
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- Admin
(2, 2), -- Stock Manager
(3, 3); -- Sales Rep

-- Insert Categories
INSERT INTO categories (name_en, name_ar, is_active) VALUES
('Electronics', 'إلكترونيات', 1),
('Food & Beverages', 'أطعمة ومشروبات', 1),
('Clothing', 'ملابس', 1),
('Home & Garden', 'منزل وحديقة', 1);

-- Insert Product Types
INSERT INTO product_types (name_en, name_ar, is_active) VALUES
('Retail', 'تجزئة', 1),
('Wholesale', 'جملة', 1),
('Service', 'خدمة', 1);

-- Insert Sample Products
INSERT INTO products (sku, barcode, name_en, name_ar, category_id, type_id, unit_price, cost_price, unit, min_stock_level, is_active) VALUES
('PROD-001', '1234567890123', 'Laptop Computer', 'كمبيوتر محمول', 1, 1, 999.99, 750.00, 'piece', 5, 1),
('PROD-002', '1234567890124', 'Wireless Mouse', 'ماوس لاسلكي', 1, 1, 29.99, 15.00, 'piece', 20, 1),
('PROD-003', '1234567890125', 'Coffee Beans 1kg', 'حبوب قهوة 1 كجم', 2, 1, 15.99, 10.00, 'kg', 50, 1),
('PROD-004', '1234567890126', 'T-Shirt', 'تي شيرت', 3, 1, 19.99, 8.00, 'piece', 100, 1);

-- Insert Sample Employees
INSERT INTO employees (name, email, phone, position, hire_date, salary, is_active) VALUES
('Ahmed Hassan', 'ahmed.hassan@company.com', '+966501234567', 'Sales Representative', '2024-01-15', 3500.00, 1),
('Fatima Al-Rashid', 'fatima.rashid@company.com', '+966501234568', 'Delivery Driver', '2024-02-01', 2800.00, 1),
('Omar Al-Mansouri', 'omar.mansouri@company.com', '+966501234569', 'Warehouse Manager', '2023-12-01', 4000.00, 1);

-- Insert Sample Locations
INSERT INTO locations (name, address, phone, type, is_active) VALUES
('Main Warehouse', 'Industrial Area, Riyadh, Saudi Arabia', '+966114567890', 'warehouse', 1),
('North Branch', 'King Fahd Road, Riyadh, Saudi Arabia', '+966114567891', 'branch', 1),
('South Branch', 'Prince Sultan Road, Jeddah, Saudi Arabia', '+966126543210', 'branch', 1);

-- Insert Sample Vans
INSERT INTO vans (name, plate_number, owner_type, sales_rep_id, employee_id, is_active) VALUES
('Van 1 - North Route', 'ABC-123', 'company', 3, 1, 1),
('Van 2 - South Route', 'XYZ-789', 'company', 3, 2, 1);

-- Initialize Warehouse Stock
INSERT INTO stock (product_id, location_type, location_id, quantity) VALUES
(1, 'warehouse', 0, 50),
(2, 'warehouse', 0, 200),
(3, 'warehouse', 0, 500),
(4, 'warehouse', 0, 1000);

-- Insert Sample Customers
INSERT INTO customers (name, phone, email, address, is_active) VALUES
('ABC Trading Co.', '+1234567893', 'abc@trading.com', '123 Main St, City', 1),
('XYZ Retail Store', '+1234567894', 'xyz@retail.com', '456 Market St, City', 1);

-- Insert Default Invoice Templates
INSERT INTO invoice_templates (name, template_type, html_content, is_default, is_active) VALUES
('A4 Standard Template', 'a4', '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { text-align: right; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{company_name}}</h1>
        <p>{{company_address}}</p>
    </div>
    <div class="invoice-info">
        <p><strong>Invoice #:</strong> {{invoice_number}}</p>
        <p><strong>Date:</strong> {{invoice_date}}</p>
        <p><strong>Customer:</strong> {{customer_name}}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            {{items}}
        </tbody>
    </table>
    <div class="total">
        <p>Subtotal: {{subtotal}}</p>
        <p>Tax: {{tax}}</p>
        <p>Total: {{total}}</p>
    </div>
</body>
</html>', 1, 1),

('Thermal 80mm Template', 'thermal_80mm', '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: 80mm auto; margin: 0; }
        body { font-family: Arial, sans-serif; width: 80mm; margin: 0; padding: 5mm; font-size: 12px; }
        .center { text-align: center; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; font-size: 11px; }
        .total { font-weight: bold; font-size: 14px; }
    </style>
</head>
<body>
    <div class="center">
        <strong>{{company_name}}</strong><br>
        {{company_address}}
    </div>
    <div class="line"></div>
    <p>Invoice: {{invoice_number}}<br>
    Date: {{invoice_date}}<br>
    Customer: {{customer_name}}</p>
    <div class="line"></div>
    <table>
        {{items}}
    </table>
    <div class="line"></div>
    <div class="center total">
        Total: {{total}}
    </div>
    <div class="center">Thank you!</div>
</body>
</html>', 0, 1);

-- Insert System Settings
INSERT INTO settings (setting_key, setting_value, setting_type) VALUES
('company_name', 'Stock Management Co.', 'string'),
('company_address', '123 Business St, City, Country', 'string'),
('company_phone', '+1234567890', 'string'),
('company_email', 'info@stockmanagement.com', 'string'),
('tax_rate', '15', 'number'),
('currency', 'USD', 'string'),
('currency_symbol', '$', 'string');

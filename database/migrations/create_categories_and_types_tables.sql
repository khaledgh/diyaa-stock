-- Create Categories and Product Types tables
-- This separates categories and types into their own tables for better management

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name_en (name_en),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PRODUCT TYPES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS product_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name_en (name_en),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- UPDATE PRODUCTS TABLE
-- =============================================
-- Add foreign keys to products table for category and type
ALTER TABLE products 
ADD COLUMN category_id INT NULL AFTER name_ar,
ADD COLUMN type_id INT NULL AFTER category_id,
ADD CONSTRAINT fk_products_category 
    FOREIGN KEY (category_id) REFERENCES categories(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE,
ADD CONSTRAINT fk_products_type 
    FOREIGN KEY (type_id) REFERENCES product_types(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;

-- Add indexes for better performance
CREATE INDEX idx_category_id ON products(category_id);
CREATE INDEX idx_type_id ON products(type_id);

-- =============================================
-- MIGRATE EXISTING DATA (if any)
-- =============================================
-- Insert unique categories from products table
INSERT INTO categories (name_en, name_ar)
SELECT DISTINCT category, category 
FROM products 
WHERE category IS NOT NULL AND category != ''
ON DUPLICATE KEY UPDATE name_en = name_en;

-- Insert unique types from products table
INSERT INTO product_types (name_en, name_ar)
SELECT DISTINCT type, type 
FROM products 
WHERE type IS NOT NULL AND type != ''
ON DUPLICATE KEY UPDATE name_en = name_en;

-- Update products to reference the new tables
UPDATE products p
INNER JOIN categories c ON p.category = c.name_en
SET p.category_id = c.id
WHERE p.category IS NOT NULL;

UPDATE products p
INNER JOIN product_types pt ON p.type = pt.name_en
SET p.type_id = pt.id
WHERE p.type IS NOT NULL;

-- Optional: Remove old category and type columns after migration
-- ALTER TABLE products DROP COLUMN category;
-- ALTER TABLE products DROP COLUMN type;

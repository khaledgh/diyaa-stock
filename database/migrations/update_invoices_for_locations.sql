-- Update invoice tables to support location-based system

-- Check and add location_id to sales_invoices table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sales_invoices' 
    AND COLUMN_NAME = 'location_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE sales_invoices ADD COLUMN location_id INT DEFAULT NULL AFTER customer_id', 
    'SELECT "Column location_id already exists in sales_invoices"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add location_id to purchase_invoices table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_invoices' 
    AND COLUMN_NAME = 'location_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE purchase_invoices ADD COLUMN location_id INT DEFAULT NULL AFTER invoice_number', 
    'SELECT "Column location_id already exists in purchase_invoices"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add vendor_id to purchase_invoices table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_invoices' 
    AND COLUMN_NAME = 'vendor_id');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE purchase_invoices ADD COLUMN vendor_id INT DEFAULT NULL AFTER location_id', 
    'SELECT "Column vendor_id already exists in purchase_invoices"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for sales_invoices location_id
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sales_invoices' 
    AND CONSTRAINT_NAME = 'fk_sales_invoice_location');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE sales_invoices ADD CONSTRAINT fk_sales_invoice_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL', 
    'SELECT "Foreign key fk_sales_invoice_location already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for purchase_invoices location_id
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_invoices' 
    AND CONSTRAINT_NAME = 'fk_purchase_invoice_location');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE purchase_invoices ADD CONSTRAINT fk_purchase_invoice_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL', 
    'SELECT "Foreign key fk_purchase_invoice_location already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for purchase_invoices vendor_id
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_invoices' 
    AND CONSTRAINT_NAME = 'fk_purchase_invoice_vendor');

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE purchase_invoices ADD CONSTRAINT fk_purchase_invoice_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL', 
    'SELECT "Foreign key fk_purchase_invoice_vendor already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing sales invoices to use location_id from van_id
-- This assumes van_id maps to a location with type='van'
UPDATE sales_invoices si
INNER JOIN locations l ON l.van_id = si.van_id AND l.type = 'van'
SET si.location_id = l.id
WHERE si.location_id IS NULL AND si.van_id IS NOT NULL;

-- Add index for sales_invoices location_id
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'sales_invoices' 
    AND INDEX_NAME = 'idx_sales_invoices_location');

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_sales_invoices_location ON sales_invoices(location_id)', 
    'SELECT "Index idx_sales_invoices_location already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for purchase_invoices location_id
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_invoices' 
    AND INDEX_NAME = 'idx_purchase_invoices_location');

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_purchase_invoices_location ON purchase_invoices(location_id)', 
    'SELECT "Index idx_purchase_invoices_location already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for purchase_invoices vendor_id
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'purchase_invoices' 
    AND INDEX_NAME = 'idx_purchase_invoices_vendor');

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_purchase_invoices_vendor ON purchase_invoices(vendor_id)', 
    'SELECT "Index idx_purchase_invoices_vendor already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

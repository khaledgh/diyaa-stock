-- Update payments table to support both purchase and sales invoices

-- Drop the old foreign key constraint
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND CONSTRAINT_NAME = 'payments_ibfk_1');

SET @sql = IF(@fk_exists > 0, 
    'ALTER TABLE payments DROP FOREIGN KEY payments_ibfk_1', 
    'SELECT "Foreign key payments_ibfk_1 does not exist"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add invoice_type column to payments table
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'invoice_type');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE payments ADD COLUMN invoice_type ENUM(''purchase'', ''sales'') NOT NULL DEFAULT ''sales'' AFTER invoice_id', 
    'SELECT "Column invoice_type already exists in payments"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing payments to have invoice_type = 'sales' (assuming old payments were sales)
UPDATE payments 
SET invoice_type = 'sales' 
WHERE invoice_type IS NULL OR invoice_type = '';

-- Note: We cannot add foreign keys because invoice_id now references different tables
-- based on invoice_type. The application will handle referential integrity.

-- Add invoice_date field to purchase_invoices table
-- This allows editing the invoice date separately from creation date

ALTER TABLE purchase_invoices 
ADD COLUMN invoice_date DATE NULL;

-- Update existing records to use created_at as invoice_date
UPDATE purchase_invoices 
SET invoice_date = DATE(created_at) 
WHERE invoice_date IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE purchase_invoices 
MODIFY COLUMN invoice_date DATE NOT NULL;

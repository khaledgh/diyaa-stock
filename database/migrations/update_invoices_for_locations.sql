-- Update invoice tables to support location-based system

-- Add location_id to sales_invoices table (if not exists)
ALTER TABLE sales_invoices 
ADD COLUMN IF NOT EXISTS location_id INT DEFAULT NULL AFTER customer_id,
ADD CONSTRAINT fk_sales_invoice_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- Add vendor_id to purchase_invoices table (if not exists)
ALTER TABLE purchase_invoices 
ADD COLUMN IF NOT EXISTS vendor_id INT DEFAULT NULL AFTER invoice_number,
ADD CONSTRAINT fk_purchase_invoice_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;

-- Update existing sales invoices to use location_id from van_id
-- This assumes van_id maps to a location with type='van'
UPDATE sales_invoices si
INNER JOIN locations l ON l.van_id = si.van_id AND l.type = 'van'
SET si.location_id = l.id
WHERE si.location_id IS NULL AND si.van_id IS NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_location ON sales_invoices(location_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_vendor ON purchase_invoices(vendor_id);

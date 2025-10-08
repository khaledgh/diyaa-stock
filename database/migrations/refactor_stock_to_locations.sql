-- =============================================
-- Refactor Stock Table to Use Locations
-- This migration changes stock from warehouse/van to location-based
-- =============================================

-- Step 1: Add location_id column if it doesn't exist (it already exists)
-- The stock table already has location_id, but we need to change the logic

-- Step 2: Update stock table to remove location_type enum restriction
-- We'll keep location_type for backward compatibility but change it to just 'location'
ALTER TABLE `stock` 
MODIFY COLUMN `location_type` ENUM('warehouse', 'van', 'location') NOT NULL DEFAULT 'location';

-- Step 3: Migrate existing warehouse stock to location-based
-- First, ensure we have a main warehouse location
INSERT INTO `locations` (name, address, type, is_active, created_at)
SELECT 'Main Warehouse', 'Main warehouse location', 'warehouse', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE type = 'warehouse' LIMIT 1);

-- Get the warehouse location ID
SET @warehouse_location_id = (SELECT id FROM `locations` WHERE type = 'warehouse' ORDER BY id ASC LIMIT 1);

-- Step 4: Update existing warehouse stock (location_id = 0) to use the warehouse location
UPDATE `stock` 
SET location_type = 'location', 
    location_id = @warehouse_location_id
WHERE location_type = 'warehouse' AND location_id = 0;

-- Step 5: Update existing van stock to use location-based approach
-- For each van, create or link to a location
UPDATE `stock` s
INNER JOIN `vans` v ON s.location_id = v.id AND s.location_type = 'van'
LEFT JOIN `locations` l ON l.van_id = v.id
SET s.location_type = 'location',
    s.location_id = COALESCE(l.id, s.location_id)
WHERE s.location_type = 'van';

-- Step 6: Create locations for vans that don't have one
INSERT INTO `locations` (name, type, van_id, is_active, created_at)
SELECT 
    CONCAT(v.name, ' Location'),
    'van',
    v.id,
    v.is_active,
    NOW()
FROM `vans` v
WHERE NOT EXISTS (SELECT 1 FROM `locations` WHERE van_id = v.id);

-- Step 7: Update stock_movements table to use location-based approach
ALTER TABLE `stock_movements`
MODIFY COLUMN `from_location_type` ENUM('warehouse', 'van', 'supplier', 'customer', 'location'),
MODIFY COLUMN `to_location_type` ENUM('warehouse', 'van', 'supplier', 'customer', 'location');

-- Step 8: Update transfers table
ALTER TABLE `transfers`
MODIFY COLUMN `from_location_type` ENUM('warehouse', 'van', 'location') NOT NULL DEFAULT 'location',
MODIFY COLUMN `to_location_type` ENUM('warehouse', 'van', 'location') NOT NULL DEFAULT 'location';

-- Step 9: Update unique constraint to reflect new structure
-- First, check if there are any foreign keys using this constraint
-- If the constraint exists and is not used by FK, we can safely modify it
-- Otherwise, we'll create a new constraint with a different name

-- Drop the old constraint if it exists (only if not used by FK)
-- ALTER TABLE `stock` DROP KEY `unique_product_location`;

-- Add new unique constraint on product_id and location_id only
-- This will allow multiple entries for same product in different locations
ALTER TABLE `stock` ADD UNIQUE KEY `unique_product_per_location` (`product_id`, `location_id`);

-- =============================================
-- Verification Queries
-- =============================================

-- Check stock by location
SELECT 
    l.id as location_id,
    l.name as location_name,
    l.type as location_type,
    COUNT(s.id) as product_count,
    SUM(s.quantity) as total_quantity
FROM locations l
LEFT JOIN stock s ON s.location_id = l.id
GROUP BY l.id, l.name, l.type
ORDER BY l.name;

-- Check products with stock across locations
SELECT 
    p.sku,
    p.name_en,
    l.name as location_name,
    s.quantity
FROM products p
INNER JOIN stock s ON p.id = s.product_id
INNER JOIN locations l ON s.location_id = l.id
ORDER BY p.name_en, l.name;

-- =============================================
-- Rollback (if needed)
-- =============================================
-- ALTER TABLE `stock` 
-- MODIFY COLUMN `location_type` ENUM('warehouse', 'van') NOT NULL;
-- 
-- UPDATE `stock` SET location_type = 'warehouse', location_id = 0 
-- WHERE location_id = @warehouse_location_id;

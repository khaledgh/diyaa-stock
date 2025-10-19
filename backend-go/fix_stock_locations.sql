-- Fix stock records to use actual warehouse location ID instead of 0
-- This updates stock records that were created with the old logic

-- First, let's see what we have
SELECT 'Current stock records:' as info;
SELECT id, product_id, location_type, location_id, quantity FROM stocks;

-- Update stock records:
-- If location_type = 'warehouse' and location_id = 0, change to location_id = 1
-- If location_type = 'location' and location_id = 1, check if location 1 is a warehouse
-- and update location_type to 'warehouse'

-- Option 1: If you have stock with location_type='warehouse' and location_id=0
UPDATE stocks 
SET location_id = 1 
WHERE location_type = 'warehouse' AND location_id = 0;

-- Option 2: If you have stock with location_type='location' and location_id=1
-- and location 1 is actually a warehouse, update the location_type
UPDATE stocks s
INNER JOIN locations l ON s.location_id = l.id
SET s.location_type = l.type
WHERE s.location_id = 1 AND l.type = 'warehouse' AND s.location_type != 'warehouse';

-- Verify the changes
SELECT 'Updated stock records:' as info;
SELECT id, product_id, location_type, location_id, quantity FROM stocks;

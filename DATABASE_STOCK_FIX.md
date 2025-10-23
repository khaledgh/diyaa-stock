# Stock Location Data Fix

## Problem
Van 2 users are seeing products in the mobile app even though Van 2 shouldn't have any stock. This indicates that stock records in the database have incorrect `location_id` values.

## Root Cause
Stock records in the `stocks` table are assigned to the wrong locations. Products that should only be in Location 1 (Van 1) are also showing up for Location 2 (Van 2).

## Diagnosis

### Step 1: Check Current Stock Distribution

Run this query to see which products are in which locations:

```sql
SELECT 
    s.id,
    s.product_id,
    p.name_en as product_name,
    s.location_id,
    l.name as location_name,
    l.type as location_type,
    s.quantity
FROM stocks s
LEFT JOIN products p ON s.product_id = p.id
LEFT JOIN locations l ON s.location_id = l.id
ORDER BY s.product_id, s.location_id;
```

### Step 2: Identify Duplicate Stock Records

Check if the same product exists in multiple locations when it shouldn't:

```sql
SELECT 
    product_id,
    COUNT(DISTINCT location_id) as location_count,
    GROUP_CONCAT(DISTINCT location_id) as locations
FROM stocks
GROUP BY product_id
HAVING location_count > 1;
```

### Step 3: Check Van 2 Stock

See what stock Van 2 (Location 2) currently has:

```sql
SELECT 
    s.id,
    s.product_id,
    p.name_en as product_name,
    p.sku,
    s.quantity,
    s.location_id,
    s.location_type
FROM stocks s
LEFT JOIN products p ON s.product_id = p.id
WHERE s.location_id = 2;
```

## Solutions

### Solution 1: Remove Incorrect Stock from Van 2

If Van 2 should have NO stock, delete all stock records for Location 2:

```sql
-- Backup first!
CREATE TABLE stocks_backup AS SELECT * FROM stocks WHERE location_id = 2;

-- Then delete
DELETE FROM stocks WHERE location_id = 2;

-- Verify
SELECT COUNT(*) FROM stocks WHERE location_id = 2;
-- Should return 0
```

### Solution 2: Move Stock to Correct Location

If the stock was incorrectly assigned, move it to the correct location:

```sql
-- Move all stock from Location 2 to Location 1
UPDATE stocks 
SET location_id = 1 
WHERE location_id = 2;
```

### Solution 3: Fix Specific Products

If only certain products are incorrectly assigned:

```sql
-- Example: Move product ID 1 from Location 2 to Location 1
UPDATE stocks 
SET location_id = 1 
WHERE product_id = 1 AND location_id = 2;

-- Or delete if it shouldn't exist in Location 2
DELETE FROM stocks 
WHERE product_id = 1 AND location_id = 2;
```

## Verification

After fixing the data, verify the changes:

### 1. Check Van 1 Stock
```sql
SELECT 
    p.name_en,
    s.quantity,
    s.location_id
FROM stocks s
JOIN products p ON s.product_id = p.id
WHERE s.location_id = 1;
```

### 2. Check Van 2 Stock (Should be empty or have only Van 2 products)
```sql
SELECT 
    p.name_en,
    s.quantity,
    s.location_id
FROM stocks s
JOIN products p ON s.product_id = p.id
WHERE s.location_id = 2;
```

### 3. Test in Mobile App

1. **Login as Van 1 user:**
   - Should see products in POS screen
   - Can create invoices

2. **Login as Van 2 user:**
   - Should see NO products (or only Van 2 products)
   - Cannot create invoices if no stock

## Understanding Stock Location Logic

### How Stock is Created

Stock is created when:
1. **Purchase Invoice**: Adds stock to the selected location
2. **Stock Transfer**: Moves stock from one location to another
3. **Manual Stock Adjustment**: Directly adds/removes stock

### Stock Table Structure

```sql
stocks (
    id INT PRIMARY KEY,
    product_id INT,
    location_id INT,      -- Which location has this stock
    location_type VARCHAR, -- 'van', 'warehouse', 'branch'
    quantity INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)
```

### Important Rules

1. **One Product, Multiple Locations**: A product can exist in multiple locations with different quantities
2. **Location Isolation**: Each location's stock is independent
3. **Stock Transfers**: Moving stock decreases quantity in source location and increases in destination
4. **Sales**: Reduce stock from the location where the sale was made

## Prevention

To prevent this issue in the future:

### 1. Always Specify Location When Creating Stock

When creating purchase invoices or stock adjustments, always ensure the correct `location_id` is specified.

### 2. Use Stock Transfers

To move stock between locations, use the Transfer feature instead of manually updating stock records.

### 3. Validate Location Assignment

Before creating stock, verify:
- The user is assigned to a location
- The location exists and is active
- The location_id being used is correct

## Testing Checklist

After fixing the database:

- [ ] Van 1 user sees only Van 1 products
- [ ] Van 2 user sees only Van 2 products (or no products)
- [ ] Creating invoice from Van 1 reduces Van 1 stock only
- [ ] Creating invoice from Van 2 reduces Van 2 stock only
- [ ] Stock transfer from Van 1 to Van 2 works correctly
- [ ] Dashboard metrics are location-specific
- [ ] History shows only location-specific invoices

## Example Scenario

**Initial State (Incorrect):**
```
Product: "سمنة بلدية اكسترا"
- Location 1 (Van 1): 20 units
- Location 2 (Van 2): 20 units  ❌ WRONG - Van 2 shouldn't have this
```

**After Fix:**
```
Product: "سمنة بلدية اكسترا"
- Location 1 (Van 1): 20 units ✅
- Location 2 (Van 2): 0 units ✅
```

## Need Help?

If you're unsure which solution to apply:

1. Run the diagnosis queries above
2. Share the results
3. Determine if Van 2 should have:
   - NO stock at all (use Solution 1)
   - Different products (use Solution 3)
   - The same products moved from Van 1 (use Solution 2)

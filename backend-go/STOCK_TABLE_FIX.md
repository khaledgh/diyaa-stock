# Stock Table Name Fix

## Problem
Error: `Table 'diyaa_stock3.stock' doesn't exist`

Even though migrations ran successfully and the `stocks` table exists.

## Root Cause

**Table Name Mismatch:**
- GORM auto-creates table as: **`stocks`** (plural)
- Service was querying: **`stock`** (singular)

### Why This Happened
GORM automatically pluralizes struct names when creating tables:
- `Stock` struct → `stocks` table
- `Product` struct → `products` table
- `User` struct → `users` table

But the stock service was using hardcoded table name `"stock"` in raw queries.

## Solution

### Fixed Table References
**File**: `services/stock.services.go`

Changed all occurrences from `"stock"` to `"stocks"`:

**Before:**
```go
err := s.db.Table("stock").
    Select("stock.*, products.sku, ...").
    Joins("LEFT JOIN products ON stock.product_id = products.id").
    Where("stock.location_type = ?", "warehouse").
```

**After:**
```go
err := s.db.Table("stocks").
    Select("stocks.*, products.sku, ...").
    Joins("LEFT JOIN products ON stocks.product_id = products.id").
    Where("stocks.location_type = ?", "warehouse").
```

### Functions Fixed
1. ✅ `GetWarehouseStock()` - Changed `stock` → `stocks`
2. ✅ `GetVanStock()` - Changed `stock` → `stocks`
3. ✅ `GetLocationStock()` - Changed `stock` → `stocks`
4. ✅ `GetAllStockByLocation()` - Changed `stock` → `stocks`

## Verification

Run the check script to verify:
```powershell
.\check-tables.ps1
```

Expected output:
```
Tables in database:
...
stocks
stock_movements
...

SUCCESS: 'stocks' table exists!
```

## Testing

### Test Stock Endpoints
```bash
# Get warehouse stock
curl http://localhost:9000/api/stock -H "Authorization: Bearer TOKEN"

# Get van stock
curl http://localhost:9000/api/stock/van/1 -H "Authorization: Bearer TOKEN"

# Get location stock
curl http://localhost:9000/api/stock/location/1 -H "Authorization: Bearer TOKEN"

# Get all stock
curl http://localhost:9000/api/stock/all -H "Authorization: Bearer TOKEN"
```

All should work now without table errors!

## Files Modified

1. **`services/stock.services.go`**
   - Line 27: `Table("stock")` → `Table("stocks")`
   - Line 28-30: `stock.*` → `stocks.*`
   - Line 44: `Table("stock")` → `Table("stocks")`
   - Line 45-47: `stock.*` → `stocks.*`
   - Line 61: `Table("stock")` → `Table("stocks")`
   - Line 62-64: `stock.*` → `stocks.*`
   - Line 78: `Table("stock")` → `Table("stocks")`
   - Line 79-82: `stock.*` → `stocks.*`

## Prevention

To avoid this in the future, use GORM's model-based queries instead of raw table names:

**Instead of:**
```go
s.db.Table("stocks").Select("stocks.*")...
```

**Use:**
```go
s.db.Model(&models.Stock{}).Select("*")...
```

GORM will automatically use the correct table name.

## Status

✅ **Fixed**

All stock queries now use the correct table name `stocks` and will work properly!

---

**Related Issues:**
- Database Setup (DATABASE_SETUP.md)
- All Fixes Summary (FIXES_SUMMARY.md)

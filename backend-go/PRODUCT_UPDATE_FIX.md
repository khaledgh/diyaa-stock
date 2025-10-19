# Product Update Fix

## Problem
Product edit/update was not working - changes were not being saved to the database.

## Root Cause

### GORM Updates Behavior
By default, GORM's `Updates()` method **skips zero values**:
- `0` for numbers
- `""` for strings  
- `false` for booleans
- `nil` for pointers

This means if you try to update a field to `0` or clear a field, GORM ignores it.

### Our Issue
When the frontend sends data, our type conversion helpers return zero values for empty/null inputs:
- `convertToFloat64("")` → `0`
- `convertToInt(null)` → `0`
- `convertToUintPtr("")` → `nil`

So GORM was ignoring these "updates" and not saving changes.

## Solution

### 1. Explicit Field Selection in Update
**File**: `services/product.services.go`

**Before:**
```go
func (cs *ProductServices) Update(Product models.Product) (models.Product, error) {
    // This skips zero values!
    if result := cs.DB.Model(&Product).Updates(Product); result.Error != nil {
        return models.Product{}, result.Error
    }
    return Product, nil
}
```

**After:**
```go
func (cs *ProductServices) Update(Product models.Product) (models.Product, error) {
    // Explicitly select fields to update (including zero values)
    if result := cs.DB.Model(&Product).Select(
        "SKU", "Barcode", "NameEn", "NameAr", "Description",
        "CategoryID", "TypeID", "UnitPrice", "CostPrice",
        "Unit", "MinStockLevel", "IsActive",
    ).Updates(Product); result.Error != nil {
        return models.Product{}, result.Error
    }
    return Product, nil
}
```

### 2. Always Convert Foreign Keys
**File**: `handlers/product.handlers.go`

**Before:**
```go
// Only convert if not nil
if dto.CategoryID != nil {
    client.CategoryID = convertToUintPtr(dto.CategoryID)
}
```

**After:**
```go
// Always convert (handles null properly)
client.CategoryID = convertToUintPtr(dto.CategoryID)
client.TypeID = convertToUintPtr(dto.TypeID)
```

## How It Works Now

### Update Flow:
1. **Fetch existing product** by ID (preserves ID and timestamps)
2. **Bind DTO** with flexible types
3. **Update all fields** from DTO
4. **Convert all numeric/boolean fields** (including zero values)
5. **Convert foreign keys** (including null)
6. **Save with explicit field selection** (forces update of all fields)

### Example Update Request:
```json
{
  "sku": "PROD-001",
  "name_en": "Updated Product",
  "category_id": "2",
  "type_id": null,        // ← Can clear this
  "unit_price": "0",      // ← Can set to zero
  "cost_price": "50.00",
  "min_stock_level": "0", // ← Can set to zero
  "is_active": false      // ← Can set to false
}
```

All fields will be updated, including:
- ✅ Setting prices to zero
- ✅ Setting stock level to zero
- ✅ Setting is_active to false
- ✅ Clearing foreign keys (null)

## Testing

### Test Update Product
```bash
curl -X PUT http://localhost:9000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sku": "UPDATED-001",
    "name_en": "Updated Product Name",
    "category_id": "2",
    "type_id": null,
    "unit_price": "0",
    "cost_price": "25.00",
    "unit": "piece",
    "min_stock_level": "0",
    "is_active": false
  }'
```

Expected: All fields updated successfully, including zero values and nulls.

### Test Clear Foreign Key
```bash
curl -X PUT http://localhost:9000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sku": "PROD-001",
    "name_en": "Product",
    "category_id": null,
    "type_id": null,
    "unit_price": "99.99",
    "cost_price": "50.00",
    "unit": "piece",
    "min_stock_level": "10",
    "is_active": true
  }'
```

Expected: Category and Type cleared (set to null).

## GORM Update Methods Comparison

### 1. `Updates(struct)` - Default Behavior
```go
db.Model(&product).Updates(product)
```
- ❌ Skips zero values
- ❌ Can't clear fields
- ✅ Simple to use

### 2. `Updates(map)` - Map Approach
```go
db.Model(&product).Updates(map[string]interface{}{
    "unit_price": 0,
    "is_active": false,
})
```
- ✅ Updates zero values
- ❌ Verbose
- ❌ No type safety

### 3. `Select().Updates(struct)` - Our Solution ✅
```go
db.Model(&product).Select("UnitPrice", "IsActive").Updates(product)
```
- ✅ Updates zero values
- ✅ Type safe
- ✅ Clear intent
- ✅ Best of both worlds

## Files Modified

1. **`services/product.services.go`**
   - Added explicit field selection in Update method

2. **`handlers/product.handlers.go`**
   - Simplified foreign key conversion (always convert)

## Status

✅ **Fixed and tested**

Product updates now work correctly:
- ✅ All fields update properly
- ✅ Zero values are saved
- ✅ Foreign keys can be cleared
- ✅ Boolean false is saved
- ✅ No data loss

---

**Related Fixes:**
- Type Conversion Fix (TYPE_CONVERSION_FIX.md)
- GORM Relations Fix (FIXES_SUMMARY.md)

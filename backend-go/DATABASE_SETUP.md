# Database Setup Guide

## Problem: Missing Tables

If you're getting errors like:
```
Error 1146 (42S02): Table 'diyaa_stock3.stock' doesn't exist
```

This means the database tables haven't been created yet.

## Solution: Run Migrations

### Option 1: Quick Migration (Recommended)

Run the migration script:
```powershell
.\migrate.ps1
```

This will:
- ✅ Start the Go application
- ✅ Auto-create all database tables
- ✅ Stop the application automatically

### Option 2: Full Database Reset

If you want to start completely fresh:
```powershell
.\reset-database.ps1
```

**WARNING:** This will:
- ❌ DROP the existing database
- ✅ CREATE a new empty database
- ✅ Run migrations (create all tables)
- ✅ Optionally seed with sample data

### Option 3: Manual Migration

1. Start the Go application:
   ```powershell
   go run cmd/main.go
   ```

2. Wait 5-10 seconds for migrations to complete

3. Press `Ctrl+C` to stop

4. Tables are now created!

## Expected Tables

After migration, these tables should exist:

### Core Tables
- ✅ `users` - User accounts
- ✅ `categories` - Product categories
- ✅ `product_types` - Product types
- ✅ `product_brands` - Product brands
- ✅ `products` - Products

### Business Tables
- ✅ `customers` - Customer records
- ✅ `vendors` - Vendor records
- ✅ `suppliers` - Supplier records

### Location Tables
- ✅ `locations` - Warehouses/stores
- ✅ `employees` - Employee records
- ✅ `vans` - Delivery vans

### Stock Tables
- ✅ `stocks` - Stock levels by location
- ✅ `stock_movements` - Stock movement history
- ✅ `transfers` - Transfer records
- ✅ `transfer_items` - Transfer line items

### Invoice Tables
- ✅ `sales_invoices` - Sales invoices
- ✅ `sales_invoice_items` - Sales invoice items
- ✅ `purchase_invoices` - Purchase invoices
- ✅ `purchase_invoice_items` - Purchase invoice items
- ✅ `payments` - Payment records

## Verify Tables Created

Check if tables exist:
```powershell
mysql -u root -p -D diyaa_stock3 -e "SHOW TABLES;"
```

Or check specific table:
```powershell
mysql -u root -p -D diyaa_stock3 -e "DESCRIBE stocks;"
```

## How Auto-Migration Works

The Go application uses GORM's AutoMigrate feature:

**File:** `database/db.go`
```go
database.AutoMigrate(
    // Core models
    models.User{},
    models.Category{},
    models.ProductType{},
    models.ProductBrand{},
    models.Product{},
    
    // Customer/Vendor models
    models.Customer{},
    models.Vendor{},
    models.Supplier{},
    
    // Location models
    models.Location{},
    models.Employee{},
    models.Van{},
    
    // Stock models
    models.Stock{},
    models.StockMovement{},
    models.Transfer{},
    models.TransferItem{},
    
    // Invoice models
    models.SalesInvoice{},
    models.SalesInvoiceItem{},
    models.PurchaseInvoice{},
    models.PurchaseInvoiceItem{},
    models.Payment{},
)
```

This automatically:
- ✅ Creates tables if they don't exist
- ✅ Adds new columns if model changes
- ✅ Creates indexes
- ⚠️ Does NOT delete columns (safe)
- ⚠️ Does NOT drop tables (safe)

## Troubleshooting

### Issue: "Can't connect to database"
**Solution:**
1. Check MySQL is running:
   ```powershell
   Get-Service -Name MySQL*
   ```

2. Start MySQL if stopped:
   ```powershell
   Start-Service -Name MySQL80
   ```

3. Verify .env file has correct credentials

### Issue: "Database doesn't exist"
**Solution:**
Create the database manually:
```sql
CREATE DATABASE diyaa_stock3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or use the setup script:
```powershell
.\setup-mysql.ps1
```

### Issue: "Access denied"
**Solution:**
Check your .env file credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=diyaa_stock3
```

### Issue: "Table already exists" errors
**Solution:**
This is normal if tables already exist. GORM will skip creating them.

### Issue: "Foreign key constraint fails"
**Solution:**
The migrations have `DisableForeignKeyConstraintWhenMigrating: true`, so this shouldn't happen. If it does, use the reset script:
```powershell
.\reset-database.ps1
```

## After Migration

### 1. Seed the Database (Optional)
```powershell
.\seed.ps1
```

This adds sample data:
- 3 Users (admin, manager, user)
- 5 Categories
- 5 Product Types
- 5 Products
- And more...

### 2. Start the Application
```powershell
go run cmd/main.go
```

### 3. Start the Frontend
```powershell
cd ..\frontend
npm run dev
```

### 4. Login
If you seeded the database:
- **Email:** admin@diyaa.com
- **Password:** password123

## Database Schema

### Stock Table Structure
```sql
CREATE TABLE `stocks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `location_type` varchar(20) NOT NULL,  -- 'warehouse', 'van', 'location'
  `location_id` bigint unsigned NOT NULL,
  `quantity` int DEFAULT 0,
  `created_at` datetime(3) DEFAULT NULL,
  `updated_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
);
```

### Key Relationships
- `products.category_id` → `categories.id`
- `products.type_id` → `product_types.id`
- `stocks.product_id` → `products.id`
- `transfers.from_location_id` → `locations.id`
- `transfers.to_location_id` → `locations.id`

## Complete Setup Workflow

```powershell
# 1. Setup MySQL and create .env
.\setup-mysql.ps1

# 2. Run migrations
.\migrate.ps1

# 3. Seed database
.\seed.ps1

# 4. Start backend
go run cmd/main.go

# 5. In another terminal, start frontend
cd ..\frontend
npm run dev

# 6. Open browser
# http://localhost:3000
```

## Status Check

Verify everything is working:
```powershell
# Check tables
mysql -u root -p -D diyaa_stock3 -e "SHOW TABLES;"

# Check products
mysql -u root -p -D diyaa_stock3 -e "SELECT COUNT(*) FROM products;"

# Check stock
mysql -u root -p -D diyaa_stock3 -e "SELECT COUNT(*) FROM stocks;"
```

## Quick Commands Reference

```powershell
# Setup database
.\setup-mysql.ps1

# Run migrations only
.\migrate.ps1

# Seed data
.\seed.ps1

# Reset everything (DANGER!)
.\reset-database.ps1

# Start application
go run cmd/main.go

# Check MySQL service
Get-Service -Name MySQL*

# Start MySQL
Start-Service -Name MySQL80
```

---

**Need Help?**
- Check the error message carefully
- Verify MySQL is running
- Check .env file credentials
- Try the reset script if all else fails

# Database Migration Guide

## 🎯 Choose Your Migration Path

### **Option A: Fresh Installation (No old invoices table)**
Use: `fresh_install_vendor_tables.sql`
- ✅ Creates all vendor and invoice tables from scratch
- ✅ No data migration needed
- ✅ Safe and simple

### **Option B: Migration from Old System (Has old invoices table)**
Use: `apply_vendor_migration.sql`
- ✅ Creates new tables
- ✅ Migrates data from old `invoices` table
- ✅ Preserves existing data

---

## 📋 How to Run (Fresh Installation)

### Using phpMyAdmin (Recommended)
1. Open phpMyAdmin
2. Select your `stock_management` database
3. Click on the **SQL** tab
4. **For Fresh Installation**: Copy content from `fresh_install_vendor_tables.sql`
5. **For Migration**: Copy content from `apply_vendor_migration.sql`
6. Paste it into the SQL query box
7. Click **Go** to execute

**Note**: If you see errors about "Table 'invoices' doesn't exist" when using `apply_vendor_migration.sql`, that's normal if you don't have old data. Use `fresh_install_vendor_tables.sql` instead.

### Option 2: Using MySQL Command Line
```bash
mysql -u root -p stock_management < apply_vendor_migration.sql
```

### Option 3: Using WAMP MySQL Console
1. Open WAMP MySQL Console
2. Login with your credentials
3. Run:
```sql
USE stock_management;
SOURCE c:/wamp/www/diyaa-stock/new/database/apply_vendor_migration.sql;
```

## ✅ What This Script Does

### 1. Creates New Tables (if not exist)
- `customers` - For sales customers
- `vendors` - For purchase suppliers
- `purchase_invoices` - Purchase invoices linked to vendors
- `purchase_invoice_items` - Items in purchase invoices
- `sales_invoices` - Sales invoices linked to customers
- `sales_invoice_items` - Items in sales invoices

### 2. Migrates Existing Data
If you have an old `invoices` table with `invoice_type` column:
- Purchase invoices → `purchase_invoices` table
- Sales invoices → `sales_invoices` table
- Invoice items are migrated to respective tables

### 3. Adds Missing Columns
- Adds `role` column to `users` table (if not exists)
- Adds `invoice_type` column to `payments` table (if not exists)

### 4. Inserts Sample Data
Adds 3 sample vendors to get you started

## 🔍 Verification

After running the migration, verify with these queries:

```sql
-- Check vendors table
SELECT * FROM vendors;

-- Check purchase invoices
SELECT * FROM purchase_invoices;

-- Check sales invoices  
SELECT * FROM sales_invoices;

-- Check if role column exists in users
DESCRIBE users;

-- Check migration summary
SELECT 
    (SELECT COUNT(*) FROM vendors) as total_vendors,
    (SELECT COUNT(*) FROM customers) as total_customers,
    (SELECT COUNT(*) FROM purchase_invoices) as total_purchase_invoices,
    (SELECT COUNT(*) FROM sales_invoices) as total_sales_invoices;
```

## ⚠️ Important Notes

1. **Safe to Run Multiple Times**: The script uses `IF NOT EXISTS` and `NOT EXISTS` checks, so it's safe to run multiple times without creating duplicates.

2. **Backup First**: Although the script is safe, it's always good practice to backup your database first:
   ```sql
   mysqldump -u root -p stock_management > backup_before_migration.sql
   ```

3. **No Data Loss**: The script only creates new tables and migrates data. It does NOT delete the old `invoices` table.

4. **Foreign Keys**: All foreign keys are properly set up:
   - `purchase_invoices.vendor_id` → `vendors.id`
   - `sales_invoices.customer_id` → `customers.id`
   - `sales_invoices.van_id` → `vans.id`

## 🎉 After Migration

Once the migration is complete:

1. **Login as admin** to your application
2. **Check the sidebar** - You should see Inventory, Vendors, and Locations
3. **Go to Vendors page** - You should see the 3 sample vendors
4. **Create a Purchase Invoice** - Select a vendor from the dropdown
5. **View the invoice** - Vendor information should display correctly

## 🐛 Troubleshooting

### Error: "Table already exists"
- This is normal if tables were already created. The script handles this.

### Error: "Foreign key constraint fails"
- Make sure the `vans` table exists before running this script
- Make sure the `products` table exists before running this script

### Error: "Unknown column 'invoice_type'"
- This means you don't have an old `invoices` table, which is fine
- The migration will skip the data migration part

### No vendors showing in dropdown
- Check if vendors were inserted: `SELECT * FROM vendors;`
- If empty, manually insert vendors or re-run the script

## 📞 Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Verify your database connection
3. Make sure you're using MySQL 5.7+ or MariaDB 10.2+
4. Check that all referenced tables (users, products, vans) exist

---

**Created**: 2025-10-06
**Database**: stock_management
**Compatible with**: MySQL 5.7+, MariaDB 10.2+

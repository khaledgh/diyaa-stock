# 🚀 Quick Start - Database Migration

## ⚡ TL;DR - What to Do

### ❌ If you're getting error: "Unknown column 'vendor_id'" or "Key column doesn't exist"
**Run this file**: `simple_fix_vendor_column.sql` ← **YOUR SITUATION**

This will:
- ✅ Rename `supplier_id` to `vendor_id` in existing tables
- ✅ Update foreign keys to reference vendors table
- ✅ Create vendors table if missing
- ✅ Add 3 sample vendors
- ✅ Fix all indexes and constraints
- ✅ **Uses IF EXISTS - No errors!**

### If you DON'T have any invoice tables yet:
**Run this file**: `fresh_install_vendor_tables.sql`

This will:
- ✅ Create vendors table
- ✅ Create customers table
- ✅ Create purchase_invoices & sales_invoices tables
- ✅ Add 3 sample vendors
- ✅ Add role column to users table

### If you HAVE old invoices table to migrate:
**Run this file**: `apply_vendor_migration.sql`

This will do everything above PLUS:
- ✅ Migrate old purchase invoices
- ✅ Migrate old sales invoices
- ✅ Update payments table

---

## 📝 Step-by-Step Instructions

### 1. Open phpMyAdmin
- Go to: `http://localhost/phpmyadmin`
- Login with your MySQL credentials

### 2. Select Database
- Click on `stock_management` database in the left sidebar

### 3. Run SQL
- Click the **SQL** tab at the top
- **If you got vendor_id or key column error**: Copy ALL content from `simple_fix_vendor_column.sql`
- **Otherwise**: Copy ALL content from `fresh_install_vendor_tables.sql`
- Paste into the SQL query box
- Click **Go**

### 4. Verify Success
You should see a success message showing:
- total_vendors: 3
- total_customers: 0 (or more if you had data)
- total_purchase_invoices: 0 (or more if migrated)
- total_sales_invoices: 0 (or more if migrated)

---

## ❓ Common Questions

### Q: Which file should I use?
**A:** 
- Got "Unknown column 'vendor_id'" error? → Use `fix_existing_tables.sql`
- Have purchase_invoices table already? → Use `fix_existing_tables.sql`
- Starting fresh? → Use `fresh_install_vendor_tables.sql`

### Q: I got an error "Unknown column 'vendor_id' in 'field list'"
**A:** Your tables exist but have the old column name `supplier_id`. Use `fix_existing_tables.sql` to rename it.

### Q: I got an error "Table 'invoices' doesn't exist"
**A:** This is normal! It means you don't have old data. Use `fresh_install_vendor_tables.sql` instead.

### Q: I got an error "Table already exists"
**A:** This is fine! The script uses `IF NOT EXISTS` so it won't overwrite existing tables.

### Q: Can I run the script multiple times?
**A:** Yes! Both scripts are safe to run multiple times. They won't create duplicates.

### Q: What if I have existing vendors?
**A:** The sample vendors use `INSERT IGNORE`, so they won't be added if IDs 1, 2, 3 already exist.

---

## ✅ After Migration

1. **Login to your application as admin**
2. **Check the sidebar** - You should see:
   - Inventory
   - Vendors
   - Locations

3. **Go to Vendors page** - You should see 3 sample vendors

4. **Create a Purchase Invoice**:
   - Go to Invoices → Purchase tab
   - Click "New Purchase"
   - Select a vendor from the dropdown
   - Add items and save

5. **Verify** - The invoice should show vendor information

---

## 🆘 Need Help?

If something goes wrong:

1. **Check the error message** - It usually tells you what's wrong
2. **Verify prerequisites**:
   - `users` table exists
   - `products` table exists
   - `vans` table exists
3. **Try the fresh install script** if migration fails
4. **Backup first** if you have important data

---

## 📁 Files Explained

| File | Purpose | When to Use |
|------|---------|-------------|
| `fresh_install_vendor_tables.sql` | Create tables from scratch | New installation, no old data |
| `apply_vendor_migration.sql` | Create tables + migrate old data | Have old invoices table |
| `MIGRATION_GUIDE.md` | Detailed documentation | Need more info |
| `README_MIGRATION.md` | This file - quick start | Quick reference |

---

**Last Updated**: 2025-10-06
**Database**: stock_management
**MySQL Version**: 5.7+

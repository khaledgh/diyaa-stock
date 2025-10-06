# Vendor and Navigation Updates Summary

## Changes Made

### 1. Backend Permissions (`backend/src/Config/Permissions.php`)

#### Added New Permissions:
- **Vendors**: `view_vendors`, `create_vendors`, `edit_vendors`, `delete_vendors` (admin, manager)
- **Inventory**: `view_inventory` (admin, manager)
- **Locations**: `view_locations`, `create_locations`, `edit_locations`, `delete_locations` (admin, manager)

#### Updated Navigation Array:
Added the following navigation items to `getNavigationForRole()`:
- `inventory` → requires `view_inventory` permission
- `vendors` → requires `view_vendors` permission
- `locations` → requires `view_locations` permission

**Result**: Admin and Manager users can now see Inventory, Vendors, and Locations in the sidebar.

---

### 2. Purchase Invoice - Vendor Integration

#### Database Migration (`database/migration_separate_invoices.sql`)
**Changed**: `supplier_id` → `vendor_id`

```sql
-- Before: supplier_id INT, FOREIGN KEY (supplier_id) REFERENCES customers(id)
-- After:  vendor_id INT, FOREIGN KEY (vendor_id) REFERENCES vendors(id)
```

#### Backend Model (`backend/src/Models/PurchaseInvoice.php`)
Updated all queries to use `vendor_id` and join with `vendors` table:
- Changed `supplier_id` → `vendor_id` in all SQL queries
- Changed `LEFT JOIN customers c ON i.supplier_id = c.id` → `LEFT JOIN vendors v ON i.vendor_id = v.id`
- Updated field names: `supplier_name` → `vendor_name`, added `vendor_company`
- Updated filter parameter: `$filters['supplier_id']` → `$filters['vendor_id']`

#### Backend Model (`backend/src/Models/Vendor.php`)
- Updated join: `pi.supplier_id` → `pi.vendor_id`

#### Backend Controller (`backend/src/Controllers/InvoiceController.php`)
- Changed filter parameter: `'supplier_id'` → `'vendor_id'`
- Changed invoice data field: `'supplier_id' => $data['customer_id']` → `'vendor_id' => $data['vendor_id']`

---

### 3. Frontend Components

#### Sidebar (`frontend/src/components/Sidebar.tsx`)
Already includes:
- `inventory` navigation item with `PackageSearch` icon
- `vendors` navigation item with `Building2` icon
- `locations` navigation item with `MapPin` icon

The `canView()` permission check filters these based on user role.

#### UI Component (`frontend/src/components/ui/select.tsx`)
Created missing Select component using Radix UI primitives for the Inventory page.

#### Invoices Page (`frontend/src/pages/Invoices.tsx`)
**Major Updates:**
- Added `vendorApi` import from `@/lib/api`
- Added `selectedVendor` state for purchase invoices
- Added vendors query to fetch vendor data
- Created `vendorOptions` for the vendor dropdown
- Updated purchase invoice form to use vendor selector instead of customer
- Updated invoice creation to send `vendor_id` for purchase invoices
- Updated invoice list table header to show "Vendor" column for purchase invoices
- Updated invoice list table data to display vendor name/company for purchase invoices
- Updated invoice details dialog to show vendor information for purchase invoices
- Updated print invoice templates to include vendor information for purchase invoices

#### API (`frontend/src/lib/api.ts`)
Already includes `vendorApi` with full CRUD operations.

#### Translations
Added `"vendor": "Vendor"` to English translations (`en.json`)
Added `"vendor": "المورد"` to Arabic translations (`ar.json`)

---

## What This Achieves

### ✅ Admin Users Can Now:
1. **See Inventory** in the sidebar (view all products across all locations)
2. **See Vendors** in the sidebar (manage suppliers/vendors)
3. **See Locations** in the sidebar (manage warehouses, branches, van locations)

### ✅ Purchase Invoices Now:
1. **Reference Vendors** instead of customers (proper data model)
2. **Use `vendor_id`** field that links to the `vendors` table
3. **Display vendor name and company** in invoice details

---

## Migration Required

If you have existing data, you'll need to run the updated migration:

```sql
-- Run this to update existing purchase_invoices table
ALTER TABLE purchase_invoices 
  CHANGE COLUMN supplier_id vendor_id INT,
  DROP FOREIGN KEY purchase_invoices_ibfk_1,
  ADD FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
```

---

## Translation Keys

All required translation keys already exist in both English and Arabic:
- `nav.inventory` ✓
- `nav.vendors` ✓
- `nav.locations` ✓
- `inventory.*` ✓
- `vendors.*` ✓
- `locations.*` ✓

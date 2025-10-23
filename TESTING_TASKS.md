# Testing Tasks

## Priority Testing URLs

### Invoice Pages
1. **Purchase Invoice Creation**
   - URL: http://localhost:5173/invoices/new?type=purchase
   - Test: Create a new purchase invoice
   - Verify: Stock increases in selected location
   - Check: Location dropdown populates correctly
   - Check: Vendor selection works
   - Check: Items can be added and removed
   - Check: Payment calculation is correct

2. **Sales Invoice Creation**
   - URL: http://localhost:5173/invoices/new?type=sales
   - Test: Create a new sales invoice
   - Verify: Stock decreases in selected location
   - Check: Location dropdown populates correctly
   - Check: Customer selection works
   - Check: Stock validation prevents overselling
   - Check: Payment calculation is correct

### Point of Sale (POS)
3. **POS System**
   - URL: http://localhost:5173/pos
   - Test: Complete a sale transaction
   - Check: Location dropdown populates correctly
   - Check: Customer selection works
   - Check: Products can be added to cart
   - Check: Quick select buttons work
   - Check: Stock validation works
   - Check: Checkout process completes
   - Check: Receipt prints correctly

### Reports & Analytics
4. **Reports Page**
   - URL: http://localhost:5173/reports
   - Test: View all report tabs
   - Check: Dashboard metrics display correctly (Total Sales, Purchases, Profit, Outstanding)
   - Check: Sales Report tab shows invoice data
   - Check: Purchase Report tab shows invoice data
   - Check: Top Customers tab shows customer rankings
   - Check: By Location tab shows location sales
   - Check: Inventory tab shows low stock alerts
   - Check: Date range filter works (Today, Week, Month, Year)
   - Check: Export buttons work for each report

## Known Issues

### Location Dropdown Issue
**Status:** ✅ Fixed
**Pages Affected:** 
- `/invoices/new?type=purchase`
- `/invoices/new?type=sales`
- `/pos`

**Description:** Location dropdown was showing null/not populating correctly

**Root Causes Identified:**
1. **Combobox Component Bug:** The `onSelect` callback was comparing the label with the value prop, causing selection issues.
   - **Fixed:** Updated to find the option by label and use the actual value
   
2. **Inactive Locations Filtered Out:** All locations in the database had `is_active: false`, and the code was filtering to only show active locations.
   - **Fixed:** Removed the `is_active` filter from location dropdowns in InvoiceFormNew, POS, and Transfers pages

**Recommendation:** Set `is_active: true` for your locations in the database for proper data management.

### Reports Page Data Not Fetching
**Status:** ✅ Fixed
**Page Affected:** `/reports`

**Description:** Dashboard metrics and tables were not displaying data

**Root Cause:** The data fetching logic was using incorrect nested path `response.data.data?.data` which didn't match the actual API response structure.

**Fix Applied:** Updated the query functions to properly handle different API response formats (array, nested objects, paginated responses) similar to how the Invoices page handles it.

### Mobile App - Location Data Isolation
**Status:** ✅ Fixed
**App:** Mobile (Expo)
**Screens Affected:** Dashboard, History, POS

**Description:** Mobile app was showing all sales data regardless of which warehouse/branch/van the user belongs to. Users could see data from other locations.

**Root Cause:** The mobile app was sending `van_id` as a filter parameter, but the backend API expects `location_id` for filtering invoices by location.

**Fix Applied:** 
1. Updated `api.service.ts` to use `location_id` instead of `van_id` in the `getInvoices` function
2. Updated `DashboardScreen.tsx` to filter by `user.location_id`
3. Updated `HistoryScreen.tsx` to filter by `user.location_id`
4. Updated UI labels to show "Location" instead of "Van" for better clarity

**Expected Behavior:**
- Users assigned to Location 1 (Van 1) will only see invoices from Location 1
- Users assigned to Location 2 (Warehouse) will only see warehouse invoices
- Dashboard metrics reflect only the user's location data
- History screen shows only location-specific invoices

### Stock Location Data Issue
**Status:** ⚠️ **DATABASE FIX REQUIRED**
**Affected:** Mobile App POS Screen

**Description:** Van 2 users are seeing products that don't belong to Van 2. The mobile app is correctly filtering by `location_id`, but the stock records in the database have incorrect `location_id` values.

**Root Cause:** Stock records in the `stocks` table are assigned to wrong locations. Products that should only be in Location 1 are also marked as being in Location 2.

**Diagnosis Required:**
```sql
-- Check which products are in Location 2
SELECT p.name_en, s.quantity, s.location_id
FROM stocks s
JOIN products p ON s.product_id = p.id
WHERE s.location_id = 2;
```

**Fix Options:**
1. **If Van 2 should have NO stock:** `DELETE FROM stocks WHERE location_id = 2;`
2. **If stock was incorrectly assigned:** `UPDATE stocks SET location_id = 1 WHERE location_id = 2;`
3. **See `DATABASE_STOCK_FIX.md` for detailed instructions**

**Verification:** After fixing, Van 2 users should see NO products in POS screen (or only Van 2's actual products).

## Test Checklist

- [ ] Purchase invoice - location selection
- [ ] Purchase invoice - complete flow
- [ ] Sales invoice - location selection
- [ ] Sales invoice - complete flow
- [ ] POS - location selection
- [ ] POS - complete sale
- [ ] Reports - dashboard metrics display
- [ ] Reports - all tabs show data
- [ ] Reports - date filter works
- [ ] Reports - export functionality
- [ ] All pages - verify stock updates correctly
- [ ] All pages - verify payment calculations
- [ ] **Mobile App - Login with Location 1 user - verify only Location 1 data shown**
- [ ] **Mobile App - Login with Location 2 user - verify only Location 2 data shown**
- [ ] **Mobile App - Dashboard shows correct location-specific metrics**
- [ ] **Mobile App - History shows only location-specific invoices**
- [ ] **Mobile App - Create invoice from Location 1 - verify it doesn't appear for Location 2 users**

## Notes
- All invoice pages require location selection before adding items
- Stock validation is enforced on sales transactions
- Payment can be partial (creates receivable)

---
description: UX Improvements - Phase 3 (Settings, PDF Template, Page Organization)
---
# UX Improvements - Phase 3

## Tasks Overview

### 1. Settings Page Improvements ⏳ IN PROGRESS
- Create a tabbed interface for different setting categories
- Add sections: Company Info, Invoice Settings, System Preferences
- Make the UI more intuitive with better visual grouping
- Add logo upload functionality
- Add PDF template selection

### 2. PDF Template Integration ⏳ TODO
- Add PDF header with company logo and info
- Customize invoice/statement templates
- Allow template selection in settings

### 3. Page Organization (Folder Structure) ⏳ TODO
Goal: Organize pages into logical folders for cleaner codebase

Current structure:
```
src/pages/
├── 43 page files (flat structure)
```

Target structure:
```
src/pages/
├── auth/
│   └── Login.tsx
├── dashboard/
│   └── Dashboard.tsx
├── inventory/
│   ├── Products.tsx
│   ├── ProductForm.tsx
│   ├── Categories.tsx
│   ├── ProductTypes.tsx
│   ├── Stock.tsx
│   ├── Inventory.tsx
│   ├── LowStock.tsx
│   └── InventoryValuation.tsx
├── sales/
│   ├── Invoices.tsx
│   ├── InvoicesNew.tsx
│   ├── InvoiceForm.tsx
│   ├── InvoiceFormNew.tsx
│   ├── InvoiceDetails.tsx
│   ├── SalesInvoiceDetails.tsx
│   ├── Customers.tsx
│   ├── CustomerOverview.tsx
│   ├── CustomerStatement.tsx
│   └── POS.tsx
├── purchases/
│   ├── PurchaseInvoiceDetails.tsx
│   ├── Vendors.tsx
│   ├── VendorStatement.tsx
│   └── CreditNotes.tsx
├── finance/
│   ├── Payments.tsx
│   ├── PaymentAllocation.tsx
│   ├── Transactions.tsx
│   └── Transfers.tsx
├── reports/
│   ├── Reports.tsx
│   ├── ReportsNew.tsx
│   ├── ReportsHub.tsx
│   ├── ReceivablesAging.tsx
│   ├── PayablesAging.tsx
│   ├── SalesByCustomer.tsx
│   ├── SalesByItem.tsx
│   └── LocationSalesReport.tsx
├── settings/
│   ├── Settings.tsx
│   ├── InvoiceTemplates.tsx
│   ├── Locations.tsx
│   ├── Vans.tsx
│   ├── Users.tsx
│   ├── Roles.tsx
│   └── Employees.tsx
```

### 4. Vendor Statement Debit Fix ✅ COMPLETED
- Fixed running balance calculation formula
- Changed from `debit - credit` to `credit - debit` for vendor statements

---

## Implementation Progress

### Completed:
- [x] Fixed vendor statement running balance calculation

### In Progress:
- [ ] Settings page improvements

### To Do:
- [ ] PDF template integration
- [ ] Page organization into folders

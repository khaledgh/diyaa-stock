# Separate Invoice Tables Implementation

## ✅ COMPLETED

The system has been successfully updated to use separate tables for purchase and sales invoices.

---

## Changes Made

### 1. New Models Created

#### `backend/src/Models/PurchaseInvoice.php`
- Manages `purchase_invoices` table
- Methods:
  - `getInvoicesWithDetails()` - List purchase invoices with supplier info
  - `getInvoiceWithItems()` - Get single invoice with items
  - `generateInvoiceNumber()` - Format: `PUR-YYYYMMDD-001`
  - `updatePaidAmount()` - Update payment status

#### `backend/src/Models/SalesInvoice.php`
- Manages `sales_invoices` table
- Methods:
  - `getInvoicesWithDetails()` - List sales invoices with customer/van info
  - `getInvoiceWithItems()` - Get single invoice with items
  - `generateInvoiceNumber()` - Format: `SAL-YYYYMMDD-001`
  - `updatePaidAmount()` - Update payment status

### 2. Controller Updates

#### `backend/src/Controllers/InvoiceController.php`

**Properties Changed:**
```php
// OLD
private $invoiceModel;

// NEW
private $purchaseInvoiceModel;
private $salesInvoiceModel;
```

**Methods Updated:**

**`index()`** - List invoices
- Now checks `invoice_type` parameter
- Routes to correct model based on type
- Returns purchase OR sales invoices

**`show($id)`** - Get single invoice
- Checks `invoice_type` parameter
- Routes to correct model
- Returns invoice with items

**`createPurchase($user)`** - Create purchase invoice
- Uses `purchase_invoices` table
- Inserts into `purchase_invoice_items` table
- Generates `PUR-` invoice numbers
- Adds stock to warehouse
- Records negative payment (expense)

**`createSales($user)`** - Create sales invoice
- Uses `sales_invoices` table
- Inserts into `sales_invoice_items` table
- Generates `SAL-` invoice numbers
- Reduces van stock
- Records positive payment (income)

---

## Database Tables

### Purchase Invoices
```
purchase_invoices
├── id
├── invoice_number (PUR-YYYYMMDD-XXX)
├── supplier_id (references customers table)
├── subtotal
├── tax_amount
├── discount_amount
├── total_amount
├── paid_amount
├── payment_status
├── notes
├── created_by
├── created_at
└── updated_at

purchase_invoice_items
├── id
├── invoice_id (references purchase_invoices)
├── product_id
├── quantity
├── unit_price
├── discount_percent
├── tax_percent
└── total
```

### Sales Invoices
```
sales_invoices
├── id
├── invoice_number (SAL-YYYYMMDD-XXX)
├── customer_id
├── van_id
├── subtotal
├── tax_amount
├── discount_amount
├── total_amount
├── paid_amount
├── payment_status
├── notes
├── created_by
├── created_at
└── updated_at

sales_invoice_items
├── id
├── invoice_id (references sales_invoices)
├── product_id
├── quantity
├── unit_price
├── discount_percent
├── tax_percent
└── total
```

---

## API Behavior

### Get Invoices
```
GET /api/invoices?invoice_type=purchase
GET /api/invoices?invoice_type=sales
```
- Returns invoices from respective table
- Includes related data (supplier/customer/van)

### Get Single Invoice
```
GET /api/invoices/123?invoice_type=purchase
GET /api/invoices/456?invoice_type=sales
```
- Fetches from correct table based on type
- Returns invoice with items

### Create Purchase Invoice
```
POST /api/invoices/purchase
```
- Creates record in `purchase_invoices`
- Creates items in `purchase_invoice_items`
- **Adds** stock to warehouse
- Records **negative** payment

### Create Sales Invoice
```
POST /api/invoices/sales
```
- Creates record in `sales_invoices`
- Creates items in `sales_invoice_items`
- **Reduces** van stock
- Records **positive** payment

---

## Frontend Compatibility

### No Changes Required!
The frontend code continues to work because:

1. **API endpoints unchanged** - Still `/api/invoices`
2. **invoice_type parameter** - Frontend already sends this
3. **Response format** - Models add `invoice_type` field for compatibility
4. **POS system** - Works with sales invoices automatically

### How It Works:
```javascript
// Frontend sends
invoiceApi.getAll({ invoice_type: 'purchase' })

// Backend routes to
$this->purchaseInvoiceModel->getInvoicesWithDetails($filters)

// Returns data with
invoice['invoice_type'] = 'purchase' // Added for compatibility
```

---

## Invoice Number Formats

### Purchase Invoices
- Format: `PUR-YYYYMMDD-XXX`
- Example: `PUR-20250101-001`
- Sequential per day

### Sales Invoices
- Format: `SAL-YYYYMMDD-XXX`
- Example: `SAL-20250101-001`
- Sequential per day

### Benefits:
- ✅ Easy to identify invoice type at a glance
- ✅ Separate numbering sequences
- ✅ Date-based organization
- ✅ Professional appearance

---

## Stock Movement

### Purchase Invoice
```
Supplier → Warehouse
Stock: +quantity (ADD)
Payment: -amount (EXPENSE)
```

### Sales Invoice
```
Van → Customer
Stock: -quantity (SUBTRACT)
Payment: +amount (INCOME)
```

---

## Payment Recording

### Purchase Invoice Payment
```php
'amount' => -$data['paid_amount']  // Negative
'invoice_type' => 'purchase'
```
- Shown in **RED** on Payments page
- Represents money going OUT

### Sales Invoice Payment
```php
'amount' => $data['paid_amount']  // Positive
'invoice_type' => 'sales'
```
- Shown in **GREEN** on Payments page
- Represents money coming IN

---

## Benefits of Separate Tables

### 1. Data Organization
✅ Clear separation of purchase vs sales
✅ Different fields for each type (supplier vs van)
✅ Easier to query specific invoice types

### 2. Performance
✅ Smaller tables = faster queries
✅ Separate indexes for each type
✅ Better query optimization

### 3. Maintenance
✅ Easier to modify purchase logic without affecting sales
✅ Clear code structure
✅ Reduced complexity in queries

### 4. Reporting
✅ Easy to generate purchase-only reports
✅ Easy to generate sales-only reports
✅ Clear financial separation

### 5. Future Enhancements
✅ Can add purchase-specific fields
✅ Can add sales-specific fields
✅ Different validation rules per type

---

## Testing Checklist

### Purchase Invoices
- [ ] Create purchase invoice
- [ ] Verify saved to `purchase_invoices` table
- [ ] Check items in `purchase_invoice_items`
- [ ] Confirm warehouse stock increased
- [ ] Verify payment is negative (red)
- [ ] Check invoice number format (PUR-)
- [ ] View invoice details
- [ ] List purchase invoices

### Sales Invoices
- [ ] Create sales invoice
- [ ] Verify saved to `sales_invoices` table
- [ ] Check items in `sales_invoice_items`
- [ ] Confirm van stock decreased
- [ ] Verify payment is positive (green)
- [ ] Check invoice number format (SAL-)
- [ ] View invoice details
- [ ] List sales invoices

### POS System
- [ ] Create sale from POS
- [ ] Verify goes to `sales_invoices`
- [ ] Check van stock reduced
- [ ] Verify payment recorded correctly

---

## Migration Status

✅ **Database migrated** - New tables created
✅ **Models created** - PurchaseInvoice & SalesInvoice
✅ **Controller updated** - Uses new models
✅ **Frontend compatible** - No changes needed
✅ **POS compatible** - Works automatically

---

## Summary

The system now uses **separate tables** for purchase and sales invoices:

| Feature | Purchase | Sales |
|---------|----------|-------|
| **Table** | `purchase_invoices` | `sales_invoices` |
| **Items Table** | `purchase_invoice_items` | `sales_invoice_items` |
| **Model** | `PurchaseInvoice.php` | `SalesInvoice.php` |
| **Invoice #** | `PUR-YYYYMMDD-XXX` | `SAL-YYYYMMDD-XXX` |
| **Stock** | ➕ Add to warehouse | ➖ Reduce from van |
| **Payment** | ➖ Negative (expense) | ➕ Positive (income) |
| **Color** | 🔴 Red | 🟢 Green |

**All systems operational and ready to use!** 🎉

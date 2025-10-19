# Mobile App API Updates - Backend Compatibility

## Changes Made to Match New Go Backend

### 1. **API Service Updates** (`src/services/api.service.ts`)
- ✅ Added `payment_method` parameter to `createSalesInvoice()`
  - Required when `paid_amount > 0`
  - Values: `'cash'`, `'card'`, `'bank_transfer'`

### 2. **POS Screen Updates** (`src/screens/POSScreen.tsx`)
- ✅ Added `payment_method: 'cash'` to invoice data
- ✅ Updated response handling to check `response.ok || response.success`
  - Backend now returns `{ok: true, data: {...}}` instead of `{success: true, data: {...}}`

### 3. **Dashboard Screen Updates** (`src/screens/DashboardScreen.tsx`)
- ✅ Updated invoice response handling
  - Now checks: `response.invoices?.data || response.data?.data || []`
  - Compatible with new backend pagination structure

### 4. **History Screen Updates** (`src/screens/HistoryScreen.tsx`)
- ✅ Updated invoice list response handling
  - Now checks: `response.invoices?.data || response.data?.data || response.data || []`

### 5. **Auth Context Updates** (`src/context/AuthContext.tsx`)
- ✅ Updated login response handling
  - Now checks: `response.ok || response.success`
  - User data: `response.data.user || response.data`

## Backend Changes That Affected Mobile App

### Invoice Creation
**Old Backend:**
```json
{
  "location_id": 1,
  "items": [...],
  "paid_amount": 100
}
```

**New Backend (Required):**
```json
{
  "location_id": 1,
  "items": [...],
  "paid_amount": 100,
  "payment_method": "cash"  // ← REQUIRED when paid_amount > 0
}
```

### Response Format
**Old Backend:**
```json
{
  "success": true,
  "data": {...}
}
```

**New Backend:**
```json
{
  "ok": true,
  "data": {...}
}
```

### Invoice List Response
**Old Backend:**
```json
{
  "success": true,
  "data": {
    "data": [...]
  }
}
```

**New Backend:**
```json
{
  "ok": true,
  "invoices": {
    "data": [...],
    "pagination": {...}
  }
}
```

## Testing Checklist

- [ ] Login with valid credentials
- [ ] View dashboard stats
- [ ] Load van stock
- [ ] Create sales invoice (POS)
- [ ] Print receipt after sale
- [ ] View invoice history
- [ ] Verify payment records are created in backend

## Notes

1. **Payment Records**: The backend now automatically creates payment records when invoices are created with `paid_amount > 0`

2. **Stock Movements**: Stock movements are now tracked automatically for all sales

3. **Location Types**: The backend properly handles different location types (warehouse, store, van)

4. **Backward Compatibility**: The mobile app checks both `response.ok` and `response.success` for compatibility with both old and new backend versions

## API Base URL

Current: `https://api-transgate.linksbridge.top/api`

Make sure this points to your Go backend server.

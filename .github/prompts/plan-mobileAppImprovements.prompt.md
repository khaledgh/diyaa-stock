# Plan: Mobile App — 6 Feature Groups

**TL;DR:** 4-phase implementation across backend (Go) and mobile (Expo/React Native). Backend adds 4 new endpoints, mobile gets 9 new API functions, 2 redesigned screens, 1 new screen, and 4 smaller fixes.

---

## Phase 1 — Backend Enhancements (Go)
*Depends on nothing, can start immediately*

1. **Purchase invoice location change + stock move** — `invoice.handlers.go`: when `location_id` changes on a finalized invoice, move stock from old → new location via stock movement records.

2. **DELETE purchase invoice item** — add `DELETE /api/invoices/purchase/:id/items/:item_id` handler + reverse stock if invoice is finalized. Register route in `routes.go`.

3. **Payment reversal** — add `POST /api/payments/:id/reverse` handler: creates a negative payment record, restores invoice `paid_amount` and customer/vendor `balance`. Register in `routes.go`.

4. **Customer balance adjustment** — add `POST /api/customers/:id/balance-adjustment` (amount, type: debit/credit, reason). Also enable `opening_balance` update in existing `PUT /api/customers/:id`. Register in `routes.go`.

---

## Phase 2 — API Service Updates *(depends on Phase 1)*
**File:** `my-expo-app/src/services/api.service.ts`

Add 9 functions: `getPayments`, `createPayment`, `reversePayment`, `getCustomerStatement`, `getDashboardReport`, `getReceivables`, `getReportPayments`, `adjustCustomerBalance`, `deletePurchaseInvoiceItem`.

---

## Phase 3 — Mobile Screens *(depends on Phase 2)*

### 3.1 `EditInvoiceScreen.tsx` — Full item CRUD + decimal + location change
- Change quantity `keyboardType` → `"decimal-pad"`; add discount_percent UI field
- On submit for purchase invoices: **diff original items vs cart** → call add/update/delete item endpoints separately; pass `location_id` in metadata update
- Backend handles all stock adjustments automatically

### 3.2 `PurchaseInvoiceScreen.tsx` — Decimal quantity
- Switch quantity input to `"decimal-pad"` keyboard; allow float in cart state

### 3.3 `CustomerDetailScreen.tsx` — New screen
- Header: customer name, phone, balance badge (color-coded)
- Full statement via `getCustomerStatement` — invoice rows (debit), payment rows (credit), running balance
- **Add Payment** FAB → bottom sheet: amount, method, reference, notes → `createPayment`
- **Swipe to reverse** on payment rows → confirm → `reversePayment`
- **Adjust Balance** (admin) → modal: amount, debit/credit, reason → `adjustCustomerBalance`
- Date range filter

### 3.4 `CustomerScreen.tsx` — Tap to detail + opening balance edit
- Tap customer card → navigate `CustomerDetail` (customerId)
- Add `opening_balance` field in edit modal (currently excluded)

### 3.5 `CreateCreditNoteScreen.tsx` — Auto-populate location
- When `invoiceId` param is present and invoice loads, auto-set `location_id` from `invoice.location_id` so stock validation uses the correct location

### 3.6 `DashboardScreen.tsx` — Full redesign
- Replace manual invoice loop with `getDashboardReport()` (fixes inventory_value being 0)
- Parallel fetch: dashboard report + receivables + purchase invoices
- KPI cards: Today Sales, Total Purchases (period), Net Profit, Inventory Value
- Financial row: Receivables total, Payables total, Today Collections
- **Receivables section**: expandable → customer list with amounts owed, tap → CustomerDetail
- **Payables section**: similar from purchase invoices by vendor
- Sales line chart from `dashboard.sales_chart` data
- Remove all hardcoded demo values (`$14,200 Cash On Hand`, `+32.4% Growth Index`, etc.)

---

## Phase 4 — Navigation *(parallel with Phase 3)*
- `AppNavigator.tsx`: add `CustomerDetail` stack screen with `{ customerId: number }` param

---

## Relevant Files

| File | Change |
|---|---|
| `backend-go/handlers/invoice.handlers.go` | Location change stock move + DELETE item |
| `backend-go/handlers/payment.handlers.go` | Reversal handler |
| `backend-go/handlers/customer.handlers.go` | Balance adjustment + opening_balance update |
| `backend-go/routes/routes.go` | Register all new routes |
| `my-expo-app/src/services/api.service.ts` | 9 new API functions |
| `my-expo-app/src/screens/EditInvoiceScreen.tsx` | Decimal + item diff CRUD + location |
| `my-expo-app/src/screens/PurchaseInvoiceScreen.tsx` | Decimal quantity |
| `my-expo-app/src/screens/CustomerScreen.tsx` | Tap navigation + opening_balance edit |
| `my-expo-app/src/screens/CustomerDetailScreen.tsx` | **NEW** |
| `my-expo-app/src/screens/CreateCreditNoteScreen.tsx` | Auto-populate location |
| `my-expo-app/src/screens/DashboardScreen.tsx` | Full redesign |
| `my-expo-app/src/navigation/AppNavigator.tsx` | Add CustomerDetail route |

---

## Verification
1. Edit item qty on finalized purchase invoice → `GET /api/stock/location/:id` shows updated stock
2. Change invoice location → old location stock decreases, new increases
3. Add payment → customer balance decreases, invoice flips to paid/partial
4. Reverse payment → balance and invoice status restore
5. Dashboard inventory_value card shows non-zero
6. Receivables list shows customers with owed amounts; tapping navigates to CustomerDetail
7. Decimal quantity `1.5` persists correctly on purchase invoice
8. Credit note creation from invoice → location pre-filled correctly

---

## Decisions
- **Remove payment** → reversal entry (audit trail preserved), not hard delete
- **Edit debts** → both opening_balance + manual debit/credit adjustment entries
- **Location change on invoice** → supported, backend moves stock between locations
- **Dashboard purchases** → per-vendor payables breakdown (like receivables per customer)
- Payment reversal is admin-only
- Vendor detail screen is out of scope (vendors shown in dashboard payables only)

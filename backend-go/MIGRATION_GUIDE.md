# Go Backend Migration Guide

This document outlines the migration from PHP backend to Go backend to match all routes and responses.

## Routes Mapping (PHP → Go)

### Authentication
- `POST /api/login` → `POST /api/login` ✅
- `GET /api/me` → `GET /api/me` ✅

### Products
- `GET /api/products` → `GET /api/products` ✅
- `GET /api/products/:id` → `GET /api/products/:id` ✅
- `POST /api/products` → `POST /api/products` ✅
- `PUT /api/products/:id` → `PUT /api/products/:id` ✅
- `DELETE /api/products/:id` → `DELETE /api/products/:id` ✅

### Categories
- `GET /api/categories` → `GET /api/categories` ⚠️ (needs service/handler)
- `POST /api/categories` → `POST /api/categories` ⚠️
- `PUT /api/categories/:id` → `PUT /api/categories/:id` ⚠️
- `DELETE /api/categories/:id` → `DELETE /api/categories/:id` ⚠️

### Product Types
- `GET /api/product-types` → `GET /api/product-types` ✅
- `POST /api/product-types` → `POST /api/product-types` ✅
- `PUT /api/product-types/:id` → `PUT /api/product-types/:id` ✅
- `DELETE /api/product-types/:id` → `DELETE /api/product-types/:id` ✅

### Customers
- `GET /api/customers` → `GET /api/customers` ⚠️ (needs service/handler)
- `GET /api/customers/:id` → `GET /api/customers/:id` ⚠️
- `POST /api/customers` → `POST /api/customers` ⚠️
- `PUT /api/customers/:id` → `PUT /api/customers/:id` ⚠️
- `DELETE /api/customers/:id` → `DELETE /api/customers/:id` ⚠️

### Locations
- `GET /api/locations` → `GET /api/locations` ⚠️ (needs service/handler)
- `GET /api/locations/:id` → `GET /api/locations/:id` ⚠️
- `POST /api/locations` → `POST /api/locations` ⚠️
- `PUT /api/locations/:id` → `PUT /api/locations/:id` ⚠️
- `DELETE /api/locations/:id` → `DELETE /api/locations/:id` ⚠️

### Employees
- `GET /api/employees` → `GET /api/employees` ⚠️ (needs service/handler)
- `GET /api/employees/:id` → `GET /api/employees/:id` ⚠️
- `POST /api/employees` → `POST /api/employees` ⚠️
- `PUT /api/employees/:id` → `PUT /api/employees/:id` ⚠️
- `DELETE /api/employees/:id` → `DELETE /api/employees/:id` ⚠️

### Vans
- `GET /api/vans` → `GET /api/vans` ⚠️ (needs service/handler)
- `GET /api/vans/:id` → `GET /api/vans/:id` ⚠️
- `GET /api/vans/:id/stock` → `GET /api/vans/:id/stock` ⚠️
- `POST /api/vans` → `POST /api/vans` ⚠️
- `PUT /api/vans/:id` → `PUT /api/vans/:id` ⚠️
- `DELETE /api/vans/:id` → `DELETE /api/vans/:id` ⚠️

### Stock
- `GET /api/stock` → `GET /api/stock` ⚠️ (needs service/handler)
- `GET /api/stock/all` → `GET /api/stock/all` ⚠️
- `GET /api/stock/location/:id` → `GET /api/stock/location/:id` ⚠️
- `GET /api/stock/movements` → `GET /api/stock/movements` ⚠️
- `POST /api/stock/adjust` → `POST /api/stock/adjust` ⚠️
- `POST /api/stock/add` → `POST /api/stock/add` ⚠️

### Transfers
- `GET /api/transfers` → `GET /api/transfers` ⚠️ (needs service/handler)
- `GET /api/transfers/:id` → `GET /api/transfers/:id` ⚠️
- `POST /api/transfers` → `POST /api/transfers` ⚠️

### Invoices
- `GET /api/invoices/stats` → `GET /api/invoices/stats` ⚠️ (needs handler method)
- `GET /api/invoices` → `GET /api/invoices` ⚠️
- `GET /api/invoices/:id` → `GET /api/invoices/:id` ⚠️
- `POST /api/invoices/purchase` → `POST /api/invoices/purchase` ⚠️
- `POST /api/invoices/sales` → `POST /api/invoices/sales` ⚠️

### Payments
- `GET /api/payments` → `GET /api/payments` ⚠️ (needs service/handler)
- `POST /api/payments` → `POST /api/payments` ⚠️

### Reports
- `GET /api/reports/sales` → `GET /api/reports/sales` ⚠️ (needs handler)
- `GET /api/reports/stock-movements` → `GET /api/reports/stock-movements` ⚠️
- `GET /api/reports/receivables` → `GET /api/reports/receivables` ⚠️
- `GET /api/reports/product-performance` → `GET /api/reports/product-performance` ⚠️
- `GET /api/reports/dashboard` → `GET /api/reports/dashboard` ⚠️

### Users
- `GET /api/users` → `GET /api/users` ✅
- `GET /api/users/:id` → `GET /api/users/:id` ✅
- `POST /api/users` → `POST /api/users` ✅
- `PUT /api/users/:id` → `PUT /api/users/:id` ✅
- `DELETE /api/users/:id` → `DELETE /api/users/:id` ✅

### Vendors
- `GET /api/vendors` → `GET /api/vendors` ⚠️ (needs service/handler)
- `GET /api/vendors/:id` → `GET /api/vendors/:id` ⚠️
- `POST /api/vendors` → `POST /api/vendors` ⚠️
- `PUT /api/vendors/:id` → `PUT /api/vendors/:id` ⚠️
- `DELETE /api/vendors/:id` → `DELETE /api/vendors/:id` ⚠️

## Response Format

All responses follow this format (matching PHP backend):

### Success Response
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": { /* validation errors if any */ }
}
```

## Files Created

### Models
- ✅ `models/category.models.go`
- ✅ `models/customer.models.go`
- ✅ `models/vendor.models.go`
- ✅ `models/location.models.go`
- ✅ `models/employee.models.go`
- ✅ `models/van.models.go`
- ✅ `models/stock.models.go`
- ✅ `models/transfer.models.go`
- ✅ `models/payment.models.go`
- ✅ `models/sales_invoice.models.go`
- ✅ `models/purchase_invoice.models.go`
- ✅ Updated `models/product.models.go`

### Services (Need to be created)
- ⚠️ `services/category.services.go`
- ⚠️ `services/customer.services.go`
- ⚠️ `services/vendor.services.go`
- ⚠️ `services/location.services.go`
- ⚠️ `services/employee.services.go`
- ⚠️ `services/van.services.go`
- ⚠️ `services/stock.services.go`
- ⚠️ `services/transfer.services.go`
- ⚠️ `services/payment.services.go`
- ⚠️ `services/sales_invoice.services.go`
- ⚠️ `services/purchase_invoice.services.go`

### Handlers (Need to be created)
- ⚠️ `handlers/category.handlers.go`
- ⚠️ `handlers/customer.handlers.go`
- ⚠️ `handlers/vendor.handlers.go`
- ⚠️ `handlers/location.handlers.go`
- ⚠️ `handlers/employee.handlers.go`
- ⚠️ `handlers/van.handlers.go`
- ⚠️ `handlers/stock.handlers.go`
- ⚠️ `handlers/transfer.handlers.go`
- ⚠️ `handlers/payment.handlers.go`
- ⚠️ `handlers/invoice_new.handlers.go` (for sales/purchase invoices)
- ⚠️ `handlers/report.handlers.go`

## Next Steps

1. Create all missing services following the existing pattern
2. Create all missing handlers following the existing pattern
3. Update response format to match PHP backend exactly
4. Test all endpoints
5. Verify database migrations work correctly

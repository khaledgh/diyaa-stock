---
description: Zoho Books Style Workflow for Stock Management
---

# Zoho Books Style Workflow

This workflow describes how to process business transactions in the enhanced system.

## 1. Inventory & Items
- **Create Items**: Add products under "Items > Products". Categorize them for easier reporting.
- **Stock Tracking**: Use "Items > Inventory" to view stock levels across different locations (Vans, Warehousing).
- **Transfers**: Move stock between locations using "Items > Transfers".

## 2. Sales Process (Receivables)
- **Customers**: Register customers under "Sales > Customers".
- **Sales Invoices**: Create an invoice when a sale occurs. This will:
    - Reduce stock from the selected location.
    - Increase the customer's outstanding balance.
- **Record Payment**: Go to "Payments > Payments Received" or click "Record Payment" on an invoice.
    - This reduces the customer's outstanding balance.
- **Statement**: Generate a "Customer Statement" under "Reports" to see all transactions and the running balance.

## 3. Purchase Process (Payables)
- **Vendors**: Register suppliers under "Purchases > Vendors".
- **Bills (Purchase Invoices)**: Record a bill when purchasing stock. This will:
    - Increase stock in the selected location.
    - Increase the amount owed to the vendor.
- **Pay Bill**: Record a payment under "Payments > Payments Made".

## 4. Financial Health & Reporting
- **Dashboard**: Check the "Receivables" and "Payables" widgets for a quick overview of cash flow.
- **Valuation**: Run the "Inventory Valuation" report to see the total value of current stock.
- **Location Reports**: Use "Reports > By Location" to see which van or store is performing best.

## // turbo-all
Use the following commands to initialize any new migrations or seed data if needed:
- `.\migrate.ps1`
- `.\seed.ps1`

# PowerShell script to remove old/unwanted files

Write-Host "Removing old handlers..." -ForegroundColor Yellow

# Remove old handlers
Remove-Item -Path "handlers/account.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/bank_account.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/bank_transaction.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/business_unit.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/client.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/invoice.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/invoiceDetails.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/ledger.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/receipt.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/receivable_invoice.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/tax.handlers.go" -ErrorAction SilentlyContinue
Remove-Item -Path "handlers/tax_entry.handlers.go" -ErrorAction SilentlyContinue

Write-Host "Removing old services..." -ForegroundColor Yellow

# Remove old services
Remove-Item -Path "services/account.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/bank_account.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/bank_transaction.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/business_unit.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/client.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/invoice.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/invoiceDetails.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/ledger.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/receipt.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/receivable_invoice.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/tax.services.go" -ErrorAction SilentlyContinue
Remove-Item -Path "services/tax_entry.services.go" -ErrorAction SilentlyContinue

Write-Host "Removing old models..." -ForegroundColor Yellow

# Remove old models
Remove-Item -Path "models/account.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/bank.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/business.unit.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/client.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/company.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/invoice.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/ledger.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/receipt.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/receivable.models.go" -ErrorAction SilentlyContinue
Remove-Item -Path "models/tax.models.go" -ErrorAction SilentlyContinue

Write-Host "Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining files are:" -ForegroundColor Cyan
Write-Host "  Handlers: auth, category, custom, product, productBrand, productType, supplier, user" -ForegroundColor White
Write-Host "  Services: auth, category, product, productBrand, productType, supplier, user" -ForegroundColor White
Write-Host "  Models: category, customer, employee, location, payment, product, purchase_invoice, sales_invoice, stock, supplier, transfer, user, van, vendor" -ForegroundColor White

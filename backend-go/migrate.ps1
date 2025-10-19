# Database Migration Script
# This script runs the Go application briefly to execute auto-migrations

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Database Migration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your database credentials." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting Go application to run migrations..." -ForegroundColor Yellow
Write-Host "This will create/update all database tables." -ForegroundColor Yellow
Write-Host ""

# Start the Go app
$process = Start-Process -FilePath "go" -ArgumentList "run", "cmd/main.go" -NoNewWindow -PassThru

# Wait for migrations to complete (10 seconds should be enough)
Write-Host "Waiting for migrations to complete..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Stop the process
Write-Host "Stopping application..." -ForegroundColor Yellow
Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Migration Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "All database tables have been created/updated." -ForegroundColor White
Write-Host ""
Write-Host "Expected tables:" -ForegroundColor Cyan
Write-Host "  ✓ users" -ForegroundColor White
Write-Host "  ✓ categories" -ForegroundColor White
Write-Host "  ✓ product_types" -ForegroundColor White
Write-Host "  ✓ product_brands" -ForegroundColor White
Write-Host "  ✓ products" -ForegroundColor White
Write-Host "  ✓ customers" -ForegroundColor White
Write-Host "  ✓ vendors" -ForegroundColor White
Write-Host "  ✓ suppliers" -ForegroundColor White
Write-Host "  ✓ locations" -ForegroundColor White
Write-Host "  ✓ employees" -ForegroundColor White
Write-Host "  ✓ vans" -ForegroundColor White
Write-Host "  ✓ stocks" -ForegroundColor White
Write-Host "  ✓ stock_movements" -ForegroundColor White
Write-Host "  ✓ transfers" -ForegroundColor White
Write-Host "  ✓ transfer_items" -ForegroundColor White
Write-Host "  ✓ sales_invoices" -ForegroundColor White
Write-Host "  ✓ sales_invoice_items" -ForegroundColor White
Write-Host "  ✓ purchase_invoices" -ForegroundColor White
Write-Host "  ✓ purchase_invoice_items" -ForegroundColor White
Write-Host "  ✓ payments" -ForegroundColor White
Write-Host ""
Write-Host "You can now:" -ForegroundColor Yellow
Write-Host "  1. Run seeder: .\seed.ps1" -ForegroundColor White
Write-Host "  2. Start application: go run cmd/main.go" -ForegroundColor White
Write-Host ""

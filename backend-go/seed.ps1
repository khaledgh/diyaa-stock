# Database Seeder Script
# This script runs the database seeder to populate the database with initial data

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Diyaa Stock - Database Seeder" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create a .env file based on .env.example" -ForegroundColor Yellow
    Write-Host ""
    
    $continue = Read-Host "Do you want to continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Seeding cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Starting database seeder..." -ForegroundColor Green
Write-Host ""

# Run the seeder
try {
    go run ./cmd/seed/main.go
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Green
        Write-Host "  Seeding completed successfully!" -ForegroundColor Green
        Write-Host "=========================================" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host "  Seeding failed!" -ForegroundColor Red
        Write-Host "=========================================" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error running seeder: $_" -ForegroundColor Red
    exit 1
}

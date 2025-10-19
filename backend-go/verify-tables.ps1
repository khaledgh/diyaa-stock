# Verify Database Tables Script

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Database Tables Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit 1
}

# Parse .env file
$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

$dbHost = $envVars["DB_HOST"]
$dbPort = $envVars["DB_PORT"]
$dbUser = $envVars["DB_USER"]
$dbPassword = $envVars["DB_PASSWORD"]
$dbName = $envVars["DB_NAME"]

Write-Host "Checking database: $dbName" -ForegroundColor Yellow
Write-Host ""

# Check if database exists
Write-Host "Checking if database exists..." -ForegroundColor Yellow
$checkDb = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -e `"SHOW DATABASES LIKE '$dbName';`" 2>&1"
$result = Invoke-Expression $checkDb

if ($result -match $dbName) {
    Write-Host "✓ Database '$dbName' exists" -ForegroundColor Green
} else {
    Write-Host "✗ Database '$dbName' does NOT exist!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Creating database..." -ForegroundColor Yellow
    $createDb = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -e `"CREATE DATABASE $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`" 2>&1"
    Invoke-Expression $createDb
    Write-Host "✓ Database created" -ForegroundColor Green
}

Write-Host ""
Write-Host "Listing all tables..." -ForegroundColor Yellow
Write-Host ""

$tablesCmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -D $dbName -e `"SHOW TABLES;`" 2>&1"
$tables = Invoke-Expression $tablesCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host $tables
    Write-Host ""
    
    # Count tables
    $tableCount = ($tables -split "`n" | Where-Object { $_ -match "^\|" -and $_ -notmatch "Tables_in" }).Count
    Write-Host "Total tables: $tableCount" -ForegroundColor Cyan
    
    # Check for specific tables
    Write-Host ""
    Write-Host "Checking critical tables:" -ForegroundColor Yellow
    
    $criticalTables = @("users", "products", "stocks", "stock_movements", "categories", "locations")
    
    foreach ($table in $criticalTables) {
        if ($tables -match $table) {
            Write-Host "  ✓ $table" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $table (MISSING)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    # Check if 'stock' (singular) exists
    if ($tables -match "stock") {
        Write-Host "WARNING: Found 'stock' (singular) table - this might cause issues!" -ForegroundColor Yellow
        Write-Host "  GORM expects 'stocks' (plural)" -ForegroundColor Yellow
    }
    
    # If no tables, suggest running migrations
    if ($tableCount -eq 0) {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host "  NO TABLES FOUND!" -ForegroundColor Red
        Write-Host "=========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "You need to run migrations:" -ForegroundColor Yellow
        Write-Host "  .\migrate.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Or start the application to auto-migrate:" -ForegroundColor Yellow
        Write-Host "  go run cmd/main.go" -ForegroundColor White
        Write-Host "  (wait 10 seconds, then Ctrl+C)" -ForegroundColor Gray
    }
    
} else {
    Write-Host "✗ Could not list tables" -ForegroundColor Red
    Write-Host "Error: $tables" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Verification Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

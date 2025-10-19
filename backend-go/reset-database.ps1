# Database Reset and Migration Script
# WARNING: This will DROP and RECREATE the database!

Write-Host "=========================================" -ForegroundColor Red
Write-Host "  DATABASE RESET WARNING" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Red
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. DROP the existing database" -ForegroundColor Yellow
Write-Host "  2. CREATE a new empty database" -ForegroundColor Yellow
Write-Host "  3. Run migrations (create all tables)" -ForegroundColor Yellow
Write-Host "  4. Seed with sample data" -ForegroundColor Yellow
Write-Host ""

$continue = Read-Host "Are you sure you want to continue? Type 'YES' to proceed"
if ($continue -ne "YES") {
    Write-Host "Operation cancelled." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Loading Configuration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Load .env file
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your database credentials." -ForegroundColor Yellow
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

Write-Host "Database: $dbName" -ForegroundColor White
Write-Host "Host: $dbHost:$dbPort" -ForegroundColor White
Write-Host "User: $dbUser" -ForegroundColor White
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Step 1: Dropping Database" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$dropCmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -e `"DROP DATABASE IF EXISTS $dbName;`" 2>&1"
$result = Invoke-Expression $dropCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database dropped successfully" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not drop database (it may not exist)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Step 2: Creating Database" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$createCmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -e `"CREATE DATABASE $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`" 2>&1"
$result = Invoke-Expression $createCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Step 3: Running Migrations" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Starting Go application to run auto-migrations..." -ForegroundColor Yellow
Write-Host ""

# Start the Go app in background to run migrations
$job = Start-Job -ScriptBlock {
    param($workDir)
    Set-Location $workDir
    go run cmd/main.go
} -ArgumentList (Get-Location).Path

# Wait for migrations to complete (give it 10 seconds)
Start-Sleep -Seconds 10

# Stop the job
Stop-Job -Job $job
Remove-Job -Job $job

Write-Host ""
Write-Host "✓ Migrations completed" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Step 4: Verifying Tables" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$tablesCmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -D $dbName -e `"SHOW TABLES;`" 2>&1"
$tables = Invoke-Expression $tablesCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Tables created successfully:" -ForegroundColor Green
    Write-Host $tables
} else {
    Write-Host "✗ Could not verify tables" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Step 5: Seeding Database" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$seedChoice = Read-Host "Do you want to seed the database with sample data? (y/n)"
if ($seedChoice -eq "y" -or $seedChoice -eq "Y") {
    Write-Host "Running seeder..." -ForegroundColor Yellow
    go run cmd/seed/main.go
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Database seeded successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Seeding failed" -ForegroundColor Red
    }
} else {
    Write-Host "Skipping seeding" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  Database Reset Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your database is now ready to use." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start the backend: go run cmd/main.go" -ForegroundColor White
Write-Host "  2. Start the frontend: cd ../frontend && npm run dev" -ForegroundColor White
Write-Host ""

if ($seedChoice -eq "y" -or $seedChoice -eq "Y") {
    Write-Host "Default login credentials:" -ForegroundColor Cyan
    Write-Host "  Email: admin@diyaa.com" -ForegroundColor White
    Write-Host "  Password: password123" -ForegroundColor White
    Write-Host ""
}

# MySQL Setup Script for Diyaa Stock
# This script helps you set up MySQL database for the application

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  MySQL Setup for Diyaa Stock" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is installed
Write-Host "Checking MySQL installation..." -ForegroundColor Yellow

$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue

if ($null -eq $mysqlService) {
    Write-Host "MySQL service not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install MySQL first:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://dev.mysql.com/downloads/installer/" -ForegroundColor White
    Write-Host "  2. Or use XAMPP/WAMP" -ForegroundColor White
    Write-Host "  3. Or use Docker: docker run --name mysql -e MYSQL_ROOT_PASSWORD=root -p 3306:3306 -d mysql:8.0" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "MySQL service found: $($mysqlService.Name)" -ForegroundColor Green

# Check if MySQL is running
if ($mysqlService.Status -ne "Running") {
    Write-Host "MySQL service is not running. Starting..." -ForegroundColor Yellow
    try {
        Start-Service -Name $mysqlService.Name
        Write-Host "MySQL service started successfully!" -ForegroundColor Green
    } catch {
        Write-Host "Failed to start MySQL service. Please start it manually." -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "MySQL service is running!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Database Configuration" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for database details
Write-Host "Please provide your MySQL credentials:" -ForegroundColor Yellow
Write-Host ""

$dbHost = Read-Host "Database Host (default: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbPort = Read-Host "Database Port (default: 3306)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "3306" }

$dbUser = Read-Host "Database User (default: root)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "root" }

$dbPassword = Read-Host "Database Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbName = Read-Host "Database Name (default: diyaa_stock)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "diyaa_stock" }

Write-Host ""
Write-Host "Testing MySQL connection..." -ForegroundColor Yellow

# Test connection using mysql command
$testConnection = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPasswordPlain -e 'SELECT 1;' 2>&1"
$result = Invoke-Expression $testConnection

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to connect to MySQL!" -ForegroundColor Red
    Write-Host "Please verify your credentials and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can also create the .env file manually." -ForegroundColor Yellow
    exit 1
}

Write-Host "Connection successful!" -ForegroundColor Green
Write-Host ""

# Create database if it doesn't exist
Write-Host "Creating database '$dbName' if it doesn't exist..." -ForegroundColor Yellow
$createDb = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPasswordPlain -e 'CREATE DATABASE IF NOT EXISTS $dbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' 2>&1"
Invoke-Expression $createDb

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database '$dbName' is ready!" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not create database. It may already exist." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Creating .env File" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Generate JWT secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Create .env file
$envContent = @"
# Database Configuration
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_USER=$dbUser
DB_PASSWORD=$dbPasswordPlain
DB_NAME=$dbName

# JWT Configuration
JWT_SECRET=$jwtSecret

# Application Configuration
APP_PORT=9000
APP_ENV=development

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Seeding (set to true to seed database on startup)
SEED_DATABASE=false
"@

$envPath = ".env"

if (Test-Path $envPath) {
    $overwrite = Read-Host ".env file already exists. Overwrite? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Keeping existing .env file." -ForegroundColor Yellow
        Write-Host ""
    } else {
        $envContent | Out-File -FilePath $envPath -Encoding UTF8
        Write-Host ".env file created successfully!" -ForegroundColor Green
    }
} else {
    $envContent | Out-File -FilePath $envPath -Encoding UTF8
    Write-Host ".env file created successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your database is configured:" -ForegroundColor Green
Write-Host "  Host: $dbHost" -ForegroundColor White
Write-Host "  Port: $dbPort" -ForegroundColor White
Write-Host "  Database: $dbName" -ForegroundColor White
Write-Host "  User: $dbUser" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run the application: go run cmd/main.go" -ForegroundColor White
Write-Host "     (This will auto-migrate the database schema)" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Seed the database: .\seed.ps1" -ForegroundColor White
Write-Host "     (This will populate with sample data)" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Login with: admin@diyaa.com / password123" -ForegroundColor White
Write-Host ""

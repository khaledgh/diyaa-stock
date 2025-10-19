# Simple Database Tables Check

Write-Host "Checking Database Tables..." -ForegroundColor Cyan
Write-Host ""

# Load .env
if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    exit 1
}

$envVars = @{}
Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $envVars[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$dbHost = $envVars["DB_HOST"]
$dbPort = $envVars["DB_PORT"]
$dbUser = $envVars["DB_USER"]
$dbPassword = $envVars["DB_PASSWORD"]
$dbName = $envVars["DB_NAME"]

Write-Host "Database: $dbName" -ForegroundColor Yellow
Write-Host ""

# Show all tables
$cmd = "mysql -h $dbHost -P $dbPort -u $dbUser -p$dbPassword -D $dbName -e `"SHOW TABLES;`" 2>&1"
$result = Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "Tables in database:" -ForegroundColor Green
    Write-Host $result
    Write-Host ""
    
    # Check for stocks table
    if ($result -match "stocks") {
        Write-Host "SUCCESS: 'stocks' table exists!" -ForegroundColor Green
    } else {
        Write-Host "ERROR: 'stocks' table NOT found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Run migrations with:" -ForegroundColor Yellow
        Write-Host "  go run cmd/main.go" -ForegroundColor White
        Write-Host "  (wait 10 seconds, then Ctrl+C)" -ForegroundColor Gray
    }
} else {
    Write-Host "Error accessing database!" -ForegroundColor Red
    Write-Host $result
}

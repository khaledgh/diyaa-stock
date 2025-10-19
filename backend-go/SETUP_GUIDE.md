# Complete Setup Guide - Diyaa Stock Backend

This guide will walk you through setting up the Diyaa Stock backend from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MySQL Setup](#mysql-setup)
3. [Application Setup](#application-setup)
4. [Database Seeding](#database-seeding)
5. [Running the Application](#running-the-application)
6. [Verification](#verification)

---

## Prerequisites

### Required Software
- **Go** 1.20 or higher - [Download](https://go.dev/dl/)
- **MySQL** 8.0 or higher - [Download](https://dev.mysql.com/downloads/installer/)
- **Git** (optional) - [Download](https://git-scm.com/downloads)

### Verify Installation
```powershell
# Check Go version
go version

# Check MySQL
mysql --version

# Check if MySQL service is running
Get-Service -Name MySQL*
```

---

## MySQL Setup

### Option 1: Automated Setup (Recommended)

Run the setup script:
```powershell
.\setup-mysql.ps1
```

This script will:
- ✅ Check MySQL installation
- ✅ Start MySQL service if stopped
- ✅ Test database connection
- ✅ Create database
- ✅ Generate `.env` file with your credentials

### Option 2: Manual Setup

#### Step 1: Create Database
```powershell
# Connect to MySQL
mysql -u root -p

# Then run:
```

```sql
CREATE DATABASE diyaa_stock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'diyaa_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON diyaa_stock.* TO 'diyaa_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Or use the SQL script:
```powershell
mysql -u root -p < setup-database.sql
```

#### Step 2: Create .env File
```powershell
# Copy example file
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=diyaa_stock

JWT_SECRET=change_this_to_a_random_secret_key

APP_PORT=9000
APP_ENV=development

CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## Application Setup

### Step 1: Install Dependencies
```powershell
go mod download
```

### Step 2: Verify Dependencies
```powershell
go mod tidy
```

### Step 3: Test Build
```powershell
go build ./cmd/main.go
```

---

## Database Seeding

### Run Migrations (Automatic)
The application automatically creates all tables on first run:
```powershell
go run cmd/main.go
```

Press `Ctrl+C` after you see "Connected to DB!" to stop.

### Seed Sample Data

**Option 1: Using Script**
```powershell
.\seed.ps1
```

**Option 2: Direct Command**
```powershell
go run cmd/seed/main.go
```

This creates:
- ✅ 3 Users (Admin, Manager, User)
- ✅ 5 Categories
- ✅ 5 Product Types
- ✅ 5 Product Brands
- ✅ 3 Locations
- ✅ 3 Customers
- ✅ 2 Vendors
- ✅ 2 Suppliers
- ✅ 5 Products
- ✅ 3 Employees
- ✅ 2 Vans
- ✅ 5 Stock Records

---

## Running the Application

### Development Mode
```powershell
go run cmd/main.go
```

### Production Build
```powershell
# Build executable
go build -o diyaa-stock.exe ./cmd/main.go

# Run
.\diyaa-stock.exe
```

The server will start on: **http://localhost:9000**

---

## Verification

### 1. Check Database Tables
```sql
USE diyaa_stock;
SHOW TABLES;
```

Expected tables:
```
categories
customers
employees
locations
payments
product_brands
product_types
products
purchase_invoice_items
purchase_invoices
sales_invoice_items
sales_invoices
stock_movements
stocks
suppliers
transfer_items
transfers
users
vans
vendors
```

### 2. Test API Endpoints

**Health Check:**
```powershell
curl http://localhost:9000/api/health
```

**Login:**
```powershell
curl -X POST http://localhost:9000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@diyaa.com\",\"password\":\"password123\"}'
```

### 3. Default Login Credentials

| Role    | Email               | Password    |
|---------|---------------------|-------------|
| Admin   | admin@diyaa.com     | password123 |
| Manager | manager@diyaa.com   | password123 |
| User    | user@diyaa.com      | password123 |

---

## Project Structure

```
backend-go/
├── cmd/
│   ├── main.go              # Application entry point
│   └── seed/
│       └── main.go          # Database seeder
├── database/
│   ├── db.go                # Database connection
│   └── seed.go              # Seed functions
├── handlers/                # HTTP handlers
├── models/                  # Database models
├── routes/                  # Route definitions
├── services/                # Business logic
├── utils/                   # Utility functions
├── .env                     # Environment variables (create this)
├── .env.example             # Environment template
├── go.mod                   # Go dependencies
└── go.sum                   # Dependency checksums
```

---

## Common Issues & Solutions

### Issue: "Error loading .env file"
**Solution:** Create `.env` file in `backend-go` directory
```powershell
cp .env.example .env
```

### Issue: "Can't connect to MySQL"
**Solutions:**
1. Check MySQL is running:
   ```powershell
   Get-Service -Name MySQL*
   Start-Service -Name MySQL80
   ```

2. Verify credentials in `.env`

3. Test connection:
   ```powershell
   mysql -h localhost -u root -p
   ```

### Issue: "Access denied for user"
**Solution:** Reset MySQL password or create new user
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### Issue: "Unknown database"
**Solution:** Create the database
```sql
CREATE DATABASE diyaa_stock;
```

### Issue: Port 9000 already in use
**Solution:** Change port in `.env`
```env
APP_PORT=9001
```

Or kill the process using port 9000:
```powershell
# Find process
netstat -ano | findstr :9000

# Kill process (replace PID)
taskkill /PID <PID> /F
```

---

## Next Steps

1. **Configure Frontend**: Update frontend `.env` to point to backend
   ```env
   VITE_API_BASE_URL=http://localhost:9000/api
   ```

2. **Explore API**: Check available endpoints in `routes/routes.go`

3. **Customize Data**: Modify `database/seed.go` to add your own sample data

4. **Read Documentation**:
   - [MySQL Connection Guide](MYSQL_CONNECTION_GUIDE.md)
   - [Seeder Documentation](SEEDER_README.md)
   - [Quick Start](SEED_QUICK_START.md)

---

## Development Workflow

```powershell
# 1. Start MySQL
Start-Service -Name MySQL80

# 2. Run backend
go run cmd/main.go

# 3. In another terminal, run frontend
cd ../frontend
npm run dev

# 4. Access application
# Frontend: http://localhost:3000
# Backend API: http://localhost:9000/api
```

---

## Production Deployment

For production deployment:

1. **Update .env for production**
   ```env
   APP_ENV=production
   DB_HOST=your-production-db-host
   JWT_SECRET=use-a-very-strong-secret-here
   ```

2. **Build optimized binary**
   ```powershell
   go build -ldflags="-s -w" -o diyaa-stock.exe ./cmd/main.go
   ```

3. **Use process manager** (e.g., systemd, PM2, or Windows Service)

4. **Set up reverse proxy** (e.g., Nginx, Apache)

5. **Enable HTTPS** with SSL certificates

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error logs in the console
3. Check MySQL error logs
4. Verify all environment variables are set correctly

---

## Quick Reference Commands

```powershell
# Setup
.\setup-mysql.ps1              # Setup MySQL and create .env
go mod download                # Install dependencies

# Database
mysql -u root -p               # Connect to MySQL
go run cmd/main.go             # Run migrations
go run cmd/seed/main.go        # Seed database

# Development
go run cmd/main.go             # Run application
go build ./cmd/main.go         # Build executable

# Testing
curl http://localhost:9000/api/health  # Test API
```

---

**You're all set! 🚀**

The backend should now be running and ready to accept requests from the frontend.

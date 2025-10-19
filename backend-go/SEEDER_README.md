# Database Seeder

This document explains how to use the database seeder to populate your database with initial test data.

## Overview

The seeder creates sample data for all major entities in the system:
- **Users** (Admin, Manager, Regular User)
- **Categories** (Electronics, Clothing, Food & Beverages, etc.)
- **Product Types** (Smartphones, Laptops, T-Shirts, etc.)
- **Product Brands** (Samsung, Apple, Dell, Nike, Adidas)
- **Locations** (Warehouses and Stores)
- **Customers** (Sample customer records)
- **Vendors** (Sample vendor records)
- **Suppliers** (Sample supplier records)
- **Products** (Sample products with proper relationships)
- **Employees** (Sample employee records)
- **Vans** (Delivery vans)
- **Stock** (Initial stock levels for products)

## Running the Seeder

### Method 1: Using the Seed Command

```powershell
# Navigate to the seed command directory
cd cmd/seed

# Run the seeder
go run main.go
```

### Method 2: Build and Run

```powershell
# Build the seeder
go build -o seed.exe ./cmd/seed

# Run the built executable
./seed.exe
```

### Method 3: From Project Root

```powershell
# Run directly from project root
go run ./cmd/seed/main.go
```

## Default Credentials

After seeding, you can login with these credentials:

| Role    | Email                | Password    | Company ID |
|---------|---------------------|-------------|------------|
| Admin   | admin@diyaa.com     | password123 | 1001       |
| Manager | manager@diyaa.com   | password123 | 1002       |
| User    | user@diyaa.com      | password123 | 1003       |

## Seeded Data Summary

### Users (3 records)
- 1 Admin user
- 1 Manager user
- 1 Regular user

### Categories (5 records)
- Electronics
- Clothing
- Food & Beverages
- Home Appliances
- Sports & Entertainment

### Product Types (5 records)
- Smartphones
- Laptops
- T-Shirts
- Beverages
- Snacks

### Product Brands (5 records)
- Samsung
- Apple
- Dell
- Nike
- Adidas

### Locations (3 records)
- Main Warehouse
- Secondary Warehouse
- Retail Store #1

### Customers (3 records)
- ABC Corporation (Credit Limit: $10,000)
- XYZ Trading (Credit Limit: $5,000)
- Retail Plus (Credit Limit: $7,500)

### Vendors (2 records)
- Tech Supplies Inc
- Global Distributors

### Suppliers (2 records)
- Premium Suppliers Ltd
- Wholesale Partners

### Products (5 records)
- Samsung Galaxy S21 ($799.99)
- iPhone 13 Pro ($999.99)
- Dell XPS 15 ($1,499.99)
- Nike Sports T-Shirt ($29.99)
- Mineral Water 500ml ($1.50)

### Employees (3 records)
- Ahmed Hassan (Warehouse Manager, Salary: $3,500)
- Sara Mohamed (Sales Associate, Salary: $2,800)
- Omar Ali (Store Manager, Salary: $3,200)

### Vans (2 records)
- Van 1 - Ford Transit (Plate: ABC-1234)
- Van 2 - Mercedes Sprinter (Plate: XYZ-5678)

### Stock (5 records)
- Products distributed across different locations with initial quantities

## Important Notes

1. **Idempotent**: The seeder checks if data already exists before inserting. If records exist, it will skip that section.

2. **Order Matters**: The seeder runs in a specific order to respect foreign key relationships:
   - Users → Categories → Product Types → Product Brands → Locations
   - Customers → Vendors → Suppliers → Products
   - Employees → Vans → Stock

3. **Environment Variables**: Make sure your `.env` file is properly configured with database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=your_database
   ```

4. **Database Migration**: Ensure you've run the database migrations before seeding:
   ```powershell
   go run cmd/main.go
   ```
   The main application will auto-migrate the schema on startup.

## Customizing the Seeder

To customize the seed data, edit the file: `database/seed.go`

Each entity has its own seed function (e.g., `seedUsers`, `seedProducts`, etc.). You can:
- Add more records
- Modify existing data
- Change default values
- Add new seed functions for additional entities

## Troubleshooting

### Error: "Can't connect to database"
- Check your `.env` file configuration
- Ensure MySQL/MariaDB is running
- Verify database credentials

### Error: "Foreign key constraint fails"
- The seeder runs in dependency order, but if you've modified it, ensure parent records exist before child records

### Error: "Duplicate entry"
- The seeder is idempotent and should skip existing records
- If you want to re-seed, you'll need to clear the database first

### Clearing the Database
To start fresh:
```sql
-- Drop all tables (be careful!)
DROP DATABASE your_database;
CREATE DATABASE your_database;
```

Then run migrations and seed again.

## Integration with Main Application

You can also integrate the seeder into your main application for development purposes:

```go
// In cmd/main.go, add after DBInit():
if os.Getenv("SEED_DATABASE") == "true" {
    if err := database.SeedDatabase(db); err != nil {
        e.Logger.Error("Failed to seed database:", err)
    }
}
```

Then set `SEED_DATABASE=true` in your `.env` file when needed.

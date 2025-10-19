# Quick Start: Database Seeding

## Prerequisites
1. MySQL/MariaDB running
2. Database created
3. `.env` file configured

## Steps

### 1. Configure Environment
Copy `.env.example` to `.env` and update with your database credentials:
```powershell
cp .env.example .env
```

### 2. Run the Seeder

**Option A: Using PowerShell Script (Recommended)**
```powershell
.\seed.ps1
```

**Option B: Using Go Command**
```powershell
go run ./cmd/seed/main.go
```

**Option C: Build and Run**
```powershell
go build -o seed.exe ./cmd/seed
.\seed.exe
```

### 3. Verify
Login to your application with:
- **Email**: admin@diyaa.com
- **Password**: password123

## What Gets Seeded?

✅ 3 Users (Admin, Manager, User)  
✅ 5 Categories  
✅ 5 Product Types  
✅ 5 Product Brands  
✅ 3 Locations  
✅ 3 Customers  
✅ 2 Vendors  
✅ 2 Suppliers  
✅ 5 Products  
✅ 3 Employees  
✅ 2 Vans  
✅ 5 Stock Records  

## Notes
- The seeder is **idempotent** - it won't duplicate data if run multiple times
- All passwords are hashed using bcrypt
- Default password for all users: `password123`

## Troubleshooting

**Database connection failed?**
- Check your `.env` file
- Ensure MySQL is running
- Verify database exists

**Permission denied?**
- On Windows, you may need to run PowerShell as Administrator
- Or use: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

For detailed documentation, see [SEEDER_README.md](SEEDER_README.md)

# MySQL Connection Guide

This guide explains how to set up and configure MySQL connection for the Diyaa Stock backend.

## Prerequisites

### 1. Install MySQL
Download and install MySQL Server:
- **Windows**: [MySQL Installer](https://dev.mysql.com/downloads/installer/)
- **Alternative**: Use XAMPP, WAMP, or Docker

### 2. Verify MySQL is Running

**Check MySQL Service (Windows):**
```powershell
# Check if MySQL service is running
Get-Service -Name MySQL* | Select-Object Name, Status

# Start MySQL service if stopped
Start-Service -Name MySQL80  # Adjust name based on your version
```

**Or use MySQL Workbench or command line:**
```powershell
mysql -u root -p
```

## Database Setup

### Step 1: Create Database

Connect to MySQL and create the database:

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE diyaa_stock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional, for security)
CREATE USER 'diyaa_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON diyaa_stock.* TO 'diyaa_user'@'localhost';

-- Apply changes
FLUSH PRIVILEGES;

-- Verify
SHOW DATABASES;
USE diyaa_stock;
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `backend-go` directory:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root              # or 'diyaa_user' if you created a specific user
DB_PASSWORD=your_password # your MySQL root password
DB_NAME=diyaa_stock

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_this_in_production

# Application Configuration
APP_PORT=9000
APP_ENV=development

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Connection String Format

The application uses this DSN (Data Source Name) format:
```
username:password@(host:port)/database?parseTime=true
```

Example:
```
root:mypassword@(localhost:3306)/diyaa_stock?parseTime=true
```

## Testing the Connection

### Method 1: Run the Main Application
```powershell
go run cmd/main.go
```

Expected output:
```
DB_HOST: localhost
Connected to DB!
```

### Method 2: Run the Seeder
```powershell
go run cmd/seed/main.go
```

This will test the connection and populate the database with sample data.

## Common Connection Issues

### Issue 1: "Error loading .env file"
**Solution:**
- Ensure `.env` file exists in the `backend-go` directory
- Check file permissions
- Verify the file is not named `.env.txt`

### Issue 2: "Access denied for user"
**Solutions:**
```sql
-- Reset root password (if forgotten)
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';

-- Or create new user
CREATE USER 'diyaa_user'@'localhost' IDENTIFIED BY 'password123';
GRANT ALL PRIVILEGES ON diyaa_stock.* TO 'diyaa_user'@'localhost';
FLUSH PRIVILEGES;
```

### Issue 3: "Unknown database 'diyaa_stock'"
**Solution:**
```sql
CREATE DATABASE diyaa_stock;
```

### Issue 4: "Can't connect to MySQL server"
**Solutions:**
1. Check if MySQL service is running:
   ```powershell
   Get-Service -Name MySQL*
   ```

2. Start MySQL service:
   ```powershell
   Start-Service -Name MySQL80
   ```

3. Check if port 3306 is in use:
   ```powershell
   netstat -ano | findstr :3306
   ```

### Issue 5: "Too many connections"
**Solution:**
```sql
-- Check current connections
SHOW PROCESSLIST;

-- Increase max connections
SET GLOBAL max_connections = 200;
```

### Issue 6: Connection timeout
**Solution:**
The application retries connection up to 10 times with 1-second intervals. If it still fails:
- Check firewall settings
- Verify MySQL is listening on 0.0.0.0 or localhost
- Check `my.ini` or `my.cnf` for bind-address setting

## MySQL Configuration Files

### Windows
- **Location**: `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`
- **Or**: `C:\Program Files\MySQL\MySQL Server 8.0\my.ini`

### Important Settings
```ini
[mysqld]
# Bind to all interfaces (or just localhost)
bind-address = 0.0.0.0

# Port
port = 3306

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Max connections
max_connections = 200

# Packet size (for large data)
max_allowed_packet = 64M
```

## Docker Alternative

If you prefer using Docker for MySQL:

### docker-compose.yml
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: diyaa_mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: diyaa_stock
      MYSQL_USER: diyaa_user
      MYSQL_PASSWORD: diyaa_pass
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    command: --default-authentication-plugin=mysql_native_password

volumes:
  mysql_data:
```

**Run with:**
```powershell
docker-compose up -d
```

**Your .env would be:**
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=diyaa_user
DB_PASSWORD=diyaa_pass
DB_NAME=diyaa_stock
```

## Verifying Connection in Code

The connection logic is in `database/db.go`:

```go
func connectToDB() *gorm.DB {
    // Loads .env file
    err := godotenv.Load()
    
    // Reads environment variables
    dbHost := os.Getenv("DB_HOST")
    dbPort := os.Getenv("DB_PORT")
    dbUser := os.Getenv("DB_USER")
    dbPassword := os.Getenv("DB_PASSWORD")
    dbName := os.Getenv("DB_NAME")
    
    // Creates DSN
    dsn := dbUser + ":" + dbPassword + "@(" + dbHost + ":" + dbPort + ")/" + dbName + "?parseTime=true"
    
    // Attempts connection with retry logic (up to 10 times)
    connection, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
        DisableForeignKeyConstraintWhenMigrating: true,
    })
}
```

## Next Steps

After successful connection:

1. **Run Migrations** (automatic on app start):
   ```powershell
   go run cmd/main.go
   ```

2. **Seed Database**:
   ```powershell
   .\seed.ps1
   # or
   go run cmd/seed/main.go
   ```

3. **Verify Tables Created**:
   ```sql
   USE diyaa_stock;
   SHOW TABLES;
   ```

Expected tables:
- users
- categories
- product_types
- product_brands
- products
- locations
- customers
- vendors
- suppliers
- employees
- vans
- stocks
- stock_movements
- transfers
- transfer_items
- sales_invoices
- sales_invoice_items
- purchase_invoices
- purchase_invoice_items
- payments

## Security Best Practices

1. **Never commit .env file** - It's in `.gitignore`
2. **Use strong passwords** in production
3. **Create dedicated database user** instead of using root
4. **Use environment-specific configurations**
5. **Enable SSL/TLS** for production databases
6. **Restrict database access** by IP if possible

## Production Considerations

For production deployment:

```env
# Use remote database
DB_HOST=your-db-server.com
DB_PORT=3306
DB_USER=prod_user
DB_PASSWORD=strong_secure_password
DB_NAME=diyaa_stock_prod

# Enable SSL
DB_SSL_MODE=required
```

Update connection string to include SSL:
```go
dsn := dbUser + ":" + dbPassword + "@tcp(" + dbHost + ":" + dbPort + ")/" + dbName + "?parseTime=true&tls=true"
```

## Support

If you continue to have connection issues:

1. Check MySQL error logs:
   - Windows: `C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err`
   
2. Enable verbose logging in your app (already enabled):
   ```go
   fmt.Println("DB_HOST:", dbHost)
   log.Println("DB not yet ready ...")
   ```

3. Test connection with MySQL client:
   ```powershell
   mysql -h localhost -P 3306 -u root -p diyaa_stock
   ```

4. Verify Go MySQL driver is installed:
   ```powershell
   go get -u gorm.io/driver/mysql
   go get -u gorm.io/gorm
   ```

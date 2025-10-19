-- =============================================
-- Diyaa Stock - Database Setup Script
-- =============================================
-- This script creates the database and user for the application
-- Run this script as MySQL root user

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS diyaa_stock 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 2. Create User (Optional - for better security)
-- Replace 'your_secure_password' with a strong password
CREATE USER IF NOT EXISTS 'diyaa_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 3. Grant Privileges
GRANT ALL PRIVILEGES ON diyaa_stock.* TO 'diyaa_user'@'localhost';

-- 4. Apply Changes
FLUSH PRIVILEGES;

-- 5. Verify Database
SHOW DATABASES LIKE 'diyaa_stock';

-- 6. Use the database
USE diyaa_stock;

-- =============================================
-- Notes:
-- =============================================
-- After running this script:
-- 1. Update your .env file with these credentials:
--    DB_HOST=localhost
--    DB_PORT=3306
--    DB_USER=diyaa_user (or root if you prefer)
--    DB_PASSWORD=your_secure_password
--    DB_NAME=diyaa_stock
--
-- 2. Run the Go application to auto-migrate tables:
--    go run cmd/main.go
--
-- 3. Seed the database with sample data:
--    go run cmd/seed/main.go
--
-- =============================================
-- How to run this script:
-- =============================================
-- Method 1: MySQL Command Line
--   mysql -u root -p < setup-database.sql
--
-- Method 2: MySQL Workbench
--   Open the file and execute
--
-- Method 3: Command Line Interactive
--   mysql -u root -p
--   source setup-database.sql
--
-- =============================================
-- Troubleshooting:
-- =============================================
-- If you get "Access denied" error:
--   1. Make sure you're running as root user
--   2. Check your MySQL root password
--
-- If user already exists:
--   DROP USER 'diyaa_user'@'localhost';
--   Then run the CREATE USER command again
--
-- To reset root password (if forgotten):
--   ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
--
-- =============================================

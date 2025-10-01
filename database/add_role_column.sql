-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role ENUM('admin', 'manager', 'sales', 'user') DEFAULT 'user' AFTER full_name;

-- Update existing users to have admin role (you can change this as needed)
UPDATE users SET role = 'admin' WHERE id = 1;

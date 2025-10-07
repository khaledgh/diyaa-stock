# Database Migration: Merge Users and Employees

## Overview
This migration consolidates the `employees` and `users` tables into a single `users` table, simplifying the system architecture and reducing redundancy.

## Benefits
- **Simplified Management**: One table for all people in the system
- **Reduced Complexity**: No need to manage separate employee and user records
- **Better Integration**: Direct van assignment to users
- **Easier Authentication**: All employees can have login credentials

## Changes Made

### 1. Database Schema
- Added employee fields to `users` table:
  - `phone` - Contact phone number
  - `position` - Job position/title
  - `hire_date` - Date of hire
  - `salary` - Employee salary
  - `address` - Physical address
  - `emergency_contact` - Emergency contact name
  - `emergency_phone` - Emergency contact phone

### 2. Backend Updates
- **UserController**: Updated to handle employee fields and van assignments
- **User Model**: Already includes van_id in getUserWithRoles()
- **Van Assignment**: Users can now be directly assigned to vans via `sales_rep_id`

### 3. API Changes
- `GET /api/users` - Now returns users with van assignments and employee fields
- `POST /api/users` - Accepts employee fields and optional `van_id`
- `PUT /api/users/{id}` - Can update employee fields and reassign vans

## Migration Steps

### Step 1: Backup Database
```bash
mysqldump -u root -p diyaa_stock > backup_before_migration.sql
```

### Step 2: Run Migration
```bash
mysql -u root -p diyaa_stock < migrations/merge_users_employees.sql
```

### Step 3: Verify Data
Check that all employees have been migrated to users:
```sql
SELECT u.id, u.full_name, u.email, u.position, v.name as van_name
FROM users u
LEFT JOIN vans v ON v.sales_rep_id = u.id
WHERE u.position IS NOT NULL;
```

### Step 4: Test API
- Test user creation with employee fields
- Test van assignment
- Test POS app login with migrated users

### Step 5: Remove Old Table (Optional)
After verifying everything works:
```sql
DROP TABLE IF EXISTS employees;
```

## Rollback
If you need to rollback, restore from backup:
```bash
mysql -u root -p diyaa_stock < backup_before_migration.sql
```

## User Roles
After migration, users can have these roles:
- `admin` - Full system access
- `manager` - Management functions
- `sales` - Sales representatives (POS access)
- `employee` - General employees
- `user` - Basic users

## Van Assignment
To assign a user to a van:
```json
PUT /api/users/{id}
{
  "van_id": 1
}
```

Or via SQL:
```sql
UPDATE vans SET sales_rep_id = {user_id} WHERE id = {van_id};
```

## Testing Checklist
- [ ] All employees migrated to users
- [ ] Van assignments preserved
- [ ] POS app can login with migrated users
- [ ] User management works with new fields
- [ ] Van stock shows correctly for assigned users
- [ ] Sales invoices create successfully

## Notes
- Default password for migrated employees: `password`
- Users should change their password on first login
- The `employee_id` column in `vans` table is kept temporarily for safety
- After confirming everything works, you can drop the `employees` table

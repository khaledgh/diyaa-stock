# Role-Based Access Control System

## Setup Instructions

### 1. Run the Database Migration
Execute the SQL migration to add the role column to the users table:

```sql
-- Run this in your MySQL database
SOURCE database/add_role_column.sql;
```

Or manually run:
```sql
ALTER TABLE users 
ADD COLUMN role ENUM('admin', 'manager', 'sales', 'user') DEFAULT 'user' AFTER full_name;

-- Set first user as admin
UPDATE users SET role = 'admin' WHERE id = 1;
```

### 2. Refresh Your Browser
After running the migration, refresh your browser to clear any cached data.

## Role Definitions

### 🔴 Admin
**Full system access** - Can manage everything including users

**Permissions:**
- ✅ All features
- ✅ User management (create, edit, delete users)
- ✅ Settings management
- ✅ All reports
- ✅ Delete any records

**Visible Pages:**
- Dashboard, POS, Products, Customers, Employees, **Users**, Vans, Stock, Transfers, Invoices, Payments, Reports, Settings

---

### 🔵 Manager
**Full operational access** - Cannot manage system users

**Permissions:**
- ✅ Manage products, customers, employees
- ✅ Manage vans and stock
- ✅ Create and manage invoices
- ✅ View and export reports
- ✅ Approve transfers
- ❌ Cannot manage users
- ❌ Cannot access settings

**Visible Pages:**
- Dashboard, POS, Products, Customers, Employees, Vans, Stock, Transfers, Invoices, Payments, Reports

---

### 🟢 Sales
**Sales and customer management** - Can create invoices and manage customers

**Permissions:**
- ✅ Access POS
- ✅ Create sales invoices
- ✅ Manage customers
- ✅ View products (read-only)
- ✅ View and manage vans
- ✅ View stock levels
- ❌ Cannot edit products
- ❌ Cannot manage employees
- ❌ Cannot view reports

**Visible Pages:**
- Dashboard, POS, Products (view only), Customers, Vans, Stock (view only), Transfers (view only), Invoices, Payments

---

### ⚪ User
**Basic read-only access** - View-only for most features

**Permissions:**
- ✅ View dashboard
- ✅ View products
- ❌ Very limited access
- ❌ Cannot create or edit anything

**Visible Pages:**
- Dashboard, Products (view only)

---

## Permission System

### Backend Permissions Configuration
Located in: `backend/src/Config/Permissions.php`

The system uses a permission-based approach where each action is mapped to allowed roles:

```php
'view_products' => ['admin', 'manager', 'sales', 'user'],
'create_products' => ['admin', 'manager'],
'edit_products' => ['admin', 'manager'],
'delete_products' => ['admin'],
```

### Frontend Permission Checking

Use the `usePermissions` hook in your components:

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, canView, isAdmin } = usePermissions();
  
  // Check specific permission
  if (hasPermission('create_products')) {
    // Show create button
  }
  
  // Check if user can view a page
  if (canView('users')) {
    // Show users link
  }
  
  // Check role
  if (isAdmin()) {
    // Show admin-only features
  }
}
```

### Sidebar Navigation
The sidebar automatically filters menu items based on user permissions. Only pages the user has access to will be displayed.

## Customizing Permissions

### Adding New Permissions

1. **Backend** - Edit `backend/src/Config/Permissions.php`:
```php
public static function getRolePermissions() {
    return [
        // Add your new permission
        'your_new_permission' => ['admin', 'manager'],
        // ...
    ];
}
```

2. **Frontend** - Use in components:
```typescript
const { hasPermission } = usePermissions();

if (hasPermission('your_new_permission')) {
  // Show feature
}
```

### Adding New Pages to Navigation

Edit `backend/src/Config/Permissions.php` in the `getNavigationForRole` method:

```php
$allNavigation = [
    // Add your new page
    ['name' => 'your_page', 'permission' => 'view_your_page'],
    // ...
];
```

## Testing Roles

1. Create test users with different roles
2. Log in with each user
3. Verify that:
   - Sidebar shows only allowed pages
   - Buttons/actions respect permissions
   - API calls are authorized correctly

## Security Notes

- ⚠️ Always validate permissions on the backend
- ⚠️ Frontend permission checks are for UX only
- ⚠️ Never trust client-side permission checks for security
- ⚠️ Always verify user role/permissions in API endpoints

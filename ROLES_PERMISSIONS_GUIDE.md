# Roles & Permissions System Guide

## Overview
A comprehensive role-based access control (RBAC) system for managing user permissions across the application.

## Backend Structure

### 1. Database Models (`backend-go/models/role.models.go`)

#### Role
- `id`: Unique identifier
- `name`: Role name (e.g., "Admin", "Manager", "Cashier")
- `description`: Role description
- `company_id`: Associated company
- `is_system`: System roles cannot be deleted
- `permissions`: Many-to-many relationship with permissions

#### Permission
- `id`: Unique identifier
- `resource`: Resource name (e.g., "products", "invoices", "users")
- `action`: Action type (e.g., "view", "create", "update", "delete")
- `description`: Permission description

#### UserRole
- Links users to roles (many-to-many)
- `user_id`: User identifier
- `role_id`: Role identifier

### 2. Services (`backend-go/services/role.services.go`)

**RoleService Methods:**
- `GetAllRoles(companyID)` - Get all roles for a company
- `GetRoleByID(roleID, companyID)` - Get specific role
- `CreateRole(role)` - Create new role
- `UpdateRole(roleID, companyID, updates)` - Update role
- `DeleteRole(roleID, companyID)` - Delete role (if not system role)
- `AssignPermissionsToRole(roleID, permissionIDs)` - Assign permissions to role
- `GetAllPermissions()` - Get all available permissions
- `AssignRoleToUser(userID, roleID)` - Assign role to user
- `RemoveRoleFromUser(userID, roleID)` - Remove role from user
- `GetUserRoles(userID)` - Get all roles for a user
- `CheckUserPermission(userID, resource, action)` - Check if user has permission
- `GetUsersWithRoles(companyID)` - Get all users with their roles

### 3. API Endpoints (`backend-go/routes/routes.go`)

```
GET    /api/roles                    - List all roles
GET    /api/roles/:id                - Get role by ID
POST   /api/roles                    - Create new role
PUT    /api/roles/:id                - Update role
DELETE /api/roles/:id                - Delete role
GET    /api/permissions              - List all permissions
POST   /api/roles/:id/permissions    - Assign permissions to role
POST   /api/users/assign-role        - Assign role to user
POST   /api/users/remove-role        - Remove role from user
GET    /api/users-with-roles         - Get users with their roles
GET    /api/check-permission         - Check user permission
```

## Frontend Structure

### Roles Management Page (`frontend/src/pages/Roles.tsx`)

**Features:**

1. **Role Management**
   - Create new roles
   - Edit existing roles
   - Delete roles (except system roles)
   - View role details and permissions

2. **Permission Assignment**
   - Assign/remove permissions to roles
   - Permissions grouped by resource
   - Visual checkbox interface

3. **User Role Assignment**
   - View all users and their assigned roles
   - Assign roles to users
   - Remove roles from users
   - Visual role badges

**UI Components:**
- Role cards with permission count
- User table with role assignments
- Modal dialogs for editing
- Permission grouping by resource

## Permission Structure

### Resource Types
- `products` - Product management
- `invoices` - Invoice management
- `users` - User management
- `customers` - Customer management
- `locations` - Location management
- `stock` - Stock management
- `reports` - Report access
- `settings` - System settings

### Action Types
- `view` - Read access
- `create` - Create new records
- `update` - Modify existing records
- `delete` - Delete records

### Example Permissions
```json
{
  "resource": "products",
  "action": "view",
  "description": "View products"
},
{
  "resource": "products",
  "action": "create",
  "description": "Create new products"
},
{
  "resource": "invoices",
  "action": "delete",
  "description": "Delete invoices"
}
```

## Usage Examples

### 1. Create a New Role

**Backend:**
```go
POST /api/roles
{
  "name": "Store Manager",
  "description": "Manages store operations"
}
```

**Frontend:**
```typescript
await axios.post('/api/roles', {
  name: 'Store Manager',
  description: 'Manages store operations'
});
```

### 2. Assign Permissions to Role

**Backend:**
```go
POST /api/roles/1/permissions
{
  "permission_ids": [1, 2, 3, 5, 7]
}
```

**Frontend:**
```typescript
await axios.post(`/api/roles/${roleId}/permissions`, {
  permission_ids: selectedPermissions
});
```

### 3. Assign Role to User

**Backend:**
```go
POST /api/users/assign-role
{
  "user_id": 5,
  "role_id": 2
}
```

**Frontend:**
```typescript
await axios.post('/api/users/assign-role', {
  user_id: userId,
  role_id: roleId
});
```

### 4. Check User Permission

**Backend:**
```go
GET /api/check-permission?resource=products&action=create
```

**Frontend:**
```typescript
const response = await axios.get('/api/check-permission', {
  params: { resource: 'products', action: 'create' }
});
const hasPermission = response.data.has_permission;
```

## Database Migration

To set up the database tables, run migrations for:

1. `roles` table
2. `permissions` table
3. `role_permissions` junction table
4. `user_roles` junction table

### Sample SQL (for reference):

```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  company_id INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Seeding Default Permissions

Create a seed file to populate default permissions:

```go
permissions := []models.Permission{
  {Resource: "products", Action: "view", Description: "View products"},
  {Resource: "products", Action: "create", Description: "Create products"},
  {Resource: "products", Action: "update", Description: "Update products"},
  {Resource: "products", Action: "delete", Description: "Delete products"},
  {Resource: "invoices", Action: "view", Description: "View invoices"},
  {Resource: "invoices", Action: "create", Description: "Create invoices"},
  {Resource: "invoices", Action: "update", Description: "Update invoices"},
  {Resource: "invoices", Action: "delete", Description: "Delete invoices"},
  {Resource: "users", Action: "view", Description: "View users"},
  {Resource: "users", Action: "create", Description: "Create users"},
  {Resource: "users", Action: "update", Description: "Update users"},
  {Resource: "users", Action: "delete", Description: "Delete users"},
  // Add more permissions as needed
}

for _, perm := range permissions {
  db.Create(&perm)
}
```

## Security Best Practices

1. **System Roles**: Mark critical roles as `is_system = true` to prevent deletion
2. **Permission Checks**: Always verify permissions before sensitive operations
3. **Audit Logging**: Log role and permission changes
4. **Least Privilege**: Assign minimum necessary permissions
5. **Regular Review**: Periodically review and update role assignments

## Integration with Existing Code

### Middleware for Permission Checking

Create a middleware to check permissions:

```go
func RequirePermission(resource, action string) echo.MiddlewareFunc {
  return func(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
      user := c.Get("user").(models.User)
      
      roleService := services.NewRoleService(models.Role{}, db)
      hasPermission, err := roleService.CheckUserPermission(user.ID, resource, action)
      
      if err != nil || !hasPermission {
        return c.JSON(http.StatusForbidden, map[string]string{
          "error": "You don't have permission to perform this action"
        })
      }
      
      return next(c)
    }
  }
}

// Usage:
apiGroup.POST("/products", productHandler.CreateHandler, RequirePermission("products", "create"))
```

## Frontend Route Protection

```typescript
// In your routing configuration
const ProtectedRoute = ({ resource, action, children }) => {
  const [hasPermission, setHasPermission] = useState(false);
  
  useEffect(() => {
    axios.get('/api/check-permission', {
      params: { resource, action }
    }).then(res => {
      setHasPermission(res.data.has_permission);
    });
  }, [resource, action]);
  
  if (!hasPermission) {
    return <div>Access Denied</div>;
  }
  
  return children;
};

// Usage:
<ProtectedRoute resource="products" action="create">
  <ProductForm />
</ProtectedRoute>
```

## Summary

This roles and permissions system provides:

✅ **Flexible Role Management** - Create custom roles per company
✅ **Granular Permissions** - Control access at resource and action level
✅ **User Assignment** - Easy role assignment to users
✅ **System Protection** - Prevent deletion of critical roles
✅ **Scalable Architecture** - Easy to add new resources and actions
✅ **Complete UI** - Full-featured management interface
✅ **API Integration** - RESTful endpoints for all operations

The system is production-ready and can be extended with additional features like:
- Permission inheritance
- Role hierarchies
- Time-based permissions
- IP-based restrictions
- Audit trails

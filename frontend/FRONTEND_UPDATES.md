# Frontend Updates - User/Employee Merge

## Overview
Updated the frontend web application to align with the backend changes that merged the `employees` and `users` tables into a single unified `users` table.

## Changes Made

### 1. Updated Users Page (`src/pages/Users.tsx`)

#### **New Features**
- **Tabbed Interface**: Organized user form into 3 tabs:
  - **Basic Info**: Name, email, password, role, status
  - **Employee Info**: Phone, position, hire date, salary, address
  - **Van Assignment**: Assign user to a van for POS access

#### **Enhanced Table View**
Added new columns to display:
- Phone number
- Position/Title
- Van assignment (shows van name if assigned)

#### **Employee Fields**
- `phone` - Contact phone number
- `position` - Job title/position
- `hire_date` - Date of hire
- `salary` - Employee salary
- `address` - Physical address
- `van_id` - Assigned van for sales representatives

#### **New Role**
- Added `employee` role with orange badge color
- Role description: "Employee with van assignment for POS access"

#### **Van Assignment**
- Dropdown to select van from available vans
- Visual indicator when van is assigned
- Explanation of POS access with van assignment

### 2. Updated API (`src/lib/api.ts`)

#### **Removed**
- `employeeApi` - No longer needed

#### **Comment Added**
```typescript
// Employee API removed - now merged with userApi
// All employee data is now managed through the users endpoint
```

### 3. Employees Page Status

The `Employees.tsx` page still exists but is now **deprecated**. It can be:
- **Option 1**: Removed entirely (recommended after migration)
- **Option 2**: Kept temporarily and redirected to Users page
- **Option 3**: Updated to show a deprecation notice

## User Roles

| Role | Badge Color | Description |
|------|-------------|-------------|
| `admin` | Purple | Full system access including user management |
| `manager` | Blue | Can manage products, stock, invoices, and view reports |
| `sales` | Green | Can create invoices, manage customers, and access POS |
| `employee` | Orange | Employee with van assignment for POS access |
| `user` | Gray | View-only access to products and basic features |

## How to Use

### Creating a User with Employee Data

1. Click "Add User" button
2. Fill in **Basic Info** tab:
   - Full Name
   - Email
   - Password
   - Role (select appropriate role)
   - Status (Active/Inactive)

3. Fill in **Employee Info** tab (optional):
   - Phone
   - Position (e.g., "Sales Representative")
   - Hire Date
   - Salary
   - Address

4. Fill in **Van Assignment** tab (optional):
   - Select a van from dropdown
   - User will be assigned as sales rep for that van
   - They will have POS access to sell from that van's stock

5. Click "Create User"

### Assigning a Van to Existing User

1. Click Edit icon on user row
2. Go to "Van Assignment" tab
3. Select van from dropdown
4. Click "Update User"

### Removing Van Assignment

1. Edit the user
2. Go to "Van Assignment" tab
3. Select "No van assigned"
4. Click "Update User"

## API Integration

The frontend now sends all employee fields to the backend:

```typescript
{
  full_name: "John Doe",
  email: "john@example.com",
  password: "password123",
  role: "employee",
  phone: "+1234567890",
  position: "Sales Representative",
  hire_date: "2024-01-15",
  salary: "50000",
  address: "123 Main St",
  van_id: "1",
  is_active: 1
}
```

Backend endpoint: `POST /api/users` or `PUT /api/users/{id}`

## Migration Checklist

- [x] Updated Users.tsx with employee fields
- [x] Added van assignment functionality
- [x] Added employee role to role options
- [x] Updated table columns to show employee data
- [x] Removed employeeApi from api.ts
- [ ] Remove or deprecate Employees.tsx page
- [ ] Update navigation to remove Employees link
- [ ] Test user creation with all fields
- [ ] Test van assignment
- [ ] Test POS app login with assigned users

## Next Steps

1. **Remove Employees Page** (Optional):
   ```bash
   # Delete the file
   rm src/pages/Employees.tsx
   ```

2. **Update Navigation** (if Employees link exists):
   - Remove "Employees" menu item from navigation
   - Keep only "Users" menu item

3. **Update App Routing** (if needed):
   - Remove `/employees` route
   - Redirect `/employees` to `/users`

4. **Test Everything**:
   - Create new user with employee fields
   - Assign van to user
   - Login to POS app with assigned user
   - Verify stock shows correctly

## Benefits

✅ **Single Source of Truth**: All personnel data in one place  
✅ **Simplified Management**: One interface for all users  
✅ **Better Integration**: Direct van assignment  
✅ **Reduced Complexity**: Fewer pages and APIs to maintain  
✅ **Consistent Data**: No sync issues between users and employees  

## Notes

- The Employees page (`Employees.tsx`) still exists but should be removed after migration
- All existing employee data should be migrated using the backend SQL script first
- Van assignments are managed through the Users page now
- The `employeeApi` has been removed from the codebase

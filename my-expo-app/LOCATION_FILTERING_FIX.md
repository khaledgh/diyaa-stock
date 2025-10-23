# Location-Based Data Filtering Fix

## Problem
The mobile application was showing all sales data regardless of which warehouse/branch/van the user belongs to. Users could see data from other locations.

## Root Cause
1. **API Parameter Mismatch**: The mobile app was sending `van_id` as a filter parameter, but the backend API expects `location_id`
2. **User Data Structure**: Users have both `van_id` and `location_id` properties, but the filtering logic was inconsistent

## Solution

### Backend API Filter Parameters
The `/invoices` endpoint accepts the following filter:
- `location_id` - Filters invoices by location

### Mobile App Changes Required

#### 1. Update API Service (`src/services/api.service.ts`)
Change the `getInvoices` function to use `location_id` instead of `van_id`:

```typescript
async getInvoices(filters?: {
  invoice_type?: string;
  location_id?: number;  // Changed from van_id
  limit?: number;
  offset?: number;
}) {
  const response = await this.api.get('/invoices', { params: filters });
  return response.data;
}
```

#### 2. Update Dashboard Screen (`src/screens/DashboardScreen.tsx`)
Change line 31 to use `location_id`:

```typescript
const invoicesResponse = await apiService.getInvoices({
  location_id: user?.location_id,  // Changed from van_id
  invoice_type: 'sales',
  limit: 100,
  offset: 0,
});
```

And update the dependency array on line 78:

```typescript
}, [user?.location_id]);  // Changed from van_id
```

#### 3. Update History Screen (`src/screens/HistoryScreen.tsx`)
Change line 24 and 28 to use `location_id`:

```typescript
const loadInvoices = useCallback(async () => {
  if (!user?.location_id) return;  // Changed from van_id

  try {
    const response = await apiService.getInvoices({
      location_id: user.location_id,  // Changed from van_id
      invoice_type: 'sales',
      limit: 50,
      offset: 0,
    });
```

And update the dependency array on line 72:

```typescript
}, [user?.location_id]);  // Changed from van_id
```

## Expected Behavior After Fix
- Users assigned to Van 1 will only see invoices created from Van 1's location
- Users assigned to Warehouse will only see warehouse invoices
- Users assigned to Branch will only see branch invoices
- Dashboard metrics will reflect only the user's location data
- History screen will show only invoices from the user's location

## Testing Checklist
- [ ] Login with a van user - verify only van's data is shown
- [ ] Login with a warehouse user - verify only warehouse data is shown
- [ ] Create an invoice from Van 1 - verify it doesn't appear for Van 2 users
- [ ] Dashboard metrics should match the location's actual sales
- [ ] History screen should only show location-specific invoices

## Notes
- The `location_id` is set during user creation/assignment in the backend
- Each van has a corresponding location record with `type='van'`
- Warehouses have `type='warehouse'` and branches have `type='branch'`

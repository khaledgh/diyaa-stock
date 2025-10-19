# Backend Deployment Checklist

## Changes Made Today (Oct 19, 2025)

### 1. **CORS Configuration** (main.go)
- Updated to allow mobile app connections
- Allows all necessary origins and headers

### 2. **Login Response Format** (auth.handlers.go)
- Fixed to return nested data object: `{ok: true, data: {user, token}}`

### 3. **User Model** (user.models.go)
- Added: `FullName`, `IsActive`, `VanID`, `LocationID`, `Position`, `VanName`
- All computed fields populated automatically

### 4. **Van Model** (van.models.go)
- Added: `EmployeeID`, `EmployeeName` (computed from User)

### 5. **Location Model** (location.models.go)
- Added: `VanID`, `Van`, `VanName` (for van-type locations)

### 6. **Stock Movement Tracking**
- Transfer handler creates movement records
- Invoice handlers create movement records
- Payment records created automatically

### 7. **Type Conversion Handlers**
- User update: handles `full_name` splitting, `van_id` conversion
- Van update: handles `employee_id` to `user_id` conversion
- Location update: handles `van_id` conversion

### 8. **Auth Service** (auth.services.go)
- CheckEmail: Preloads Van, populates computed fields
- GetUser: Preloads Van, populates computed fields
- Returns complete user data with `van_id` for mobile

### 9. **Payment Service** (payment.services.go)
- Fixed ID conversion bug (string(rune) → strconv.Itoa)

## Deployment Steps

### Local Development:
```bash
cd d:\Private Projects\gonext\diyaa-stock\backend-go\cmd
go run main.go
```

### Production Server:
```bash
# 1. Build the binary
cd d:\Private Projects\gonext\diyaa-stock\backend-go\cmd
go build -o app

# 2. Upload to server
# Upload the 'app' binary to: /www/wwwroot/transgatelb.linksbridge.top/backend-go/cmd/

# 3. Restart on server
pm2 restart transgate-backend

# 4. Check logs
pm2 logs transgate-backend
```

## Testing After Deployment

### Web Frontend (localhost:5173):
- ✅ Login works
- ✅ Users page shows names, positions, vans, status
- ✅ Vans page shows assigned employees
- ✅ Locations page saves van assignments
- ✅ Invoices show customer/vendor/location names
- ✅ Stock movements are tracked

### Mobile App:
- ✅ Login returns user with van_id
- ✅ User can access van stock
- ✅ Can create sales invoices
- ✅ Payment records are created

## Important Notes

1. **Mobile users must logout and login again** to get updated user data with van_id
2. **Database migrations**: New fields added (van_id, location_id, position) - GORM will auto-migrate
3. **CORS is now permissive** - allows mobile app connections
4. **All computed fields** are populated in services, not models

## API Response Format Changes

### Login Response:
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "van_id": 1,
      "location_id": 1,
      ...
    },
    "token": "jwt_token_here"
  }
}
```

### User Response:
```json
{
  "id": 1,
  "full_name": "John Doe",
  "is_active": true,
  "van_id": 1,
  "van_name": "Van #1",
  ...
}
```

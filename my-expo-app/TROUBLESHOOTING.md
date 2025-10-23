# Mobile App Troubleshooting Guide

## Issue: Location Filtering Not Working

### Symptoms
- Dashboard shows data from all locations instead of just your assigned location
- History screen shows invoices from other locations
- Logs show `User location_id: undefined`

### Root Cause
The user data cached in SecureStore doesn't have the `location_id` field. This happens if:
1. You logged in before the location filtering feature was added
2. The backend didn't return `location_id` in the user data
3. The user record in the database doesn't have `location_id` set

### Solution 1: Force Logout and Login Again (Recommended)

**Steps:**
1. Open the mobile app
2. Go to Profile screen
3. Tap "Logout"
4. Login again with your credentials
5. The app will fetch fresh user data with `location_id`

### Solution 2: Clear App Data (If logout doesn't work)

**For Android:**
1. Go to Settings → Apps → Your App
2. Tap "Storage"
3. Tap "Clear Data" or "Clear Storage"
4. Open the app and login again

**For iOS:**
1. Delete the app
2. Reinstall from Expo Go or your development build
3. Login again

### Solution 3: Verify Backend Data

Check if your user record has `location_id` set:

1. **Check the database:**
   ```sql
   SELECT id, email, full_name, van_id, location_id FROM users WHERE id = YOUR_USER_ID;
   ```

2. **Expected result:**
   - `location_id` should NOT be NULL
   - `location_id` should match a valid location ID in the `locations` table

3. **If location_id is NULL, update it:**
   ```sql
   -- For van users, location_id should match the van's location
   UPDATE users 
   SET location_id = (SELECT id FROM locations WHERE van_id = users.van_id AND type = 'van')
   WHERE van_id IS NOT NULL AND location_id IS NULL;
   
   -- For warehouse/branch users, set it manually
   UPDATE users SET location_id = 2 WHERE id = YOUR_USER_ID;
   ```

### Verification

After applying the fix, check the logs when you open the app:

**Good logs (working):**
```
LOG  Login response user data: {..., "location_id": 1, ...}
LOG  Loading dashboard data for location_id: 1
LOG  Loaded 5 invoices for location 1
LOG  Loading invoices for location_id: 1
```

**Bad logs (not working):**
```
LOG  User location_id: undefined User van_id: 1
WARN  No location_id found for user. User data: {...}
```

### Testing Location Isolation

1. **Create test scenario:**
   - User A: Assigned to Location 1
   - User B: Assigned to Location 2

2. **Test steps:**
   - Login as User A → Create 2 invoices
   - Logout → Login as User B → Create 3 invoices
   - Logout → Login as User A again
   - **Expected:** Dashboard shows 2 invoices, History shows 2 invoices
   - Logout → Login as User B again
   - **Expected:** Dashboard shows 3 invoices, History shows 3 invoices

3. **If you see all 5 invoices for both users:**
   - The location filtering is NOT working
   - Follow Solution 1 or 2 above

## Common Issues

### Issue: "No location_id found for user"

**Cause:** User data doesn't have `location_id` field

**Fix:** Logout and login again, or verify backend data (Solution 3)

### Issue: Seeing data from all locations

**Cause:** Backend is not filtering by `location_id`

**Fix:** 
1. Check backend API logs to see if `location_id` parameter is being sent
2. Verify the backend `/invoices` endpoint accepts and filters by `location_id`
3. Check if the SQL query in the backend includes `WHERE location_id = ?`

### Issue: 401 Unauthorized errors

**Cause:** Token expired or invalid

**Fix:**
1. Logout and login again
2. Check if the backend token is valid
3. Verify the token is being sent in the Authorization header

## Debug Logs

Enable detailed logging by checking the Metro bundler terminal:

```bash
# Look for these logs:
LOG  Loading dashboard data for location_id: X
LOG  Loaded Y invoices for location X
LOG  Loading invoices for location_id: X
```

If you see warnings or errors, follow the solutions above.

## Need More Help?

1. Check the `LOCATION_FILTERING_FIX.md` file for technical details
2. Verify your user has `location_id` set in the database
3. Ensure you've logged out and logged in again after the fix
4. Check the backend API is returning `location_id` in the login response

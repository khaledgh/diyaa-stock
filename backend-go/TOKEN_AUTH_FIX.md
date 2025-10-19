# Token Authentication Fix

## Problem
Users were being automatically logged out immediately after logging in. This was caused by a mismatch between backend and frontend authentication mechanisms.

## Root Cause

### Backend Behavior
- Backend was setting JWT token **only in HTTP-only cookies**
- Login response did NOT include token in response body
- Cookie was set with `Domain: localhost` and `HttpOnly: true`

### Frontend Behavior
- Frontend expected token in **response body**
- Stored token in **localStorage**
- Sent token as **Bearer token** in Authorization header
- Did not send cookies with requests (`withCredentials` was false)

### The Mismatch
1. User logs in → Backend sets cookie but doesn't return token in response
2. Frontend tries to extract `token` from response → Gets `undefined`
3. Frontend stores `undefined` in localStorage
4. Next API request → Frontend sends `Bearer undefined`
5. Backend rejects request → 401 Unauthorized
6. Frontend auto-logs out user

## Solution

### Changes Made

#### 1. Backend - Return Token in Response Body
**File**: `handlers/auth.handlers.go`

```go
// Updated Login interface to return both cookie and token
Login(username, password string) (*http.Cookie, string, error)

// Updated Login response to include token
type LoginResponse struct {
    OK      bool        `json:"ok"`
    User    models.User `json:"user"`
    Token   string      `json:"token"`  // ← Added
    Message string      `json:"message"`
}
```

**File**: `services/auth.services.go`

```go
// Updated Login method to return token string
func (as *AuthService) Login(email, password string) (*http.Cookie, string, error) {
    tokenString, err := generateJWT(email)
    if err != nil {
        return nil, "", err
    }
    cookie := as.GenerateCookie("jwt", tokenString, "ADD")
    return cookie, tokenString, nil  // ← Return token string
}
```

#### 2. Backend - Support Both Authentication Methods
**File**: `handlers/auth.handlers.go`

```go
func (ah *AuthHandler) JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        var tokenString string

        // Try Authorization header first (Bearer token)
        authHeader := c.Request().Header.Get("Authorization")
        if authHeader != "" && len(authHeader) > 7 && authHeader[:7] == "Bearer " {
            tokenString = authHeader[7:]
        } else {
            // Fallback to cookie
            cookie, err := c.Cookie("jwt")
            if err != nil {
                return echo.NewHTTPError(http.StatusUnauthorized, "missing or invalid token")
            }
            tokenString = cookie.Value
        }
        
        // ... validate token
    }
}
```

#### 3. Frontend - Enable Cookie Support
**File**: `frontend/src/lib/api.ts`

```typescript
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ← Added: Enable sending cookies
});
```

## Authentication Flow (After Fix)

### Login Flow
1. User submits credentials
2. Backend validates credentials
3. Backend generates JWT token
4. Backend:
   - Sets token in HTTP-only cookie
   - Returns token in response body
5. Frontend:
   - Extracts token from response body
   - Stores token in localStorage
   - Stores user data in Zustand store
6. User is authenticated ✅

### Subsequent Requests
Frontend sends **both**:
- Cookie (automatically sent by browser)
- Bearer token in Authorization header

Backend accepts **either**:
- Bearer token from Authorization header (preferred)
- Token from cookie (fallback)

## Benefits of This Approach

### Dual Authentication Support
- ✅ **Bearer Token**: Standard REST API authentication
- ✅ **Cookie**: XSS protection via HTTP-only flag
- ✅ **Flexibility**: Works with both SPA and traditional web apps

### Security
- HTTP-only cookies prevent XSS attacks
- Bearer tokens allow API access from mobile apps
- CORS properly configured with credentials

### Compatibility
- Works with existing frontend code
- No breaking changes for other clients
- Gradual migration path

## Testing

### Test Login
```bash
curl -X POST http://localhost:9000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@diyaa.com","password":"password123"}' \
  -c cookies.txt
```

Expected response:
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "email": "admin@diyaa.com",
    "first_name": "Admin",
    ...
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

### Test Protected Endpoint with Bearer Token
```bash
curl http://localhost:9000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Protected Endpoint with Cookie
```bash
curl http://localhost:9000/api/products \
  -b cookies.txt
```

Both should work! ✅

## Configuration

### Backend CORS (Already Configured)
**File**: `cmd/main.go`

```go
e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
    AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
    AllowCredentials: true, // ← Required for cookies
}))
```

### Frontend Environment
**File**: `frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:9000/api
```

## Troubleshooting

### Still Getting Logged Out?

1. **Check token in response**:
   ```javascript
   console.log('Login response:', response.data);
   console.log('Token:', response.data.token);
   ```

2. **Check localStorage**:
   ```javascript
   console.log('Stored token:', localStorage.getItem('auth_token'));
   ```

3. **Check cookie**:
   - Open DevTools → Application → Cookies
   - Look for `jwt` cookie on `localhost`

4. **Check API requests**:
   - Open DevTools → Network
   - Check if Authorization header is sent
   - Check if cookies are sent

### Common Issues

**Issue**: Token is `undefined` in response
- **Solution**: Restart backend server to apply changes

**Issue**: 401 on all requests after login
- **Solution**: Check if token is being stored in localStorage
- **Solution**: Check if Authorization header is being sent

**Issue**: CORS error
- **Solution**: Ensure `withCredentials: true` in frontend
- **Solution**: Ensure `AllowCredentials: true` in backend CORS

**Issue**: Cookie not being set
- **Solution**: Check Domain setting in cookie (should be `localhost` for dev)
- **Solution**: Ensure HTTPS in production with `Secure: true`

## Production Considerations

### Environment Variables
Use environment variables for JWT secret:

```go
// Instead of hardcoded "secret"
jwtSecret := os.Getenv("JWT_SECRET")
```

### Cookie Settings for Production
```go
cookie := &http.Cookie{
    Name:     "jwt",
    Value:    tokenString,
    Path:     "/",
    Expires:  time.Now().Add(24 * time.Hour),
    Domain:   os.Getenv("COOKIE_DOMAIN"), // e.g., ".yourdomain.com"
    HttpOnly: true,
    Secure:   true,  // ← Set to true in production (requires HTTPS)
    SameSite: http.SameSiteStrictMode,
}
```

### CORS for Production
```go
e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
    AllowOrigins:     []string{os.Getenv("FRONTEND_URL")},
    AllowCredentials: true,
}))
```

## Summary

The fix ensures that:
1. ✅ Backend returns token in response body
2. ✅ Backend accepts both Bearer token and cookie
3. ✅ Frontend stores and sends token correctly
4. ✅ Users stay logged in after authentication
5. ✅ Both security methods (cookie + bearer) are supported

**Status**: Fixed and tested ✅

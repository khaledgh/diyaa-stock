# Quick Start Guide

## 🚀 Getting Started

### 1. Clean Up Old Files (Optional)
```powershell
.\cleanup.ps1
```

### 2. Configure Environment
Create or update `.env` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=diyaa_stock
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=86400
```

### 3. Install Dependencies
```bash
go mod tidy
```

### 4. Run the Server
```bash
cd cmd
go run main.go
```

Server will start on **http://localhost:9000**

## 📋 Quick Test

### Login
```bash
curl -X POST http://localhost:9000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

Save the token from response.

### Test Protected Endpoint
```bash
curl -X GET http://localhost:9000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔧 Common Issues

### Database Connection Error
- Check `.env` file configuration
- Ensure MySQL is running
- Verify database exists

### Port Already in Use
- Change port in `cmd/main.go` (line 31)
- Or stop the process using port 9000

### Module Import Errors
```bash
go mod tidy
go mod download
```

## 📚 API Documentation

All routes are documented in `COMPLETION_SUMMARY.md`

## 🎯 Key Differences from PHP Backend

1. **Port**: Go uses 9000, PHP uses Apache/Nginx port
2. **Route Prefix**: Both use `/api/*` (no version)
3. **Response Format**: Identical JSON structure
4. **Authentication**: JWT tokens (same as PHP)

## ✅ Verification Checklist

- [ ] Server starts without errors
- [ ] Database tables are created
- [ ] Login works and returns token
- [ ] Protected routes require authentication
- [ ] CRUD operations work for all entities
- [ ] Stock updates work correctly
- [ ] Invoice creation updates stock
- [ ] Payment recording updates invoice status
- [ ] Reports return data

## 🔄 Switching from PHP to Go

1. Update frontend API base URL to `http://localhost:9000/api`
2. No changes needed to request/response format
3. Authentication tokens work the same way
4. All endpoints have identical paths

## 📞 Support

Check these files for more information:
- `COMPLETION_SUMMARY.md` - Full feature list
- `MIGRATION_GUIDE.md` - Migration details
- `IMPLEMENTATION_STATUS.md` - Implementation notes

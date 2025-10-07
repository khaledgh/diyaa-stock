# Quick Start Guide - POS App

## 🚀 5-Minute Setup

### 1. Database Migration (1 min)
```bash
# Backup database
mysqldump -u root -p diyaa_stock > backup.sql

# Run migration
mysql -u root -p diyaa_stock < backend/migrations/merge_users_employees.sql
```

### 2. Assign User to Van (30 sec)
```sql
-- Replace 1 with your user ID and van ID
UPDATE vans SET sales_rep_id = 1 WHERE id = 1;
```

### 3. Install & Start App (2 min)
```bash
cd my-expo-app
npm install
npm start
```

### 4. Test Login (1 min)
- Scan QR code with Expo Go app
- Login with user credentials
- Browse van stock
- Add items to cart
- Complete a sale

## 📱 App Features at a Glance

| Feature | Mobile | Tablet/Desktop |
|---------|--------|----------------|
| Product List | ✅ Full screen | ✅ Left side |
| Cart | 🔘 Overlay button | ✅ Right sidebar |
| Search | ✅ Top bar | ✅ Top bar |
| Checkout | ✅ Full screen | ✅ In sidebar |

## 🔑 Quick Commands

### Create New Sales User
```bash
curl -X POST http://localhost/diyaa-stock/new/backend/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "sales",
    "phone": "1234567890",
    "position": "Sales Rep",
    "van_id": 1
  }'
```

### Assign Van to Existing User
```sql
UPDATE vans SET sales_rep_id = {user_id} WHERE id = {van_id};
```

### Check User's Van Assignment
```sql
SELECT u.id, u.full_name, u.email, v.id as van_id, v.name as van_name
FROM users u
LEFT JOIN vans v ON v.sales_rep_id = u.id
WHERE u.id = {user_id};
```

### View Van Stock
```sql
SELECT p.name, s.quantity, s.location_id as van_id
FROM stock s
JOIN products p ON s.product_id = p.id
WHERE s.location_type = 'van' AND s.location_id = {van_id};
```

## 🎯 Common Tasks

### Add Stock to Van
```bash
curl -X POST http://localhost/diyaa-stock/new/backend/api/stock/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "product_id": 1,
    "location_type": "van",
    "location_id": 1,
    "quantity": 10
  }'
```

### Create Manual Sale (API)
```bash
curl -X POST http://localhost/diyaa-stock/new/backend/api/invoices/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "van_id": 1,
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "unit_price": 10.00,
        "discount_percent": 5
      }
    ],
    "paid_amount": 19.00
  }'
```

## 🐛 Quick Fixes

### "No van assigned to your account"
```sql
UPDATE vans SET sales_rep_id = {your_user_id} WHERE id = {van_id};
```

### "Failed to load stock"
1. Check backend is running
2. Verify API_BASE_URL in `src/config/api.ts`
3. Check user has valid token

### Tailwind styles not working
```bash
# Clear cache and restart
npx expo start -c
```

### Can't login
1. Verify user exists: `SELECT * FROM users WHERE email = 'your@email.com'`
2. Check user is active: `is_active = 1`
3. Reset password if needed:
```sql
UPDATE users 
SET password = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' 
WHERE email = 'your@email.com';
-- Password is now: password
```

## 📊 Verify Everything Works

```sql
-- 1. Check users with vans
SELECT u.full_name, u.role, v.name as van_name
FROM users u
LEFT JOIN vans v ON v.sales_rep_id = u.id;

-- 2. Check van stock
SELECT v.name as van, p.name as product, s.quantity
FROM stock s
JOIN vans v ON s.location_id = v.id AND s.location_type = 'van'
JOIN products p ON s.product_id = p.id
ORDER BY v.name, p.name;

-- 3. Check recent sales
SELECT i.invoice_number, u.full_name as sales_rep, v.name as van, i.total_amount
FROM sales_invoices i
JOIN users u ON i.created_by = u.id
JOIN vans v ON i.van_id = v.id
ORDER BY i.created_at DESC
LIMIT 10;
```

## 🎉 You're Ready!

The POS app is now:
- ✅ Responsive on all devices
- ✅ Showing only user's van stock
- ✅ Preventing overselling
- ✅ Using simplified user management

Happy selling! 🛒

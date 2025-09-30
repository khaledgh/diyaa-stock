# 📦 Installation Guide - Stock Management System

## Prerequisites

- **WAMP/XAMPP** (PHP 7.4+, MySQL 5.7+)
- **Node.js** (v18 or higher)
- **Composer** (PHP dependency manager)
- **Git** (optional)

---

## 🔧 Backend Setup (PHP API)

### Step 1: Database Setup

1. Open phpMyAdmin or MySQL command line
2. Import the database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   Or manually import `database/schema.sql` through phpMyAdmin

3. The database `stock_management` will be created with sample data

### Step 2: Configure Backend

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install PHP dependencies:
   ```bash
   composer install
   ```

3. Copy environment file:
   ```bash
   copy config\.env.example config\.env
   ```

4. Edit `config/.env` with your database credentials:
   ```env
   DB_HOST=localhost
   DB_NAME=stock_management
   DB_USER=root
   DB_PASS=your_password
   
   JWT_SECRET=your-secret-key-change-this
   JWT_EXPIRY=86400
   ```

### Step 3: Configure Apache (WAMP)

The `.htaccess` file is already configured. Ensure:
- Apache `mod_rewrite` is enabled
- `AllowOverride All` is set in your Apache config

### Step 4: Test Backend

Open browser and navigate to:
```
http://localhost/diyaa-stock/new/backend/api/login
```

You should see a CORS or method not allowed message (this is expected for GET request).

---

## 🎨 Frontend Setup (React)

### Step 1: Install Dependencies

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm packages:
   ```bash
   npm install
   ```

### Step 2: Configure Environment

1. Copy environment file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` with your API URL:
   ```env
   VITE_API_BASE_URL=http://localhost/diyaa-stock/new/backend/api
   ```

### Step 3: Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

### Step 4: Build for Production

```bash
npm run build
```

The production files will be in the `dist` folder.

---

## 🔐 Default Login Credentials

### Admin Account
- **Email:** admin@example.com
- **Password:** admin123
- **Permissions:** Full access

### Stock Manager
- **Email:** manager@example.com
- **Password:** manager123
- **Permissions:** Products, Stock, Transfers, Purchase Invoices

### Sales Representative
- **Email:** sales@example.com
- **Password:** sales123
- **Permissions:** Products (view), Sales Invoices, Customers

---

## 🧪 Testing the System

### 1. Login
- Open `http://localhost:5173`
- Login with admin credentials

### 2. Test Features
- **Dashboard:** View KPIs and charts
- **Products:** Add/Edit/Delete products
- **Customers:** Manage customers
- **Vans:** View vans and their stock
- **Stock:** Check warehouse inventory
- **Transfers:** Transfer products from warehouse to vans
- **Invoices:** Create purchase/sales invoices
- **Payments:** Record payments
- **Reports:** View sales, receivables, and performance reports

---

## 🌍 Language & RTL Support

### Switch Language
1. Click the globe icon in the header
2. Select English or Arabic (العربية)
3. The interface will switch instantly with RTL support for Arabic

---

## 🖨️ Printing Setup

### For Thermal Printers (80mm)
1. Create a sales invoice
2. Click print button
3. Select your thermal printer
4. The system will automatically format for 80mm width

### For A4 Printers
1. Use the standard print template
2. Print preview will show A4 format

---

## 🔧 Troubleshooting

### Backend Issues

**Problem:** Database connection failed
- **Solution:** Check `config/.env` credentials
- Ensure MySQL service is running

**Problem:** 404 errors on API routes
- **Solution:** Enable `mod_rewrite` in Apache
- Check `.htaccess` file exists in backend folder

**Problem:** CORS errors
- **Solution:** Check CORS headers in `index.php`
- Ensure frontend URL is allowed

### Frontend Issues

**Problem:** API connection failed
- **Solution:** Check `.env` file has correct API URL
- Verify backend is running

**Problem:** Blank page after login
- **Solution:** Check browser console for errors
- Clear browser cache and localStorage

**Problem:** Build fails
- **Solution:** Delete `node_modules` and run `npm install` again
- Check Node.js version (should be v18+)

---

## 📁 Project Structure

```
new/
├── backend/               # PHP API
│   ├── config/           # Database & environment config
│   ├── src/
│   │   ├── Controllers/  # API controllers
│   │   ├── Models/       # Database models
│   │   ├── Middleware/   # Auth & CORS
│   │   └── Utils/        # Helpers
│   ├── index.php         # Main router
│   └── composer.json
│
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── lib/          # API & utilities
│   │   ├── store/        # Zustand stores
│   │   └── i18n/         # Translations
│   ├── package.json
│   └── vite.config.ts
│
└── database/             # SQL schema
    └── schema.sql
```

---

## 🚀 Production Deployment

### Backend
1. Upload backend folder to server
2. Configure `.env` with production database
3. Ensure Apache/Nginx is configured for URL rewriting
4. Set proper file permissions

### Frontend
1. Build production version: `npm run build`
2. Upload `dist` folder contents to server
3. Configure web server to serve SPA (redirect all routes to index.html)
4. Update API URL in production `.env`

---

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review the README.md file
- Check browser console for errors
- Verify all prerequisites are installed

---

## 🎉 You're Ready!

Your Stock Management System is now set up and ready to use. Enjoy managing your inventory!

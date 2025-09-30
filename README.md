# 🚀 Stock & Van Sales Management System

A comprehensive full-stack stock management system with multi-language support (English/Arabic), RTL/LTR toggle, and thermal printer support.

## 📋 Features

- **Multi-language**: English & Arabic with instant RTL/LTR switching
- **Role-Based Access Control**: Admin, Stock Manager, Sales Rep
- **Stock Management**: Central warehouse + multiple vans
- **Invoice System**: Purchase & Sales invoices with multiple templates
- **Payment Tracking**: Cash, Card, Other payment methods
- **Thermal Printing**: Support for A4 and 80mm thermal printers
- **Real-time Updates**: Optimistic UI with polling
- **Reports**: Sales, Stock movements, Receivables, Performance

## 🛠️ Tech Stack

### Frontend
- React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (State Management)
- React Query (Data Fetching)
- React Router (Routing)
- i18next (Internationalization)
- Recharts (Charts)
- react-to-print (Printing)

### Backend
- Pure PHP (No Framework)
- MySQL Database
- JWT Authentication
- RESTful API

## 📁 Project Structure

```
new/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities & config
│   │   ├── store/         # Zustand stores
│   │   ├── hooks/         # Custom hooks
│   │   └── i18n/          # Translations
│   └── public/
├── backend/           # PHP API
│   ├── config/        # Configuration
│   ├── controllers/   # API Controllers
│   ├── models/        # Database Models
│   ├── middleware/    # Auth & CORS
│   └── utils/         # Helpers
└── database/          # SQL schema
```

## 🚀 Installation

### Backend Setup

1. **Import Database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. **Configure Environment**
   ```bash
   cd backend
   cp config/.env.example config/.env
   # Edit config/.env with your database credentials
   ```

3. **Install Dependencies**
   ```bash
   composer install
   ```

4. **Start Server**
   - Place in WAMP `www` directory
   - Access via: `http://localhost/diyaa-stock/new/backend/`

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API URL
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

## 🔐 Default Credentials

- **Admin**: admin@example.com / admin123
- **Stock Manager**: manager@example.com / manager123
- **Sales Rep**: sales@example.com / sales123

## 📱 API Endpoints

### Authentication
- `POST /api/login` - Login

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Stock
- `GET /api/stock` - Central warehouse stock
- `GET /api/vans/{id}/stock` - Van stock
- `POST /api/transfer` - Transfer stock to van

### Invoices
- `POST /api/invoices/purchase` - Create purchase invoice
- `POST /api/invoices/sales` - Create sales invoice
- `GET /api/invoices` - List invoices
- `GET /api/invoices/{id}` - Get invoice details

### Payments
- `POST /api/payments` - Record payment
- `GET /api/payments` - List payments

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/stock-movements` - Stock movements
- `GET /api/reports/receivables` - Outstanding balances

## 🖨️ Printing

The system supports:
- **A4 Format**: Standard invoice printing
- **Thermal 80mm**: Bluetooth thermal printers
- **Multiple Templates**: Customizable invoice templates

## 🌍 Internationalization

- English (LTR)
- Arabic (RTL)
- Instant language switching
- Cairo/Noto Sans fonts

## 📄 License

MIT License

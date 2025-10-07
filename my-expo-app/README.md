# Diyaa Stock POS Mobile App

A Point of Sale (POS) mobile application built with React Native and Expo for sales representatives to manage sales from their assigned van stock.

## Features

- **User Authentication**: Secure login for sales representatives
- **Van-Specific Stock**: Sales reps can only view and sell from their assigned van's inventory
- **Product Search**: Search products by name, SKU, or barcode
- **Shopping Cart**: Add products to cart with quantity and discount management
- **Customer Selection**: Optional customer assignment for sales tracking
- **Invoice Creation**: Complete sales transactions with automatic stock updates
- **Real-time Stock Validation**: Prevents overselling with live stock checks

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Backend API running (see backend setup)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure API endpoint:
   - Open `src/config/api.ts`
   - Update `API_BASE_URL` to match your backend URL
   - Default: `http://localhost/diyaa-stock/new/backend/api`

## Running the App

### Development Mode

```bash
npm start
```

This will start the Expo development server. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan QR code with Expo Go app on your physical device

### Platform-Specific Commands

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## Backend Setup Requirements

The app requires the backend API to be running with the following modifications:

### User-Van Assignment

Users must be assigned to a van in the database. The `vans` table should have a `sales_rep_id` field linking to the `users` table.

Example SQL to assign a user to a van:
```sql
UPDATE vans SET sales_rep_id = 1 WHERE id = 1;
```

### API Endpoints Used

- `POST /api/login` - User authentication
- `GET /api/me` - Get current user info (includes van_id)
- `GET /api/vans/{vanId}/stock` - Get stock for specific van
- `GET /api/customers` - Get customer list
- `POST /api/invoices/sales` - Create sales invoice

## User Roles

The app is designed for **sales representatives** who:
- Are assigned to a specific van
- Can only view stock in their assigned van
- Can create sales invoices from their van stock
- Cannot access other vans' inventory

## Project Structure

```
my-expo-app/
├── src/
│   ├── config/          # API configuration
│   ├── context/         # React context (Auth)
│   ├── navigation/      # Navigation setup
│   ├── screens/         # App screens
│   │   ├── LoginScreen.tsx
│   │   └── POSScreen.tsx
│   ├── services/        # API services
│   └── types/           # TypeScript types
├── App.tsx              # Main app component
├── package.json
└── tailwind.config.js   # Tailwind CSS config
```

## Usage

1. **Login**: Enter your email and password
2. **Browse Products**: View all products available in your van
3. **Search**: Use the search bar to find products quickly
4. **Add to Cart**: Tap products to add them to cart
5. **Adjust Quantities**: Use +/- buttons to change quantities
6. **Apply Discounts**: Enter discount percentage per item
7. **Select Customer** (Optional): Tap "Add Customer" to assign sale to a customer
8. **Complete Sale**: Review total and tap "Complete Sale"

## Troubleshooting

### Tailwind Styles Not Working
- Ensure `tailwind.config.js` includes `./src/**/*.{js,jsx,ts,tsx}` in content array
- Clear cache: `npx expo start -c`

### API Connection Issues
- Verify backend is running
- Check `API_BASE_URL` in `src/config/api.ts`
- For Android emulator, use `10.0.2.2` instead of `localhost`
- For iOS simulator, `localhost` should work
- For physical device, use your computer's IP address

### Authentication Errors
- Ensure user exists in database
- Verify user is assigned to a van (sales_rep_id in vans table)
- Check JWT_SECRET in backend .env file

## Technologies Used

- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **NativeWind** - Tailwind CSS for React Native
- **React Navigation** - Navigation
- **Axios** - HTTP client
- **Expo SecureStore** - Secure token storage

## License

Proprietary - Diyaa Stock Management System

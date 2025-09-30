# Remaining Features Implementation Guide

## ✅ COMPLETED: Dashboard Payables

### What Was Done:
- Added "Amount to Pay" card to dashboard
- Shows unpaid purchase invoice totals
- Backend calculates from `purchase_invoices` table
- Displays in red with TrendingDown icon

### Files Modified:
- ✅ `frontend/src/pages/Dashboard.tsx` - Added payables card
- ✅ `backend/src/Controllers/ReportController.php` - Added payables calculation
- ✅ Updated to use new `sales_invoices` and `purchase_invoices` tables

---

## 🔄 TO IMPLEMENT: Enhanced Reports

### Requirements:
1. Monthly reports
2. Yearly reports
3. Weekly reports
4. Usable/actionable reports

### Implementation Plan:

#### 1. Create Reports Page
**File:** `frontend/src/pages/Reports.tsx`

**Features:**
- Tab-based interface (Weekly, Monthly, Yearly, Custom)
- Date range selectors
- Export to PDF/Excel
- Charts and graphs
- Summary cards

**Report Types:**

**Weekly Report:**
- Sales by day of week
- Top selling products
- Van performance
- Daily comparisons

**Monthly Report:**
- Sales by month
- Month-over-month growth
- Profit margins
- Customer analysis

**Yearly Report:**
- Annual sales trends
- Seasonal patterns
- Year-over-year comparison
- Financial summary

**Custom Reports:**
- Profit & Loss
- Inventory valuation
- Aging receivables
- Supplier payments due
- Employee performance
- Product profitability

#### 2. Backend API Endpoints

**Add to `ReportController.php`:**

```php
public function weekly() {
    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-7 days'));
    
    // Sales by day
    $sql = "SELECT 
                DATE(created_at) as date,
                DAYNAME(created_at) as day_name,
                COUNT(*) as invoice_count,
                SUM(total_amount) as total_sales,
                SUM(paid_amount) as total_paid
            FROM sales_invoices
            WHERE DATE(created_at) >= ?
            GROUP BY DATE(created_at)
            ORDER BY date ASC";
    
    // Top products
    // Van performance
    // Return data
}

public function monthly() {
    $year = $_GET['year'] ?? date('Y');
    $month = $_GET['month'] ?? date('m');
    
    // Monthly summary
    // Daily breakdown
    // Product analysis
    // Customer analysis
}

public function yearly() {
    $year = $_GET['year'] ?? date('Y');
    
    // Monthly breakdown
    // Quarterly summary
    // Year-over-year comparison
    // Trends and insights
}

public function profitLoss() {
    // Revenue (sales)
    // Cost of goods sold (purchases)
    // Gross profit
    // Operating expenses
    // Net profit
}

public function agingReceivables() {
    // Unpaid invoices grouped by age
    // 0-30 days, 31-60 days, 61-90 days, 90+ days
}
```

---

## 🔄 TO IMPLEMENT: Mobile Sidebar Toggle

### Requirements:
- Sidebar should be collapsible on mobile
- Hamburger menu button
- Overlay when sidebar is open
- Smooth animations

### Implementation:

#### 1. Update Layout Component
**File:** `frontend/src/components/Layout.tsx`

```tsx
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-800 shadow-lg"
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

#### 2. Update Sidebar Component
**File:** `frontend/src/components/Sidebar.tsx`

```tsx
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <div
      className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Sidebar content */}
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => onClose()} // Close sidebar on mobile when link clicked
              className={({ isActive }) =>
                cn(
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {t(`nav.${item.name}`)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
```

---

## 🔄 TO IMPLEMENT: Employee-Van Filtering in POS

### Requirements:
- Each employee can only see their assigned van in POS
- Filter vans based on logged-in user
- Backend validation

### Implementation:

#### 1. Update POS Page
**File:** `frontend/src/pages/POS.tsx`

**Current:**
```tsx
const { data: vans } = useQuery({
  queryKey: ['vans'],
  queryFn: async () => {
    const response = await vanApi.getAll();
    return response.data.data || [];
  },
});
```

**Updated:**
```tsx
const { data: vans } = useQuery({
  queryKey: ['vans', 'assigned'],
  queryFn: async () => {
    // Get only vans assigned to current employee
    const response = await vanApi.getAssignedVans();
    return response.data.data || [];
  },
});
```

#### 2. Add Backend API Endpoint
**File:** `backend/src/Controllers/VanController.php`

```php
public function getAssignedVans($user) {
    try {
        // Get employee record for current user
        $stmt = $this->db->prepare("
            SELECT id FROM employees WHERE user_id = ? AND is_active = 1
        ");
        $stmt->execute([$user['id']]);
        $employee = $stmt->fetch();

        if (!$employee) {
            // If not an employee, return all vans (admin/manager)
            $vans = $this->van->findAll();
        } else {
            // Return only vans assigned to this employee
            $stmt = $this->db->prepare("
                SELECT v.* 
                FROM vans v
                WHERE v.employee_id = ? AND v.is_active = 1
            ");
            $stmt->execute([$employee['id']]);
            $vans = $stmt->fetchAll();
        }

        Response::success($vans);
    } catch (\Exception $e) {
        Response::error($e->getMessage());
    }
}
```

#### 3. Add Route
**File:** `backend/index.php`

```php
// In routes section
if ($path === '/api/vans/assigned' && $method === 'GET') {
    $controller = new VanController();
    $controller->getAssignedVans($user);
    exit;
}
```

#### 4. Update API Client
**File:** `frontend/src/lib/api.ts`

```typescript
export const vanApi = {
  getAll: () => api.get('/vans'),
  getAssignedVans: () => api.get('/vans/assigned'), // NEW
  getStock: (id: number) => api.get(`/vans/${id}/stock`),
  create: (data: any) => api.post('/vans', data),
  update: (id: number, data: any) => api.put(`/vans/${id}`, data),
  delete: (id: number) => api.delete(`/vans/${id}`),
};
```

---

## Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ **Dashboard Payables** - COMPLETED
2. **Mobile Sidebar Toggle** - Essential for mobile UX
3. **Employee-Van Filtering** - Security and workflow

### Phase 2: Important (Do Next)
4. **Weekly Reports** - Most frequently used
5. **Monthly Reports** - Business analysis
6. **Profit & Loss Report** - Financial tracking

### Phase 3: Nice to Have
7. **Yearly Reports** - Long-term planning
8. **Advanced Reports** - Detailed analysis
9. **Export Features** - PDF/Excel exports

---

## Quick Start Guide

### To Implement Mobile Sidebar:
1. Update `Layout.tsx` - Add state and button
2. Update `Sidebar.tsx` - Add props and animations
3. Test on mobile devices

### To Implement Employee-Van Filter:
1. Add `getAssignedVans()` to `VanController.php`
2. Add route in `backend/index.php`
3. Update `vanApi` in `frontend/src/lib/api.ts`
4. Update POS page to use new endpoint

### To Implement Reports:
1. Create `Reports.tsx` page
2. Add report methods to `ReportController.php`
3. Add routes for each report type
4. Create chart components
5. Add export functionality

---

## Testing Checklist

### Dashboard Payables
- [ ] Shows correct unpaid purchase total
- [ ] Updates when payments made
- [ ] Displays in red color
- [ ] Shows subtitle text

### Mobile Sidebar
- [ ] Hamburger menu visible on mobile
- [ ] Sidebar slides in/out smoothly
- [ ] Overlay closes sidebar when clicked
- [ ] Links close sidebar on mobile
- [ ] Works on desktop (always visible)

### Employee-Van Filter
- [ ] Employees see only their vans
- [ ] Admins see all vans
- [ ] Cannot select unassigned vans
- [ ] Backend validates van access

### Reports
- [ ] Weekly report shows 7 days
- [ ] Monthly report shows correct month
- [ ] Yearly report shows 12 months
- [ ] Charts display correctly
- [ ] Export works

---

## Summary

**Completed:**
✅ Dashboard payables feature

**Ready to Implement:**
- Mobile sidebar toggle (2-3 hours)
- Employee-van filtering (1-2 hours)
- Enhanced reports (4-6 hours)

**Total Estimated Time:** 7-11 hours

All code examples and implementation guides are provided above. Follow the phases for best results.

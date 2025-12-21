import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Plus,
  X,
} from 'lucide-react';
import {
  DashboardIcon,
  PosIcon,
  ItemsIcon,
  ProductsIcon,
  CategoriesIcon,
  InventoryIcon,
  TransfersIcon,
  SalesIcon,
  CustomersIcon,
  SalesInvoicesIcon,
  CreditNotesIcon,
  PurchasesIcon,
  VendorsIcon,
  PurchaseInvoicesIcon,
  BankingIcon,
  PaymentsIcon,
  WarehouseIcon,
  LocationsIcon,
  VansIcon,
  ReportsIcon,
  UsersSettingsIcon,
  SettingsIcon,
} from './NavIcons';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { usePermissions } from '@/hooks/usePermissions';

// Simplified Zoho-style navigation
const navigation = {
  main: [
    { name: 'dashboard', href: '/dashboard', icon: DashboardIcon },
    { name: 'pos', href: '/pos', icon: PosIcon },
  ],
  items: {
    label: 'items',
    icon: ItemsIcon,
    children: [
      { name: 'products', href: '/products', icon: ProductsIcon },
      { name: 'categories', href: '/categories', icon: CategoriesIcon },
      { name: 'inventory', href: '/inventory', icon: InventoryIcon },
      { name: 'transfers', href: '/transfers', icon: TransfersIcon },
    ],
  },
  sales: {
    label: 'sales',
    icon: SalesIcon,
    children: [
      { name: 'customers', href: '/customers', icon: CustomersIcon },
      { name: 'sales-invoices', href: '/invoices/sales', icon: SalesInvoicesIcon },
      { name: 'credit-notes', href: '/credit-notes', icon: CreditNotesIcon },
    ],
  },
  purchases: {
    label: 'purchases',
    icon: PurchasesIcon,
    children: [
      { name: 'vendors', href: '/vendors', icon: VendorsIcon },
      { name: 'purchase-invoices', href: '/invoices/purchase', icon: PurchaseInvoicesIcon },
    ],
  },
  banking: {
    label: 'banking',
    icon: BankingIcon,
    children: [
      { name: 'payments', href: '/payments', icon: PaymentsIcon },
    ],
  },
  locations: {
    label: 'warehousing',
    icon: WarehouseIcon,
    children: [
      { name: 'locations', href: '/locations', icon: LocationsIcon },
      { name: 'vans', href: '/vans', icon: VansIcon },
    ],
  },
  reports: [
    { name: 'reports', href: '/reports', icon: ReportsIcon },
  ],
  settings: [
    { name: 'users', href: '/users', icon: UsersSettingsIcon },
    { name: 'settings', href: '/settings', icon: SettingsIcon },
  ],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { canView } = usePermissions();
  const location = useLocation();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    items: false,
    sales: false,
    purchases: false,
    banking: false,
    locations: false,
  });

  // Auto-expand section based on current path
  useEffect(() => {
    const path = location.pathname;
    const newExpanded = { ...expandedSections };

    if (path.includes('/products') || path.includes('/categories') || path.includes('/inventory') || path.includes('/transfers')) {
      newExpanded.items = true;
    }
    if (path.includes('/customers') || path.includes('/invoices/sales') || path.includes('/credit-notes')) {
      newExpanded.sales = true;
    }
    if (path.includes('/vendors') || path.includes('/invoices/purchase')) {
      newExpanded.purchases = true;
    }
    if (path.includes('/payments') || path.includes('/payment-allocation')) {
      newExpanded.banking = true;
    }
    if (path.includes('/locations') || path.includes('/vans')) {
      newExpanded.locations = true;
    }

    setExpandedSections(newExpanded);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderNavItem = (item: { name: string; href: string; icon: any }, isNested = false) => {
    if (!canView(item.name)) return null;

    return (
      <NavLink
        key={item.name}
        to={item.href}
        onClick={onClose}
        className={({ isActive }) =>
          cn(
            'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all',
            isNested ? 'ml-6 text-xs' : 'my-0.5',
            isActive
              ? 'bg-primary/10 text-primary border-r-2 border-primary rounded-r-none'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )
        }
      >
        <item.icon className={cn(
          "transition-transform shrink-0",
          isNested ? "h-3.5 w-3.5" : "h-5 w-5",
          "group-hover:scale-110"
        )} />
        <span className="truncate">{t(`nav.${item.name}`)}</span>
      </NavLink>
    );
  };

  const renderSection = (
    sectionKey: string,
    section: { label: string; icon: any; children: any[] }
  ) => {
    const visibleChildren = section.children.filter(item => canView(item.name));
    if (visibleChildren.length === 0) return null;

    const isExpanded = expandedSections[sectionKey];
    const hasActiveChild = visibleChildren.some(
      item => location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    );

    return (
      <div key={sectionKey} className="space-y-0.5">
        <button
          onClick={() => toggleSection(sectionKey)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors group',
            hasActiveChild
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          )}
        >
          <div className="flex items-center gap-3">
            <section.icon className={cn(
              "h-5 w-5 transition-transform",
              hasActiveChild && "scale-110"
            )} />
            <span className="capitalize">{t(`nav.${section.label}`)}</span>
          </div>
          <div className={cn(
            "transition-transform duration-200",
            isExpanded ? "rotate-90" : "rotate-0"
          )}>
            <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-70" />
          </div>
        </button>
        {isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {visibleChildren.map(item => renderNavItem(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <ProductsIcon className="h-4 w-4" style={{ stroke: 'white', color: 'white' }} />
              </div>
              <h1 className="text-base font-bold text-foreground">{t('app.name')}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-8 w-8"
              title="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Action */}
          <div className="px-3 py-3 border-b">
            <NavLink
              to="/invoices/new"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-medium text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </NavLink>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
            {/* Main */}
            <div className="space-y-0.5">
              {navigation.main
                .filter(item => canView(item.name))
                .map(item => renderNavItem(item))}
            </div>

            {/* Sections */}
            <div className="space-y-2">
              {renderSection('items', navigation.items)}
              {renderSection('sales', navigation.sales)}
              {renderSection('purchases', navigation.purchases)}
              {renderSection('banking', navigation.banking)}
              {renderSection('locations', navigation.locations)}
            </div>

            {/* Reports */}
            <div className="space-y-0.5">
              {navigation.reports
                .filter(item => canView(item.name))
                .map(item => renderNavItem(item))}
            </div>

            {/* Settings */}
            <div className="pt-3 border-t space-y-0.5">
              {navigation.settings
                .filter(item => canView(item.name))
                .map(item => renderNavItem(item))}
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

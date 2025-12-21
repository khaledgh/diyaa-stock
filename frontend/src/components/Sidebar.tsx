import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Warehouse,
  ArrowRightLeft,
  CreditCard,
  BarChart3,
  ShoppingCart,
  Settings,
  X,
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  Tag,
  FileX,
  Receipt,
  Plus,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { usePermissions } from '@/hooks/usePermissions';

// Simplified Zoho-style navigation
const navigation = {
  main: [
    { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'pos', href: '/pos', icon: ShoppingCart },
  ],
  items: {
    label: 'items',
    icon: Package,
    children: [
      { name: 'products', href: '/products', icon: Package },
      { name: 'categories', href: '/categories', icon: Tag },
      { name: 'inventory', href: '/inventory', icon: Warehouse },
      { name: 'transfers', href: '/transfers', icon: ArrowRightLeft },
    ],
  },
  sales: {
    label: 'sales',
    icon: Receipt,
    children: [
      { name: 'customers', href: '/customers', icon: Users },
      { name: 'sales-invoices', href: '/invoices/sales', icon: FileText },
      { name: 'credit-notes', href: '/credit-notes', icon: FileX },
    ],
  },
  purchases: {
    label: 'purchases',
    icon: ShoppingCart,
    children: [
      { name: 'vendors', href: '/vendors', icon: Building2 },
      { name: 'purchase-invoices', href: '/invoices/purchase', icon: FileText },
    ],
  },
  banking: {
    label: 'banking',
    icon: CreditCard,
    children: [
      { name: 'payments', href: '/payments', icon: CreditCard },
    ],
  },
  locations: {
    label: 'warehousing',
    icon: MapPin,
    children: [
      { name: 'locations', href: '/locations', icon: MapPin },
      { name: 'vans', href: '/vans', icon: Truck },
    ],
  },
  reports: [
    { name: 'reports', href: '/reports', icon: BarChart3 },
  ],
  settings: [
    { name: 'users', href: '/users', icon: Users },
    { name: 'settings', href: '/settings', icon: Settings },
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
            'group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all',
            isNested && 'ml-6 text-xs',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )
        }
      >
        <item.icon className={cn("h-4 w-4 flex-shrink-0", isNested && "h-3.5 w-3.5")} />
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
            'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors',
            hasActiveChild
              ? 'text-foreground bg-muted/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <div className="flex items-center gap-3">
            <section.icon className="h-4 w-4" />
            <span>{t(`nav.${section.label}`)}</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isExpanded && (
          <div className="space-y-0.5 mt-0.5">
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
                <Package className="h-4 w-4 text-primary-foreground" />
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

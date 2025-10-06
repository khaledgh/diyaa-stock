import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  Truck,
  Warehouse,
  ArrowRightLeft,
  FileText,
  CreditCard,
  BarChart3,
  ShoppingCart,
  Settings,
  Shield,
  X,
  Building2,
  MapPin,
  PackageSearch,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { usePermissions } from '@/hooks/usePermissions';

const mainNavigation = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'pos', href: '/pos', icon: ShoppingCart },
  { name: 'products', href: '/products', icon: Package },
  { name: 'customers', href: '/customers', icon: Users },
  { name: 'vendors', href: '/vendors', icon: Building2 },
  { name: 'employees', href: '/employees', icon: UserCog },
  { name: 'users', href: '/users', icon: Shield },
];

const inventoryNavigation = [
  { name: 'inventory', href: '/inventory', icon: PackageSearch },
  { name: 'vans', href: '/vans', icon: Truck },
  { name: 'locations', href: '/locations', icon: MapPin },
  { name: 'transfers', href: '/transfers', icon: ArrowRightLeft },
];

const businessNavigation = [
  { name: 'invoices', href: '/invoices', icon: FileText },
  { name: 'payments', href: '/payments', icon: CreditCard },
  { name: 'reports', href: '/reports', icon: BarChart3 },
  { name: 'settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { canView } = usePermissions();
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const [isBusinessOpen, setIsBusinessOpen] = useState(true);

  // Filter navigation based on user permissions
  const filteredMainNav = mainNavigation.filter(item => canView(item.name));
  const filteredInventoryNav = inventoryNavigation.filter(item => canView(item.name));
  const filteredBusinessNav = businessNavigation.filter(item => canView(item.name));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full pt-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden"
              title="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {/* Main Navigation */}
              {filteredMainNav.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
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

              {/* Inventory Management Section */}
              {filteredInventoryNav.length > 0 && (
                <div className="pt-4">
                  <button
                    onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                    className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <div className="flex items-center">
                      <Warehouse className="mr-2 h-4 w-4" />
                      <span>Inventory</span>
                    </div>
                    {isInventoryOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isInventoryOpen && (
                    <div className="mt-1 space-y-1">
                      {filteredInventoryNav.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'group flex items-center px-2 py-2 pl-8 text-sm font-medium rounded-md transition-colors',
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
                    </div>
                  )}
                </div>
              )}

              {/* Business Section */}
              {filteredBusinessNav.length > 0 && (
                <div className="pt-4">
                  <button
                    onClick={() => setIsBusinessOpen(!isBusinessOpen)}
                    className="w-full flex items-center justify-between px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <span>Business</span>
                    {isBusinessOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isBusinessOpen && (
                    <div className="mt-1 space-y-1">
                      {filteredBusinessNav.map((item) => (
                        <NavLink
                          key={item.name}
                          to={item.href}
                          onClick={onClose}
                          className={({ isActive }) =>
                            cn(
                              'group flex items-center px-2 py-2 pl-8 text-sm font-medium rounded-md transition-colors',
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
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

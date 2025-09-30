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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'pos', href: '/pos', icon: ShoppingCart },
  { name: 'products', href: '/products', icon: Package },
  { name: 'customers', href: '/customers', icon: Users },
  { name: 'employees', href: '/employees', icon: UserCog },
  { name: 'vans', href: '/vans', icon: Truck },
  { name: 'stock', href: '/stock', icon: Warehouse },
  { name: 'transfers', href: '/transfers', icon: ArrowRightLeft },
  { name: 'invoices', href: '/invoices', icon: FileText },
  { name: 'payments', href: '/payments', icon: CreditCard },
  { name: 'reports', href: '/reports', icon: BarChart3 },
  { name: 'settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const { t } = useTranslation();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-primary">{t('app.name')}</h1>
        </div>
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
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
    </div>
  );
}

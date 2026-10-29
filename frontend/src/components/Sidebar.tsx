import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3,
  Boxes,
  ChevronDown,
  Landmark,
  LayoutDashboard,
  LucideIcon,
  Plus,
  ScanBarcode,
  Settings,
  ShoppingBag,
  Truck,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

interface NavLeaf {
  name: string;
  href: string;
  icon?: LucideIcon;
}

interface NavSection {
  key: string;
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavSection;

interface NavGroup {
  label: string;
  entries: NavEntry[];
}

const navigation: NavGroup[] = [
  {
    label: 'overview',
    entries: [
      { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'pos', href: '/pos', icon: ScanBarcode },
    ],
  },
  {
    label: 'operations',
    entries: [
      {
        key: 'items',
        label: 'items',
        icon: Boxes,
        children: [
          { name: 'products', href: '/products' },
          { name: 'categories', href: '/categories' },
          { name: 'inventory', href: '/inventory' },
          { name: 'transfers', href: '/transfers' },
        ],
      },
      {
        key: 'sales',
        label: 'sales',
        icon: ShoppingBag,
        children: [
          { name: 'customers', href: '/customers' },
          { name: 'sales-invoices', href: '/invoices/sales' },
          { name: 'credit-notes', href: '/credit-notes' },
        ],
      },
      {
        key: 'purchases',
        label: 'purchases',
        icon: Truck,
        children: [
          { name: 'vendors', href: '/vendors' },
          { name: 'purchase-invoices', href: '/invoices/purchase' },
        ],
      },
      {
        key: 'banking',
        label: 'banking',
        icon: Landmark,
        children: [
          { name: 'payments', href: '/payments' },
          { name: 'expenses', href: '/expenses' },
        ],
      },
      {
        key: 'locations',
        label: 'warehousing',
        icon: Warehouse,
        children: [
          { name: 'locations', href: '/locations' },
          { name: 'vans', href: '/vans' },
        ],
      },
    ],
  },
  {
    label: 'insights',
    entries: [{ name: 'reports', href: '/reports', icon: BarChart3 }],
  },
  {
    label: 'administration',
    entries: [
      { name: 'users', href: '/users', icon: UsersRound },
      { name: 'settings', href: '/settings', icon: Settings },
    ],
  },
];

const isSection = (e: NavEntry): e is NavSection => 'children' in e;

const matchesPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + '/');

// Extra paths that belong to a section without being one of its links.
const sectionAliases: Record<string, string[]> = {
  banking: ['/payment-allocation', '/transactions'],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { canView } = usePermissions();
  const location = useLocation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sectionIsActive = (section: NavSection) =>
    section.children.some((c) => matchesPath(location.pathname, c.href)) ||
    (sectionAliases[section.key] || []).some((p) => matchesPath(location.pathname, p));

  // Open the section that contains the current page whenever the route changes.
  useEffect(() => {
    navigation.forEach((group) =>
      group.entries.forEach((entry) => {
        if (isSection(entry) && sectionIsActive(entry)) {
          setExpanded((prev) => (prev[entry.key] ? prev : { ...prev, [entry.key]: true }));
        }
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const renderLink = (item: NavLeaf, nested = false) => (
    <NavLink
      key={item.name}
      to={item.href}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-md text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          nested ? 'py-1.5 ps-3 pe-2' : 'h-9 px-2.5',
          isActive
            ? 'bg-primary/10 font-medium text-primary dark:bg-primary/15'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          {nested && (
            <span
              aria-hidden
              className={cn(
                'absolute -start-[9.5px] top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full transition-colors',
                isActive ? 'bg-primary' : 'bg-transparent'
              )}
            />
          )}
          {item.icon && (
            <item.icon
              aria-hidden
              strokeWidth={1.75}
              className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
            />
          )}
          <span className="truncate">{t(`nav.${item.name}`)}</span>
        </>
      )}
    </NavLink>
  );

  const renderSection = (section: NavSection) => {
    const children = section.children.filter((c) => canView(c.name));
    if (children.length === 0) return null;
    const open = !!expanded[section.key];
    const active = sectionIsActive(section);
    const Icon = section.icon;

    return (
      <div key={section.key}>
        <button
          type="button"
          onClick={() => setExpanded((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
          aria-expanded={open}
          className={cn(
            'group flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon
            aria-hidden
            strokeWidth={1.75}
            className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')}
          />
          <span className="flex-1 truncate text-start">{t(`nav.${section.label}`)}</span>
          <ChevronDown
            aria-hidden
            className={cn('h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200', open ? 'rotate-0' : '-rotate-90 rtl:rotate-90')}
          />
        </button>
        <div className={cn('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className={cn('overflow-hidden', !open && 'invisible')}>
            <div className="my-1 ms-[1.3rem] space-y-0.5 border-s border-border ps-2">
              {children.map((c) => renderLink(c, true))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        aria-hidden
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e bg-card transition-transform duration-200 ease-out',
          'md:relative md:translate-x-0 md:rtl:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
          <NavLink to="/dashboard" onClick={onClose} className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(210_78%_30%)] text-primary-foreground shadow-sm ring-1 ring-inset ring-white/10">
              <Boxes className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight text-foreground">{t('app.name')}</span>
              <span className="block truncate text-xs leading-tight text-muted-foreground">{t('app.tagline')}</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Primary action */}
        <div className="px-3 pb-2">
          <NavLink
            to="/invoices/new"
            onClick={onClose}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t('nav.new-invoice')}
          </NavLink>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Main">
          {navigation.map((group) => {
            const visible = group.entries.filter((e) =>
              isSection(e) ? e.children.some((c) => canView(c.name)) : canView(e.name)
            );
            if (visible.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {t(`nav.group-${group.label}`)}
                </p>
                <div className="space-y-0.5">
                  {visible.map((e) => (isSection(e) ? renderSection(e) : renderLink(e)))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

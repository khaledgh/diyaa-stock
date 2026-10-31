import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Globe, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  onMenuClick: () => void;
}

// First URL segment -> nav translation key, for the page title.
const pageTitles: Record<string, string> = {
  dashboard: 'dashboard',
  pos: 'pos',
  products: 'products',
  categories: 'categories',
  'product-types': 'product-types',
  inventory: 'inventory',
  'low-stock': 'inventory',
  transfers: 'transfers',
  customers: 'customers',
  invoices: 'invoices',
  'credit-notes': 'credit-notes',
  vendors: 'vendors',
  payments: 'payments',
  'payment-allocation': 'payment-allocation',
  transactions: 'payments',
  expenses: 'expenses',
  locations: 'locations',
  vans: 'vans',
  reports: 'reports',
  users: 'users',
  employees: 'employees',
  settings: 'settings',
};

const iconButton =
  'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, language, setLanguage, sidebarCollapsed, toggleSidebar } = useSettingsStore();

  const segment = location.pathname.split('/')[1] || 'dashboard';
  const titleKey = pageTitles[segment];

  const handleLanguageChange = (lang: 'en' | 'ar') => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onMenuClick} className={`${iconButton} md:hidden`} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className={`${iconButton} hidden md:inline-flex`}
            aria-label={sidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
            title={sidebarCollapsed ? 'Open sidebar (Ctrl+B)' : 'Close sidebar (Ctrl+B)'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px] rtl:-scale-x-100" strokeWidth={1.75} />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px] rtl:-scale-x-100" strokeWidth={1.75} />
            )}
          </button>
          <div className="mx-1 hidden h-5 w-px bg-border md:block" aria-hidden />
          {titleKey && <h2 className="truncate text-sm font-medium text-muted-foreground">{t(`nav.${titleKey}`)}</h2>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className={iconButton}
            aria-label={theme === 'light' ? t('header.dark-mode') : t('header.light-mode')}
            title={theme === 'light' ? t('header.dark-mode') : t('header.light-mode')}
          >
            {theme === 'light' ? <Moon className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Sun className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={iconButton} aria-label={t('header.language')} title={t('header.language')}>
                <Globe className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {([
                ['en', 'English'],
                ['ar', 'العربية'],
              ] as const).map(([code, label]) => (
                <DropdownMenuItem key={code} onClick={() => handleLanguageChange(code)} className="justify-between">
                  {label}
                  {language === code && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="mx-1.5 h-6 w-px bg-border" aria-hidden />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md py-1 pe-1.5 ps-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(user?.full_name)}
                </span>
                <span className="hidden min-w-0 text-start sm:block">
                  <span className="block max-w-[160px] truncate text-sm font-medium leading-tight">{user?.full_name}</span>
                  <span className="block text-xs capitalize leading-tight text-muted-foreground">{user?.role}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium">{user?.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-2 text-red-600 focus:text-red-600 dark:text-red-400">
                <LogOut className="h-4 w-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

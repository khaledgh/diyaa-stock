import { LucideProps } from "lucide-react";

export type IconProps = LucideProps;

const IconWrapper = ({ color, children, ...props }: { color: string; children: React.ReactNode } & IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={props.className}
        {...props}
    >
        <defs>
            <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: `var(--icon-${color}-stop1, ${color})`, stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: `var(--icon-${color}-stop2, ${color})`, stopOpacity: 0.8 }} />
            </linearGradient>
        </defs>
        {children}
    </svg>
);

export const DashboardIcon = (props: IconProps) => (
    <IconWrapper color="blue" {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
    </IconWrapper>
);

export const PosIcon = (props: IconProps) => (
    <IconWrapper color="cyan" {...props}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M6 10h4" />
        <path d="M6 14h1" />
        <path d="M10 14h1" />
        <path d="M15 10h3v4h-3z" fill="currentColor" fillOpacity="0.2" />
        <path d="M2 17h20" />
        <path d="M10 21h4" />
    </IconWrapper>
);

export const ItemsIcon = (props: IconProps) => (
    <IconWrapper color="orange" {...props}>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </IconWrapper>
);

export const ProductsIcon = (props: IconProps) => (
    <IconWrapper color="orange" {...props}>
        <path d="M16.5 9.4 7.5 4.21" />
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </IconWrapper>
);

export const CategoriesIcon = (props: IconProps) => (
    <IconWrapper color="yellow" {...props}>
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1" />
    </IconWrapper>
);

export const InventoryIcon = (props: IconProps) => (
    <IconWrapper color="green" {...props}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 15h.01" />
        <path d="M12 15h.01" />
        <path d="M16 15h.01" />
    </IconWrapper>
);

export const TransfersIcon = (props: IconProps) => (
    <IconWrapper color="purple" {...props}>
        <path d="m16 3 4 4-4 4" />
        <path d="M8 21 4 17l4-4" />
        <path d="M20 7H4a2 2 0 0 0-2 2v2" />
        <path d="M4 17h16a2 2 0 0 0 2-2v-2" />
    </IconWrapper>
);

export const SalesIcon = (props: IconProps) => (
    <IconWrapper color="emerald" {...props}>
        <circle cx="8" cy="8" r="6" />
        <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
        <path d="M7 6h1v4" />
        <path d="m16.71 13.88.7.71-2.82 2.82" />
    </IconWrapper>
);

export const CustomersIcon = (props: IconProps) => (
    <IconWrapper color="blue" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" fill="currentColor" fillOpacity="0.1" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconWrapper>
);

export const SalesInvoicesIcon = (props: IconProps) => (
    <IconWrapper color="emerald" {...props}>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M8 12h8" />
        <path d="M8 16h8" />
    </IconWrapper>
);

export const CreditNotesIcon = (props: IconProps) => (
    <IconWrapper color="red" {...props}>
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
    </IconWrapper>
);

export const PurchasesIcon = (props: IconProps) => (
    <IconWrapper color="rose" {...props}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" fill="currentColor" fillOpacity="0.2" />
    </IconWrapper>
);

export const VendorsIcon = (props: IconProps) => (
    <IconWrapper color="rose" {...props}>
        <path d="M3 21h18" />
        <path d="M9 21V9" />
        <path d="M15 21V11" />
        <path d="M3 7l9-4 9 4v14H3V7z" fill="currentColor" fillOpacity="0.1" />
    </IconWrapper>
);

export const PurchaseInvoicesIcon = (props: IconProps) => (
    <IconWrapper color="rose" {...props}>
        <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
        <path d="M14 2v5h5" />
        <path d="M3 15h6" />
        <path d="M3 18h6" />
    </IconWrapper>
);

export const BankingIcon = (props: IconProps) => (
    <IconWrapper color="indigo" {...props}>
        <path d="M3 21h18" />
        <path d="M19 21v-7" />
        <path d="M5 21v-7" />
        <path d="M9 21v-7" />
        <path d="M13 21v-7" />
        <path d="M3 10h18" />
        <path d="m3 10 9-7 9 7" fill="currentColor" fillOpacity="0.1" />
    </IconWrapper>
);

export const PaymentsIcon = (props: IconProps) => (
    <IconWrapper color="indigo" {...props}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <path d="M7 15h.01" />
        <path d="M11 15h2" />
    </IconWrapper>
);

export const WarehouseIcon = (props: IconProps) => (
    <IconWrapper color="slate" {...props}>
        <path d="M3 21V9l9-5 9 5v12" />
        <path d="M9 21v-6a3 3 0 0 1 6 0v6" />
        <rect x="7" y="10" width="10" height="4" rx="1" fill="currentColor" fillOpacity="0.1" />
    </IconWrapper>
);

export const LocationsIcon = (props: IconProps) => (
    <IconWrapper color="slate" {...props}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" fill="currentColor" fillOpacity="0.2" />
    </IconWrapper>
);

export const VansIcon = (props: IconProps) => (
    <IconWrapper color="slate" {...props}>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18h1" />
        <path d="M16 8h3l3 3v7h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
    </IconWrapper>
);

export const ReportsIcon = (props: IconProps) => (
    <IconWrapper color="blue" {...props}>
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
        <path d="M3 20h18" />
    </IconWrapper>
);

export const UsersSettingsIcon = (props: IconProps) => (
    <IconWrapper color="gray" {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <circle cx="19" cy="11" r="3" />
        <path d="M19 8v1" />
        <path d="M19 13v1" />
    </IconWrapper>
);

export const SettingsIcon = (props: IconProps) => (
    <IconWrapper color="gray" {...props}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
    </IconWrapper>
);

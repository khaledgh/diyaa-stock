import { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const BaseIcon = ({ children, ...props }: IconProps) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5} // Bold stroke
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {children}
    </svg>
);

// Modern, elegant, formal icons
// Style: Thin stroke (1.2), geometric, clean, professional.

export const DashboardIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </BaseIcon>
);

export const PosIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </BaseIcon>
);

export const ItemsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
        <path d="M12 12l8-4.5" />
        <path d="M12 12v9" />
        <path d="M12 12L4 7.5" />
    </BaseIcon>
);

export const ProductsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </BaseIcon>
);

export const CategoriesIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
    </BaseIcon>
);

export const InventoryIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
        <path d="M16 4h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
    </BaseIcon>
);

export const TransfersIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </BaseIcon>
);

export const SalesIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M20.91 8.84 8.56 2.23a1.93 1.93 0 0 0-1.81 0l-3.35 1.78a2 2 0 0 0-.58 3.19l9.33 11a5 5 0 0 0 7.6-6.37Z" />
        <path d="M6 10a.5.5 0 0 1 .5-.5h.05" />
    </BaseIcon>
);

export const CustomersIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </BaseIcon>
);

export const SalesInvoicesIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
    </BaseIcon>
);

export const CreditNotesIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
    </BaseIcon>
);

export const PurchasesIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
    </BaseIcon>
);

export const VendorsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4 8 4v14" />
        <path d="M13 10V7" />
        <path d="M11 10V7" />
    </BaseIcon>
);

export const PurchaseInvoicesIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <path d="M9 7h6" />
        <path d="M9 11h6" />
        <path d="M9 15h4" />
    </BaseIcon>
);

export const BankingIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4 8 4v14" />
        <circle cx="10" cy="14" r="1.5" />
        <circle cx="18" cy="14" r="1.5" />
    </BaseIcon>
);

export const PaymentsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <circle cx="12" cy="12" r="9" />
        <path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1" />
        <path d="M12 6v12" />
    </BaseIcon>
);

export const WarehouseIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M2 22h20" />
        <path d="M6 4h12a2 2 0 0 1 2 2v14H4V6a2 2 0 0 1 2-2z" />
        <path d="M10 22v-8h4v8" />
        <path d="M10 8h4" />
    </BaseIcon>
);

export const LocationsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
    </BaseIcon>
);

export const VansIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <rect x="1" y="3" width="15" height="13" rx="2" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </BaseIcon>
);

export const ReportsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
    </BaseIcon>
);

export const UsersSettingsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </BaseIcon>
);

export const SettingsIcon = (props: IconProps) => (
    <BaseIcon {...props}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </BaseIcon>
);

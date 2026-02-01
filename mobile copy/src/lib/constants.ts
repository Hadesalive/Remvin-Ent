/**
 * Constants & Configuration
 * Remvin Enterprise LTD Mobile App
 */

// App Information
export const APP_NAME = 'Remvin Enterprise LTD';
export const APP_VERSION = '1.0.0';

// Session Configuration
export const SESSION_KEY = 'hoe_mobile_session';
export const SESSION_EXPIRY_HOURS = 12;

// API Configuration
export const SUPABASE_URL = 'https://vmlouzwnwpdjygvwvben.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbG91endud3Bkanlndnd2YmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzYxMDQsImV4cCI6MjA4NDAxMjEwNH0.RYTugFC0wu-elQGOvY7435Tls8FgbgZ4j-q-UOs4kJY';

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Permissions
export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_SALES: 'view_sales',
  CREATE_SALE: 'create_sale',
  VIEW_CUSTOMERS: 'view_customers',
  MANAGE_CUSTOMERS: 'manage_customers',
  VIEW_PRODUCTS: 'view_products',
  MANAGE_PRODUCTS: 'manage_products',
  VIEW_INVOICES: 'view_invoices',
  MANAGE_INVOICES: 'manage_invoices',
  VIEW_ORDERS: 'view_orders',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_RETURNS: 'view_returns',
  MANAGE_RETURNS: 'manage_returns',
  VIEW_REPORTS: 'view_reports',
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_USERS: 'manage_users',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Role Permissions Matrix
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.MANAGER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.CREATE_SALE,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.MANAGE_CUSTOMERS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.MANAGE_PRODUCTS,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.MANAGE_INVOICES,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.VIEW_RETURNS,
    PERMISSIONS.MANAGE_RETURNS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_SETTINGS,
  ],
  [USER_ROLES.CASHIER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_SALES,
    PERMISSIONS.CREATE_SALE,
    PERMISSIONS.VIEW_CUSTOMERS,
    PERMISSIONS.VIEW_PRODUCTS,
    PERMISSIONS.VIEW_INVOICES,
  ],
};

// Responsive Breakpoints (matching requirements)
export const BREAKPOINTS = {
  SMALL: 600, // phones
  MEDIUM: 768, // tablets
  LARGE: 1024, // large tablets
} as const;

// Design Tokens (matching desktop)
export const DESIGN_TOKENS = {
  borderRadius: {
    sm: 8,
    md: 10,
    lg: 12,
    xl: 16,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
} as const;

// Status Options
export const SALE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  CREDIT: 'credit',
  OTHER: 'other',
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_FULL: 'MMMM dd, yyyy',
  DISPLAY_TIME: 'MMM dd, yyyy hh:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
} as const;


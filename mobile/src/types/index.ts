// ============================================
// Types - House of Electronics Mobile App
// ============================================

// User & Authentication
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'cashier';
  employeeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

export interface AuthSession {
  userId: string;
  expiresAt: string;
}

// Customer
export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  company?: string | null;
  notes?: string | null;
  avatar?: string | null;
  storeCredit?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Product
export interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  minStock?: number | null;
  sku?: string | null;
  category?: string | null;
  image?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Sale
export interface Sale {
  id: string;
  customerId?: string | null;
  customerName?: string | null;
  items: string; // JSON string
  subtotal: number;
  tax: number;
  taxes?: string | null; // JSON string
  discount: number;
  total: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
  notes?: string | null;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  userId?: string | null;
  cashierName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  sku?: string;
}

// Invoice
export interface Invoice {
  id: string;
  number: string;
  customerId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  items: string; // JSON string
  subtotal: number;
  tax: number;
  taxes?: string | null; // JSON string
  discount: number;
  total: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  invoiceType: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
  currency: string;
  dueDate?: string | null;
  notes?: string | null;
  terms?: string | null;
  bankDetails?: string | null; // JSON string
  saleId?: string | null;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

// Order
export interface Order {
  id: string;
  orderNumber: string;
  supplierId?: string | null;
  supplierName: string;
  items: string; // JSON string
  subtotal: number;
  tax: number;
  taxes?: string | null; // JSON string
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other' | null;
  expectedDeliveryDate?: string | null;
  actualDeliveryDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Return
export interface Return {
  id: string;
  returnNumber: string;
  saleId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  items: string; // JSON string
  subtotal: number;
  tax: number;
  total: number;
  refundAmount: number;
  refundMethod: 'cash' | 'store_credit' | 'original_payment' | 'exchange';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  processedBy?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// BOQ
export interface BOQ {
  id: string;
  boqNumber: string;
  date: string;
  projectTitle?: string | null;
  companyName?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  clientName?: string | null;
  clientAddress?: string | null;
  items: string; // JSON string
  notes?: string | null;
  managerSignature?: string | null;
  totalLE: number;
  totalUSD: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BOQItem {
  id: string;
  description: string;
  units: string;
  quantity: number;
  unitPriceLE: number;
  amountLE: number;
  amountUSD: number;
}

// Debt/Credit
export interface Debt {
  id: string;
  customerId?: string | null;
  amount: number;
  paid: number;
  status: 'active' | 'paid';
  description?: string | null;
  items?: string | null; // JSON string
  saleId?: string | null;
  createdAt?: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  method?: string | null;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard Stats
export interface DashboardStats {
  todayRevenue: number;
  todaySalesCount: number;
  activeCustomers: number;
  lowStockCount: number;
  pendingOrders: number;
  overdueInvoices: number;
}

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

// Product Model
export interface ProductModel {
  id: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  category?: string | null;
  colors?: string[]; // Available colors for this model
  storageOptions?: string[]; // Available storage options for this model
  // SIM options and pricing
  supportsPhysicalSim?: boolean;
  supportsEsim?: boolean;
  physicalSimPrice?: number | null;
  eSimPrice?: number | null;
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
  productModelId?: string | null; // Links to ProductModel for IMEI tracking
  storage?: string | null; // e.g., "128GB", "256GB"
  color?: string | null; // e.g., "Black", "White"
  // SIM options and pricing at product level
  supportsPhysicalSim?: boolean;
  supportsEsim?: boolean;
  physicalSimPrice?: number | null;
  eSimPrice?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// Inventory Item (IMEI-tracked items)
export interface InventoryItem {
  id: string;
  productId: string;
  imei: string;
  status: 'in_stock' | 'sold' | 'returned' | 'defective';
  condition: 'new' | 'refurbished' | 'used';
  // SIM type for this physical device (optional - can be null)
  simType?: 'physical' | 'esim' | null;
  purchaseCost?: number | null;
  // IMEI-specific selling price (optional, mainly for trade-in items where condition affects price)
  sellingPrice?: number | null;
  customerId?: string | null;
  saleId?: string | null;
  soldDate?: string | null;
  notes?: string | null;
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
  imeis?: string[]; // Array of IMEI numbers for IMEI-tracked products
  inventoryItemIds?: string[]; // Array of inventory item IDs that were sold
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

// Swap (Device Trade-in)
export interface Swap {
  id: string;
  swapNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  saleId?: string | null;
  purchasedProductId: string;
  purchasedProductName: string;
  purchasedProductPrice: number;
  // Optional IMEI of the purchased device (when not linked to an inventory item)
  purchasedImei?: string | null;
  tradeInProductId?: string | null;
  tradeInProductName?: string | null;
  tradeInImei: string;
  tradeInCondition: 'new' | 'refurbished' | 'used';
  tradeInNotes?: string | null;
  tradeInValue: number;
  differencePaid: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
  status: 'pending' | 'completed' | 'cancelled';
  inventoryItemId?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductModel {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  image?: string;
  colors?: string[]; // Available colors for this model
  storageOptions?: string[]; // Available storage options for this model
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  sku?: string;
  category?: string;
  stock: number;
  minStock?: number;
  productModelId?: string;
  storage?: string;
  color?: string;
  image?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  imei: string;
  status: 'in_stock' | 'sold' | 'returned' | 'defective';
  saleId?: string;
  customerId?: string;
  soldDate?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'completed' | 'refunded' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
}

export interface SalesData {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  settings: CompanySettings;
}

export interface DashboardStats {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  totalProducts: number;
  recentSales: Sale[];
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
  salesByMonth: Array<{
    month: string;
    revenue: number;
    sales: number;
  }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }>;
}

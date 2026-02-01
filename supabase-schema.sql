-- =====================================================
-- Supabase PostgreSQL Database Schema
-- Generated from SQLite schema for Remvin Enterprise
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  avatar TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  zip VARCHAR(20),
  country VARCHAR(100),
  company VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  store_credit NUMERIC(12, 2) DEFAULT 0 CHECK (store_credit >= 0)
);

-- Product Models table - Top-level models (e.g., "iPhone 17", "iPhone 17 Pro")
CREATE TABLE IF NOT EXISTS product_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category VARCHAR(100),
  description TEXT,
  image TEXT,
  colors JSONB DEFAULT '[]'::jsonb,
  storage_options JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Products table - Enhanced with product_model_id, storage, and color for variant tracking
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  cost NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  sku VARCHAR(100),
  category VARCHAR(100),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock INTEGER CHECK (min_stock >= 0),
  product_model_id UUID REFERENCES product_models(id) ON DELETE SET NULL,
  storage VARCHAR(50),
  color VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  image TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Product Accessories table - Links accessories to product models or specific products
CREATE TABLE IF NOT EXISTS product_accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_model_id UUID NOT NULL REFERENCES product_models(id) ON DELETE CASCADE,
  accessory_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  linked_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  is_mandatory BOOLEAN DEFAULT false,
  default_quantity INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(product_model_id, accessory_product_id, linked_product_id)
);

-- Company Settings table
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  company_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  tax_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.15 CHECK (tax_rate >= 0 AND tax_rate <= 1),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  onboarding_completed BOOLEAN DEFAULT false,
  preferences JSONB,
  reports_password VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Users table for RBAC
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
  employee_id VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- SALES & TRANSACTIONS
-- =====================================================

-- Sales table - Updated with backorder support (must be created before inventory_items)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  items JSONB NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  tax NUMERIC(12, 2) NOT NULL CHECK (tax >= 0),
  taxes JSONB,
  discount NUMERIC(12, 2) NOT NULL CHECK (discount >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'credit', 'other')),
  notes TEXT,
  has_backorder BOOLEAN DEFAULT false,
  backorder_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  invoice_id UUID,
  invoice_number VARCHAR(100),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cashier_name VARCHAR(255),
  cashier_employee_id VARCHAR(50)
);

-- Inventory Items table - Individual units tracked by IMEI (created after sales table)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  imei VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_stock' 
    CHECK (status IN ('in_stock', 'sold', 'returned', 'defective', 'reserved', 'warranty')),
  condition VARCHAR(20) DEFAULT 'new' CHECK (condition IN ('new', 'refurbished', 'used', 'fair', 'poor')),
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  sold_date TIMESTAMP WITH TIME ZONE,
  purchase_cost NUMERIC(12, 2),
  warranty_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(100) NOT NULL UNIQUE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  items JSONB NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  tax NUMERIC(12, 2) NOT NULL CHECK (tax >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  refund_amount NUMERIC(12, 2) NOT NULL CHECK (refund_amount >= 0),
  refund_method VARCHAR(20) NOT NULL CHECK (refund_method IN ('cash', 'store_credit', 'original_payment', 'exchange')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  processed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Swaps table - Device trade-in/swap transactions
CREATE TABLE IF NOT EXISTS swaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_number VARCHAR(100) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  customer_address TEXT,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  purchased_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  purchased_product_name VARCHAR(255) NOT NULL,
  purchased_product_price NUMERIC(12, 2) NOT NULL CHECK (purchased_product_price >= 0),
  trade_in_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  trade_in_product_name VARCHAR(255),
  trade_in_imei VARCHAR(50) NOT NULL UNIQUE,
  trade_in_condition VARCHAR(20) NOT NULL CHECK (trade_in_condition IN ('new', 'refurbished', 'used', 'fair', 'poor')),
  trade_in_notes TEXT,
  trade_in_value NUMERIC(12, 2) NOT NULL CHECK (trade_in_value >= 0),
  difference_paid NUMERIC(12, 2) NOT NULL,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'credit', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
  description TEXT,
  items JSONB,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL
);

-- Debt Payments table
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  method VARCHAR(50)
);

-- =====================================================
-- INVOICES
-- =====================================================

-- Invoice Templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preview VARCHAR(100),
  colors_primary VARCHAR(20) NOT NULL,
  colors_secondary VARCHAR(20) NOT NULL,
  colors_accent VARCHAR(20) NOT NULL,
  colors_background VARCHAR(20) NOT NULL,
  colors_text VARCHAR(20) NOT NULL,
  fonts_primary VARCHAR(100) NOT NULL,
  fonts_secondary VARCHAR(100) NOT NULL,
  fonts_size VARCHAR(20) DEFAULT 'medium',
  layout_header_style VARCHAR(50) DEFAULT 'classic',
  layout_show_logo BOOLEAN NOT NULL DEFAULT true,
  layout_show_border BOOLEAN NOT NULL DEFAULT true,
  layout_item_table_style VARCHAR(50) DEFAULT 'simple',
  layout_footer_style VARCHAR(50) DEFAULT 'minimal',
  custom_schema JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(100) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_address TEXT,
  customer_phone VARCHAR(50),
  items JSONB NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  tax NUMERIC(12, 2) NOT NULL CHECK (tax >= 0),
  taxes JSONB,
  discount NUMERIC(12, 2) NOT NULL CHECK (discount >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  invoice_type VARCHAR(20) NOT NULL CHECK (invoice_type IN ('invoice', 'proforma', 'quote', 'credit_note', 'delivery')),
  currency VARCHAR(10) NOT NULL,
  due_date DATE,
  notes TEXT,
  terms TEXT,
  bank_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sales_rep_name VARCHAR(255),
  sales_rep_id VARCHAR(50)
);

-- =====================================================
-- OTHER TABLES
-- =====================================================

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  value NUMERIC(12, 2) NOT NULL CHECK (value > 0),
  probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
  stage VARCHAR(50) NOT NULL CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost')),
  expected_close_date DATE,
  actual_close_date DATE,
  source VARCHAR(100),
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  negotiation_history JSONB DEFAULT '[]'::jsonb,
  stakeholders JSONB DEFAULT '[]'::jsonb,
  competitor_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- BOQ (Bill of Quantities) table
CREATE TABLE IF NOT EXISTS boqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boq_number VARCHAR(100) NOT NULL UNIQUE,
  date DATE NOT NULL,
  project_title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_address TEXT NOT NULL,
  company_phone VARCHAR(50) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_address TEXT NOT NULL,
  items JSONB NOT NULL,
  notes TEXT,
  manager_signature TEXT,
  total_le NUMERIC(12, 2) NOT NULL CHECK (total_le >= 0),
  total_usd NUMERIC(12, 2) NOT NULL CHECK (total_usd >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- License activation tracking table
CREATE TABLE IF NOT EXISTS license_activations (
  id SERIAL PRIMARY KEY,
  machine_fingerprint VARCHAR(255) NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_company VARCHAR(255),
  license_data JSONB,
  is_active BOOLEAN DEFAULT true
);

-- License validation history table
CREATE TABLE IF NOT EXISTS license_validations (
  id SERIAL PRIMARY KEY,
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  valid BOOLEAN NOT NULL,
  reason TEXT,
  machine_fingerprint VARCHAR(255)
);

-- Hardware snapshots table (for detecting hardware changes)
CREATE TABLE IF NOT EXISTS hardware_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  machine_fingerprint VARCHAR(255) NOT NULL,
  hardware_data JSONB NOT NULL,
  cpu_info TEXT,
  mac_address VARCHAR(50),
  platform VARCHAR(50),
  hostname VARCHAR(255)
);

-- Simple product key table (for internal system)
CREATE TABLE IF NOT EXISTS product_key (
  id INTEGER PRIMARY KEY DEFAULT 1,
  product_key_hash VARCHAR(255) NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  machine_id VARCHAR(255),
  machine_name VARCHAR(255),
  CONSTRAINT single_row CHECK (id = 1)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Customer indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);

-- Product Model indexes
CREATE INDEX IF NOT EXISTS idx_product_models_brand ON product_models(brand);
CREATE INDEX IF NOT EXISTS idx_product_models_category ON product_models(category);
CREATE INDEX IF NOT EXISTS idx_product_models_name ON product_models(name);
CREATE INDEX IF NOT EXISTS idx_product_models_deleted_at ON product_models(deleted_at);

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_model_id ON products(product_model_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- Inventory Items indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_product_id ON inventory_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_imei ON inventory_items(imei);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sale_id ON inventory_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_customer_id ON inventory_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_deleted_at ON inventory_items(deleted_at);

-- Product Accessories indexes
CREATE INDEX IF NOT EXISTS idx_product_accessories_model ON product_accessories(product_model_id);
CREATE INDEX IF NOT EXISTS idx_product_accessories_product ON product_accessories(accessory_product_id);
CREATE INDEX IF NOT EXISTS idx_product_accessories_linked ON product_accessories(linked_product_id);
CREATE INDEX IF NOT EXISTS idx_product_accessories_deleted_at ON product_accessories(deleted_at);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_total ON sales(total);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_status ON sales(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_created_status ON sales(created_at, status);
CREATE INDEX IF NOT EXISTS idx_sales_deleted_at ON sales(deleted_at);

-- Returns indexes
CREATE INDEX IF NOT EXISTS idx_returns_return_number ON returns(return_number);
CREATE INDEX IF NOT EXISTS idx_returns_sale_id ON returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_refund_method ON returns(refund_method);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_deleted_at ON returns(deleted_at);

-- Swaps indexes
CREATE INDEX IF NOT EXISTS idx_swaps_customer_id ON swaps(customer_id);
CREATE INDEX IF NOT EXISTS idx_swaps_sale_id ON swaps(sale_id);
CREATE INDEX IF NOT EXISTS idx_swaps_trade_in_imei ON swaps(trade_in_imei);
CREATE UNIQUE INDEX IF NOT EXISTS idx_swaps_swap_number ON swaps(swap_number);
CREATE INDEX IF NOT EXISTS idx_swaps_deleted_at ON swaps(deleted_at);

-- Invoice indexes
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_deleted_at ON invoices(deleted_at);

-- BOQ indexes
CREATE INDEX IF NOT EXISTS idx_boqs_boq_number ON boqs(boq_number);
CREATE INDEX IF NOT EXISTS idx_boqs_date ON boqs(date);
CREATE INDEX IF NOT EXISTS idx_boqs_client_name ON boqs(client_name);
CREATE INDEX IF NOT EXISTS idx_boqs_created_at ON boqs(created_at);
CREATE INDEX IF NOT EXISTS idx_boqs_deleted_at ON boqs(deleted_at);

-- Deal indexes
CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_priority ON deals(priority);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value);
CREATE INDEX IF NOT EXISTS idx_deals_stage_priority ON deals(stage, priority);
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(deleted_at);

-- Invoice template indexes
CREATE INDEX IF NOT EXISTS idx_invoice_templates_name ON invoice_templates(name);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_created_at ON invoice_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_deleted_at ON invoice_templates(deleted_at);

-- Debt indexes
CREATE INDEX IF NOT EXISTS idx_debts_customer_id ON debts(customer_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_created_at ON debts(created_at);
CREATE INDEX IF NOT EXISTS idx_debts_deleted_at ON debts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_deleted_at ON debt_payments(deleted_at);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- License table indexes
CREATE INDEX IF NOT EXISTS idx_license_activations_machine ON license_activations(machine_fingerprint);
CREATE INDEX IF NOT EXISTS idx_license_activations_active ON license_activations(is_active);
CREATE INDEX IF NOT EXISTS idx_license_validations_machine ON license_validations(machine_fingerprint);
CREATE INDEX IF NOT EXISTS idx_license_validations_timestamp ON license_validations(validated_at);
CREATE INDEX IF NOT EXISTS idx_hardware_snapshots_machine ON hardware_snapshots(machine_fingerprint);
CREATE INDEX IF NOT EXISTS idx_hardware_snapshots_timestamp ON hardware_snapshots(snapshot_at);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_models_updated_at BEFORE UPDATE ON product_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_accessories_updated_at BEFORE UPDATE ON product_accessories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swaps_updated_at BEFORE UPDATE ON swaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_templates_updated_at BEFORE UPDATE ON invoice_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boqs_updated_at BEFORE UPDATE ON boqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default company settings if none exist
INSERT INTO company_settings (id, company_name, address, phone, email, tax_rate, currency, onboarding_completed)
VALUES (1, 'House of Electronics', '', '', '', 0.15, 'USD', false)
ON CONFLICT (id) DO NOTHING;

-- Insert default invoice templates if none exist
INSERT INTO invoice_templates (
  id, name, description, preview,
  colors_primary, colors_secondary, colors_accent, colors_background, colors_text,
  fonts_primary, fonts_secondary, fonts_size,
  layout_header_style, layout_show_logo, layout_show_border, layout_item_table_style, layout_footer_style,
  is_default, created_at, updated_at
) VALUES
  (
    gen_random_uuid(), 'Pro Corporate', 
    'Clean corporate with balanced header and easy-to-scan table',
    'pro-corporate-preview',
    '#1f2937', '#6b7280', '#3b82f6', '#ffffff', '#111827',
    'Inter', 'Inter', 'medium',
    'classic', true, true, 'detailed', 'detailed',
    true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(), 'Modern Stripe',
    'Bold accent stripe with modern typography',
    'modern-stripe-preview',
    '#0f172a', '#475569', '#8b5cf6', '#ffffff', '#0f172a',
    'Inter', 'Inter', 'medium',
    'modern', true, true, 'modern', 'minimal',
    false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(), 'Minimal Outline',
    'Clean minimal design with subtle borders',
    'minimal-outline-preview',
    '#111827', '#6b7280', '#10b981', '#ffffff', '#111827',
    'Inter', 'Inter', 'medium',
    'minimal', true, true, 'simple', 'minimal',
    false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(), 'Elegant Dark',
    'Sophisticated dark theme with gold accents',
    'elegant-dark-preview',
    '#1e293b', '#64748b', '#f59e0b', '#0f172a', '#f1f5f9',
    'Inter', 'Inter', 'medium',
    'premium', true, true, 'detailed', 'detailed',
    false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid(), 'Classic Column',
    'Traditional two-column layout',
    'classic-column-preview',
    '#374151', '#9ca3af', '#ef4444', '#ffffff', '#1f2937',
    'Inter', 'Inter', 'medium',
    'classic', true, true, 'simple', 'minimal',
    false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - Optional
-- Uncomment and customize based on your security requirements
-- =====================================================

-- Enable RLS on tables (optional - customize as needed)
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize based on your needs)
-- CREATE POLICY "Users can view all customers" ON customers FOR SELECT USING (true);
-- CREATE POLICY "Users can insert customers" ON customers FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update customers" ON customers FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete customers" ON customers FOR DELETE USING (true);

-- =====================================================
-- NOTES
-- =====================================================
-- 1. This schema uses UUID for all primary keys (except company_settings and product_key which use INTEGER)
-- 2. JSONB is used for complex data structures (items, taxes, preferences, etc.)
-- 3. All timestamps use TIMESTAMP WITH TIME ZONE for proper timezone handling
-- 4. Boolean fields use BOOLEAN type instead of INTEGER
-- 5. Numeric fields use NUMERIC(12, 2) for precise decimal calculations
-- 6. All foreign key constraints are properly defined with ON DELETE actions
-- 7. Indexes are created for commonly queried columns
-- 8. Triggers automatically update updated_at timestamps
-- 9. Default data is inserted for company_settings and invoice_templates
-- 10. RLS policies are commented out - enable and customize as needed for your security requirements

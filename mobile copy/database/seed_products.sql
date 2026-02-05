-- ============================================
-- Product Seed Data for Remvin Enterprise
-- Creates product models, products, and inventory items
-- All inventory items are condition='new'
-- ============================================

-- Helper function to generate UUIDs (if needed)
-- Note: Supabase uses gen_random_uuid() by default

-- ============================================
-- MIGRATION: Ensure new_price and used_price columns exist
-- ============================================
-- Add new_price and used_price columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'new_price') THEN
    ALTER TABLE products ADD COLUMN new_price NUMERIC(12, 2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'products' AND column_name = 'used_price') THEN
    ALTER TABLE products ADD COLUMN used_price NUMERIC(12, 2);
  END IF;
END $$;

-- ============================================
-- STEP 1: CREATE PRODUCT MODELS
-- ============================================

-- iPhone Models
-- Only insert if model doesn't already exist (check by name and brand)
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 16 Plus', 'Apple', 'Smartphones', 
   '["Pink"]'::jsonb, '["512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 16 Plus' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 16', 'Apple', 'Smartphones',
   '["Pink"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 16' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 16 Pro Max', 'Apple', 'Smartphones',
   '["Desert Titanium"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 16 Pro Max' AND brand = 'Apple');
  
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone Air', 'Apple', 'Smartphones',
   '["Light Gold", "Sky Blue"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone Air' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 17 Pro', 'Apple', 'Smartphones',
   '["Cosmic Orange", "Deep Blue"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 17 Pro' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 17 Pro Max', 'Apple', 'Smartphones',
   '["Cosmic Orange", "Deep Blue"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 17 Pro Max' AND brand = 'Apple');

-- iPhone 14 Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 14 Pro Max', 'Apple', 'Smartphones',
   '["Deep Purple"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 14 Pro Max' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 14 Pro', 'Apple', 'Smartphones',
   '["Silver"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 14 Pro' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 14', 'Apple', 'Smartphones',
   '["Deep Purple", "Starlight"]'::jsonb, '["128GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 14' AND brand = 'Apple');

-- iPhone 15 Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 15 Pro Max', 'Apple', 'Smartphones',
   '["Black Titanium", "Natural Titanium"]'::jsonb, '["256GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 15 Pro Max' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 15', 'Apple', 'Smartphones',
   '["Pink", "Green"]'::jsonb, '["128GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 15' AND brand = 'Apple');

-- iPhone 12 Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 12 Pro Max', 'Apple', 'Smartphones',
   '["Silver", "Pacific Blue", "Graphite"]'::jsonb, '["128GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 12 Pro Max' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 12 Pro', 'Apple', 'Smartphones',
   '["Silver"]'::jsonb, '["128GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 12 Pro' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 12', 'Apple', 'Smartphones',
   '["Purple", "Pacific Blue", "Black", "Red", "Green", "White"]'::jsonb, '["64GB", "128GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 12' AND brand = 'Apple');

-- iPhone 13 Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 13 Pro Max', 'Apple', 'Smartphones',
   '["Graphite", "Alpine Green", "Silver", "Sierra Blue", "Gold"]'::jsonb, '["128GB", "256GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 13 Pro Max' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 13 Pro', 'Apple', 'Smartphones',
   '["Gold", "Sierra Blue"]'::jsonb, '["256GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 13 Pro' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 13', 'Apple', 'Smartphones',
   '["Starlight"]'::jsonb, '["128GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 13' AND brand = 'Apple');

-- iPhone 11 Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 11 Pro Max', 'Apple', 'Smartphones',
   '["Silver", "Gold"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 11 Pro Max' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 11 Pro', 'Apple', 'Smartphones',
   '["Gold", "Midnight Green"]'::jsonb, '["64GB", "256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 11 Pro' AND brand = 'Apple');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 11', 'Apple', 'Smartphones',
   '["Yellow", "Red", "Black", "Purple", "White", "Green"]'::jsonb, '["64GB", "128GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 11' AND brand = 'Apple');

-- iPhone XR
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone XR', 'Apple', 'Smartphones',
   '["Black", "Blue", "Coral", "Red", "White"]'::jsonb, '["64GB", "128GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone XR' AND brand = 'Apple');

-- iPhone XS Max
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone XS Max', 'Apple', 'Smartphones',
   '[]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone XS Max' AND brand = 'Apple');

-- iPhone 8 Plus
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'iPhone 8 Plus', 'Apple', 'Smartphones',
   '["Red"]'::jsonb, '["64GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'iPhone 8 Plus' AND brand = 'Apple');

-- Samsung Models
-- Galaxy S Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S25 Ultra', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["256GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S25 Ultra' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S24 Ultra', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S24 Ultra' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S23 Ultra', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S23 Ultra' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S22+', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S22+' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S22', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["128GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S22' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S21 Ultra', 'Samsung', 'Smartphones',
   '["Silver"]'::jsonb, '["512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S21 Ultra' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S21+', 'Samsung', 'Smartphones',
   '["Purple", "Phantom Black"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S21+' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S20+', 'Samsung', 'Smartphones',
   '["Black", "Grey"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S20+' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S20 Ultra', 'Samsung', 'Smartphones',
   '["Black"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S20 Ultra' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S10+', 'Samsung', 'Smartphones',
   '["Blue", "Black"]'::jsonb, '["128GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S10+' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S10 5G', 'Samsung', 'Smartphones',
   '["Black", "White", "Blue"]'::jsonb, '["256GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S10 5G' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy S9+', 'Samsung', 'Smartphones',
   '["Black", "Purple"]'::jsonb, '["64GB", "128GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy S9+' AND brand = 'Samsung');

-- Galaxy Note Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Note 20 Ultra', 'Samsung', 'Smartphones',
   '["Gold"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Note 20 Ultra' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Note 10+', 'Samsung', 'Smartphones',
   '["Silver", "White"]'::jsonb, '["256GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Note 10+' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Note 9', 'Samsung', 'Smartphones',
   '["Purple", "Black", "Blue"]'::jsonb, '["128GB", "512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Note 9' AND brand = 'Samsung');

-- Galaxy Z Series
INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Z Fold 6', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Z Fold 6' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Z Fold 5', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["512GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Z Fold 5' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Z Flip 5', 'Samsung', 'Smartphones',
   '[]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Z Flip 5' AND brand = 'Samsung');

INSERT INTO product_models (id, name, brand, category, colors, storage_options, is_active, created_at, updated_at)
SELECT gen_random_uuid(), 'Galaxy Z Flip 4', 'Samsung', 'Smartphones',
   '["Blue", "White"]'::jsonb, '["256GB"]'::jsonb, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM product_models WHERE name = 'Galaxy Z Flip 4' AND brand = 'Samsung');

-- ============================================
-- STEP 2: CREATE PRODUCTS (Specific Variants)
-- ============================================
-- Note: We'll use CTEs to reference model IDs, then insert products with new_price and used_price

WITH model_ids AS (
  SELECT id, name FROM product_models
),
-- iPhone Products with pricing (in Leones, converted from USD where needed)
iphone_products AS (
  SELECT 
    m.id as model_id,
    m.name as model_name,
    p.storage,
    p.color,
    p.name as product_name,
    p.new_price,
    p.used_price,
    p.sku
  FROM (VALUES
    -- iPhone 16 Plus - 256GB: Le19,500 new (512GB estimated at 22,000)
    ('iPhone 16 Plus', '512GB', 'Pink', 'iPhone 16 Plus Pink 512GB', 22000, 0, 'IPH16PLUS-512-PINK'),
    
    -- iPhone 16 - 128GB: Le16,000 new (256GB estimated at 18,000)
    ('iPhone 16', '256GB', 'Pink', 'iPhone 16 Pink 256GB', 18000, 0, 'IPH16-256-PINK'),
    
    -- iPhone 16 Pro Max - 256GB: Le25,000 new, Le22,500 used
    ('iPhone 16 Pro Max', '256GB', 'Desert Titanium', 'iPhone 16 Pro Max Desert Titanium 256GB', 25000, 22500, 'IPH16PM-256-DESERT'),
    
    -- iPhone Air (17 Air) - $1300 = 31,200 Leones
    ('iPhone Air', '256GB', 'Light Gold', 'iPhone Air 256GB Light Gold', 31200, 0, 'IPHAIR-256-GOLD'),
    ('iPhone Air', '256GB', 'Sky Blue', 'iPhone Air 256GB Sky Blue', 31200, 0, 'IPHAIR-256-BLUE'),
    
    -- iPhone 17 Pro - $1400 = 33,600 Leones
    ('iPhone 17 Pro', '256GB', 'Cosmic Orange', 'iPhone 17 Pro Cosmic Orange 256GB', 33600, 0, 'IPH17P-256-ORANGE'),
    ('iPhone 17 Pro', '256GB', 'Deep Blue', 'iPhone 17 Pro Deep Blue 256GB', 33600, 0, 'IPH17P-256-BLUE'),
    
    -- iPhone 17 Pro Max - $1600 (SIM) = 38,400 Leones, $1550 (eSIM) = 37,200 Leones
    ('iPhone 17 Pro Max', '256GB', 'Cosmic Orange', 'iPhone 17 Pro Max Cosmic Orange 256GB', 38400, 37200, 'IPH17PM-256-ORANGE'),
    ('iPhone 17 Pro Max', '256GB', 'Deep Blue', 'iPhone 17 Pro Max Deep Blue 256GB', 38400, 37200, 'IPH17PM-256-BLUE'),
    
    -- iPhone 14 Pro Max - 128GB: Le15,000 new, 256GB: Le16,000 new
    ('iPhone 14 Pro Max', '256GB', 'Deep Purple', 'iPhone 14 Pro Max Deep Purple 256GB', 16000, 15000, 'IPH14PM-256-PURPLE'),
    
    -- iPhone 14 Pro - estimated based on Pro Max pricing
    ('iPhone 14 Pro', '256GB', 'Silver', 'iPhone 14 Pro Silver 256GB', 15000, 14000, 'IPH14P-256-SILVER'),
    
    -- iPhone 14 - 128GB: Le11,000 used (new price estimated at 12,000)
    ('iPhone 14', '128GB', 'Starlight', 'iPhone 14 Starlight 128GB', 12000, 11000, 'IPH14-128-STARLIGHT'),
    
    -- iPhone 15 Pro Max - 256GB: Le20,000 new, Le17,000 used, 512GB: Le21,000 new, Le18,000 used
    ('iPhone 15 Pro Max', '256GB', 'Black Titanium', 'iPhone 15 Pro Max Black Titanium 256GB', 20000, 17000, 'IPH15PM-256-BLACK'),
    ('iPhone 15 Pro Max', '256GB', 'Natural Titanium', 'iPhone 15 Pro Max Natural Titanium 256GB', 20000, 17000, 'IPH15PM-256-NATURAL'),
    ('iPhone 15 Pro Max', '512GB', 'Natural Titanium', 'iPhone 15 Pro Max Natural Titanium 512GB', 21000, 18000, 'IPH15PM-512-NATURAL'),
    
    -- iPhone 15 - estimated pricing (not in list, but similar to iPhone 14)
    ('iPhone 15', '128GB', 'Pink', 'iPhone 15 Pink 128GB', 13000, 12000, 'IPH15-128-PINK'),
    ('iPhone 15', '256GB', 'Green', 'iPhone 15 Green 256GB', 14000, 13000, 'IPH15-256-GREEN'),
    ('iPhone 15', '256GB', 'Pink', 'iPhone 15 Pink 256GB', 14000, 13000, 'IPH15-256-PINK'),
    
    -- iPhone 12 Pro Max - 128GB: Le11,000 new, 256GB: Le12,000 new
    ('iPhone 12 Pro Max', '128GB', 'Silver', 'iPhone 12 Pro Max Silver 128GB', 11000, 9500, 'IPH12PM-128-SILVER'),
    ('iPhone 12 Pro Max', '256GB', 'Silver', 'iPhone 12 Pro Max Silver 256GB', 12000, 10500, 'IPH12PM-256-SILVER'),
    ('iPhone 12 Pro Max', '128GB', 'Pacific Blue', 'iPhone 12 Pro Max Pacific Blue 128GB', 11000, 9500, 'IPH12PM-128-BLUE'),
    ('iPhone 12 Pro Max', '256GB', 'Pacific Blue', 'iPhone 12 Pro Max Pacific Blue 256GB', 12000, 10500, 'IPH12PM-256-BLUE'),
    ('iPhone 12 Pro Max', '128GB', 'Graphite', 'iPhone 12 Pro Max Graphite 128GB', 11000, 9500, 'IPH12PM-128-GRAPHITE'),
    
    -- iPhone 12 Pro - 128GB: Le9,000 new, 256GB: Le9,800 new
    ('iPhone 12 Pro', '128GB', 'Silver', 'iPhone 12 Pro Silver 128GB', 9000, 8000, 'IPH12P-128-SILVER'),
    ('iPhone 12 Pro', '256GB', 'Silver', 'iPhone 12 Pro Silver 256GB', 9800, 9000, 'IPH12P-256-SILVER'),
    
    -- iPhone 12 - 64GB: Le7,000 new, 128GB: Le7,600 new
    ('iPhone 12', '64GB', 'Purple', 'iPhone 12 Purple 64GB', 7000, 6000, 'IPH12-64-PURPLE'),
    ('iPhone 12', '128GB', 'Purple', 'iPhone 12 Purple 128GB', 7600, 7000, 'IPH12-128-PURPLE'),
    ('iPhone 12', '128GB', 'Pacific Blue', 'iPhone 12 Pacific Blue 128GB', 7600, 7000, 'IPH12-128-BLUE'),
    ('iPhone 12', '256GB', 'Black', 'iPhone 12 Black 256GB', 8500, 7500, 'IPH12-256-BLACK'),
    ('iPhone 12', '128GB', 'Red', 'iPhone 12 Red 128GB', 7600, 7000, 'IPH12-128-RED'),
    ('iPhone 12', '128GB', 'Green', 'iPhone 12 Green 128GB', 7600, 7000, 'IPH12-128-GREEN'),
    ('iPhone 12', '64GB', 'White', 'iPhone 12 White 64GB', 7000, 6000, 'IPH12-64-WHITE'),
    ('iPhone 12', '64GB', 'Pacific Blue', 'iPhone 12 Pacific Blue 64GB', 7000, 6000, 'IPH12-64-BLUE'),
    
    -- iPhone 13 Pro Max - 128GB: Le14,000 new, 256GB: Le15,000 new
    ('iPhone 13 Pro Max', '128GB', 'Graphite', 'iPhone 13 Pro Max Graphite 128GB', 14000, 12000, 'IPH13PM-128-GRAPHITE'),
    ('iPhone 13 Pro Max', '256GB', 'Graphite', 'iPhone 13 Pro Max Graphite 256GB', 15000, 13000, 'IPH13PM-256-GRAPHITE'),
    ('iPhone 13 Pro Max', '128GB', 'Alpine Green', 'iPhone 13 Pro Max Alpine Green 128GB', 14000, 12000, 'IPH13PM-128-GREEN'),
    ('iPhone 13 Pro Max', '256GB', 'Silver', 'iPhone 13 Pro Max Silver 256GB', 15000, 13000, 'IPH13PM-256-SILVER'),
    ('iPhone 13 Pro Max', '256GB', 'Sierra Blue', 'iPhone 13 Pro Max Sierra Blue 256GB', 15000, 13000, 'IPH13PM-256-BLUE'),
    ('iPhone 13 Pro Max', '512GB', 'Sierra Blue', 'iPhone 13 Pro Max Sierra Blue 512GB', 17000, 15000, 'IPH13PM-512-BLUE'),
    ('iPhone 13 Pro Max', '128GB', 'Gold', 'iPhone 13 Pro Max Gold 128GB', 14000, 12000, 'IPH13PM-128-GOLD'),
    
    -- iPhone 13 Pro - 128GB: Le11,000 new, 256GB: Le12,000 new
    ('iPhone 13 Pro', '256GB', 'Gold', 'iPhone 13 Pro Gold 256GB', 12000, 10500, 'IPH13P-256-GOLD'),
    ('iPhone 13 Pro', '512GB', 'Gold', 'iPhone 13 Pro Gold 512GB', 14000, 12000, 'IPH13P-512-GOLD'),
    ('iPhone 13 Pro', '256GB', 'Sierra Blue', 'iPhone 13 Pro Sierra Blue 256GB', 12000, 10500, 'IPH13P-256-BLUE'),
    
    -- iPhone 13 - 128GB: Le10,000 new, Le9,000 used, 256GB: Le11,000 new
    ('iPhone 13', '128GB', 'Starlight', 'iPhone 13 Starlight 128GB', 10000, 9000, 'IPH13-128-STARLIGHT'),
    ('iPhone 13', '256GB', 'Starlight', 'iPhone 13 Starlight 256GB', 11000, 10000, 'IPH13-256-STARLIGHT'),
    
    -- iPhone 11 Pro Max - 64GB: Le8,000 new, 256GB: Le9,000 new, Le8,000 used
    ('iPhone 11 Pro Max', '256GB', 'Silver', 'iPhone 11 Pro Max Silver 256GB', 9000, 8000, 'IPH11PM-256-SILVER'),
    ('iPhone 11 Pro Max', '256GB', 'Gold', 'iPhone 11 Pro Max Gold 256GB', 9000, 8000, 'IPH11PM-256-GOLD'),
    
    -- iPhone 11 Pro - 64GB: Le7,000 new, Le6,500 used, 256GB: Le7,500 new, Le7,000 used
    ('iPhone 11 Pro', '256GB', 'Gold', 'iPhone 11 Pro Gold 256GB', 7500, 7000, 'IPH11P-256-GOLD'),
    ('iPhone 11 Pro', '64GB', 'Gold', 'iPhone 11 Pro Gold 64GB', 7000, 6500, 'IPH11P-64-GOLD'),
    ('iPhone 11 Pro', '64GB', 'Midnight Green', 'iPhone 11 Pro Midnight Green 64GB', 7000, 6500, 'IPH11P-64-GREEN'),
    
    -- iPhone 11 - 64GB: Le5,500 new, Le5,000 used, 128GB: Le6,200 new, Le5,600 used
    ('iPhone 11', '64GB', 'Yellow', 'iPhone 11 Yellow 64GB', 5500, 5000, 'IPH11-64-YELLOW'),
    ('iPhone 11', '128GB', 'Red', 'iPhone 11 Red 128GB', 6200, 5600, 'IPH11-128-RED'),
    ('iPhone 11', '128GB', 'Black', 'iPhone 11 Black 128GB', 6200, 5600, 'IPH11-128-BLACK'),
    ('iPhone 11', '64GB', 'Purple', 'iPhone 11 Purple 64GB', 5500, 5000, 'IPH11-64-PURPLE'),
    ('iPhone 11', '128GB', 'White', 'iPhone 11 White 128GB', 6200, 5600, 'IPH11-128-WHITE'),
    ('iPhone 11', '128GB', 'Green', 'iPhone 11 Green 128GB', 6200, 5600, 'IPH11-128-GREEN'),
    ('iPhone 11', '64GB', 'Green', 'iPhone 11 Green 64GB', 5500, 5000, 'IPH11-64-GREEN'),
    
    -- iPhone XR - 64GB: Le5,200 new, Le4,500 used, 128GB: Le5,800 new, Le5,000 used
    ('iPhone XR', '128GB', 'Black', 'iPhone XR Black 128GB', 5800, 5000, 'IPHXR-128-BLACK'),
    ('iPhone XR', '128GB', 'Blue', 'iPhone XR Blue 128GB', 5800, 5000, 'IPHXR-128-BLUE'),
    ('iPhone XR', '64GB', 'Coral', 'iPhone XR Coral 64GB', 5200, 4500, 'IPHXR-64-CORAL'),
    ('iPhone XR', '64GB', 'Red', 'iPhone XR Red 64GB', 5200, 4500, 'IPHXR-64-RED'),
    ('iPhone XR', '128GB', 'White', 'iPhone XR White 128GB', 5800, 5000, 'IPHXR-128-WHITE'),
    
    -- iPhone XS Max - 256GB: Le6,000 used (no new price in list, estimated at 6,500)
    ('iPhone XS Max', '256GB', NULL, 'iPhone XS Max 256GB', 6500, 6000, 'IPHXSM-256'),
    
    -- iPhone 8 Plus - 256GB: Le5,000 new, Le4,000 used (64GB estimated)
    ('iPhone 8 Plus', '64GB', 'Red', 'iPhone 8 Plus Red 64GB', 4500, 3600, 'IPH8P-64-RED')
  ) AS p(model_name, storage, color, name, new_price, used_price, sku)
  JOIN model_ids m ON m.name = p.model_name
)
INSERT INTO products (id, name, product_model_id, storage, color, price, new_price, used_price, sku, category, stock, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ip.product_name,
  ip.model_id,
  ip.storage,
  ip.color,
  GREATEST(COALESCE(ip.new_price, ip.used_price, 1), 1) as price, -- Use new_price, then used_price, or minimum 1 to satisfy constraint
  ip.new_price,
  ip.used_price,
  ip.sku,
  'Smartphones',
  0, -- Stock will be calculated from inventory_items
  true,
  NOW(),
  NOW()
FROM iphone_products ip
WHERE NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = ip.product_name 
    AND p.deleted_at IS NULL
);

-- Samsung Products
WITH model_ids AS (
  SELECT id, name FROM product_models
),
samsung_products AS (
  SELECT 
    m.id as model_id,
    m.name as model_name,
    p.storage,
    p.color,
    p.name as product_name,
    p.new_price,
    p.used_price,
    p.sku
  FROM (VALUES
    -- Galaxy S25 Ultra
    ('Galaxy S25 Ultra', '256GB', NULL, 'Galaxy S25 Ultra 256GB', 23000, 0, 'S25U-256'),
    ('Galaxy S25 Ultra', '512GB', NULL, 'Galaxy S25 Ultra 512GB', 24000, 0, 'S25U-512'),
    
    -- Galaxy S24 Ultra
    ('Galaxy S24 Ultra', '256GB', NULL, 'Galaxy S24 Ultra 256GB', 18000, 0, 'S24U-256'),
    
    -- Galaxy S23 Ultra
    ('Galaxy S23 Ultra', '256GB', NULL, 'Galaxy S23 Ultra 256GB', 15000, 0, 'S23U-256'),
    
    -- Galaxy S22+ - estimated (not in list, similar to S22 Ultra)
    ('Galaxy S22+', '256GB', NULL, 'Galaxy S22+ 256GB', 12000, 11000, 'S22P-256'),
    
    -- Galaxy S22 - estimated
    ('Galaxy S22', '128GB', NULL, 'Galaxy S22 128GB', 11000, 10000, 'S22-128'),
    
    -- Galaxy S21 Ultra - 256GB: Le9,000 (512GB estimated at 11,000)
    ('Galaxy S21 Ultra', '512GB', 'Silver', 'Galaxy S21 Ultra 512GB Silver', 11000, 10000, 'S21U-512-SILVER'),
    
    -- Galaxy S21+ - estimated
    ('Galaxy S21+', '256GB', 'Purple', 'Galaxy S21+ 256GB Purple', 8500, 7500, 'S21P-256-PURPLE'),
    ('Galaxy S21+', '256GB', 'Phantom Black', 'Galaxy S21+ 256GB Phantom Black', 8500, 7500, 'S21P-256-BLACK'),
    
    -- Galaxy S20+ - 256GB: Le6,000
    ('Galaxy S20+', '256GB', 'Black', 'Galaxy S20+ 256GB Black', 6000, 5500, 'S20P-256-BLACK'),
    ('Galaxy S20+', '256GB', 'Grey', 'Galaxy S20+ 256GB Grey', 6000, 5500, 'S20P-256-GREY'),
    
    -- Galaxy S20 Ultra - estimated
    ('Galaxy S20 Ultra', '256GB', 'Black', 'Galaxy S20 Ultra 256GB Black', 7000, 6500, 'S20U-256-BLACK'),
    
    -- Galaxy S10+ - 128GB: Le5,000
    ('Galaxy S10+', '128GB', 'Blue', 'Galaxy S10+ 128GB Blue', 5000, 4500, 'S10P-128-BLUE'),
    ('Galaxy S10+', '128GB', 'Black', 'Galaxy S10+ 128GB Black', 5000, 4500, 'S10P-128-BLACK'),
    
    -- Galaxy S10 5G - 256GB: Le5,000, 512GB: Le5,200
    ('Galaxy S10 5G', '256GB', 'Black', 'Galaxy S10 5G 256GB Black', 5000, 4500, 'S10-5G-256-BLACK'),
    ('Galaxy S10 5G', '512GB', 'White', 'Galaxy S10 5G 512GB White', 5200, 4800, 'S10-5G-512-WHITE'),
    ('Galaxy S10 5G', '512GB', 'Blue', 'Galaxy S10 5G 512GB Blue', 5200, 4800, 'S10-5G-512-BLUE'),
    
    -- Galaxy S9+ - estimated (not in list, similar to Note 9)
    ('Galaxy S9+', '64GB', 'Black', 'Galaxy S9+ 64GB Black', 4000, 3500, 'S9P-64-BLACK'),
    ('Galaxy S9+', '128GB', 'Purple', 'Galaxy S9+ 128GB Purple', 4200, 3800, 'S9P-128-PURPLE'),
    
    -- Galaxy Note 20 Ultra - 256GB: Le8,000
    ('Galaxy Note 20 Ultra', '256GB', 'Gold', 'Galaxy Note 20 Ultra 256GB Gold', 8000, 7500, 'NOTE20U-256-GOLD'),
    
    -- Galaxy Note 10+ - 256GB: Le6,000 (512GB estimated at 6,500)
    ('Galaxy Note 10+', '256GB', 'Silver', 'Galaxy Note 10+ 256GB Silver', 6000, 5500, 'NOTE10P-256-SILVER'),
    ('Galaxy Note 10+', '512GB', 'Silver', 'Galaxy Note 10+ 512GB Silver', 6500, 6000, 'NOTE10P-512-SILVER'),
    ('Galaxy Note 10+', '256GB', 'White', 'Galaxy Note 10+ 256GB White', 6000, 5500, 'NOTE10P-256-WHITE'),
    
    -- Galaxy Note 9 - 512GB: Le4,300 (128GB estimated at 4,000)
    ('Galaxy Note 9', '128GB', 'Purple', 'Galaxy Note 9 128GB Purple', 4000, 3500, 'NOTE9-128-PURPLE'),
    ('Galaxy Note 9', '128GB', 'Black', 'Galaxy Note 9 128GB Black', 4000, 3500, 'NOTE9-128-BLACK'),
    ('Galaxy Note 9', '128GB', 'Blue', 'Galaxy Note 9 128GB Blue', 4000, 3500, 'NOTE9-128-BLUE'),
    ('Galaxy Note 9', '512GB', 'Black', 'Galaxy Note 9 512GB Black', 4300, 4000, 'NOTE9-512-BLACK'),
    
    -- Galaxy Z Fold 6 - 256GB: Le24,000
    ('Galaxy Z Fold 6', '256GB', NULL, 'Galaxy Z Fold 6 256GB', 24000, 22000, 'ZFOLD6-256'),
    
    -- Galaxy Z Fold 5 - 256GB: Le17,000, 512GB: Le18,000
    ('Galaxy Z Fold 5', '512GB', NULL, 'Galaxy Z Fold 5 512GB', 18000, 17000, 'ZFOLD5-512'),
    
    -- Galaxy Z Flip 5 - 256GB: Le13,000
    ('Galaxy Z Flip 5', '256GB', NULL, 'Galaxy Z Flip 5 256GB', 13000, 12000, 'ZFLIP5-256'),
    
    -- Galaxy Z Flip 4 - 256GB: Le10,000
    ('Galaxy Z Flip 4', '256GB', 'Blue', 'Galaxy Z Flip 4 256GB Blue', 10000, 9500, 'ZFLIP4-256-BLUE'),
    ('Galaxy Z Flip 4', '256GB', 'White', 'Galaxy Z Flip 4 256GB White', 10000, 9500, 'ZFLIP4-256-WHITE')
  ) AS p(model_name, storage, color, name, new_price, used_price, sku)
  JOIN model_ids m ON m.name = p.model_name
)
INSERT INTO products (id, name, product_model_id, storage, color, price, new_price, used_price, sku, category, stock, is_active, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  sp.product_name,
  sp.model_id,
  sp.storage,
  sp.color,
  GREATEST(COALESCE(sp.new_price, sp.used_price, 1), 1) as price, -- Use new_price, then used_price, or minimum 1 to satisfy constraint
  sp.new_price,
  sp.used_price,
  sp.sku,
  'Smartphones',
  0,
  true,
  NOW(),
  NOW()
FROM samsung_products sp
WHERE NOT EXISTS (
  SELECT 1 FROM products p 
  WHERE p.name = sp.product_name 
    AND p.deleted_at IS NULL
);

-- ============================================
-- STEP 3: CREATE INVENTORY ITEMS (All IMEIs, condition='new')
-- ============================================

-- Helper: Get product IDs by matching name, storage, and color
WITH product_lookup AS (
  SELECT id, name, storage, color FROM products
),
-- iPhone Inventory Items
iphone_inventory AS (
  SELECT 
    p.id as product_id,
    i.imei,
    i.condition
  FROM (VALUES
    -- iPhone 16 Plus Pink 512GB
    ('iPhone 16 Plus Pink 512GB', '359049979618919', 'new'),
    ('iPhone 16 Plus Pink 512GB', '351145646426138', 'new'),
    
    -- iPhone 16 Pink 256GB
    ('iPhone 16 Pink 256GB', '356207327838232', 'new'),
    ('iPhone 16 Pink 256GB', '354563838855806', 'new'),
    
    -- iPhone 16 Pro Max Desert Titanium 256GB
    ('iPhone 16 Pro Max Desert Titanium 256GB', NULL, 'new'), -- No IMEI provided
    
    -- iPhone Air 256GB Light Gold
    ('iPhone Air 256GB Light Gold', '351605723235165', 'new'),
    ('iPhone Air 256GB Light Gold', '353621715087801', 'new'),
    
    -- iPhone Air 256GB Sky Blue
    ('iPhone Air 256GB Sky Blue', '351605723318490', 'new'),
    
    -- iPhone 17 Pro Cosmic Orange 256GB
    ('iPhone 17 Pro Cosmic Orange 256GB', '359337793925309', 'new'),
    ('iPhone 17 Pro Cosmic Orange 256GB', '354956971520890', 'new'),
    
    -- iPhone 17 Pro Deep Blue 256GB
    ('iPhone 17 Pro Deep Blue 256GB', '359724859772545', 'new'),
    
    -- iPhone 17 Pro Max Cosmic Orange 256GB
    ('iPhone 17 Pro Max Cosmic Orange 256GB', '357431263340867', 'new'),
    ('iPhone 17 Pro Max Cosmic Orange 256GB', '359335833040254', 'new'),
    ('iPhone 17 Pro Max Cosmic Orange 256GB', '357901756535140', 'new'),
    ('iPhone 17 Pro Max Cosmic Orange 256GB', '354956971520890', 'new'),
    
    -- iPhone 17 Pro Max Deep Blue 256GB
    ('iPhone 17 Pro Max Deep Blue 256GB', '351046975508720', 'new'),
    
    -- iPhone 14 Pro Max Deep Purple 256GB
    ('iPhone 14 Pro Max Deep Purple 256GB', '357414190968141', 'new'),
    ('iPhone 14 Pro Max Deep Purple 256GB', '356200547871133', 'new'),
    
    -- iPhone 15 Pro Max Black Titanium 256GB
    ('iPhone 15 Pro Max Black Titanium 256GB', '358606711750093', 'new'),
    ('iPhone 15 Pro Max Black Titanium 256GB', '351071522184106', 'new'),
    
    -- iPhone 15 Pro Max Natural Titanium 256GB
    ('iPhone 15 Pro Max Natural Titanium 256GB', '358071244465075', 'new'),
    ('iPhone 15 Pro Max Natural Titanium 256GB', '359711533861257', 'new'),
    
    -- iPhone 16 Pro Max Desert Titanium 256GB
    ('iPhone 16 Pro Max Desert Titanium 256GB', '359906323526488', 'new'),
    
    -- Natural Titanium (assuming iPhone 15 Pro Max)
    ('iPhone 15 Pro Max Natural Titanium 256GB', '352641355668547', 'new'),
    
    -- iPhone 15 Pink 128GB
    ('iPhone 15 Pink 128GB', '356630552389177', 'new'),
    
    -- iPhone 15 Green 256GB
    ('iPhone 15 Green 256GB', '351848750038637', 'new'),
    
    -- iPhone 15 Pink 256GB
    ('iPhone 15 Pink 256GB', '358786659657714', 'new'),
    
    -- iPhone 14 Pro Silver 256GB
    ('iPhone 14 Pro Silver 256GB', '352228703181272', 'new'),
    ('iPhone 14 Pro Silver 256GB', '354567624636239', 'new'),
    
    -- Deep Purple (assuming iPhone 14)
    ('iPhone 14 Deep Purple 128GB', '353115820734399', 'new'),
    
    -- iPhone 14 Starlight
    ('iPhone 14 Starlight 128GB', '356071127078880', 'new'),
    
    -- iPhone 12 Pro Max Silver 256GB
    ('iPhone 12 Pro Max Silver 256GB', '354217684621107', 'new'),
    ('iPhone 12 Pro Max Silver 256GB', '358166962298615', 'new'),
    
    -- iPhone 12 Pro Max Pacific Blue 256GB
    ('iPhone 12 Pro Max Pacific Blue 256GB', '356738112092239', 'new'),
    ('iPhone 12 Pro Max Pacific Blue 256GB', '356737113959719', 'new'),
    
    -- iPhone 12 Pro Max Pacific Blue 128GB
    ('iPhone 12 Pro Max Pacific Blue 128GB', '356254258906109', 'new'),
    ('iPhone 12 Pro Max Pacific Blue 128GB', '356734115028627', 'new'),
    
    -- iPhone 12 Pro Max Graphite 128GB
    ('iPhone 12 Pro Max Graphite 128GB', '355949460676231', 'new'),
    
    -- iPhone 13 Pro Max Graphite 256GB
    ('iPhone 13 Pro Max Graphite 256GB', '351246307174775', 'new'),
    
    -- iPhone 13 Pro Max Alpine Green 128GB
    ('iPhone 13 Pro Max Alpine Green 128GB', '354941736546067', 'new'),
    
    -- iPhone 13 Pro Max Silver 256GB
    ('iPhone 13 Pro Max Silver 256GB', '351764711245015', 'new'),
    
    -- iPhone 13 Pro Max Sierra Blue 256GB
    ('iPhone 13 Pro Max Sierra Blue 256GB', '354347181426757', 'new'),
    
    -- iPhone 13 Pro Max Sierra Blue 512GB
    ('iPhone 13 Pro Max Sierra Blue 512GB', '358074292901561', 'new'),
    
    -- iPhone 13 Pro Max Gold 128GB
    ('iPhone 13 Pro Max Gold 128GB', '355475796754922', 'new'),
    
    -- iPhone 13 Starlight 128GB
    ('iPhone 13 Starlight 128GB', '355657923956583', 'new'),
    
    -- iPhone 13 Starlight 256GB
    ('iPhone 13 Starlight 256GB', '354727239319312', 'new'),
    
    -- iPhone 13 Pro Gold 512GB
    ('iPhone 13 Pro Gold 512GB', '354509719668495', 'new'),
    ('iPhone 13 Pro Gold 512GB', '353754680789034', 'new'),
    
    -- iPhone 13 Pro Sierra Blue 256GB
    ('iPhone 13 Pro Sierra Blue 256GB', '352725353966233', 'new'),
    
    -- iPhone 13 Pro Gold 256GB
    ('iPhone 13 Pro Gold 256GB', '353103649313447', 'new'),
    ('iPhone 13 Pro Gold 256GB', '354071159180200', 'new'),
    
    -- iPhone 12 Pro Silver 256GB
    ('iPhone 12 Pro Silver 256GB', '356740916589709', 'new'),
    
    -- iPhone 12 Pro Silver 128GB
    ('iPhone 12 Pro Silver 128GB', '356699114299257', 'new'),
    
    -- iPhone 11 Yellow 128GB
    ('iPhone 11 Yellow 128GB', '355640712497779', 'new'),
    
    -- iPhone 11 Red 128GB
    ('iPhone 11 Red 128GB', '356327105058371', 'new'),
    
    -- iPhone 11 Black 128GB
    ('iPhone 11 Black 128GB', '356600101375324', 'new'),
    
    -- iPhone 11 Purple 64GB
    ('iPhone 11 Purple 64GB', '352974113769210', 'new'),
    
    -- iPhone 11 White 128GB
    ('iPhone 11 White 128GB', '356587103964165', 'new'),
    ('iPhone 11 White 128GB', '356601103615519', 'new'),
    
    -- iPhone 11 Green 128GB
    ('iPhone 11 Green 128GB', '351905374352065', 'new'),
    ('iPhone 11 Green 128GB', '356592102979032', 'new'),
    
    -- iPhone 11 Green 64GB
    ('iPhone 11 Green 64GB', '356330106396220', 'new'),
    
    -- iPhone 12 Purple 128GB
    ('iPhone 12 Purple 128GB', '358015976792396', 'new'),
    
    -- iPhone 12 Pacific Blue 128GB
    ('iPhone 12 Pacific Blue 128GB', '355131533766923', 'new'),
    
    -- iPhone 12 Black 256GB
    ('iPhone 12 Black 256GB', '357035862354300', 'new'),
    
    -- iPhone 12 Purple 64GB
    ('iPhone 12 Purple 64GB', '352235484942640', 'new'),
    
    -- iPhone 12 Red 128GB
    ('iPhone 12 Red 128GB', '351603783312909', 'new'),
    
    -- iPhone 12 Green 128GB
    ('iPhone 12 Green 128GB', '353402713519602', 'new'),
    
    -- iPhone 12 White 64GB
    ('iPhone 12 White 64GB', '353059115761289', 'new'),
    
    -- iPhone 12 Pacific Blue 64GB
    ('iPhone 12 Pacific Blue 64GB', '355305613281090', 'new'),
    
    -- iPhone XR Black 128GB
    ('iPhone XR Black 128GB', '356412103942279', 'new'),
    ('iPhone XR Black 128GB', '356412106624536', 'new'),
    ('iPhone XR Black 128GB', '353060109807070', 'new'),
    
    -- iPhone XR Blue 128GB
    ('iPhone XR Blue 128GB', '358806094070370', 'new'),
    
    -- iPhone XR Coral 64GB
    ('iPhone XR Coral 64GB', '357377094684561', 'new'),
    
    -- iPhone XR Red 64GB
    ('iPhone XR Red 64GB', '357340098921090', 'new'),
    
    -- iPhone XR White 128GB
    ('iPhone XR White 128GB', '356417103908311', 'new'),
    ('iPhone XR White 128GB', '358804094561332', 'new'),
    
    -- iPhone 11 Pro Max Silver 256GB
    ('iPhone 11 Pro Max Silver 256GB', '353891104406280', 'new'),
    
    -- iPhone 11 Pro Max Gold 256GB
    ('iPhone 11 Pro Max Gold 256GB', '353895104961327', 'new'),
    
    -- iPhone 11 Pro Gold 256GB
    ('iPhone 11 Pro Gold 256GB', '353881101680979', 'new'),
    
    -- iPhone 11 Pro Gold 64GB
    ('iPhone 11 Pro Gold 64GB', '353838104244989', 'new'),
    
    -- iPhone 11 Pro Midnight Green 64GB
    ('iPhone 11 Pro Midnight Green 64GB', '353873102022533', 'new'),
    
    -- iPhone XS Max 256GB
    ('iPhone XS Max 256GB', '357272092803208', 'new'),
    
    -- iPhone 8 Plus Red 64GB
    ('iPhone 8 Plus Red 64GB', '356115097961607', 'new')
  ) AS i(product_name, imei, condition)
  JOIN product_lookup p ON p.name = i.product_name
  WHERE i.imei IS NOT NULL -- Only insert items with IMEIs
)
INSERT INTO inventory_items (id, product_id, imei, status, condition, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  ii.product_id,
  ii.imei,
  'in_stock',
  ii.condition,
  NOW(),
  NOW()
FROM iphone_inventory ii
ON CONFLICT (imei) DO NOTHING;

-- Samsung Inventory Items
WITH product_lookup AS (
  SELECT id, name, storage, color FROM products
),
samsung_inventory AS (
  SELECT 
    p.id as product_id,
    i.imei,
    i.condition
  FROM (VALUES
    -- Galaxy S25 Ultra 256GB
    ('Galaxy S25 Ultra 256GB', '358574635322987', 'new'),
    ('Galaxy S25 Ultra 256GB', '355838535550713', 'new'),
    ('Galaxy S25 Ultra 256GB', '355838535859403', 'new'),
    
    -- Galaxy S24 Ultra 256GB
    ('Galaxy S24 Ultra 256GB', '357994254893723', 'new'),
    ('Galaxy S24 Ultra 256GB', '351184066731339', 'new'),
    ('Galaxy S24 Ultra 256GB', '354126950975206', 'new'),
    
    -- Galaxy Z Fold 5 512GB
    ('Galaxy Z Fold 5 512GB', '357150462269210', 'new'),
    ('Galaxy Z Fold 5 512GB', '355026650833623', 'new'),
    
    -- Galaxy Z Fold 6 256GB
    ('Galaxy Z Fold 6 256GB', '356701950306707', 'new'),
    ('Galaxy Z Fold 6 256GB', '351379491221639', 'new'),
    ('Galaxy Z Fold 6 256GB', '359482516812705', 'new'),
    
    -- Galaxy S22+ 256GB
    ('Galaxy S22+ 256GB', '352516404731613', 'new'),
    ('Galaxy S22+ 256GB', '356329204644085', 'new'),
    
    -- Galaxy S23 Ultra 256GB
    ('Galaxy S23 Ultra 256GB', '350105093864711', 'new'),
    ('Galaxy S23 Ultra 256GB', '355752920341291', 'new'),
    
    -- Galaxy S22 128GB
    ('Galaxy S22 128GB', '353409200760722', 'new'),
    ('Galaxy S22 128GB', '356666980505893', 'new'),
    
    -- Galaxy Z Flip 4 256GB Blue
    ('Galaxy Z Flip 4 256GB Blue', '353285386939488', 'new'),
    
    -- Galaxy Z Flip 4 256GB White
    ('Galaxy Z Flip 4 256GB White', '353285381898147', 'new'),
    
    -- Galaxy Z Flip 5 256GB
    ('Galaxy Z Flip 5 256GB', '350929871790602', 'new'),
    
    -- Galaxy S21 Ultra 512GB Silver
    ('Galaxy S21 Ultra 512GB Silver', '353769590229988', 'new'),
    
    -- Galaxy S21+ 256GB Purple
    ('Galaxy S21+ 256GB Purple', '357834991388399', 'new'),
    
    -- Galaxy S21+ 256GB Phantom Black
    ('Galaxy S21+ 256GB Phantom Black', '357830991141442', 'new'),
    
    -- Galaxy S20+ 256GB Black
    ('Galaxy S20+ 256GB Black', '354203114657879', 'new'),
    ('Galaxy S20+ 256GB Black', '354203114464219', 'new'),
    
    -- Galaxy S20+ 256GB Grey
    ('Galaxy S20+ 256GB Grey', '354203116458847', 'new'),
    
    -- Galaxy S20 Ultra 256GB Black
    ('Galaxy S20 Ultra 256GB Black', '352650110768328', 'new'),
    
    -- Galaxy Note 10+ 256GB Silver
    ('Galaxy Note 10+ 256GB Silver', '358779100600326', 'new'),
    
    -- Galaxy Note 10+ 512GB Silver
    ('Galaxy Note 10+ 512GB Silver', '358593108175738', 'new'),
    
    -- Galaxy Note 10+ 256GB White
    ('Galaxy Note 10+ 256GB White', '351591113527280', 'new'),
    
    -- Galaxy Note 20 Ultra 256GB Gold
    ('Galaxy Note 20 Ultra 256GB Gold', '355857112121920', 'new'),
    
    -- Galaxy Note 9 128GB Purple
    ('Galaxy Note 9 128GB Purple', '357586091266954', 'new'),
    
    -- Galaxy Note 9 128GB Black
    ('Galaxy Note 9 128GB Black', '357175095356720', 'new'),
    ('Galaxy Note 9 128GB Black', '357452090644230', 'new'),
    
    -- Galaxy Note 9 128GB Blue
    ('Galaxy Note 9 128GB Blue', '351752100014282', 'new'),
    
    -- Galaxy Note 9 512GB Black
    ('Galaxy Note 9 512GB Black', '357174091081572', 'new'),
    
    -- Galaxy S9+ 64GB Black
    ('Galaxy S9+ 64GB Black', '355418094268773', 'new'),
    
    -- Galaxy S9+ 128GB Purple
    ('Galaxy S9+ 128GB Purple', '358208090757110', 'new'),
    
    -- Galaxy S9+ 64GB Black (duplicate storage/color)
    ('Galaxy S9+ 64GB Black', '354263092482856', 'new'),
    
    -- Galaxy S10+ 128GB Blue
    ('Galaxy S10+ 128GB Blue', '352070100941886', 'new'),
    
    -- Galaxy S10+ 128GB Black
    ('Galaxy S10+ 128GB Black', '352070100465019', 'new'),
    
    -- Galaxy S10 5G 256GB Black
    ('Galaxy S10 5G 256GB Black', '355401102049724', 'new'),
    
    -- Galaxy S10 5G 512GB White
    ('Galaxy S10 5G 512GB White', '355401101144161', 'new'),
    
    -- Galaxy S10 5G 512GB Blue
    ('Galaxy S10 5G 512GB Blue', '355375100156634', 'new')
  ) AS i(product_name, imei, condition)
  JOIN product_lookup p ON p.name = i.product_name
  WHERE i.imei IS NOT NULL
)
INSERT INTO inventory_items (id, product_id, imei, status, condition, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  si.product_id,
  si.imei,
  'in_stock',
  si.condition,
  NOW(),
  NOW()
FROM samsung_inventory si
ON CONFLICT (imei) DO NOTHING;

-- ============================================
-- UPDATE PRODUCT STOCK COUNTS
-- ============================================
-- Update stock counts based on inventory_items
UPDATE products p
SET stock = (
  SELECT COUNT(*)
  FROM inventory_items ii
  WHERE ii.product_id = p.id
    AND ii.status = 'in_stock'
    AND ii.deleted_at IS NULL
)
WHERE p.product_model_id IS NOT NULL; -- Only update IMEI-tracked products

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the data was inserted correctly:

-- Check product models count
-- SELECT COUNT(*) as model_count FROM product_models;

-- Check products count
-- SELECT COUNT(*) as product_count FROM products;

-- Check inventory items count
-- SELECT COUNT(*) as inventory_count FROM inventory_items;

-- Check products with inventory
-- SELECT p.name, p.storage, p.color, p.stock, p.new_price, p.used_price
-- FROM products p
-- WHERE p.product_model_id IS NOT NULL
-- ORDER BY p.name, p.storage, p.color;

-- Check inventory items by product
-- SELECT p.name, COUNT(ii.id) as item_count
-- FROM products p
-- JOIN inventory_items ii ON ii.product_id = p.id
-- WHERE ii.deleted_at IS NULL
-- GROUP BY p.name
-- ORDER BY p.name;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================
-- 1. Open Supabase SQL Editor
-- 2. Copy and paste this entire file
-- 3. Run the script
-- 4. Verify the data using the queries above
--
-- NOTE: This script will:
--   - Create product models (iPhone 16 Plus, Galaxy S25 Ultra, etc.)
--   - Create products (specific variants with storage/color)
--   - Create inventory items (all IMEIs with condition='new')
--   - Update product stock counts automatically
--
-- IDEMPOTENT: This script is safe to run multiple times!
--   - Product models: Checks by name + brand (won't create duplicates)
--   - Products: Checks by name (won't create duplicates)
--   - Inventory items: Uses ON CONFLICT on IMEI (won't create duplicates)
--   - Stock counts are recalculated each time
--
-- If you need to completely reset and re-seed, delete existing data first:
--   DELETE FROM inventory_items;
--   DELETE FROM products WHERE product_model_id IS NOT NULL;
--   DELETE FROM product_models;
--
-- Pricing Notes:
--   - Prices are in Leones (Le)
--   - USD prices have been converted at rate: 1 USD = 24 Leones
--   - new_price: Price for new condition items
--   - used_price: Price for used condition items (0 if not applicable)
--   - All inventory items in this seed are condition='new'

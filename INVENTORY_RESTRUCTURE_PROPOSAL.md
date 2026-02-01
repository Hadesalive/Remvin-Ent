# Inventory Restructure for Electronics (Phones) - Hierarchical Structure

## Structure Overview

**3-Level Hierarchy:**
1. **Product Models** (e.g., "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "iPhone 17 Air")
2. **Products** (Storage + Color combinations, e.g., "iPhone 17 256GB Red", "iPhone 17 512GB Blue")
3. **Inventory Items** (Individual units with IMEI)

**Plus:**
- **Accessories** grouped under Product Models (e.g., iPhone 17 cases, chargers, etc.)

---

## Database Structure

### 1. **Product Models Table** (NEW)
Top-level model/series (e.g., "iPhone 17", "iPhone 17 Pro")

**Fields:**
- `id` - Unique identifier
- `name` - Model name (e.g., "iPhone 17", "iPhone 17 Pro")
- `brand` - Brand name (e.g., "Apple", "Samsung")
- `category` - Category (e.g., "Smartphones")
- `description` - General description
- `image` - Model image
- `isActive` - Active status
- `createdAt`, `updatedAt`

**Example:**
```typescript
{
  id: "model_001",
  name: "iPhone 17",
  brand: "Apple",
  category: "Smartphones",
  description: "Latest iPhone model",
  image: "...",
  isActive: true
}
```

### 2. **Products Table** (ENHANCED)
Specific product variants (Storage + Color combinations)

**New Fields Added:**
- `productModelId` - Reference to Product Model
- `storage` - Storage capacity (e.g., "256GB", "512GB", "1TB")
- `color` - Color variant (e.g., "Red", "Green", "Blue", "Natural Titanium")
- Keep existing: `name`, `price`, `cost`, `sku`, `stock`, `image`

**Product Name Format:**
- Auto-generate: `{Model Name} {Storage} {Color}`
- Example: "iPhone 17 256GB Red"

**Example:**
```typescript
{
  id: "prod_001",
  productModelId: "model_001", // Links to "iPhone 17"
  name: "iPhone 17 256GB Red",
  storage: "256GB",
  color: "Red",
  sku: "IPH17-256-RED",
  price: 899.00,
  cost: 750.00,
  stock: 5, // Calculated from inventory_items
  category: "Smartphones",
  image: "..."
}
```

### 3. **Inventory Items Table** (NEW)
Individual units tracked by IMEI

**Fields:**
- `id` - Unique identifier
- `productId` - Reference to product (e.g., "iPhone 17 256GB Red")
- `imei` - IMEI number (unique, required)
- `status` - `'in_stock'` | `'sold'` | `'returned'` | `'defective'`
- `saleId` - Which sale this was sold in (nullable)
- `customerId` - Which customer bought it (nullable)
- `soldDate` - When sold (nullable)
- `purchaseCost` - Actual cost for this unit
- `warrantyExpiry` - Warranty expiry date (nullable)
- `notes` - Additional notes
- `createdAt`, `updatedAt`

**Example:**
```typescript
{
  id: "item_001",
  productId: "prod_001", // iPhone 17 256GB Red
  imei: "123456789012345",
  status: "in_stock",
  saleId: null,
  customerId: null,
  soldDate: null,
  purchaseCost: 750.00,
  warrantyExpiry: "2025-01-15",
  notes: ""
}
```

### 4. **Accessories** (Optional Enhancement)
Accessories can be linked to Product Models

**Option A: Use existing products table with `productModelId`**
- Set `productModelId` to link accessory to model
- Use `category = "Accessories"` to distinguish

**Option B: Separate accessories table** (if needed later)

---

## Database Schema

### Create `product_models` table:
```sql
CREATE TABLE IF NOT EXISTS product_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  description TEXT,
  image TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_product_models_brand ON product_models(brand);
CREATE INDEX idx_product_models_category ON product_models(category);
```

### Update `products` table:
```sql
ALTER TABLE products ADD COLUMN product_model_id TEXT;
ALTER TABLE products ADD COLUMN storage TEXT;
ALTER TABLE products ADD COLUMN color TEXT;

CREATE INDEX idx_products_model_id ON products(product_model_id);
```

### Create `inventory_items` table:
```sql
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  imei TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_stock' 
    CHECK (status IN ('in_stock', 'sold', 'returned', 'defective')),
  sale_id TEXT,
  customer_id TEXT,
  sold_date DATETIME,
  purchase_cost REAL,
  warranty_expiry DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_inventory_items_product_id ON inventory_items(product_id);
CREATE INDEX idx_inventory_items_imei ON inventory_items(imei);
CREATE INDEX idx_inventory_items_status ON inventory_items(status);
```

### Auto-calculate stock:
- Product `stock` = COUNT of `inventory_items` where `product_id = product.id` AND `status = 'in_stock'`
- Update stock automatically when items are added/sold

---

## UI Structure

### 1. **Product Models Page** (Main View)
- Tree/hierarchical view:
  ```
  📱 iPhone 17
    ├─ iPhone 17 256GB Red (Stock: 5)
    ├─ iPhone 17 256GB Green (Stock: 3)
    ├─ iPhone 17 256GB Blue (Stock: 2)
    ├─ iPhone 17 512GB Red (Stock: 4)
    ├─ iPhone 17 512GB Green (Stock: 1)
    └─ 📦 Accessories
        ├─ iPhone 17 Case - Clear
        ├─ iPhone 17 Charger
        └─ iPhone 17 Screen Protector
  
  📱 iPhone 17 Pro
    ├─ iPhone 17 Pro 256GB Natural Titanium (Stock: 8)
    ├─ iPhone 17 Pro 512GB Blue Titanium (Stock: 6)
    └─ 📦 Accessories
        └─ ...
  ```

### 2. **Product Model Form**
- Name (e.g., "iPhone 17")
- Brand (dropdown: Apple, Samsung, etc.)
- Category
- Description
- Image

### 3. **Product Form** (Enhanced)
- **Select Product Model** (dropdown: iPhone 17, iPhone 17 Pro, etc.)
- **Storage** (dropdown: 64GB, 128GB, 256GB, 512GB, 1TB)
- **Color** (text input or dropdown with common colors)
- **Name** - Auto-generated: "{Model} {Storage} {Color}" (editable)
- **SKU** - Auto-generated or manual
- **Price**, **Cost**
- **Category** - Can be "Smartphones" or "Accessories"
- **Image**

### 4. **Add Inventory Items**
- Select Product (e.g., "iPhone 17 256GB Red")
- Enter IMEI
- Purchase Cost
- Warranty Expiry
- Bulk import: CSV with IMEIs

### 5. **Sales Flow**
1. Select Product Model (e.g., "iPhone 17")
2. System shows all products under that model (256GB Red, 256GB Green, etc.)
3. Select specific product (e.g., "iPhone 17 256GB Red")
4. Select quantity
5. System shows available IMEIs for that product
6. User selects specific IMEIs to sell
7. On sale completion:
   - Update items: `status = 'sold'`, `saleId = <sale_id>`, `customerId = <customer_id>`, `soldDate = NOW()`
   - Product stock auto-updates

---

## Example Workflow

### Creating iPhone 17 Products:

1. **Create Product Model:**
   - Name: "iPhone 17"
   - Brand: "Apple"
   - Category: "Smartphones"

2. **Create Products under iPhone 17:**
   - Product 1: Model="iPhone 17", Storage="256GB", Color="Red" → Name: "iPhone 17 256GB Red"
   - Product 2: Model="iPhone 17", Storage="256GB", Color="Green" → Name: "iPhone 17 256GB Green"
   - Product 3: Model="iPhone 17", Storage="256GB", Color="Blue" → Name: "iPhone 17 256GB Blue"
   - Product 4: Model="iPhone 17", Storage="512GB", Color="Red" → Name: "iPhone 17 512GB Red"
   - Product 5: Model="iPhone 17", Storage="512GB", Color="Green" → Name: "iPhone 17 512GB Green"
   - etc.

3. **Add Inventory Items:**
   - Select Product: "iPhone 17 256GB Red"
   - Add IMEI: "123456789012345"
   - Add IMEI: "123456789012346"
   - Add IMEI: "123456789012347"
   - (Stock automatically becomes 3)

4. **Add Accessories:**
   - Create Product: Model="iPhone 17", Name="iPhone 17 Case - Clear", Category="Accessories"
   - Create Product: Model="iPhone 17", Name="iPhone 17 Charger", Category="Accessories"

---

## Key Features

✅ **Hierarchical Organization**: Models → Products → Items
✅ **Storage & Color Variants**: Easy to create all combinations
✅ **IMEI Tracking**: Track each device individually
✅ **Auto Stock Calculation**: Stock = count of in_stock items
✅ **Accessories Grouping**: Accessories linked to models
✅ **Sales Integration**: Select specific IMEIs when selling
✅ **Warranty Tracking**: Track warranty per device

---

## Implementation Steps

1. **Database Migration**
   - Create `product_models` table
   - Add `product_model_id`, `storage`, `color` to `products` table
   - Create `inventory_items` table
   - Migrate existing products (extract model/storage/color from name if possible)

2. **Backend Services**
   - Product Model service
   - Update product service to handle model linking
   - Inventory item service
   - Update stock calculation logic
   - Update sales service to handle IMEI selection

3. **UI Updates**
   - Create product models page (tree view)
   - Enhance product form (model selection, storage, color)
   - Create inventory items page
   - Update sales flow to select IMEIs
   - Add IMEI lookup/search

4. **Testing**
   - Test model creation
   - Test product creation with variants
   - Test IMEI tracking
   - Test sales with IMEI selection
   - Test stock auto-calculation

---

## Benefits

- **Clear Organization**: Models group related products
- **Easy Variant Creation**: Storage + Color combinations
- **Accessories Management**: Group accessories by model
- **IMEI Tracking**: Track each device individually
- **Scalable**: Easy to add new models and variants

---

## Ready to Implement?

This structure provides clear organization with Models → Products → Items hierarchy, plus accessories support. Should I proceed with implementation?

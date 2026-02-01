# Returns & Accessories System Analysis

## 1. Returns Page Analysis

### Current State
The returns system currently:
- ✅ Handles basic return creation and approval
- ✅ Restores stock count for returned products
- ✅ Supports multiple refund methods (cash, store credit, original payment, exchange)
- ✅ Links returns to sales
- ❌ **Does NOT handle IMEI-tracked products properly**
- ❌ **Does NOT restore specific inventory items when returning IMEI-tracked products**
- ❌ **Does NOT display IMEI information in return details**
- ❌ **Does NOT allow selecting specific IMEIs to return**

### Issues Identified

#### Issue 1: IMEI-Tracked Product Returns
**Problem:** When returning an IMEI-tracked product (e.g., iPhone), the system:
- Only restores the product's stock count
- Does NOT restore the specific `inventory_items` status from 'sold' to 'in_stock'
- Does NOT track which specific IMEI was returned
- Loses IMEI tracking history

**Impact:**
- Inventory items remain marked as 'sold' even though they're returned
- Cannot track return history per IMEI
- Stock count may be incorrect
- Cannot verify if the correct IMEI was returned

#### Issue 2: Return Items Missing IMEI Data
**Problem:** `ReturnItem` interface doesn't include IMEI information:
```typescript
export interface ReturnItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason: string;
  condition: 'unopened' | 'opened' | 'defective' | 'damaged';
  // ❌ Missing: imeis?: string[];
}
```

#### Issue 3: Return Handler Logic
**Problem:** `return-handlers.js` only updates product stock, not inventory items:
```javascript
// Current code (line 201-215)
await databaseService.updateProduct(item.productId, {
  stock: newStock  // Only updates stock count
});
// ❌ Missing: Update inventory_items status
```

### Required Changes

1. **Update `ReturnItem` interface** to include `imeis?: string[]`
2. **Update return handlers** to restore inventory items when returning IMEI-tracked products
3. **Update return UI** to:
   - Show IMEI information when returning IMEI-tracked products
   - Allow selecting specific IMEIs to return (from the original sale)
   - Display IMEI and condition in return details
4. **Update return creation flow** to:
   - Fetch IMEIs from the original sale
   - Allow user to select which IMEIs to return
   - Update inventory item status to 'returned' or 'in_stock'

---

## 2. Accessory Management System Design

### Industry Standard Approaches

Based on research, industry-standard inventory systems use:

1. **Product Model-Level Linking** (Most Common)
   - Accessories linked to `product_models` (e.g., "iPhone 17")
   - All variants of that model share the same accessories
   - Example: All iPhone 17 variants (256GB Red, 512GB Blue, etc.) share iPhone 17 accessories

2. **Many-to-Many Relationship**
   - Junction table linking products/models to accessories
   - Supports optional vs mandatory accessories
   - Supports quantity per accessory

3. **Bundles/Kits**
   - Pre-defined product bundles
   - Can include main product + accessories
   - Sold as a single unit

### Recommended Approach for Remvin Enterprise

**Option 1: Product Model-Level (RECOMMENDED)**
- Link accessories to `product_models`
- Simpler to manage
- Matches your use case: "all accessories for iPhone 17"
- Accessories appear for all variants of that model

**Option 2: Product-Level**
- Link accessories to individual products
- More granular control
- More complex to manage
- Doesn't match your use case

**Option 3: Hybrid**
- Link to models by default
- Allow product-level overrides
- Most flexible but most complex

### Database Schema Design

```sql
-- Option 1: Product Model-Level (Recommended)
CREATE TABLE IF NOT EXISTS product_accessories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_model_id TEXT NOT NULL,
  accessory_product_id TEXT NOT NULL,
  is_mandatory INTEGER DEFAULT 0, -- 0 = optional, 1 = mandatory
  default_quantity INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_model_id) REFERENCES product_models(id) ON DELETE CASCADE,
  FOREIGN KEY (accessory_product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE(product_model_id, accessory_product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_accessories_model ON product_accessories(product_model_id);
CREATE INDEX IF NOT EXISTS idx_product_accessories_product ON product_accessories(accessory_product_id);
```

### Features to Implement

1. **Accessory Management UI**
   - Add/remove accessories for a product model
   - Set mandatory vs optional
   - Set default quantity
   - Reorder accessories

2. **Sales Integration**
   - Show suggested accessories when selecting a product
   - Auto-add mandatory accessories
   - Allow adding optional accessories
   - Show accessories grouped by product model

3. **Product Model Page**
   - Display linked accessories
   - Manage accessories from model detail page

4. **Product Detail Page**
   - Show accessories for this product's model
   - Quick add accessories to sale

### Implementation Priority

**Phase 1: Core Functionality**
1. Create `product_accessories` table
2. Add CRUD operations for accessories
3. Display accessories on product model page

**Phase 2: Sales Integration**
4. Show accessories in sales page
5. Auto-add mandatory accessories
6. Allow adding optional accessories

**Phase 3: Advanced Features**
7. Accessory bundles/kits
8. Accessory pricing rules
9. Accessory analytics

---

## 3. Implementation Plan

### Returns System Updates

#### Step 1: Update Type Definitions
- Add `imeis?: string[]` to `ReturnItem` interface
- Update `Return` interface if needed

#### Step 2: Update Return Handlers
- Modify `create-return` handler to restore inventory items
- Modify `update-return` handler to handle IMEI-tracked products
- Modify `delete-return` handler to reverse inventory item changes

#### Step 3: Update Return UI
- Update `ReturnNewPage.tsx` to show IMEI selection
- Update `ReturnDetailPage.tsx` to display IMEI information
- Add IMEI selection modal (similar to sales)

#### Step 4: Update Database Service
- Add method to get inventory items by sale ID
- Add method to restore inventory items from return

### Accessory System Implementation

#### Step 1: Database Schema
- Create `product_accessories` table
- Add migration script
- Create indexes

#### Step 2: Backend Services
- Add CRUD operations in `database-service.js`
- Add IPC handlers in `product-handlers.js`
- Update `preload.js` and TypeScript definitions

#### Step 3: Frontend Services
- Create `accessory.service.ts`
- Add to service index

#### Step 4: UI Components
- Add accessory management to `ProductModelsPage.tsx`
- Create accessory selection component for sales
- Update product model detail page

---

## 4. Code Examples

### Returns Handler Update (IMEI Support)

```javascript
// In return-handlers.js
if (items && Array.isArray(items)) {
  for (const item of items) {
    const product = await databaseService.getProductById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    
    // Check if product is IMEI-tracked
    if (product.productModelId && item.imeis && item.imeis.length > 0) {
      // Restore specific inventory items by IMEI
      for (const imei of item.imeis) {
        const inventoryItem = await databaseService.getInventoryItemByImei(imei);
        if (inventoryItem && inventoryItem.status === 'sold') {
          await databaseService.updateInventoryItem(inventoryItem.id, {
            status: 'returned', // or 'in_stock' based on condition
            saleId: null,
            customerId: null,
            soldDate: null
          });
        }
      }
      // Stock will be auto-calculated by updateInventoryItem
    } else {
      // Regular product: restore stock count
      const currentStock = product.stock || 0;
      const quantityReturned = item.quantity || 0;
      const newStock = currentStock + quantityReturned;
      
      await databaseService.updateProduct(item.productId, {
        stock: newStock
      });
    }
  }
}
```

### Accessory Service Example

```typescript
// In accessory.service.ts
export const accessoryService = {
  async getAccessoriesForModel(modelId: string) {
    return await electronAPI.getAccessoriesForModel(modelId);
  },
  
  async addAccessoryToModel(modelId: string, accessoryProductId: string, options: {
    isMandatory?: boolean;
    defaultQuantity?: number;
  }) {
    return await electronAPI.addAccessoryToModel(modelId, accessoryProductId, options);
  },
  
  async removeAccessoryFromModel(modelId: string, accessoryProductId: string) {
    return await electronAPI.removeAccessoryFromModel(modelId, accessoryProductId);
  }
};
```

---

## 5. Testing Checklist

### Returns System
- [ ] Return IMEI-tracked product restores inventory item
- [ ] Return regular product restores stock count
- [ ] IMEI information displayed in return details
- [ ] Can select specific IMEIs to return
- [ ] Return deletion reverses inventory item changes
- [ ] Stock calculation correct after return

### Accessory System
- [ ] Can add accessories to product model
- [ ] Can remove accessories from product model
- [ ] Accessories displayed on product model page
- [ ] Accessories suggested in sales page
- [ ] Mandatory accessories auto-added
- [ ] Optional accessories can be added
- [ ] Accessories work with IMEI-tracked products

---

## 6. Next Steps

1. **Immediate:** Fix returns system to handle IMEI-tracked products
2. **Short-term:** Implement basic accessory management (model-level)
3. **Medium-term:** Add sales integration for accessories
4. **Long-term:** Add advanced features (bundles, pricing rules)

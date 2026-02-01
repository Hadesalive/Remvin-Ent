# Mobile App Sync Implementation Guide

## Overview
This document outlines the changes made to align the mobile app with the desktop Electron system, making it a true companion device with full IMEI tracking, inventory management, and swap functionality.

## Changes Implemented

### 1. Environment Configuration
**Files Modified:**
- `src/lib/supabase.ts` - Now uses environment variables
- `app.json` - Added `extra` config for Supabase credentials
- `.env` (create this file) - Store your Supabase URL and anon key

**Setup Instructions:**
```bash
# Create .env file in mobile copy root
EXPO_PUBLIC_SUPABASE_URL=https://vmlouzwnwpdjygvwvben.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### 2. UUID-Based IDs
**Changes:**
- Removed custom ID generation (`prod-*`, `cust-*`)
- Now using Supabase-generated UUIDs
- Compatible with desktop sync system

**Files Modified:**
- `src/services/database.service.ts` - Updated create methods

### 3. New Type Definitions
**Files Modified:**
- `src/types/index.ts`

**New Types Added:**
- `ProductModel` - Device models (iPhone 13, Samsung S21, etc.)
- `InventoryItem` - IMEI-tracked inventory items
- `Swap` - Device trade-in/swap transactions

**Updated Types:**
- `Product` - Added `productModelId`, `storage`, `color`, `image`

### 4. New Services Created

#### Product Model Service
**File:** `src/services/product-model.service.ts`
- CRUD operations for product models
- Matches desktop schema (brand, category, isActive)

#### Inventory Item Service
**File:** `src/services/inventory-item.service.ts`
- Manage IMEI-tracked items
- Status tracking (in_stock, sold, returned, defective)
- Condition tracking (new, refurbished, used)
- Auto-validates IMEI uniqueness
- Links to products, customers, and sales

#### Swap Service
**File:** `src/services/swap.service.ts`
- Create and manage device swaps
- Tracks purchased device and trade-in device
- Calculates difference paid
- Matches desktop field contract

### 5. Responsive Utilities
**File:** `src/lib/responsive.ts`
- Breakpoint detection (phone, tablet, large tablet)
- Helper functions for responsive layouts
- Master-detail layout detection
- Grid column calculations

## Desktop Alignment

### Data Flow
```
Mobile App → Supabase (direct) ← Desktop (via sync-service)
```

### Key Alignments:

#### 1. IMEI Tracking
- Products with `product_model_id` are IMEI-tracked
- Stock is auto-calculated from `inventory_items` count
- Manual stock edits blocked for IMEI-tracked products

#### 2. Field Mapping
All snake_case database fields properly mapped to camelCase:
- `product_model_id` ↔ `productModelId`
- `min_stock` ↔ `minStock`
- `is_active` ↔ `isActive`
- `trade_in_imei` ↔ `tradeInImei`
- etc.

#### 3. Swap Transaction Fields
Mobile swap records match desktop contract:
- `swap_number` - Auto-generated
- `purchased_product_id/name/price`
- `trade_in_product_id/name/imei/condition/value`
- `difference_paid`
- `payment_method`
- `inventory_item_id` - Links to trade-in item

## Next Steps (UI Implementation)

### Screens to Create:

#### 1. Inventory Items Screens
- **InventoryItemsListScreen** - List/search IMEI items
- **InventoryItemDetailScreen** - View/edit item details
- **NewInventoryItemScreen** - Add new IMEI item

#### 2. Swaps Screens
- **SwapsListScreen** - View all swaps
- **SwapDetailScreen** - View swap details
- **NewSwapScreen** - Create new swap (stepper flow)

#### 3. Product Form Updates
- Add product model selector
- Add storage/color fields
- Show IMEI tracking indicator
- Block manual stock for IMEI products
- Link to "Manage Items" for IMEI products

### Navigation Updates
Add to `App.tsx`:
```typescript
<Stack.Screen name="InventoryItems" component={InventoryItemsListScreen} />
<Stack.Screen name="InventoryItemDetail" component={InventoryItemDetailScreen} />
<Stack.Screen name="NewInventoryItem" component={NewInventoryItemScreen} />
<Stack.Screen name="Swaps" component={SwapsListScreen} />
<Stack.Screen name="SwapDetail" component={SwapDetailScreen} />
<Stack.Screen name="NewSwap" component={NewSwapScreen} />
```

Add to bottom tabs (More screen):
- Inventory Items
- Swaps

### Responsive Enhancements
Use `useResponsive()` hook in screens:
```typescript
const { isTablet, isLargeTablet, width } = useResponsive();

// Adjust layouts
<View style={{ 
  flexDirection: isTablet ? 'row' : 'column',
  padding: getResponsivePadding(width)
}}>
```

## Testing Checklist

### Basic Functionality
- [ ] Create product with product model
- [ ] Add inventory item with IMEI
- [ ] Verify stock auto-updates
- [ ] Create swap transaction
- [ ] Search by IMEI
- [ ] Filter by status/condition

### Sync Testing
- [ ] Create product on mobile → appears on desktop
- [ ] Create inventory item on mobile → desktop sees it
- [ ] Create swap on mobile → desktop syncs correctly
- [ ] Desktop changes → mobile sees updates

### Responsive Testing
- [ ] Test on phone (< 768px)
- [ ] Test on tablet (768-1024px)
- [ ] Test on large tablet (> 1024px)
- [ ] Verify master-detail layouts work
- [ ] Check grid layouts adapt

## Database Schema Reference

### Products Table
```sql
- id (uuid, PK)
- name (text)
- description (text)
- price (numeric)
- cost (numeric)
- stock (integer)
- min_stock (integer)
- sku (text)
- category (text)
- image (text)
- product_model_id (uuid, FK → product_models)
- storage (text) -- e.g., "128GB"
- color (text) -- e.g., "Black"
- is_active (integer/boolean)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp)
```

### Product Models Table
```sql
- id (uuid, PK)
- name (text) -- e.g., "iPhone 13"
- brand (text) -- e.g., "Apple"
- description (text)
- category (text)
- is_active (integer/boolean)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp)
```

### Inventory Items Table
```sql
- id (uuid, PK)
- product_id (uuid, FK → products)
- imei (text, UNIQUE)
- status (text) -- in_stock, sold, returned, defective
- condition (text) -- new, refurbished, used
- purchase_cost (numeric)
- customer_id (uuid, FK → customers)
- sale_id (uuid, FK → sales)
- sold_date (timestamp)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp)
```

### Swaps Table
```sql
- id (uuid, PK)
- swap_number (text, UNIQUE)
- customer_id (uuid, FK → customers)
- customer_name (text)
- customer_phone (text)
- customer_email (text)
- customer_address (text)
- sale_id (uuid, FK → sales)
- purchased_product_id (uuid, FK → products)
- purchased_product_name (text)
- purchased_product_price (numeric)
- trade_in_product_id (uuid, FK → products)
- trade_in_product_name (text)
- trade_in_imei (text)
- trade_in_condition (text)
- trade_in_notes (text)
- trade_in_value (numeric)
- difference_paid (numeric)
- payment_method (text)
- status (text) -- pending, completed, cancelled
- inventory_item_id (uuid, FK → inventory_items)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
- deleted_at (timestamp)
```

## Best Practices

### 1. Always Use Services
Don't query Supabase directly in components. Use the service layer:
```typescript
// ✅ Good
const { data, error } = await InventoryItemService.getInventoryItems();

// ❌ Bad
const { data } = await supabase.from('inventory_items').select('*');
```

### 2. Handle Errors Gracefully
```typescript
const { data, error } = await service.method();
if (error) {
  Alert.alert('Error', error.message || 'Something went wrong');
  return;
}
```

### 3. Use Responsive Hooks
```typescript
const { isTablet, width } = useResponsive();
const columns = getGridColumns(width, 300);
```

### 4. Validate IMEI Before Creating
```typescript
// Check if IMEI exists
const existing = await InventoryItemService.getInventoryItemByImei(imei);
if (existing.data) {
  Alert.alert('Error', 'IMEI already exists');
  return;
}
```

### 5. Respect IMEI Tracking Rules
```typescript
// For IMEI-tracked products
if (product.productModelId) {
  // Don't allow manual stock edits
  // Show "Manage Items" button instead
  // Stock = count of in_stock inventory items
}
```

## Troubleshooting

### Issue: "Missing Supabase configuration"
**Solution:** Create `.env` file with proper credentials

### Issue: Products not syncing
**Solution:** Check desktop sync-service is running and pulling from Supabase

### Issue: IMEI already exists error
**Solution:** Check `inventory_items` table for duplicate IMEI

### Issue: Stock not updating
**Solution:** For IMEI products, stock is auto-calculated. Don't manually update.

## Additional Resources

- Desktop sync engine: `electron/services/sync-service.js`
- Desktop database schema: `electron/services/database-service.js`
- Sync analysis: `SYNC_ENGINE_ANALYSIS.md`
- Desktop inventory page: `src/pages/InventoryPage.tsx`
- Desktop swaps page: `src/pages/SwapsPage.tsx`

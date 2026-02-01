# Product Architecture Alignment - Mobile with Desktop

## Overview
This document outlines the alignment of mobile product functionality with the desktop architecture, focusing on IMEI tracking, product models, and stock management.

## Key Architecture Changes

### 1. Stock Calculation (✅ IMPLEMENTED)

**Desktop Behavior:**
- Products with `productModelId` (IMEI-tracked) calculate stock from `inventory_items` table
- Stock = COUNT of `inventory_items` where `product_id = product.id` AND `status = 'in_stock'`
- Products without `productModelId` use manual stock management

**Mobile Implementation:**
- `DatabaseService.getProducts()` now calculates stock for IMEI-tracked products using `InventoryItemService.getInStockCount()`
- For products with `productModelId`, stock is dynamically calculated from inventory_items
- For products without `productModelId`, stock uses the stored value from database

**Code Location:**
- `mobile copy/src/services/database.service.ts` - `getProducts()` method

### 2. Product Deletion (✅ IMPLEMENTED)

**Desktop Behavior:**
- When deleting a product with `productModelId`, all associated `inventory_items` should be handled
- `forceDelete` option allows deleting all inventory items along with the product

**Mobile Implementation:**
- `DatabaseService.deleteProduct()` now checks if product has `productModelId`
- If `forceDelete` is true, soft-deletes all associated inventory items
- Warns if inventory items exist without forceDelete

**Code Location:**
- `mobile copy/src/services/database.service.ts` - `deleteProduct()` method

### 3. Product Model Integration (🔄 TODO)

**Desktop Behavior:**
- Products are organized hierarchically by `ProductModel`
- Filters include model selection
- Products display model name, brand, storage, color variants

**Mobile Implementation Status:**
- `ProductModelService` exists and works with Supabase ✅
- ProductListScreen needs model filtering integration
- NewProductScreen needs model selection UI

**Next Steps:**
- Add model filter dropdown to ProductListScreen
- Load and display product models in product creation form
- Show model hierarchy in product list (optional, for better UX)

### 4. Product Form Fields (🔄 TODO)

**Desktop Behavior:**
- Product form supports `productModelId`, `storage`, `color` fields
- Auto-generates product name from model + storage + color
- Disables manual stock input when `productModelId` is selected (IMEI tracking)

**Mobile Implementation Status:**
- `NewProductScreen` currently doesn't support `productModelId`, `storage`, `color`
- Product creation/update in `DatabaseService` already supports these fields ✅

**Next Steps:**
- Update `NewProductScreen` to include model selection
- Add storage and color input fields
- Auto-generate product name when model is selected
- Disable manual stock input for IMEI-tracked products

### 5. IMEI Tracking Indicators (🔄 TODO)

**Desktop Behavior:**
- Products with IMEI tracking show "IMEI Tracking" badge
- Stock shows "Auto-calculated" for IMEI products
- Different actions: "Manage Items" vs "Adjust Stock"

**Mobile Implementation Status:**
- ProductListScreen shows stock but doesn't indicate IMEI vs manual
- No visual distinction between IMEI-tracked and manual stock products

**Next Steps:**
- Add IMEI tracking indicator badge in product list
- Show "Auto-calculated" vs manual stock indicator
- Different navigation/actions for IMEI vs manual products

## Data Flow

### Product Fetching Flow

```
1. DatabaseService.getProducts()
   └─> Fetch all products from Supabase
   └─> For each product:
       ├─ If productModelId exists:
       │   └─> InventoryItemService.getInStockCount(productId)
       │       └─> COUNT inventory_items WHERE product_id = X AND status = 'in_stock'
       │   └─> Use calculated stock
       └─ If no productModelId:
           └─> Use stored stock value from database
```

### Product Creation Flow (Current)

```
1. NewProductScreen submits form
   └─> DatabaseService.createProduct(productData)
       └─> Insert into Supabase products table
           └─> Returns created product with stock (0 for IMEI, manual value for others)
```

### Product Creation Flow (Target - IMEI Products)

```
1. User selects ProductModel
2. User enters Storage + Color
3. System auto-generates product name
4. User cannot edit stock (disabled field)
5. Product created with productModelId, storage, color
6. Stock remains 0 (calculated from inventory_items when items are added)
```

### Product Deletion Flow

```
1. DatabaseService.deleteProduct(id, options)
   └─> Check if product has productModelId
       ├─ If yes:
       │   └─> Check for inventory_items
       │       ├─ If forceDelete = true:
       │       │   └─> Soft delete all inventory_items
       │       └─ If forceDelete = false:
       │           └─> Log warning (but allow deletion)
       └─ Soft delete product
```

## Database Schema Alignment

### Products Table Fields
- ✅ `product_model_id` (nullable) - Links to product_models
- ✅ `storage` (nullable) - Storage capacity (e.g., "256GB")
- ✅ `color` (nullable) - Color variant (e.g., "Red")
- ✅ `stock` - Manual stock (0 for IMEI-tracked, actual value for manual)

### Product Models Table
- ✅ Fully implemented via `ProductModelService`
- ✅ CRUD operations with Supabase

### Inventory Items Table
- ✅ Fully implemented via `InventoryItemService`
- ✅ IMEI tracking with status management
- ✅ Links to products via `product_id`

## Testing Checklist

### Stock Calculation
- [ ] Products with productModelId show correct stock from inventory_items
- [ ] Products without productModelId show stored stock value
- [ ] Stock updates correctly when inventory items change status
- [ ] Stock calculation handles errors gracefully

### Product Deletion
- [ ] Deleting IMEI-tracked product with forceDelete removes inventory items
- [ ] Deleting IMEI-tracked product without forceDelete shows warning
- [ ] Deleting regular product works as before

### Product Models
- [ ] Can filter products by model
- [ ] Can create product with model selection
- [ ] Model changes reflect in product list

### Product Form
- [ ] Model selection works
- [ ] Storage and color fields work
- [ ] Product name auto-generates from model + storage + color
- [ ] Stock input disabled for IMEI-tracked products

## Remaining Work

1. **ProductListScreen Enhancements**
   - Add product model filter
   - Show IMEI tracking indicators
   - Display model hierarchy/grouping (optional)

2. **NewProductScreen Updates**
   - Add ProductModel selection dropdown
   - Add Storage and Color input fields
   - Auto-generate product name
   - Conditionally disable stock input for IMEI products

3. **UI/UX Improvements**
   - IMEI tracking badges/indicators
   - Stock calculation status indicators
   - Better visual distinction between IMEI and manual products

## Notes

- Mobile uses Supabase directly (no IPC layer)
- UUIDs are generated by Supabase (no custom ID generation)
- Stock calculation happens on-demand (not cached)
- Product deletion uses soft deletes (deleted_at timestamp)

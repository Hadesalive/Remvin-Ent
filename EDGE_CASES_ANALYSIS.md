# Edge Cases Analysis - Product & Inventory System

## Executive Summary

This document identifies critical edge cases, potential bugs, and data integrity issues in the product and inventory management system. Each edge case includes severity, impact, and recommended fixes.

---

## 1. Product Form Edge Cases

### 1.1 Model Selection Without Storage/Color Options
**Severity:** Medium  
**Issue:** User selects a product model, but the model has no `storageOptions` or `colors` defined.

**Current Behavior:**
- Form shows storage/color dropdowns as required
- User cannot proceed without selecting storage/color
- But if model has empty arrays, dropdowns are empty

**Impact:**
- User cannot create product even though model is selected
- No clear error message explaining why

**Recommendation:**
```typescript
// Add validation in product-form.tsx
if (formData.productModelId && selectedModel) {
  if (!selectedModel.storageOptions || selectedModel.storageOptions.length === 0) {
    newErrors.productModelId = 'Selected model has no storage options defined';
  }
  if (!selectedModel.colors || selectedModel.colors.length === 0) {
    newErrors.productModelId = 'Selected model has no color options defined';
  }
}
```

### 1.2 Model Deleted While Form is Open
**Severity:** High  
**Issue:** User opens product form, selects a model, then another user/admin deletes that model.

**Current Behavior:**
- Form still shows selected model
- On save, `productModelId` references non-existent model
- Foreign key constraint may fail or create orphaned reference

**Impact:**
- Data integrity violation
- Product created with invalid `productModelId`

**Recommendation:**
- Validate model exists before save
- Show warning if model becomes inactive/deleted
- Refresh model list periodically or on focus

### 1.3 Storage/Color Options Removed After Product Creation
**Severity:** Medium  
**Issue:** Product created with "256GB" storage, then model's `storageOptions` array is updated to remove "256GB".

**Current Behavior:**
- Product still has `storage: "256GB"` but model no longer lists it
- Editing product shows invalid storage option
- No validation that storage/color matches model's current options

**Impact:**
- Data inconsistency
- Confusion when editing products

**Recommendation:**
- When editing, allow storage/color even if not in current model options (historical data)
- Show warning: "This option is no longer available for this model"
- Or migrate products when model options change

### 1.4 Auto-Generated Name Conflicts
**Severity:** Low  
**Issue:** Two products with same model + storage + color combination.

**Current Behavior:**
- Auto-generates: "iPhone 17 256GB Red"
- No uniqueness check on product name
- Can create duplicate product names

**Impact:**
- Confusion identifying products
- Potential data integrity issues

**Recommendation:**
- Add uniqueness validation or allow duplicates (if intentional)
- Consider adding SKU auto-generation based on model+storage+color

### 1.5 Price/Cost Validation Edge Cases
**Severity:** Medium  
**Issue:** 
- Price = 0 (currently blocked, but what about free products?)
- Cost > Price (negative margin)
- Cost = undefined vs cost = 0 (different meanings)

**Current Behavior:**
- `price <= 0` is blocked
- No validation for cost > price
- `cost: undefined` vs `cost: 0` treated differently

**Impact:**
- Cannot create free products
- Can create products with negative margins
- Inconsistent cost handling

**Recommendation:**
```typescript
// Allow price = 0 for free products
if (formData.price < 0) { // Changed from <= 0
  newErrors.price = 'Price cannot be negative';
}

// Warn about negative margins
if (formData.cost !== undefined && formData.cost > formData.price) {
  newErrors.cost = 'Cost is higher than price. This will result in a loss.';
}
```

### 1.6 Stock vs Inventory Items Mismatch
**Severity:** High  
**Issue:** Product has `stock: 5` but only 3 inventory items with IMEI exist.

**Current Behavior:**
- No validation that stock count matches inventory items
- Can manually set stock to any number
- No automatic sync between stock and inventory items

**Impact:**
- Data inconsistency
- Inventory tracking confusion
- Potential overselling

**Recommendation:**
- For products with `productModelId`, calculate stock from inventory items
- Or add validation: `stock <= inventoryItems.length`
- Show warning when mismatch detected

---

## 2. Product Model Edge Cases

### 2.1 Model Deletion with Existing Products
**Severity:** Critical  
**Issue:** Delete a product model that has products referencing it.

**Current Behavior:**
- Need to check if `deleteProductModel` prevents deletion when products exist
- If allowed, creates orphaned products with invalid `productModelId`

**Impact:**
- Data integrity violation
- Products become unusable
- Foreign key constraint violations

**Recommendation:**
```javascript
// In deleteProductModel
async deleteProductModel(id) {
  // Check if products reference this model
  const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE product_model_id = ?').get(id);
  if (products.count > 0) {
    throw new Error(`Cannot delete model: ${products.count} product(s) still reference it`);
  }
  // Proceed with deletion
}
```

### 2.2 Model Colors/Storage Options JSON Parsing
**Severity:** Medium  
**Issue:** `colors` and `storageOptions` stored as JSON strings, parsing can fail.

**Current Behavior:**
- Database stores as TEXT (JSON string)
- Frontend parses with `JSON.parse()`
- If invalid JSON, parsing fails

**Impact:**
- Application crash
- Data loss

**Recommendation:**
```javascript
// Safe parsing
try {
  const colors = model.colors ? JSON.parse(model.colors) : [];
  if (!Array.isArray(colors)) colors = [];
} catch (e) {
  console.error('Invalid colors JSON:', e);
  colors = [];
}
```

### 2.3 Empty Arrays vs Null vs Undefined
**Severity:** Low  
**Issue:** Model has `colors: []` vs `colors: null` vs `colors: undefined`.

**Current Behavior:**
- Inconsistent handling
- May cause UI issues

**Impact:**
- UI bugs
- Confusion

**Recommendation:**
- Normalize to empty array `[]` in database
- Use `model.colors || []` in frontend

---

## 3. Inventory Items Edge Cases

### 3.1 Duplicate IMEI Prevention
**Severity:** Critical  
**Issue:** IMEI must be unique globally, but validation may not catch all cases.

**Current Behavior:**
- Database has `UNIQUE` constraint on `imei`
- Frontend validation checks length (15+ digits)
- No format validation (should be 15 or 17 digits)

**Impact:**
- Database constraint violation on save
- Poor user experience (error after form submission)

**Recommendation:**
```typescript
// Validate IMEI format
const validateIMEI = (imei: string): boolean => {
  // Remove spaces/dashes
  const cleaned = imei.replace(/[\s-]/g, '');
  // Should be 15 or 17 digits
  return /^\d{15}$|^\d{17}$/.test(cleaned);
};

// Check for duplicates before save
const existingItem = await inventoryItemService.getInventoryItemByImei(imei);
if (existingItem.success && existingItem.data) {
  newErrors.imei = 'This IMEI is already registered';
}
```

### 3.2 IMEI Case Sensitivity
**Severity:** Low  
**Issue:** IMEI stored as-is, but should be normalized (uppercase, no spaces).

**Current Behavior:**
- IMEI stored exactly as entered
- "123456789012345" vs "123456789012346" (typo) both valid

**Impact:**
- Potential duplicates with different formatting
- Harder to search

**Recommendation:**
- Normalize IMEI: remove spaces, convert to uppercase
- Store normalized version

### 3.3 Product Deletion with Inventory Items
**Severity:** Critical  
**Issue:** Delete a product that has inventory items with IMEI.

**Current Behavior:**
- Need to check if `deleteProduct` handles this
- Foreign key constraint may prevent deletion
- Or orphaned inventory items

**Impact:**
- Data integrity issues
- Lost inventory tracking

**Recommendation:**
```javascript
// Option 1: Prevent deletion
async deleteProduct(id) {
  const items = db.prepare('SELECT COUNT(*) as count FROM inventory_items WHERE product_id = ?').get(id);
  if (items.count > 0) {
    throw new Error(`Cannot delete product: ${items.count} inventory item(s) still exist`);
  }
  // Proceed
}

// Option 2: Cascade delete (dangerous - loses IMEI tracking)
// Option 3: Soft delete (mark as deleted, keep data)
```

### 3.4 Inventory Item Status Transitions
**Severity:** Medium  
**Issue:** Invalid status transitions (e.g., `sold` → `in_stock` without return).

**Current Behavior:**
- No validation of status transitions
- Can manually set any status

**Impact:**
- Data inconsistency
- Inventory tracking errors

**Recommendation:**
- Add status transition validation
- Only allow valid transitions:
  - `in_stock` → `sold`, `reserved`, `defective`
  - `sold` → `returned`, `warranty`
  - `returned` → `in_stock`, `defective`

### 3.5 Stock Count vs Inventory Items Count
**Severity:** High  
**Issue:** Product `stock: 10` but only 8 inventory items exist.

**Current Behavior:**
- No automatic sync
- Manual stock can be set to any value

**Impact:**
- Overselling risk
- Inventory confusion

**Recommendation:**
- For products with `productModelId`, calculate stock from inventory items:
  ```javascript
  const inStockItems = inventoryItems.filter(item => item.status === 'in_stock');
  product.stock = inStockItems.length;
  ```
- Or show warning when mismatch detected

---

## 4. Data Integrity Edge Cases

### 4.1 Foreign Key Constraints
**Severity:** Critical  
**Issue:** Missing or incorrect foreign key constraints.

**Current Schema:**
- `inventory_items.product_id` → `products.id` (has FK)
- `products.product_model_id` → `product_models.id` (needs verification)

**Impact:**
- Orphaned records
- Data corruption

**Recommendation:**
- Verify all foreign keys are defined
- Add `ON DELETE` actions (CASCADE, SET NULL, RESTRICT)

### 4.2 Concurrent Modifications
**Severity:** High  
**Issue:** Two users edit same product simultaneously.

**Current Behavior:**
- Last write wins
- No optimistic locking
- No conflict detection

**Impact:**
- Lost updates
- Data inconsistency

**Recommendation:**
- Add `updated_at` timestamp checking
- Implement optimistic locking
- Show conflict resolution UI

### 4.3 Transaction Rollback on Errors
**Severity:** High  
**Issue:** Partial operations (e.g., create product but fail to create inventory items).

**Current Behavior:**
- Need to verify transaction usage
- May leave partial data

**Impact:**
- Data inconsistency
- Orphaned records

**Recommendation:**
- Use database transactions for multi-step operations
- Rollback on any error

---

## 5. Business Logic Edge Cases

### 5.1 Sales with Inventory Items
**Severity:** High  
**Issue:** When selling a product with IMEI tracking, which inventory item is sold?

**Current Behavior:**
- Sales reduce product `stock` count
- But don't update specific inventory item status to `sold`

**Impact:**
- Lost IMEI tracking on sale
- Cannot track which specific unit was sold

**Recommendation:**
- When creating sale for product with `productModelId`:
  1. Select inventory item(s) with `status: 'in_stock'`
  2. Update item(s) to `status: 'sold'`
  3. Link `saleId` and `customerId` to inventory item
  4. Update product stock count

### 5.2 Returns with IMEI Tracking
**Severity:** Medium  
**Issue:** Returning a product - should inventory item status change?

**Current Behavior:**
- Returns restore product stock
- But don't update inventory item status

**Impact:**
- Inventory item remains `sold` even though returned
- Cannot track return history per IMEI

**Recommendation:**
- Update inventory item status to `returned`
- Or create new inventory item with `status: 'in_stock'`
- Link to return record

### 5.3 Stock Adjustments
**Severity:** Medium  
**Issue:** Manual stock adjustments for products with IMEI tracking.

**Current Behavior:**
- Can manually change `stock` count
- No validation against inventory items

**Impact:**
- Stock count can be wrong
- Mismatch with actual inventory items

**Recommendation:**
- For products with `productModelId`, disable manual stock editing
- Calculate stock from inventory items automatically
- Or show warning when adjusting

---

## 6. UI/UX Edge Cases

### 6.1 Form State Persistence
**Severity:** Low  
**Issue:** Form data lost if user accidentally closes form.

**Current Behavior:**
- Form state is lost on close
- No auto-save or draft functionality

**Impact:**
- User frustration
- Lost work

**Recommendation:**
- Add auto-save to localStorage
- Restore on form reopen

### 6.2 Loading States
**Severity:** Low  
**Issue:** No loading indicators during async operations.

**Current Behavior:**
- Some operations show loading, others don't
- User may click multiple times

**Impact:**
- Duplicate submissions
- Poor UX

**Recommendation:**
- Consistent loading states
- Disable buttons during operations

### 6.3 Error Messages
**Severity:** Medium  
**Issue:** Generic error messages don't help users fix issues.

**Current Behavior:**
- "Failed to save product" - not helpful
- No specific field-level errors

**Impact:**
- User confusion
- Support burden

**Recommendation:**
- Specific, actionable error messages
- Field-level validation errors
- Show database constraint errors in user-friendly format

---

## Priority Fixes

### Critical (Fix Immediately)
1. ✅ Model deletion with existing products (2.1)
2. ✅ Product deletion with inventory items (3.3)
3. ✅ IMEI duplicate prevention (3.1)
4. ✅ Foreign key constraints (4.1)

### High (Fix Soon)
1. Model deleted while form open (1.2)
2. Stock vs inventory items mismatch (1.6, 3.5)
3. Sales with inventory items (5.1)
4. Concurrent modifications (4.2)

### Medium (Fix When Possible)
1. Storage/color options removed (1.3)
2. Price/cost validation (1.5)
3. Inventory item status transitions (3.4)
4. Returns with IMEI (5.2)

### Low (Nice to Have)
1. Auto-generated name conflicts (1.4)
2. Empty arrays handling (2.3)
3. Form state persistence (6.1)

---

## Testing Recommendations

1. **Unit Tests:**
   - IMEI validation
   - Product name generation
   - Stock calculation from inventory items

2. **Integration Tests:**
   - Model deletion with products
   - Product deletion with inventory items
   - Sales with IMEI tracking

3. **E2E Tests:**
   - Complete product creation flow
   - Sales flow with inventory items
   - Return flow with IMEI tracking

4. **Edge Case Tests:**
   - Concurrent modifications
   - Invalid JSON in model options
   - Duplicate IMEI attempts
   - Model deletion scenarios

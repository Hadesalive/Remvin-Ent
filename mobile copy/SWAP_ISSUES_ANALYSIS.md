# Swap Feature Issues Analysis

## Critical Issues Identified

### 1. **Race Condition on Inventory Items** 🚨
**Problem**: When selecting an inventory item for the purchased product, the code queries for `in_stock` items but doesn't lock them. Two simultaneous swaps could select the same inventory item.

**Location**: `electron/handlers/swap-handlers.js:57-69`

**Fix**: Use a SELECT FOR UPDATE or transaction-level locking, or validate and lock the item immediately before marking as sold.

### 2. **Double Inventory Update** 🚨
**Problem**: The handler manually updates inventory after calling `createSale`, but `createSale` (via sales handler) already updates inventory. This could lead to inventory being updated twice or inconsistent states.

**Location**: `electron/handlers/swap-handlers.js:95-122`

**Fix**: Either:
- Pass a flag to `createSale` to skip inventory update, OR
- Don't manually update inventory if `createSale` handles it, OR
- Use a single transaction that coordinates both

### 3. **No Stock Validation for Purchased Product** ⚠️
**Problem**: For IMEI-tracked products, if no `in_stock` items are found, it just logs a warning but doesn't fail the transaction. For regular products, stock isn't validated before sale creation.

**Location**: `electron/handlers/swap-handlers.js:67-70, 114-122`

**Fix**: 
- For IMEI-tracked: Fail if no in-stock items available
- For regular products: Validate stock before creating sale

### 4. **Fragile Product Matching Logic** ⚠️
**Problem**: The fallback product matching by name is case-insensitive but exact match, which could match wrong products if names are similar.

**Location**: `electron/handlers/swap-handlers.js:157-161`

**Fix**: Add fuzzy matching or require explicit product selection. Consider product ID matching first.

### 5. **Missing Financial Validation** ⚠️
**Problem**: No validation that `differencePaid = purchasedProductPrice - tradeInValue`. A negative difference is allowed.

**Location**: Missing validation before swap creation

**Fix**: Validate: `differencePaid === purchasedProductPrice - tradeInValue` and ensure `differencePaid >= 0`.

### 6. **Trade-in IMEI Duplicate Check Timing** ⚠️
**Problem**: IMEI duplicate check happens before sale creation. If sale creation fails, the check was unnecessary. If sale succeeds but swap creation fails, IMEI check state is inconsistent.

**Location**: `electron/handlers/swap-handlers.js:44-49`

**Fix**: Move IMEI check within transaction after all validations, or validate at the beginning but ensure transaction rollback handles cleanup.

### 7. **Missing Required Field Validation** ⚠️
**Problem**: No validation for essential fields like `purchasedProductId`, `tradeInImei`, `customerName`, etc.

**Location**: Missing at handler entry

**Fix**: Add comprehensive input validation before transaction starts.

### 8. **Inventory Item Creation Failure** 🚨
**Problem**: If trade-in product creation succeeds but inventory item creation fails, the swap is created but the trade-in device isn't added to inventory, leaving data inconsistent.

**Location**: `electron/handlers/swap-handlers.js:188-201`

**Fix**: Ensure all operations are in transaction. If inventory item creation fails, rollback entire swap.

### 9. **Stock Calculation Race Condition** ⚠️
**Problem**: When updating stock for trade-in product, if multiple swaps happen simultaneously for the same product, stock calculations could be incorrect due to concurrent `updateProductStock` calls.

**Location**: `electron/handlers/swap-handlers.js:200`

**Fix**: Use atomic stock updates or lock the product record during stock calculation.

### 10. **Inconsistent Error Handling** ⚠️
**Problem**: Some errors throw exceptions, others return null/undefined, making it hard to handle failures consistently.

**Fix**: Standardize error handling - always throw errors for transaction failures, return error objects for validation failures.

## Recommended Fixes

1. **Use Supabase transactions** (Postgres transactions) for all atomic operations
2. **Validate all inputs** before starting transaction
3. **Use row-level locking** for inventory items when selecting
4. **Coordinate inventory updates** - don't double-update
5. **Validate financial calculations** before committing
6. **Ensure all-or-nothing** - if any part fails, rollback everything
7. **Add proper error messages** for each validation failure
8. **Handle edge cases** explicitly (empty stock, missing products, etc.)

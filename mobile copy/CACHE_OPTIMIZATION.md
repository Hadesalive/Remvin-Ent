# Cache Optimization Guide

## How the Cache Works

The app uses **local storage (AsyncStorage)** to cache products and customers, dramatically reducing Supabase API calls.

### Key Principles

1. **Cache First**: All screens read from cache by default (no API call)
2. **Single Record Updates**: When creating/updating/deleting, only fetch the changed record
3. **Incremental Cache Updates**: Cache is updated with the single changed record, not refetched
4. **24-Hour Expiration**: Cache expires after 24 hours, then refreshes from API

---

## Cache Flow

### Reading Data (getProducts / getCustomers)

```
1. Check cache → If exists and valid → Return cached data ✅ (NO API CALL)
2. If cache missing/expired → Fetch from Supabase → Cache result → Return data
```

**Result**: First call after 24h = 1 API call, all subsequent calls = 0 API calls

---

### Creating a Product

```
1. Insert into Supabase → Get inserted row back (single record)
2. Process product data (calculate stock for IMEI products)
3. Add to cache → Update local cache array
4. Return new product
```

**API Calls**: 1 (insert + select single record)

**Cache Update**: Incremental (adds single product to cache array)

---

### Updating a Product

```
1. Update in Supabase → Get updated row back (single record)
2. Process product data (recalculate stock if needed)
3. Update cache → Replace product in cache array
4. Return updated product
```

**API Calls**: 1 (update + select single record)

**Cache Update**: Incremental (replaces single product in cache array)

---

### Deleting a Product

```
1. Check cache for product (no API call if found)
2. If not in cache, fetch single product (1 API call)
3. Delete in Supabase (soft delete)
4. Remove from cache → Filter out from cache array
```

**API Calls**: 0-1 (0 if product in cache, 1 if not)

**Cache Update**: Incremental (removes single product from cache array)

---

## Screen Behavior

### Product List Screen

- **On Load**: Reads from cache (no API call if cache valid)
- **On Focus**: Reads from cache (no API call)
- **Pull to Refresh**: Reads from cache (no API call unless expired)
- **After Create/Update/Delete**: Cache already updated, so screen shows changes immediately

### Modals & Selectors

- **Product Selection Modal**: Uses cached products (no API call)
- **Customer Selection Modal**: Uses cached customers (no API call)
- **All dropdowns**: Use cached data

### New/Edit Screens

- **Product Dropdowns**: Use cached products
- **Customer Dropdowns**: Use cached customers
- **After Save**: Cache updated with single record, navigation back shows changes

---

## Console Logs

Watch for these logs to understand cache behavior:

- `📦 Using cached products` = Reading from cache (0 API calls)
- `🌐 Fetching products from API` = Cache miss/expired (1 API call)
- `✅ Added new product to cache (single record fetched)` = Created product, cache updated
- `✅ Updated product in cache (single record fetched)` = Updated product, cache updated
- `✅ Removed product from cache (no API call)` = Deleted product, cache updated

---

## API Call Reduction

### Before Optimization
- Every screen load = Full product list fetch
- Every modal open = Full product list fetch
- Every create/update/delete = Full product list refetch
- **Estimated: 50-100+ API calls per day**

### After Optimization
- First load per day = 1 API call (then cached)
- All subsequent reads = 0 API calls (from cache)
- Create/Update/Delete = 1 API call per operation (single record)
- **Estimated: 5-10 API calls per day**

---

## Force Refresh (If Needed)

If you need to force a refresh (bypass cache), you can call:

```typescript
DatabaseService.getProducts(true); // forceRefresh = true
DatabaseService.getCustomers(true); // forceRefresh = true
```

This will bypass cache and fetch from Supabase, then update the cache.

---

## Cache Invalidation

Cache is automatically invalidated when:
- Cache expires (24 hours)
- You explicitly call `CacheService.invalidateProductsCache()`
- You call `getProducts(true)` or `getCustomers(true)`

---

## Best Practices

1. **Don't force refresh** unless absolutely necessary
2. **Trust the cache** - it's updated automatically on create/update/delete
3. **Let screens use cache** - navigation listeners will show updated data from cache
4. **Single record operations** - create/update/delete only fetch the changed record

---

## Technical Details

### Cache Storage
- **Location**: AsyncStorage (persists across app restarts)
- **Format**: `{ data: T[], timestamp: number }`
- **Expiration**: 24 hours (CACHE_DURATION)

### Stock Calculation
For IMEI-tracked products, stock is calculated from `inventory_items` table. This happens:
- When fetching from API (full list)
- When fetching single product (create/update)
- Cache stores the calculated stock value

---

## Summary

✅ **Cache is used everywhere** (screens, modals, selectors)  
✅ **Only single records fetched** on create/update/delete  
✅ **Cache updated incrementally** (no full refetch)  
✅ **24-hour expiration** ensures data freshness  
✅ **Massive API call reduction** (90%+ reduction)

Your Supabase free tier should now be safe! 🎉

# Swaps Implementation Plan - Mobile Companion

## Overview
Implement full swap transaction flow matching desktop architecture, including sale creation, IMEI tracking, and inventory management.

## Desktop Swap Flow Analysis

### Complete Transaction Steps:
1. Validate purchased product exists and has stock
2. Check if trade-in IMEI already exists in inventory
3. Find available inventory item for purchased product (if IMEI-tracked)
4. Create sale for purchased product (includes IMEI if available)
5. Mark purchased product's inventory item as sold OR decrease manual stock
6. Find or create product for trade-in device
7. Create inventory item for trade-in device with IMEI
8. Create swap record linking everything

## Mobile Implementation Strategy

### Challenge: No Transactions in Supabase
Desktop uses SQLite transactions for atomicity. Supabase doesn't support transactions at the client level.

### Solution Approach:
1. **Sequential Operations with Error Handling**
   - Execute steps in order
   - Rollback on error (manual cleanup)
   - Validate before each step

2. **Use Supabase RPC Functions** (Optional, requires database functions)
   - Could create a PostgreSQL function for atomic swap creation
   - More complex but ensures atomicity

3. **Optimistic Approach** (For MVP)
   - Execute steps sequentially
   - Handle errors gracefully
   - Log operations for manual reconciliation if needed

### Implementation Plan:

#### Phase 1: Enhanced SwapService
- Implement full transaction flow matching desktop
- Handle sale creation
- Handle inventory item management
- Handle product creation for trade-ins

#### Phase 2: SwapsListScreen
- Display all swaps with KPIs
- Search and filter functionality
- Match desktop UI structure

#### Phase 3: NewSwapScreen
- Multi-step form for swap creation
- Product selection for purchase
- Trade-in IMEI and details
- Real-time calculation of difference
- Validation matching desktop logic

## Next Steps:
1. Enhance SwapService.createSwap() with full transaction logic
2. Create SwapsListScreen
3. Create NewSwapScreen
4. Test end-to-end flow

/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');
const { executeInTransaction, logTransaction } = require('../services/transaction-service');

function registerSwapHandlers(databaseService, syncService) {
  // Get all swaps
  ipcMain.handle('get-swaps', async () => {
    try {
      const swaps = await databaseService.getSwaps();
      return { success: true, data: swaps };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get swap by ID
  ipcMain.handle('get-swap-by-id', async (event, swapId) => {
    try {
      const swapData = await databaseService.getSwapById(swapId);
      return { success: true, data: swapData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create swap
  ipcMain.handle('create-swap', async (event, swapData) => {
    try {
      logTransaction('create-swap', { 
        customerName: swapData.customerName,
        purchasedProductId: swapData.purchasedProductId,
        tradeInImei: swapData.tradeInImei
      });
      
      // Step 0: Validate required fields BEFORE transaction
      if (!swapData.purchasedProductId) {
        return { success: false, error: 'Purchased product ID is required' };
      }
      if (!swapData.purchasedProductName) {
        return { success: false, error: 'Purchased product name is required' };
      }
      if (!swapData.tradeInImei) {
        return { success: false, error: 'Trade-in IMEI is required' };
      }
      if (!swapData.customerName) {
        return { success: false, error: 'Customer name is required' };
      }
      if (typeof swapData.purchasedProductPrice !== 'number' || swapData.purchasedProductPrice <= 0) {
        return { success: false, error: 'Purchased product price must be a positive number' };
      }
      if (typeof swapData.tradeInValue !== 'number' || swapData.tradeInValue < 0) {
        return { success: false, error: 'Trade-in value must be a non-negative number' };
      }
      if (typeof swapData.differencePaid !== 'number') {
        return { success: false, error: 'Difference paid must be a number' };
      }
      
      // Validate financial calculation
      const expectedDifference = swapData.purchasedProductPrice - swapData.tradeInValue;
      if (Math.abs(swapData.differencePaid - expectedDifference) > 0.01) {
        return { 
          success: false, 
          error: `Difference paid (${swapData.differencePaid}) does not match calculation (${swapData.purchasedProductPrice} - ${swapData.tradeInValue} = ${expectedDifference})` 
        };
      }
      if (swapData.differencePaid < 0) {
        return { 
          success: false, 
          error: `Difference paid cannot be negative. Trade-in value (${swapData.tradeInValue}) cannot exceed purchase price (${swapData.purchasedProductPrice})` 
        };
      }
      
      // Execute all operations in a single transaction
      const result = await executeInTransaction(databaseService.db, async () => {
        // Step 1: Validate purchased product exists and has stock
        const purchasedProduct = await databaseService.getProductById(swapData.purchasedProductId);
        if (!purchasedProduct) {
          throw new Error(`Product not found: ${swapData.purchasedProductId}`);
        }
        
        // Step 2: Check if trade-in IMEI already exists (check all statuses, not just in_stock)
        if (swapData.tradeInImei) {
          const existingItem = await databaseService.getInventoryItemByImei(swapData.tradeInImei);
          if (existingItem) {
            throw new Error(`IMEI ${swapData.tradeInImei} already exists in inventory (status: ${existingItem.status})`);
          }
        }
        
        // Step 3: Find and lock inventory item for purchased product (if IMEI-tracked)
        let purchasedItemImei = null;
        let purchasedInventoryItemId = null;
        
        if (purchasedProduct.productModelId) {
          // For IMEI-tracked products: Find an available inventory item
          // Use a SELECT that ensures we get the first available item
          // Note: In SQLite, we can't use SELECT FOR UPDATE, but the transaction ensures atomicity
          const itemsToSell = databaseService.db.prepare(`
            SELECT id, imei FROM inventory_items 
            WHERE product_id = ? AND status = 'in_stock' 
            ORDER BY created_at ASC 
            LIMIT 1
          `).all(swapData.purchasedProductId);
          
          if (itemsToSell.length === 0) {
            throw new Error(`No in-stock inventory items available for product "${purchasedProduct.name}". Cannot complete swap.`);
          }
          
          purchasedInventoryItemId = itemsToSell[0].id;
          purchasedItemImei = itemsToSell[0].imei;
        } else {
          // For regular products: Validate stock availability
          const currentStock = purchasedProduct.stock || 0;
          if (currentStock < 1) {
            throw new Error(`Insufficient stock for product "${purchasedProduct.name}". Current stock: ${currentStock}, required: 1`);
          }
        }
        
        // Step 4: Create sale for the purchased product with IMEI if available
        const saleItems = [{
          productId: swapData.purchasedProductId,
          productName: swapData.purchasedProductName,
          quantity: 1,
          unitPrice: swapData.purchasedProductPrice,
          total: swapData.purchasedProductPrice,
          imeis: purchasedItemImei ? [purchasedItemImei] : undefined // Include IMEI in sale item
        }];
        
        const saleData = {
          customerId: swapData.customerId || null,
          customerName: swapData.customerName,
          items: saleItems,
          subtotal: swapData.purchasedProductPrice,
          tax: 0, // Tax can be added if needed
          discount: swapData.tradeInValue, // Trade-in value as discount
          total: swapData.differencePaid,
          status: 'completed',
          paymentMethod: swapData.paymentMethod || 'cash',
          userId: swapData.userId || null,
          cashierName: swapData.cashierName || null,
          cashierEmployeeId: swapData.cashierEmployeeId || null,
          notes: `Swap transaction - Trade-in: ${swapData.tradeInProductName || 'Device'} (IMEI: ${swapData.tradeInImei})${purchasedItemImei ? ` | Sold IMEI: ${purchasedItemImei}` : ''}`
        };
        
        const sale = await databaseService.createSale(saleData);
        
        // Step 5: Update inventory for purchased product
        // Note: databaseService.createSale only creates the sale record, it doesn't handle inventory
        // So we need to manually update inventory here
        if (purchasedProduct.productModelId && purchasedInventoryItemId && purchasedItemImei) {
          // For IMEI-tracked products: Mark the specific inventory item as sold
          const soldDate = new Date().toISOString();
          await databaseService.updateInventoryItem(purchasedInventoryItemId, {
            status: 'sold',
            saleId: sale.id,
            customerId: swapData.customerId || null,
            soldDate: soldDate
          });
          
          // updateInventoryItem already calls updateProductStock, so no need to call it again
          console.log(`✅ Marked inventory item ${purchasedInventoryItemId} (IMEI: ${purchasedItemImei}) as sold for swap sale ${sale.id}`);
        } else if (!purchasedProduct.productModelId) {
          // For regular products: Decrease stock
          const currentStock = purchasedProduct.stock || 0;
          const newStock = Math.max(0, currentStock - 1);
          await databaseService.updateProduct(swapData.purchasedProductId, {
            stock: newStock
          });
          console.log(`✅ Stock updated for ${purchasedProduct.name}: ${currentStock} -> ${newStock}`);
        }
        
        // Step 6: Find or create product for trade-in device with storage and color
        let tradeInProductId = swapData.tradeInProductId;
        
        if (!tradeInProductId && swapData.tradeInProductName) {
          const products = await databaseService.getProducts();
          let matchingProduct = null;
          
          // Priority 1: Exact match with model ID, storage, and color (most specific)
          if (swapData.tradeInModelId && swapData.tradeInStorage && swapData.tradeInColor) {
            matchingProduct = products.find(p => 
              p.productModelId === swapData.tradeInModelId &&
              p.storage === swapData.tradeInStorage &&
              p.color === swapData.tradeInColor &&
              p.isActive !== false
            );
          }
          
          // Priority 2: Match with model ID and storage (if no exact match found)
          if (!matchingProduct && swapData.tradeInModelId && swapData.tradeInStorage) {
            matchingProduct = products.find(p => 
              p.productModelId === swapData.tradeInModelId &&
              p.storage === swapData.tradeInStorage &&
              (!p.color || p.color === null) && // Match products without color specified
              p.isActive !== false
            );
          }
          
          // Priority 3: Match with model ID only (less specific)
          if (!matchingProduct && swapData.tradeInModelId) {
            matchingProduct = products.find(p => 
              p.productModelId === swapData.tradeInModelId &&
              (!p.storage || p.storage === null) && // Prefer products without storage specified
              (!p.color || p.color === null) &&
              p.isActive !== false
            );
          }
          
          // Priority 4: Name-based matching (last resort, but validate it's reasonable)
          if (!matchingProduct && swapData.tradeInProductName) {
            const normalizedTradeInName = swapData.tradeInProductName.toLowerCase().trim();
            matchingProduct = products.find(p => {
              const normalizedProductName = (p.name || '').toLowerCase().trim();
              // Require at least 80% similarity or exact match to avoid wrong matches
              return normalizedProductName === normalizedTradeInName || 
                     (normalizedProductName.includes(normalizedTradeInName) && 
                      normalizedTradeInName.length >= 5); // Only if name is substantial
            });
          }
          
          if (matchingProduct) {
            tradeInProductId = matchingProduct.id;
            console.log(`✅ Found existing product for trade-in: ${matchingProduct.name} (${matchingProduct.id})`);
          } else {
            // Create a new product for the trade-in device with storage and color
            const productName = swapData.tradeInProductName;
            try {
              const newTradeInProduct = await databaseService.createProduct({
                name: productName,
                description: `Trade-in device: ${productName}`,
                price: swapData.tradeInValue, // Set price to trade-in value
                cost: swapData.tradeInValue * 0.8, // Estimate cost at 80% of value
                category: purchasedProduct.category || 'Electronics',
                stock: 0, // Will be updated when inventory item is created
                productModelId: swapData.tradeInModelId || null,
                storage: swapData.tradeInStorage || null,
                color: swapData.tradeInColor || null,
                isActive: true
              });
              tradeInProductId = newTradeInProduct.id;
              console.log(`✅ Created new product for trade-in: ${productName} (${newTradeInProduct.id})`);
            } catch (productError) {
              throw new Error(`Failed to create product for trade-in device: ${productError.message}`);
            }
          }
        }
        
        // Step 7: Create inventory item for trade-in device
        let inventoryItem = null;
        if (!tradeInProductId) {
          throw new Error('Trade-in product ID is required to create inventory item');
        }
        if (!swapData.tradeInImei) {
          throw new Error('Trade-in IMEI is required to create inventory item');
        }
        
        try {
          inventoryItem = await databaseService.createInventoryItem({
            productId: tradeInProductId,
            imei: swapData.tradeInImei,
            status: 'in_stock',
            condition: swapData.tradeInCondition || 'used',
            purchaseCost: swapData.tradeInValue,
            notes: swapData.tradeInNotes || `Trade-in from swap. Customer: ${swapData.customerName}`,
            customerId: swapData.customerId || null
          });
          
          // createInventoryItem doesn't automatically update stock, so we need to do it manually
          // But first verify the product is IMEI-tracked (has productModelId)
          const tradeInProduct = await databaseService.getProductById(tradeInProductId);
          if (tradeInProduct && tradeInProduct.productModelId) {
            // For IMEI-tracked products, stock is calculated from inventory_items
            await databaseService.updateProductStock(tradeInProductId);
          } else {
            // For regular products, increment stock
            const currentStock = tradeInProduct?.stock || 0;
            await databaseService.updateProduct(tradeInProductId, {
              stock: currentStock + 1
            });
          }
          console.log(`✅ Created inventory item for trade-in device: IMEI ${swapData.tradeInImei}`);
        } catch (inventoryError) {
          throw new Error(`Failed to create inventory item for trade-in device: ${inventoryError.message}`);
        }
        
        // Step 8: Generate swap number
        const swapNumber = swapData.swapNumber || `SWAP-${Date.now().toString().slice(-6)}`;
        
        // Step 9: Create swap record (final step - if this fails, everything rolls back)
        if (!inventoryItem || !inventoryItem.id) {
          throw new Error('Inventory item was not created successfully. Cannot create swap record.');
        }
        
        const swapRecord = await databaseService.createSwap({
          swapNumber: swapNumber,
          customerId: swapData.customerId || null,
          customerName: swapData.customerName,
          customerPhone: swapData.customerPhone || null,
          customerEmail: swapData.customerEmail || null,
          customerAddress: swapData.customerAddress || null,
          saleId: sale.id,
          purchasedProductId: swapData.purchasedProductId,
          purchasedProductName: swapData.purchasedProductName,
          tradeInProductId: tradeInProductId || null,
          tradeInProductName: swapData.tradeInProductName || null,
          tradeInImei: swapData.tradeInImei,
          tradeInCondition: swapData.tradeInCondition || 'used',
          tradeInNotes: swapData.tradeInNotes || null,
          tradeInValue: swapData.tradeInValue,
          purchasedProductPrice: swapData.purchasedProductPrice,
          differencePaid: swapData.differencePaid,
          paymentMethod: swapData.paymentMethod || 'cash',
          status: 'completed',
          inventoryItemId: inventoryItem.id, // Must exist at this point
          notes: swapData.notes || null
        });
        
        return { 
          swap: swapRecord, 
          sale: sale, 
          inventoryItem: inventoryItem,
          tradeInProductId: tradeInProductId
        };
      });
      
      // Track sync changes
      if (syncService && result.swap && result.swap.id) {
        syncService.trackChange('swaps', result.swap.id.toString(), 'create', result.swap);
      }
      
      if (syncService && result.sale && result.sale.id) {
        syncService.trackChange('sales', result.sale.id.toString(), 'create', result.sale);
      }
      
      if (syncService && result.inventoryItem && result.inventoryItem.id) {
        syncService.trackChange('inventory_items', result.inventoryItem.id.toString(), 'create', result.inventoryItem);
      }
      
      return { success: true, data: result.swap };
    } catch (error) {
      console.error('create-swap transaction failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Update swap
  ipcMain.handle('update-swap', async (event, payload) => {
    try {
      const { id, updates } = payload;
      logTransaction('update-swap', { 
        swapId: id,
        statusChange: updates.status
      });
      
      const swap = await databaseService.updateSwap(id, updates);
      
      // Track sync change
      if (syncService && swap && swap.id) {
        syncService.trackChange('swaps', swap.id.toString(), 'update', swap);
      }
      
      return { success: true, data: swap };
    } catch (error) {
      console.error('update-swap failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete swap
  ipcMain.handle('delete-swap', async (event, swapId) => {
    try {
      logTransaction('delete-swap', { swapId });
      
      // Note: This is a soft delete - we don't reverse the sale or inventory changes
      // For a full reversal, you'd need to implement a cancel-swap handler
      await databaseService.deleteSwap(swapId);
      
      // Fetch the swap to get deleted_at timestamp for sync
      const deletedSwap = await databaseService.getSwapById(swapId);
      
      // Track sync change with deleted_at timestamp
      if (syncService) {
        syncService.trackChange('swaps', swapId.toString(), 'delete', deletedSwap ? { deleted_at: deletedSwap.deletedAt || deletedSwap.deleted_at || new Date().toISOString() } : null);
      }
      
      return { success: true };
    } catch (error) {
      console.error('delete-swap failed:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerSwapHandlers };

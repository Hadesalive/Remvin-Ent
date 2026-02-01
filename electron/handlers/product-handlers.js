/* eslint-disable @typescript-eslint/no-require-imports */
const { ipcMain } = require('electron');

function registerProductHandlers(databaseService, syncService) {
  // Product-related IPC handlers
  ipcMain.handle('get-products', async () => {
    try {
      // Safety check: ensure databaseService is available and has getProducts method
      if (!databaseService) {
        return { success: false, error: 'Database service not available' };
      }
      
      if (typeof databaseService.getProducts !== 'function') {
        return { success: false, error: 'getProducts method not available on database service' };
      }
      
      const products = await databaseService.getProducts();
      return { success: true, data: products || [] };
    } catch (error) {
      console.error('get-products error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-product', async (event, productData) => {
    try {
      // Validate cost field only if provided (cost is optional)
      if (productData.cost !== null && productData.cost !== undefined) {
        if (typeof productData.cost !== 'number' || productData.cost < 0) {
          return {
            success: false,
            error: 'Product cost must be a number greater than or equal to 0.'
          };
        }
      }
      
      const product = await databaseService.createProduct(productData);
      // Track sync change
      if (syncService && product && product.id) {
        syncService.trackChange('products', product.id.toString(), 'create', product);
      }
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-product', async (event, id, updates) => {
    try {
      // Validate cost field only if provided (cost is optional, can be undefined/null to clear it)
      if (updates.cost !== undefined && updates.cost !== null) {
        if (typeof updates.cost !== 'number' || updates.cost < 0) {
          return {
            success: false,
            error: 'Product cost must be a number greater than or equal to 0.'
          };
        }
      }
      
      const product = await databaseService.updateProduct(id, updates);
      // Track sync change
      if (syncService && product && product.id) {
        syncService.trackChange('products', product.id.toString(), 'update', product);
      }
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-product', async (event, productId, options = {}) => {
    try {
      await databaseService.deleteProduct(productId, options);
      // Track sync change
      if (syncService) {
        syncService.trackChange('products', productId.toString(), 'delete');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-product-by-id', async (event, productId) => {
    try {
      const product = await databaseService.getProductById(productId);
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Product Models IPC handlers
  ipcMain.handle('get-product-models', async () => {
    try {
      const models = await databaseService.getProductModels();
      return { success: true, data: models || [] };
    } catch (error) {
      console.error('get-product-models error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-product-model', async (event, id) => {
    try {
      const model = await databaseService.getProductModelById(id);
      return { success: true, data: model };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-product-model', async (event, modelData) => {
    try {
      const model = await databaseService.createProductModel(modelData);
      if (syncService && model && model.id) {
        syncService.trackChange('product_models', model.id.toString(), 'create', model);
      }
      return { success: true, data: model };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-product-model', async (event, id, updates) => {
    try {
      const model = await databaseService.updateProductModel(id, updates);
      if (syncService && model && model.id) {
        syncService.trackChange('product_models', model.id.toString(), 'update', model);
      }
      return { success: true, data: model };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-product-model', async (event, id) => {
    try {
      const deleted = await databaseService.deleteProductModel(id);
      if (syncService && deleted) {
        syncService.trackChange('product_models', id.toString(), 'delete', null);
      }
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Product Accessories IPC handlers
  ipcMain.handle('get-accessories-for-model', async (event, productModelId) => {
    try {
      const accessories = await databaseService.getAccessoriesForModel(productModelId);
      return { success: true, data: accessories || [] };
    } catch (error) {
      console.error('get-accessories-for-model error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('add-accessory-to-model', async (event, productModelId, accessoryProductId, options) => {
    try {
      const accessory = await databaseService.addAccessoryToModel(productModelId, accessoryProductId, options || {});
      if (syncService && accessory && accessory.id) {
        syncService.trackChange('product_accessories', accessory.id.toString(), 'create', accessory);
      }
      return { success: true, data: accessory };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-accessory', async (event, id, updates) => {
    try {
      const accessory = await databaseService.updateAccessory(id, updates);
      if (syncService && accessory && accessory.id) {
        syncService.trackChange('product_accessories', accessory.id.toString(), 'update', accessory);
      }
      return { success: true, data: accessory };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('remove-accessory-from-model', async (event, id) => {
    try {
      const deleted = await databaseService.removeAccessoryFromModel(id);
      if (syncService && deleted) {
        syncService.trackChange('product_accessories', id.toString(), 'delete', null);
      }
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Inventory Items IPC handlers
  ipcMain.handle('get-inventory-items', async (event, filters) => {
    try {
      const items = await databaseService.getInventoryItems(filters || {});
      return { success: true, data: items || [] };
    } catch (error) {
      console.error('get-inventory-items error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-inventory-item', async (event, id) => {
    try {
      const item = await databaseService.getInventoryItemById(id);
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-inventory-item-by-imei', async (event, imei) => {
    try {
      const item = await databaseService.getInventoryItemByImei(imei);
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-inventory-item', async (event, itemData) => {
    try {
      const item = await databaseService.createInventoryItem(itemData);
      if (syncService && item && item.id) {
        syncService.trackChange('inventory_items', item.id.toString(), 'create', item);
      }
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-inventory-item', async (event, id, updates) => {
    try {
      const item = await databaseService.updateInventoryItem(id, updates);
      if (syncService && item && item.id) {
        syncService.trackChange('inventory_items', item.id.toString(), 'update', item);
      }
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-inventory-item', async (event, id) => {
    try {
      const deleted = await databaseService.deleteInventoryItem(id);
      if (syncService && deleted) {
        syncService.trackChange('inventory_items', id.toString(), 'delete', null);
      }
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('Product handlers registered');
}

module.exports = {
  registerProductHandlers
};

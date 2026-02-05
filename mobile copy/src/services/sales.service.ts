/**
 * Sales Service
 * Handles sales operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { Sale, SaleItem } from '../types';

/**
 * Safely parse a number
 */
function safeParseNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse sale items from JSON string
 */
function parseSaleItems(items: string): SaleItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export const SalesService = {
  /**
   * Get all sales
   */
  async getSales(): Promise<Sale[]> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((sale: any) => ({
        id: sale.id,
        customerId: sale.customer_id || null,
        customerName: sale.customer_name || null,
        items: sale.items || '[]', // Ensure it's always a valid JSON string
        subtotal: safeParseNumber(sale.subtotal),
        tax: safeParseNumber(sale.tax),
        taxes: sale.taxes || null,
        discount: safeParseNumber(sale.discount),
        total: safeParseNumber(sale.total),
        status: sale.status,
        paymentMethod: sale.payment_method,
        notes: sale.notes || null,
        invoiceId: sale.invoice_id || null,
        invoiceNumber: sale.invoice_number || null,
        userId: sale.user_id || null,
        cashierName: sale.cashier_name || null,
        createdAt: sale.created_at,
        updatedAt: sale.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get sales with pagination
   */
  async getSalesPaginated(page: number = 1, limit: number = 20): Promise<{ data: Sale[]; hasMore: boolean; total: number }> {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Get total count
      const { count } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Get paginated data
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const sales = (data || []).map((sale: any) => ({
        id: sale.id,
        customerId: sale.customer_id || null,
        customerName: sale.customer_name || null,
        items: sale.items || '[]',
        subtotal: safeParseNumber(sale.subtotal),
        tax: safeParseNumber(sale.tax),
        taxes: sale.taxes || null,
        discount: safeParseNumber(sale.discount),
        total: safeParseNumber(sale.total),
        status: sale.status,
        paymentMethod: sale.payment_method,
        notes: sale.notes || null,
        invoiceId: sale.invoice_id || null,
        invoiceNumber: sale.invoice_number || null,
        userId: sale.user_id || null,
        cashierName: sale.cashier_name || null,
        createdAt: sale.created_at,
        updatedAt: sale.updated_at,
      }));

      return {
        data: sales,
        hasMore: to < (count || 0) - 1,
        total: count || 0,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get sale by ID
   */
  async getSaleById(id: string): Promise<Sale | null> {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        items: data.items || '[]', // Ensure it's always a valid JSON string
        subtotal: safeParseNumber(data.subtotal),
        tax: safeParseNumber(data.tax),
        taxes: data.taxes || null,
        discount: safeParseNumber(data.discount),
        total: safeParseNumber(data.total),
        status: data.status,
        paymentMethod: data.payment_method,
        notes: data.notes || null,
        invoiceId: data.invoice_id || null,
        invoiceNumber: data.invoice_number || null,
        userId: data.user_id || null,
        cashierName: data.cashier_name || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new sale
   */
  async createSale(saleData: {
    customerId?: string | null;
    customerName?: string | null;
    items: SaleItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
    paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
    notes?: string | null;
    userId?: string | null;
    cashierName?: string | null;
  }): Promise<Sale> {
    try {
      const now = new Date().toISOString();

      // Validate UUID format for user_id (Supabase requires UUID)
      const isValidUUID = (str: string | null | undefined): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const validUserId = saleData.userId && isValidUUID(saleData.userId) ? saleData.userId : null;

      // First, create the sale (let Supabase generate UUID for id)
      const { data, error } = await supabase
        .from('sales')
        .insert({
          customer_id: saleData.customerId || null,
          customer_name: saleData.customerName || null,
          items: JSON.stringify(saleData.items),
          subtotal: saleData.subtotal,
          tax: saleData.tax,
          discount: saleData.discount || 0,
          total: saleData.total,
          status: saleData.status || 'completed',
          payment_method: saleData.paymentMethod || 'cash',
          notes: saleData.notes || null,
          user_id: validUserId,
          cashier_name: saleData.cashierName || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      // Update inventory - handle IMEI-tracked vs regular products
      if (saleData.status === 'completed' || !saleData.status) {
        const { DatabaseService } = await import('./database.service');
        const { InventoryItemService } = await import('./inventory-item.service');
        
        const soldDate = new Date().toISOString();
        
        for (const item of saleData.items) {
          try {
            // Get current product
            const products = await DatabaseService.getProducts();
            const product = products.data?.find(p => p.id === item.productId);
            
            if (!product) continue;
            
            // Check if product uses IMEI tracking
            if (product.productModelId) {
              // For IMEI-tracked products: Mark specific inventory items as 'sold'
              let itemsToMark = [];
              
              if (item.imeis && item.imeis.length > 0) {
                // Use selected IMEIs from sale item
                for (const imei of item.imeis) {
                  const imeiResult = await InventoryItemService.getInventoryItemByImei(imei);
                  if (imeiResult.data && imeiResult.data.productId === item.productId && imeiResult.data.status === 'in_stock') {
                    itemsToMark.push(imeiResult.data);
                  }
                }
                
                if (itemsToMark.length !== item.imeis.length) {
                }
              } else if (item.inventoryItemIds && item.inventoryItemIds.length > 0) {
                // Use inventory item IDs if provided
                for (const itemId of item.inventoryItemIds) {
                  const itemResult = await InventoryItemService.getInventoryItemById(itemId);
                  if (itemResult.data && itemResult.data.productId === item.productId && itemResult.data.status === 'in_stock') {
                    itemsToMark.push(itemResult.data);
                  }
                }
              } else {
                // Auto-select oldest in-stock items (fallback for backwards compatibility)
                const allItemsResult = await InventoryItemService.getInventoryItems({
                  productId: item.productId,
                  status: 'in_stock'
                });
                
                if (allItemsResult.data) {
                  // Sort by created_at ascending (oldest first) and take quantity needed
                  const sortedItems = allItemsResult.data.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateA - dateB;
                  });
                  itemsToMark = sortedItems.slice(0, item.quantity);
                }
              }
              
              // Update all inventory items to 'sold'
              for (const invItem of itemsToMark) {
                await InventoryItemService.updateInventoryItem(invItem.id, {
                  status: 'sold',
                  saleId: data.id,
                  customerId: saleData.customerId || null,
                  soldDate: soldDate,
                });
              }
              
              // Stock is automatically recalculated from inventory_items (done in DatabaseService.getProducts)
            } else {
              // For regular products: Update stock manually
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              await DatabaseService.updateProduct(item.productId, {
                stock: newStock,
              });
            }
          } catch (stockError) {
            // Continue with other products even if one fails
          }
        }
      }

      return {
        id: data.id,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        items: data.items || '[]', // Ensure it's always a valid JSON string
        subtotal: safeParseNumber(data.subtotal),
        tax: safeParseNumber(data.tax),
        taxes: data.taxes || null,
        discount: safeParseNumber(data.discount),
        total: safeParseNumber(data.total),
        status: data.status,
        paymentMethod: data.payment_method,
        notes: data.notes || null,
        invoiceId: data.invoice_id || null,
        invoiceNumber: data.invoice_number || null,
        userId: data.user_id || null,
        cashierName: data.cashier_name || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a sale
   */
  async updateSale(
    id: string,
    updates: {
      status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
      paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
      notes?: string | null;
      items?: SaleItem[];
      subtotal?: number;
      tax?: number;
      discount?: number;
      total?: number;
    }
  ): Promise<Sale> {
    try {
      // Get original sale to restore stock if items changed
      const originalSale = await this.getSaleById(id);
      const { DatabaseService } = await import('./database.service');

      // If items are being updated, restore old stock first
      if (updates.items && originalSale) {
        try {
          const oldItems = typeof originalSale.items === 'string' 
            ? JSON.parse(originalSale.items) 
            : originalSale.items;
          
          if (Array.isArray(oldItems) && (originalSale.status === 'completed' || !originalSale.status)) {
            // Restore stock for old items
            for (const item of oldItems) {
              try {
                const products = await DatabaseService.getProducts();
                const product = products.data?.find(p => p.id === item.productId);
                if (product) {
                  const newStock = (product.stock || 0) + item.quantity;
                  await DatabaseService.updateProduct(item.productId, {
                    stock: newStock,
                  });
                }
              } catch (stockError) {
              }
            }
          }
        } catch (parseError) {
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.items !== undefined) updateData.items = JSON.stringify(updates.items);
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates.tax !== undefined) updateData.tax = updates.tax;
      if (updates.discount !== undefined) updateData.discount = updates.discount;
      if (updates.total !== undefined) updateData.total = updates.total;

      const { data, error } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Deduct stock for new items if status is completed
      if (updates.items && (updates.status === 'completed' || (!updates.status && originalSale?.status === 'completed'))) {
        for (const item of updates.items) {
          try {
            const products = await DatabaseService.getProducts();
            const product = products.data?.find(p => p.id === item.productId);
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              await DatabaseService.updateProduct(item.productId, {
                stock: newStock,
              });
            }
          } catch (stockError) {
          }
        }
      }

      return {
        id: data.id,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        items: data.items || '[]', // Ensure it's always a valid JSON string
        subtotal: safeParseNumber(data.subtotal),
        tax: safeParseNumber(data.tax),
        taxes: data.taxes || null,
        discount: safeParseNumber(data.discount),
        total: safeParseNumber(data.total),
        status: data.status,
        paymentMethod: data.payment_method,
        notes: data.notes || null,
        invoiceId: data.invoice_id || null,
        invoiceNumber: data.invoice_number || null,
        userId: data.user_id || null,
        cashierName: data.cashier_name || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {

      throw error;
    }
  },

  /**
   * Delete a sale (soft delete)
   */
  async deleteSale(id: string): Promise<void> {
    try {
      // Get sale to restore stock and inventory items
      const sale = await this.getSaleById(id);
      const { DatabaseService } = await import('./database.service');
      const { InventoryItemService } = await import('./inventory-item.service');

      // Restore stock and inventory items if sale was completed
      if (sale && (sale.status === 'completed' || !sale.status)) {
        try {
          const items = typeof sale.items === 'string' 
            ? JSON.parse(sale.items) 
            : sale.items;
          
          if (Array.isArray(items)) {
            for (const item of items) {
              try {
                const products = await DatabaseService.getProducts();
                const product = products.data?.find(p => p.id === item.productId);
                if (!product) continue;

                // Check if product uses IMEI tracking
                if (product.productModelId && item.inventoryItemIds && Array.isArray(item.inventoryItemIds)) {
                  // Restore inventory items: set status back to 'in_stock' and clear sale info
                  for (const inventoryItemId of item.inventoryItemIds) {
                    try {
                      await InventoryItemService.updateInventoryItem(inventoryItemId, {
                        status: 'in_stock',
                        saleId: null,
                        soldDate: null,
                        customerId: null,
                      });
                    } catch (inventoryError) {
                    }
                  }
                } else {
                  // Regular product - restore stock count
                  const newStock = (product.stock || 0) + item.quantity;
                  await DatabaseService.updateProduct(item.productId, {
                    stock: newStock,
                  });
                }
              } catch (stockError) {
              }
            }
          }

          // Restore customer credit if credit was applied
          if (sale.customerId) {
            try {
              // Try to extract credit amount from notes
              let creditToRestore = 0;
              if (sale.notes) {
                const creditMatch = sale.notes.match(/Credit: NLe ([\d,]+)/);
                if (creditMatch) {
                  creditToRestore = parseFloat(creditMatch[1].replace(/,/g, ''));
                }
              }

              // If no credit found in notes but payment method is credit, restore the total
              if (creditToRestore === 0 && sale.paymentMethod === 'credit') {
                creditToRestore = sale.total || 0;
              }

              // Restore credit if any was applied
              if (creditToRestore > 0) {
                const { data: customer } = await DatabaseService.getCustomerById(sale.customerId);
                if (customer) {
                  const currentCredit = customer.storeCredit || 0;
                  await DatabaseService.updateCustomer(sale.customerId, {
                    storeCredit: currentCredit + creditToRestore,
                  });
                }
              }
            } catch (creditError) {
              // Don't throw - continue with sale deletion even if credit restoration fails
            }
          }
        } catch (parseError) {
        }
      }

      // Soft delete the sale
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },
};


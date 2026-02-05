/**
 * Swap Service
 * Handles device trade-in/swap operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { Swap } from '../types';

export const SwapService = {
  /**
   * Get all swaps
   */
  async getSwaps(): Promise<{ data: Swap[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const swaps = (data || []).map((swap: any) => ({
        id: swap.id,
        swapNumber: swap.swap_number,
        customerId: swap.customer_id || null,
        customerName: swap.customer_name || null,
        customerPhone: swap.customer_phone || null,
        customerEmail: swap.customer_email || null,
        customerAddress: swap.customer_address || null,
        saleId: swap.sale_id || null,
        purchasedProductId: swap.purchased_product_id,
        purchasedProductName: swap.purchased_product_name,
        purchasedProductPrice: swap.purchased_product_price,
        purchasedImei: swap.purchased_imei || null,
        tradeInProductId: swap.trade_in_product_id || null,
        tradeInProductName: swap.trade_in_product_name || null,
        tradeInImei: swap.trade_in_imei,
        tradeInCondition: swap.trade_in_condition,
        tradeInNotes: swap.trade_in_notes || null,
        tradeInValue: swap.trade_in_value,
        differencePaid: swap.difference_paid,
        paymentMethod: swap.payment_method,
        status: swap.status,
        inventoryItemId: swap.inventory_item_id || null,
        notes: swap.notes || null,
        createdAt: swap.created_at,
        updatedAt: swap.updated_at,
      }));

      return { data: swaps, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get swap by ID
   */
  async getSwapById(id: string): Promise<{ data: Swap | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return { data: null, error: null };

      return {
        data: {
          id: data.id,
          swapNumber: data.swap_number,
          customerId: data.customer_id || null,
          customerName: data.customer_name || null,
          customerPhone: data.customer_phone || null,
          customerEmail: data.customer_email || null,
          customerAddress: data.customer_address || null,
          saleId: data.sale_id || null,
          purchasedProductId: data.purchased_product_id,
          purchasedProductName: data.purchased_product_name,
          purchasedProductPrice: data.purchased_product_price,
          purchasedImei: data.purchased_imei || null,
          tradeInProductId: data.trade_in_product_id || null,
          tradeInProductName: data.trade_in_product_name || null,
          tradeInImei: data.trade_in_imei,
          tradeInCondition: data.trade_in_condition,
          tradeInNotes: data.trade_in_notes || null,
          tradeInValue: data.trade_in_value,
          differencePaid: data.difference_paid,
          paymentMethod: data.payment_method,
          status: data.status,
          inventoryItemId: data.inventory_item_id || null,
          notes: data.notes || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Create a new swap
   * Note: This is a simplified version. Desktop has complex transaction logic
   * that handles inventory items, sales, and stock updates atomically.
   * For mobile companion, we create the swap record and let desktop sync handle the rest.
   */
  async createSwap(
    swapData: Omit<Swap, 'id' | 'swapNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<{ data: Swap | null; error: any }> {
    try {
      const now = new Date().toISOString();
      const swapNumber = `SWAP-${Date.now().toString().slice(-6)}`;

      const { data, error } = await supabase
        .from('swaps')
        .insert({
          swap_number: swapNumber,
          customer_id: swapData.customerId || null,
          customer_name: swapData.customerName || null,
          customer_phone: swapData.customerPhone || null,
          customer_email: swapData.customerEmail || null,
          customer_address: swapData.customerAddress || null,
          sale_id: swapData.saleId || null,
          purchased_product_id: swapData.purchasedProductId,
          purchased_product_name: swapData.purchasedProductName,
          purchased_product_price: swapData.purchasedProductPrice,
          purchased_imei: (swapData as any).purchasedImei || null,
          trade_in_product_id: swapData.tradeInProductId || null,
          trade_in_product_name: swapData.tradeInProductName || null,
          trade_in_imei: swapData.tradeInImei,
          trade_in_condition: swapData.tradeInCondition,
          trade_in_notes: swapData.tradeInNotes || null,
          trade_in_value: swapData.tradeInValue,
          difference_paid: swapData.differencePaid,
          payment_method: swapData.paymentMethod,
          status: swapData.status || 'completed',
          inventory_item_id: swapData.inventoryItemId || null,
          notes: swapData.notes || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        data: {
          id: data.id,
          swapNumber: data.swap_number,
          customerId: data.customer_id || null,
          customerName: data.customer_name || null,
          customerPhone: data.customer_phone || null,
          customerEmail: data.customer_email || null,
          customerAddress: data.customer_address || null,
          saleId: data.sale_id || null,
          purchasedProductId: data.purchased_product_id,
          purchasedProductName: data.purchased_product_name,
          purchasedProductPrice: data.purchased_product_price,
          purchasedImei: data.purchased_imei || null,
          tradeInProductId: data.trade_in_product_id || null,
          tradeInProductName: data.trade_in_product_name || null,
          tradeInImei: data.trade_in_imei,
          tradeInCondition: data.trade_in_condition,
          tradeInNotes: data.trade_in_notes || null,
          tradeInValue: data.trade_in_value,
          differencePaid: data.difference_paid,
          paymentMethod: data.payment_method,
          status: data.status,
          inventoryItemId: data.inventory_item_id || null,
          notes: data.notes || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Update a swap
   */
  async updateSwap(
    id: string,
    updates: Partial<Omit<Swap, 'id' | 'swapNumber' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ data: Swap | null; error: any }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.tradeInNotes !== undefined) updateData.trade_in_notes = updates.tradeInNotes || null;

      const { data, error } = await supabase
        .from('swaps')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: {
          id: data.id,
          swapNumber: data.swap_number,
          customerId: data.customer_id || null,
          customerName: data.customer_name || null,
          customerPhone: data.customer_phone || null,
          customerEmail: data.customer_email || null,
          customerAddress: data.customer_address || null,
          saleId: data.sale_id || null,
          purchasedProductId: data.purchased_product_id,
          purchasedProductName: data.purchased_product_name,
          purchasedProductPrice: data.purchased_product_price,
          purchasedImei: data.purchased_imei || null,
          tradeInProductId: data.trade_in_product_id || null,
          tradeInProductName: data.trade_in_product_name || null,
          tradeInImei: data.trade_in_imei,
          tradeInCondition: data.trade_in_condition,
          tradeInNotes: data.trade_in_notes || null,
          tradeInValue: data.trade_in_value,
          differencePaid: data.difference_paid,
          paymentMethod: data.payment_method,
          status: data.status,
          inventoryItemId: data.inventory_item_id || null,
          notes: data.notes || null,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Delete a swap (soft delete) and restore inventory
   */
  async deleteSwap(id: string): Promise<{ data: boolean; error: any }> {
    try {
      // Get swap to restore inventory items
      const swapResult = await this.getSwapById(id);
      if (swapResult.error || !swapResult.data) {
        throw new Error('Swap not found');
      }

      const swap = swapResult.data;
      const { DatabaseService } = await import('./database.service');
      const { InventoryItemService } = await import('./inventory-item.service');

          // Restore purchased product inventory if swap was completed
      if (swap.status === 'completed' || !swap.status) {
        try {
          const products = await DatabaseService.getProducts();
          const purchasedProduct = products.data?.find(p => p.id === swap.purchasedProductId);
          
          if (purchasedProduct) {
            // Check if product uses IMEI tracking
            if (purchasedProduct.productModelId) {
              let inventoryItemIdToRestore: string | null = null;
              
              // Try to find inventory item by ID first
              if (swap.inventoryItemId) {
                inventoryItemIdToRestore = swap.inventoryItemId;
              } else if ((swap as any).purchasedImei) {
                // Try to find by IMEI if inventoryItemId is not set
                const imeiResult = await InventoryItemService.getInventoryItemByImei((swap as any).purchasedImei);
                if (imeiResult.data && imeiResult.data.productId === swap.purchasedProductId && imeiResult.data.status === 'sold') {
                  inventoryItemIdToRestore = imeiResult.data.id;
                }
              }
              
              if (inventoryItemIdToRestore) {
                // Restore inventory item: set status back to 'in_stock' and clear sale info
                try {
                  await InventoryItemService.updateInventoryItem(inventoryItemIdToRestore, {
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
              const newStock = (purchasedProduct.stock || 0) + 1;
              await DatabaseService.updateProduct(swap.purchasedProductId, {
                stock: newStock,
              });
            }
          }
        } catch (restoreError) {
          // Continue with deletion even if restoration fails
        }

        // Remove trade-in inventory item that was added
        if (swap.tradeInImei) {
          try {
            const imeiResult = await InventoryItemService.getInventoryItemByImei(swap.tradeInImei);
            if (imeiResult.data) {
              // Check if this inventory item was created for this swap
              // (by checking if notes mention this swap)
              const notes = imeiResult.data.notes || '';
              if (notes.includes(`Swap #${swap.swapNumber}`) || notes.includes('Trade-in from swap')) {
                // Delete the inventory item
                await InventoryItemService.deleteInventoryItem(imeiResult.data.id);
              }
            }
          } catch (tradeInError) {
            // Continue with deletion even if trade-in removal fails
          }
        }
      }

      // Soft delete the swap
      const { error } = await supabase
        .from('swaps')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error: any) {
      return { data: false, error };
    }
  },

  /**
   * Search swaps by term
   */
  async searchSwaps(searchTerm: string): Promise<{ data: Swap[] | null; error: any }> {
    try {
      const term = searchTerm.toLowerCase();
      const { data, error } = await supabase
        .from('swaps')
        .select('*')
        .is('deleted_at', null)
        .or(
          `swap_number.ilike.%${term}%,customer_name.ilike.%${term}%,trade_in_imei.ilike.%${term}%,purchased_product_name.ilike.%${term}%`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const swaps = (data || []).map((swap: any) => ({
        id: swap.id,
        swapNumber: swap.swap_number,
        customerId: swap.customer_id || null,
        customerName: swap.customer_name || null,
        customerPhone: swap.customer_phone || null,
        customerEmail: swap.customer_email || null,
        customerAddress: swap.customer_address || null,
        saleId: swap.sale_id || null,
        purchasedProductId: swap.purchased_product_id,
        purchasedProductName: swap.purchased_product_name,
        purchasedProductPrice: swap.purchased_product_price,
        purchasedImei: swap.purchased_imei || null,
        tradeInProductId: swap.trade_in_product_id || null,
        tradeInProductName: swap.trade_in_product_name || null,
        tradeInImei: swap.trade_in_imei,
        tradeInCondition: swap.trade_in_condition,
        tradeInNotes: swap.trade_in_notes || null,
        tradeInValue: swap.trade_in_value,
        differencePaid: swap.difference_paid,
        paymentMethod: swap.payment_method,
        status: swap.status,
        inventoryItemId: swap.inventory_item_id || null,
        notes: swap.notes || null,
        createdAt: swap.created_at,
        updatedAt: swap.updated_at,
      }));

      return { data: swaps, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },
};

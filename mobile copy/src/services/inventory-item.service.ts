/**
 * Inventory Item Service
 * Handles IMEI-tracked inventory item operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { InventoryItem } from '../types';

export const InventoryItemService = {
  /**
   * Get all inventory items with optional filters
   */
  async getInventoryItems(filters?: {
    productId?: string;
    status?: 'in_stock' | 'sold' | 'returned' | 'defective';
    imei?: string;
  }): Promise<{ data: InventoryItem[] | null; error: any }> {
    try {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.productId) {
        query = query.eq('product_id', filters.productId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.imei) {
        query = query.ilike('imei', `%${filters.imei}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items = (data || []).map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        imei: item.imei,
        status: item.status,
        condition: item.condition,
        simType: item.sim_type || undefined,
        purchaseCost: item.purchase_cost || null,
        sellingPrice: item.selling_price || null,
        customerId: item.customer_id || null,
        saleId: item.sale_id || null,
        soldDate: item.sold_date || null,
        notes: item.notes || null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      return { data: items, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  /**
   * Get inventory item by ID
   */
  async getInventoryItemById(id: string): Promise<{ data: InventoryItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return { data: null, error: null };

      return {
        data: {
          id: data.id,
          productId: data.product_id,
          imei: data.imei,
          status: data.status,
          condition: data.condition,
          simType: data.sim_type || undefined,
          purchaseCost: data.purchase_cost || null,
          sellingPrice: data.selling_price || null,
          customerId: data.customer_id || null,
          saleId: data.sale_id || null,
          soldDate: data.sold_date || null,
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
   * Get inventory item by IMEI
   */
  async getInventoryItemByImei(imei: string): Promise<{ data: InventoryItem | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('imei', imei)
        .is('deleted_at', null)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return { data: null, error: null };
        }
        throw error;
      }
      if (!data) return { data: null, error: null };

      return {
        data: {
          id: data.id,
          productId: data.product_id,
          imei: data.imei,
          status: data.status,
          condition: data.condition,
          simType: data.sim_type || undefined,
          purchaseCost: data.purchase_cost || null,
          sellingPrice: data.selling_price || null,
          customerId: data.customer_id || null,
          saleId: data.sale_id || null,
          soldDate: data.sold_date || null,
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
   * Create a new inventory item
   */
  async createInventoryItem(
    itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ data: InventoryItem | null; error: any }> {
    try {
      // Check if IMEI already exists
      const existingCheck = await this.getInventoryItemByImei(itemData.imei);
      if (existingCheck.data) {
        return {
          data: null,
          error: { message: `IMEI ${itemData.imei} already exists in inventory` },
        };
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          product_id: itemData.productId,
          imei: itemData.imei,
          status: itemData.status || 'in_stock',
          condition: itemData.condition || 'used',
          purchase_cost: itemData.purchaseCost || null,
          selling_price: itemData.sellingPrice || null,
          sim_type: itemData.simType || null,
          customer_id: itemData.customerId || null,
          sale_id: itemData.saleId || null,
          sold_date: itemData.soldDate || null,
          notes: itemData.notes || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        data: {
          id: data.id,
          productId: data.product_id,
          imei: data.imei,
          status: data.status,
          condition: data.condition,
          simType: data.sim_type || undefined,
          purchaseCost: data.purchase_cost || null,
          sellingPrice: data.selling_price || null,
          customerId: data.customer_id || null,
          saleId: data.sale_id || null,
          soldDate: data.sold_date || null,
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
   * Update an inventory item
   */
  async updateInventoryItem(
    id: string,
    updates: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ data: InventoryItem | null; error: any }> {
    try {
      // Check for duplicate IMEI if IMEI is being updated
      if (updates.imei !== undefined) {
        const existingCheck = await this.getInventoryItemByImei(updates.imei);
        if (existingCheck.data && existingCheck.data.id !== id) {
          return {
            data: null,
            error: { message: `IMEI ${updates.imei} already exists in inventory` },
          };
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.productId !== undefined) updateData.product_id = updates.productId;
      if (updates.imei !== undefined) updateData.imei = updates.imei;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.condition !== undefined) updateData.condition = updates.condition;
      if (updates.simType !== undefined) updateData.sim_type = updates.simType || null;
      if (updates.purchaseCost !== undefined) updateData.purchase_cost = updates.purchaseCost || null;
      if (updates.sellingPrice !== undefined) updateData.selling_price = updates.sellingPrice || null;
      if (updates.customerId !== undefined) updateData.customer_id = updates.customerId || null;
      if (updates.saleId !== undefined) updateData.sale_id = updates.saleId || null;
      if (updates.soldDate !== undefined) updateData.sold_date = updates.soldDate || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { data, error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        data: {
          id: data.id,
          productId: data.product_id,
          imei: data.imei,
          status: data.status,
          condition: data.condition,
          simType: data.sim_type || undefined,
          purchaseCost: data.purchase_cost || null,
          sellingPrice: data.selling_price || null,
          customerId: data.customer_id || null,
          saleId: data.sale_id || null,
          soldDate: data.sold_date || null,
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
   * Delete an inventory item (soft delete)
   */
  async deleteInventoryItem(id: string): Promise<{ data: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error: any) {
      return { data: false, error };
    }
  },

  /**
   * Get in-stock count for a product
   */
  async getInStockCount(productId: string): Promise<{ data: number; error: any }> {
    try {
      const { count, error } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('status', 'in_stock')
        .is('deleted_at', null);

      if (error) throw error;

      return { data: count || 0, error: null };
    } catch (error: any) {
      return { data: 0, error };
    }
  },
};

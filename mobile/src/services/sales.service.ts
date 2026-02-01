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
    console.error('Error parsing sale items:', error);
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
      console.error('Error fetching sales:', error);
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
      console.error('Error fetching paginated sales:', error);
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
      console.error('Error fetching sale:', error);
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
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // First, create the sale
      const { data, error } = await supabase
        .from('sales')
        .insert({
          id,
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
          user_id: saleData.userId || null,
          cashier_name: saleData.cashierName || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      // Update inventory - deduct stock for each item
      if (saleData.status === 'completed' || !saleData.status) {
        const { DatabaseService } = await import('./database.service');
        for (const item of saleData.items) {
          try {
            // Get current product
            const products = await DatabaseService.getProducts();
            const product = products.data?.find(p => p.id === item.productId);
            
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              await DatabaseService.updateProduct(item.productId, {
                stock: newStock,
              });
            }
          } catch (stockError) {
            console.error(`Error updating stock for product ${item.productId}:`, stockError);
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
      console.error('Error creating sale:', error);
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
                console.error(`Error restoring stock for product ${item.productId}:`, stockError);
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing original sale items:', parseError);
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
            console.error(`Error updating stock for product ${item.productId}:`, stockError);
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
      console.error('Error updating sale:', error);
      throw error;
    }
  },

  /**
   * Delete a sale (soft delete)
   */
  async deleteSale(id: string): Promise<void> {
    try {
      // Get sale to restore stock
      const sale = await this.getSaleById(id);
      const { DatabaseService } = await import('./database.service');

      // Restore stock if sale was completed
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
                if (product) {
                  const newStock = (product.stock || 0) + item.quantity;
                  await DatabaseService.updateProduct(item.productId, {
                    stock: newStock,
                  });
                }
              } catch (stockError) {
                console.error(`Error restoring stock for product ${item.productId}:`, stockError);
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing sale items:', parseError);
        }
      }

      // Soft delete the sale
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  },
};


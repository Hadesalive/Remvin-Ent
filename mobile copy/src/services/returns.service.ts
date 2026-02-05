/**
 * Returns Service
 * Handles all return-related operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { Return, SaleItem } from '../types';

function safeParseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

function parseReturnItems(items: string): SaleItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      id: item.id || '',
      productId: item.productId || '',
      productName: item.productName || '',
      quantity: typeof item.quantity === 'number' ? item.quantity : 0,
      price: typeof item.price === 'number' ? item.price : 0,
      total: typeof item.total === 'number' ? item.total : 0,
      sku: item.sku || undefined,
    }));
  } catch {
    return [];
  }
}

export const ReturnsService = {
  /**
   * Get all returns
   */
  async getReturns(): Promise<Return[]> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((ret: any) => ({
        id: ret.id,
        returnNumber: ret.return_number || '',
        saleId: ret.sale_id || null,
        customerId: ret.customer_id || null,
        customerName: ret.customer_name || null,
        items: ret.items || '[]',
        subtotal: safeParseNumber(ret.subtotal),
        tax: safeParseNumber(ret.tax),
        total: safeParseNumber(ret.total),
        refundAmount: safeParseNumber(ret.refund_amount),
        refundMethod: ret.refund_method || 'cash',
        status: ret.status || 'pending',
        processedBy: ret.processed_by || null,
        notes: ret.notes || null,
        createdAt: ret.created_at,
        updatedAt: ret.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get return by ID
   */
  async getReturnById(id: string): Promise<Return | null> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        returnNumber: data.return_number || '',
        saleId: data.sale_id || null,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        items: data.items || '[]',
        subtotal: safeParseNumber(data.subtotal),
        tax: safeParseNumber(data.tax),
        total: safeParseNumber(data.total),
        refundAmount: safeParseNumber(data.refund_amount),
        refundMethod: data.refund_method || 'cash',
        status: data.status || 'pending',
        processedBy: data.processed_by || null,
        notes: data.notes || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate return number
   */
  generateReturnNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `RET-${year}${month}${day}-${random}`;
  },

  /**
   * Create a new return
   */
  async createReturn(returnData: {
    saleId?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    items: SaleItem[];
    subtotal: number;
    tax: number;
    total: number;
    refundAmount: number;
    refundMethod: 'cash' | 'store_credit' | 'original_payment' | 'exchange';
    status?: 'pending' | 'approved' | 'rejected' | 'completed';
    notes?: string | null;
    exchangeItems?: SaleItem[]; // Items given in exchange
  }): Promise<Return> {
    try {
      const id = `ret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const returnNumber = this.generateReturnNumber();
      const now = new Date().toISOString();

      // Prepare items JSON
      const itemsJson = JSON.stringify(returnData.items);
      
      // If exchange, include exchange items in notes or a separate field
      let notes = returnData.notes || '';
      if (returnData.refundMethod === 'exchange' && returnData.exchangeItems && returnData.exchangeItems.length > 0) {
        const exchangeItemsJson = JSON.stringify(returnData.exchangeItems);
        notes = notes 
          ? `${notes}\n\nEXCHANGE ITEMS:\n${exchangeItemsJson}`
          : `EXCHANGE ITEMS:\n${exchangeItemsJson}`;
      }

      const { data, error } = await supabase
        .from('returns')
        .insert({
          id,
          return_number: returnNumber,
          sale_id: returnData.saleId || null,
          customer_id: returnData.customerId || null,
          customer_name: returnData.customerName || null,
          items: itemsJson,
          subtotal: returnData.subtotal,
          tax: returnData.tax,
          total: returnData.total,
          refund_amount: returnData.refundAmount,
          refund_method: returnData.refundMethod,
          status: returnData.status || 'pending',
          processed_by: null,
          notes: notes || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        returnNumber: data.return_number || '',
        saleId: data.sale_id || null,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        items: data.items || '[]',
        subtotal: safeParseNumber(data.subtotal),
        tax: safeParseNumber(data.tax),
        total: safeParseNumber(data.total),
        refundAmount: safeParseNumber(data.refund_amount),
        refundMethod: data.refund_method || 'cash',
        status: data.status || 'pending',
        processedBy: data.processed_by || null,
        notes: data.notes || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update return status
   */
  async updateReturnStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected' | 'completed',
    processedBy?: string | null
  ): Promise<Return> {
    try {
      const { data, error } = await supabase
        .from('returns')
        .update({
          status,
          processed_by: processedBy || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        returnNumber: data.return_number || '',
        saleId: data.sale_id || null,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        items: data.items || '[]',
        subtotal: safeParseNumber(data.subtotal),
        tax: safeParseNumber(data.tax),
        total: safeParseNumber(data.total),
        refundAmount: safeParseNumber(data.refund_amount),
        refundMethod: data.refund_method || 'cash',
        status: data.status || 'pending',
        processedBy: data.processed_by || null,
        notes: data.notes || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a return (soft delete)
   */
  async deleteReturn(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('returns')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },
};

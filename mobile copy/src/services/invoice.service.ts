/**
 * Invoice Service
 * Handle invoice CRUD operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { Invoice, InvoiceItem } from '../types';

function parseInvoiceItems(items: string): InvoiceItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stringifyInvoiceItems(items: InvoiceItem[]): string {
  try {
    return JSON.stringify(items);
  } catch {
    return '[]';
  }
}

export const InvoiceService = {
  /**
   * Get all invoices
   */
  async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        customerId: invoice.customer_id || null,
        customerName: invoice.customer_name || null,
        customerEmail: invoice.customer_email || null,
        customerAddress: invoice.customer_address || null,
        customerPhone: invoice.customer_phone || null,
        items: invoice.items || '[]',
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        taxes: invoice.taxes || null,
        discount: invoice.discount || 0,
        total: invoice.total || 0,
        paidAmount: invoice.paid_amount || 0,
        status: invoice.status || 'draft',
        invoiceType: invoice.invoice_type || 'invoice',
        currency: invoice.currency || 'NLe',
        dueDate: invoice.due_date || null,
        notes: invoice.notes || null,
        terms: invoice.terms || null,
        bankDetails: invoice.bank_details || null,
        saleId: invoice.sale_id || null,
        userId: invoice.user_id || null,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        number: data.number,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        customerEmail: data.customer_email || null,
        customerAddress: data.customer_address || null,
        customerPhone: data.customer_phone || null,
        items: data.items || '[]',
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        taxes: data.taxes || null,
        discount: data.discount || 0,
        total: data.total || 0,
        paidAmount: data.paid_amount || 0,
        status: data.status || 'draft',
        invoiceType: data.invoice_type || 'invoice',
        currency: data.currency || 'NLe',
        dueDate: data.due_date || null,
        notes: data.notes || null,
        terms: data.terms || null,
        bankDetails: data.bank_details || null,
        saleId: data.sale_id || null,
        userId: data.user_id || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new invoice
   */
  async createInvoice(invoiceData: {
    number?: string;
    customerId?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerAddress?: string | null;
    customerPhone?: string | null;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    taxes?: string | null;
    discount: number;
    total: number;
    paidAmount?: number;
    status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    invoiceType?: 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery';
    currency?: string;
    dueDate?: string | null;
    notes?: string | null;
    terms?: string | null;
    bankDetails?: string | null;
    saleId?: string | null;
    userId?: string | null;
  }): Promise<Invoice> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      // Generate invoice number if not provided
      let invoiceNumber = invoiceData.number;
      if (!invoiceNumber) {
        const timestamp = Date.now().toString().slice(-6);
        invoiceNumber = `INV-${timestamp}`;
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          number: invoiceNumber,
          customer_id: invoiceData.customerId || null,
          customer_name: invoiceData.customerName || null,
          customer_email: invoiceData.customerEmail || null,
          customer_address: invoiceData.customerAddress || null,
          customer_phone: invoiceData.customerPhone || null,
          items: stringifyInvoiceItems(invoiceData.items),
          subtotal: invoiceData.subtotal,
          tax: invoiceData.tax,
          taxes: invoiceData.taxes || null,
          discount: invoiceData.discount,
          total: invoiceData.total,
          paid_amount: invoiceData.paidAmount || 0,
          status: invoiceData.status || 'draft',
          invoice_type: invoiceData.invoiceType || 'invoice',
          currency: invoiceData.currency || 'NLe',
          due_date: invoiceData.dueDate || null,
          notes: invoiceData.notes || null,
          terms: invoiceData.terms || null,
          bank_details: invoiceData.bankDetails || null,
          sale_id: invoiceData.saleId || null,
          user_id: invoiceData.userId || user?.id || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        number: data.number,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        customerEmail: data.customer_email || null,
        customerAddress: data.customer_address || null,
        customerPhone: data.customer_phone || null,
        items: data.items || '[]',
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        taxes: data.taxes || null,
        discount: data.discount || 0,
        total: data.total || 0,
        paidAmount: data.paid_amount || 0,
        status: data.status || 'draft',
        invoiceType: data.invoice_type || 'invoice',
        currency: data.currency || 'NLe',
        dueDate: data.due_date || null,
        notes: data.notes || null,
        terms: data.terms || null,
        bankDetails: data.bank_details || null,
        saleId: data.sale_id || null,
        userId: data.user_id || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update an invoice
   */
  async updateInvoice(
    id: string,
    updates: Partial<Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Invoice> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.number !== undefined) updateData.number = updates.number;
      if (updates.customerId !== undefined) updateData.customer_id = updates.customerId || null;
      if (updates.customerName !== undefined) updateData.customer_name = updates.customerName || null;
      if (updates.customerEmail !== undefined) updateData.customer_email = updates.customerEmail || null;
      if (updates.customerAddress !== undefined) updateData.customer_address = updates.customerAddress || null;
      if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone || null;
      if (updates.items !== undefined) {
        const items = typeof updates.items === 'string' 
          ? parseInvoiceItems(updates.items)
          : updates.items;
        updateData.items = stringifyInvoiceItems(items);
      }
      if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
      if (updates.tax !== undefined) updateData.tax = updates.tax;
      if (updates.taxes !== undefined) updateData.taxes = updates.taxes || null;
      if (updates.discount !== undefined) updateData.discount = updates.discount;
      if (updates.total !== undefined) updateData.total = updates.total;
      if (updates.paidAmount !== undefined) updateData.paid_amount = updates.paidAmount;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.invoiceType !== undefined) updateData.invoice_type = updates.invoiceType;
      if (updates.currency !== undefined) updateData.currency = updates.currency;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.terms !== undefined) updateData.terms = updates.terms || null;
      if (updates.bankDetails !== undefined) updateData.bank_details = updates.bankDetails || null;
      if (updates.saleId !== undefined) updateData.sale_id = updates.saleId || null;

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        number: data.number,
        customerId: data.customer_id || null,
        customerName: data.customer_name || null,
        customerEmail: data.customer_email || null,
        customerAddress: data.customer_address || null,
        customerPhone: data.customer_phone || null,
        items: data.items || '[]',
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        taxes: data.taxes || null,
        discount: data.discount || 0,
        total: data.total || 0,
        paidAmount: data.paid_amount || 0,
        status: data.status || 'draft',
        invoiceType: data.invoice_type || 'invoice',
        currency: data.currency || 'NLe',
        dueDate: data.due_date || null,
        notes: data.notes || null,
        terms: data.terms || null,
        bankDetails: data.bank_details || null,
        saleId: data.sale_id || null,
        userId: data.user_id || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete an invoice
   */
  async deleteInvoice(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },
};

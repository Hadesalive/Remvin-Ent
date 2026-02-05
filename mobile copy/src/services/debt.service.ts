/**
 * Debt Service
 * Handles all debt-related operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { Debt, DebtPayment } from '../types';

function safeParseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

export const DebtService = {
  /**
   * Get all debts
   */
  async getDebts(): Promise<Debt[]> {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((debt: any) => ({
        id: debt.id,
        customerId: debt.customer_id || null,
        amount: safeParseNumber(debt.amount),
        paid: safeParseNumber(debt.paid),
        status: debt.status || 'active',
        description: debt.description || null,
        items: debt.items || null,
        saleId: debt.sale_id || null,
        createdAt: debt.created_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get debt by ID
   */
  async getDebtById(id: string): Promise<Debt | null> {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        customerId: data.customer_id || null,
        amount: safeParseNumber(data.amount),
        paid: safeParseNumber(data.paid),
        status: data.status || 'active',
        description: data.description || null,
        items: data.items || null,
        saleId: data.sale_id || null,
        createdAt: data.created_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get debt payments
   */
  async getDebtPayments(debtId: string): Promise<DebtPayment[]> {
    try {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map((payment: any) => ({
        id: payment.id,
        debtId: payment.debt_id,
        amount: safeParseNumber(payment.amount),
        date: payment.date,
        method: payment.method || null,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new debt
   */
  async createDebt(debtData: {
    customerId?: string | null;
    amount: number;
    description?: string | null;
    items?: string | null;
    saleId?: string | null;
  }): Promise<Debt> {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('debts')
        .insert({
          id,
          customer_id: debtData.customerId || null,
          amount: debtData.amount,
          paid: 0,
          status: 'active',
          description: debtData.description || null,
          items: debtData.items || null,
          sale_id: debtData.saleId || null,
          created_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        customerId: data.customer_id || null,
        amount: safeParseNumber(data.amount),
        paid: safeParseNumber(data.paid),
        status: data.status,
        description: data.description || null,
        items: data.items || null,
        saleId: data.sale_id || null,
        createdAt: data.created_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Add a payment to a debt
   */
  async addDebtPayment(paymentData: {
    debtId: string;
    amount: number;
    method?: string | null;
  }): Promise<{ payment: DebtPayment; debt: Debt }> {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Get current debt
      const debt = await this.getDebtById(paymentData.debtId);
      if (!debt) {
        throw new Error('Debt not found');
      }

      // Calculate new paid amount
      const newPaid = debt.paid + paymentData.amount;
      const newStatus = newPaid >= debt.amount ? 'paid' : 'active';

      // Create payment
      const { data: paymentDataResult, error: paymentError } = await supabase
        .from('debt_payments')
        .insert({
          id,
          debt_id: paymentData.debtId,
          amount: paymentData.amount,
          date: now,
          method: paymentData.method || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update debt
      const { data: updatedDebt, error: debtError } = await supabase
        .from('debts')
        .update({
          paid: newPaid,
          status: newStatus,
        })
        .eq('id', paymentData.debtId)
        .select()
        .single();

      if (debtError) throw debtError;

      return {
        payment: {
          id: paymentDataResult.id,
          debtId: paymentDataResult.debt_id,
          amount: safeParseNumber(paymentDataResult.amount),
          date: paymentDataResult.date,
          method: paymentDataResult.method || null,
        },
        debt: {
          id: updatedDebt.id,
          customerId: updatedDebt.customer_id || null,
          amount: safeParseNumber(updatedDebt.amount),
          paid: safeParseNumber(updatedDebt.paid),
          status: updatedDebt.status,
          description: updatedDebt.description || null,
          items: updatedDebt.items || null,
          saleId: updatedDebt.sale_id || null,
          createdAt: updatedDebt.created_at,
        },
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a debt (soft delete)
   */
  async deleteDebt(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },
};


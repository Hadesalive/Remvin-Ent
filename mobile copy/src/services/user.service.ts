/**
 * User Service
 * Handle user CRUD operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { User } from '../types';

export const UserService = {
  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }


      return (data || []).map((user: any) => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name || user.fullName || '',
        email: user.email || null,
        phone: user.phone || null,
        role: user.role || 'cashier',
        employeeId: user.employee_id || user.employeeId || null,
        isActive: user.is_active !== false && user.is_active !== 0,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login || null,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        username: data.username,
        fullName: data.full_name || data.fullName || '',
        email: data.email || null,
        phone: data.phone || null,
        role: data.role || 'cashier',
        employeeId: data.employee_id || data.employeeId || null,
        isActive: data.is_active !== false && data.is_active !== 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastLogin: data.last_login || null,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new user
   * Note: This should call a Supabase RPC function that handles password hashing
   */
  async createUser(userData: {
    username: string;
    password: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    role: 'admin' | 'manager' | 'cashier';
    employeeId?: string | null;
  }): Promise<User> {
    try {
      const { data, error } = await supabase.rpc('mobile_create_user', {
        p_username: userData.username,
        p_password: userData.password,
        p_full_name: userData.fullName,
        p_email: userData.email || null,
        p_phone: userData.phone || null,
        p_role: userData.role,
        p_employee_id: userData.employeeId || null,
      });

      if (error) throw error;

      // The RPC should return the created user
      const user = data as any;
      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name || user.fullName || '',
        email: user.email || null,
        phone: user.phone || null,
        role: user.role || 'cashier',
        employeeId: user.employee_id || user.employeeId || null,
        isActive: user.is_active !== false,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLogin: user.last_login || null,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a user
   */
  async updateUser(
    id: string,
    updates: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>>
  ): Promise<User> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
      if (updates.email !== undefined) updateData.email = updates.email || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone || null;
      if (updates.role !== undefined) updateData.role = updates.role;
      if (updates.employeeId !== undefined) updateData.employee_id = updates.employeeId || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        username: data.username,
        fullName: data.full_name || data.fullName || '',
        email: data.email || null,
        phone: data.phone || null,
        role: data.role || 'cashier',
        employeeId: data.employee_id || data.employeeId || null,
        isActive: data.is_active !== false && data.is_active !== 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        lastLogin: data.last_login || null,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a user (or deactivate)
   */
  async deleteUser(id: string): Promise<void> {
    try {
      // Instead of deleting, we'll deactivate
      await this.updateUser(id, { isActive: false });
    } catch (error) {
      throw error;
    }
  },
};

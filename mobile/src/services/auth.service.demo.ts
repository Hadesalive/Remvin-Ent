/**
 * Demo Authentication Service
 * For development without Supabase connection
 */

import * as SecureStore from 'expo-secure-store';
import { User } from '../types';
import { SESSION_KEY } from '../lib/constants';

// Demo users for testing
const DEMO_USERS = [
  {
    id: 'demo-admin-1',
    username: 'admin',
    password: 'admin123',
    fullName: 'Demo Admin',
    email: 'admin@demo.com',
    phone: '+232 76 123 456',
    role: 'admin' as const,
    employeeId: 'EMP001',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'demo-manager-1',
    username: 'manager',
    password: 'manager123',
    fullName: 'Demo Manager',
    email: 'manager@demo.com',
    phone: '+232 76 123 457',
    role: 'manager' as const,
    employeeId: 'EMP002',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: 'demo-cashier-1',
    username: 'cashier',
    password: 'cashier123',
    fullName: 'Demo Cashier',
    email: 'cashier@demo.com',
    phone: '+232 76 123 458',
    role: 'cashier' as const,
    employeeId: 'EMP003',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  },
];

export const DemoAuthService = {
  async signIn(username: string, password: string): Promise<{ data: User | null; error: any }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const user = DEMO_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      return {
        data: null,
        error: { message: 'Invalid username or password' },
      };
    }

    // Remove password from returned user data
    const { password: _, ...userData } = user;

    return { data: userData, error: null };
  },

  async signOut(): Promise<{ error: any }> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return { error: null };
    } catch (e) {
      console.error('DemoAuthService signOut error:', e);
      return { error: e };
    }
  },

  async getCurrentUser(userId: string): Promise<{ data: User | null; error: any }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const user = DEMO_USERS.find((u) => u.id === userId);

    if (!user) {
      return {
        data: null,
        error: { message: 'User not found' },
      };
    }

    // Remove password from returned user data
    const { password: _, ...userData } = user;

    return { data: userData, error: null };
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error: any }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // In demo mode, just return success
    return { success: true, error: null };
  },
};


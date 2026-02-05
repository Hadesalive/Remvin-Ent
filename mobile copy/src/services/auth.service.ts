/**
 * Authentication Service
 * House of Electronics Mobile App
 */

import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SESSION_KEY, SESSION_EXPIRY_HOURS } from '../lib/constants';
import type { User, AuthSession, ApiResponse } from '../types';

export const AuthService = {
  /**
   * Sign in using username and password
   * Uses Supabase RPC function to authenticate against users table
   */
  async signIn(username: string, password: string): Promise<ApiResponse<User>> {
    try {
      const { data, error } = await supabase.rpc('mobile_user_login', {
        p_username: username,
        p_password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Parse the JSON response from the RPC function
      const response = data as ApiResponse<User>;

      if (response.success && response.data) {
        // Store session securely
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

        const session: AuthSession = {
          userId: response.data.id,
          expiresAt: expiresAt.toISOString(),
        };

        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));

        return { success: true, data: response.data };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error: any) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Sign out and clear session
   */
  async signOut(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch (error) {
    }
  },

  /**
   * Get current user from session
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (!sessionData) return null;

      const session: AuthSession = JSON.parse(sessionData);

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.signOut();
        return null;
      }

      // Fetch user data from Supabase
      const { data, error } = await supabase.rpc('mobile_get_user', {
        p_user_id: session.userId,
      });

      if (error || !data) {
        await this.signOut();
        return null;
      }

      const response = data as ApiResponse<User>;

      if (response.success && response.data) {
        return response.data;
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get session data
   */
  async getSession(): Promise<AuthSession | null> {
    try {
      const sessionData = await SecureStore.getItemAsync(SESSION_KEY);
      if (!sessionData) return null;

      const session: AuthSession = JSON.parse(sessionData);

      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.signOut();
        return null;
      }

      return session;
    } catch (error) {
      return null;
    }
  },

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.rpc('mobile_change_password', {
        p_user_id: userId,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const response = data as ApiResponse;
      return response;
    } catch (error: any) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  },
};

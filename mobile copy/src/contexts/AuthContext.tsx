/**
 * Authentication Context
 * Handles user authentication, session management, and RBAC
 * House of Electronics Mobile App
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '../services/auth.service';
import { DemoAuthService } from '../services/auth.service.demo';
import { ROLE_PERMISSIONS } from '../lib/constants';
import type { User, ApiResponse } from '../types';
import type { UserRole, Permission } from '../lib/constants';

// Set to true for demo mode (no Supabase connection)
const USE_DEMO_MODE = true;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<ApiResponse<User>>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const service = USE_DEMO_MODE ? DemoAuthService : AuthService;
      const { data: currentUser } = await service.getCurrentUser(''); // Empty string for init check
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(
    async (username: string, password: string): Promise<ApiResponse<User>> => {
      try {
        const service = USE_DEMO_MODE ? DemoAuthService : AuthService;
        const result = await service.signIn(username, password);

        if (result.data) {
          setUser(result.data);
          return { success: true, data: result.data };
        }

        return { success: false, error: result.error?.message || 'Login failed' };
      } catch (error: any) {
        console.error('Login error:', error);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const service = USE_DEMO_MODE ? DemoAuthService : AuthService;
      await service.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      const permissions = ROLE_PERMISSIONS[user.role as UserRole];
      return permissions ? permissions.includes(permission) : false;
    },
    [user]
  );

  const hasRole = useCallback(
    (role: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      const roles = Array.isArray(role) ? role : [role];
      return roles.includes(user.role as UserRole);
    },
    [user]
  );

  const refreshUser = useCallback(async () => {
    if (!user?.id) return;

    try {
      const service = USE_DEMO_MODE ? DemoAuthService : AuthService;
      const { data: currentUser } = await service.getCurrentUser(user.id);
      if (currentUser) {
        setUser(currentUser);
      } else {
        // User no longer valid
        await logout();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [user?.id, logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export Permission enum for easy access
export { Permission } from '../lib/constants';


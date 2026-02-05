/**
 * Cache Service
 * Manages local storage caching to reduce API calls
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Customer } from '../types';

const CACHE_KEYS = {
  PRODUCTS: '@cache:products',
  PRODUCTS_TIMESTAMP: '@cache:products_timestamp',
  CUSTOMERS: '@cache:customers',
  CUSTOMERS_TIMESTAMP: '@cache:customers_timestamp',
  PRODUCT_MODELS: '@cache:product_models',
  PRODUCT_MODELS_TIMESTAMP: '@cache:product_models_timestamp',
} as const;

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const CacheService = {
  /**
   * Get cached data if it exists and is not expired
   */
  async getCached<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired (24 hours)
      if (now - entry.timestamp > CACHE_DURATION) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      return null;
    }
  },

  /**
   * Set cached data with current timestamp
   */
  async setCached<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
    }
  },

  /**
   * Remove cached data
   */
  async removeCached(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
    }
  },

  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = Object.values(CACHE_KEYS);
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
    }
  },

  /**
   * Check if cache exists and is valid
   */
  async isCacheValid(key: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return false;

      const entry: CacheEntry<unknown> = JSON.parse(cached);
      const now = Date.now();
      
      return (now - entry.timestamp) <= CACHE_DURATION;
    } catch {
      return false;
    }
  },

  // Products cache
  async getCachedProducts(): Promise<Product[] | null> {
    return this.getCached<Product[]>(CACHE_KEYS.PRODUCTS);
  },

  async setCachedProducts(products: Product[]): Promise<void> {
    await this.setCached(CACHE_KEYS.PRODUCTS, products);
    await this.setCached(CACHE_KEYS.PRODUCTS_TIMESTAMP, Date.now());
  },

  async invalidateProductsCache(): Promise<void> {
    await this.removeCached(CACHE_KEYS.PRODUCTS);
    await this.removeCached(CACHE_KEYS.PRODUCTS_TIMESTAMP);
  },

  // Customers cache
  async getCachedCustomers(): Promise<Customer[] | null> {
    return this.getCached<Customer[]>(CACHE_KEYS.CUSTOMERS);
  },

  async setCachedCustomers(customers: Customer[]): Promise<void> {
    await this.setCached(CACHE_KEYS.CUSTOMERS, customers);
    await this.setCached(CACHE_KEYS.CUSTOMERS_TIMESTAMP, Date.now());
  },

  async invalidateCustomersCache(): Promise<void> {
    await this.removeCached(CACHE_KEYS.CUSTOMERS);
    await this.removeCached(CACHE_KEYS.CUSTOMERS_TIMESTAMP);
  },

  // Product Models cache
  async getCachedProductModels(): Promise<unknown[] | null> {
    return this.getCached<unknown[]>(CACHE_KEYS.PRODUCT_MODELS);
  },

  async setCachedProductModels(models: unknown[]): Promise<void> {
    await this.setCached(CACHE_KEYS.PRODUCT_MODELS, models);
    await this.setCached(CACHE_KEYS.PRODUCT_MODELS_TIMESTAMP, Date.now());
  },

  async invalidateProductModelsCache(): Promise<void> {
    await this.removeCached(CACHE_KEYS.PRODUCT_MODELS);
    await this.removeCached(CACHE_KEYS.PRODUCT_MODELS_TIMESTAMP);
  },
};

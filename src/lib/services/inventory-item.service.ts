import { BaseService } from './base.service';
import { InventoryItem, ApiResponse } from '@/lib/types/core';

export interface InventoryItemFilters {
  productId?: string;
  status?: 'in_stock' | 'sold' | 'returned' | 'defective';
  imei?: string;
}

export class InventoryItemService extends BaseService {
  constructor() {
    super();
  }

  async getInventoryItems(filters?: InventoryItemFilters): Promise<ApiResponse<InventoryItem[]>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getInventoryItems(filters) as {
          success: boolean;
          data?: InventoryItem[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<InventoryItem[]>(result.error || 'Failed to fetch inventory items');
        }

        return this.createSuccessResponse(result.data || []);
      }

      return this.createErrorResponse<InventoryItem[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<InventoryItem[]>(error);
    }
  }

  async getInventoryItemById(id: string): Promise<ApiResponse<InventoryItem | null>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getInventoryItem(id) as {
          success: boolean;
          data?: InventoryItem | null;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<InventoryItem | null>(result.error || 'Failed to fetch inventory item');
        }

        return this.createSuccessResponse(result.data || null);
      }

      return this.createErrorResponse<InventoryItem | null>('Electron IPC not available');
    } catch (error) {
      return this.handleError<InventoryItem | null>(error);
    }
  }

  async getInventoryItemByImei(imei: string): Promise<ApiResponse<InventoryItem | null>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getInventoryItemByImei(imei) as {
          success: boolean;
          data?: InventoryItem | null;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<InventoryItem | null>(result.error || 'Failed to fetch inventory item');
        }

        return this.createSuccessResponse(result.data || null);
      }

      return this.createErrorResponse<InventoryItem | null>('Electron IPC not available');
    } catch (error) {
      return this.handleError<InventoryItem | null>(error);
    }
  }

  async createInventoryItem(itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<InventoryItem>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.createInventoryItem(itemData) as {
          success: boolean;
          data?: InventoryItem;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<InventoryItem>(result.error || 'Failed to create inventory item');
        }

        return this.createSuccessResponse(result.data!);
      }

      return this.createErrorResponse<InventoryItem>('Electron IPC not available');
    } catch (error) {
      return this.handleError<InventoryItem>(error);
    }
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<ApiResponse<InventoryItem>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateInventoryItem(id, updates) as {
          success: boolean;
          data?: InventoryItem;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<InventoryItem>(result.error || 'Failed to update inventory item');
        }

        return this.createSuccessResponse(result.data!);
      }

      return this.createErrorResponse<InventoryItem>('Electron IPC not available');
    } catch (error) {
      return this.handleError<InventoryItem>(error);
    }
  }

  async deleteInventoryItem(id: string): Promise<ApiResponse<boolean>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.deleteInventoryItem(id) as {
          success: boolean;
          data?: boolean;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<boolean>(result.error || 'Failed to delete inventory item');
        }

        return this.createSuccessResponse(result.data || true);
      }

      return this.createErrorResponse<boolean>('Electron IPC not available');
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }
}

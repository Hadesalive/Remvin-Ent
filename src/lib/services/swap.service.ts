import { Swap, ApiResponse } from '@/lib/types/core';

export class SwapService {
  // Get all swaps
  async getAllSwaps(): Promise<ApiResponse<Swap[]>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.getSwaps) {
        const result = await window.electronAPI.getSwaps() as ApiResponse<Swap[]>;
        return {
          success: result.success,
          data: result.data || [],
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available', data: [] };
    } catch (error) {
      console.error('Error getting swaps:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get swaps',
        data: []
      };
    }
  }

  // Get swap by ID
  async getSwapById(id: string): Promise<ApiResponse<Swap | null>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.getSwapById) {
        const result = await window.electronAPI.getSwapById(id) as ApiResponse<Swap>;
        return {
          success: result.success,
          data: result.data || null,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available', data: null };
    } catch (error) {
      console.error('Error getting swap:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get swap',
        data: null
      };
    }
  }

  // Create new swap
  async createSwap(swapData: Omit<Swap, 'id' | 'createdAt' | 'updatedAt' | 'swapNumber'>): Promise<ApiResponse<Swap>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.createSwap) {
        const result = await window.electronAPI.createSwap(swapData) as ApiResponse<Swap>;
        return {
          success: result.success,
          data: result.data,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available' };
    } catch (error) {
      console.error('Error creating swap:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create swap'
      };
    }
  }

  // Update swap
  async updateSwap(id: string, updates: Partial<Omit<Swap, 'id' | 'createdAt' | 'updatedAt' | 'swapNumber'>>): Promise<ApiResponse<Swap>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.updateSwap) {
        const result = await window.electronAPI.updateSwap(id, updates) as ApiResponse<Swap>;
        return {
          success: result.success,
          data: result.data,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available' };
    } catch (error) {
      console.error('Error updating swap:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update swap'
      };
    }
  }

  // Delete swap
  async deleteSwap(id: string): Promise<ApiResponse<void>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.deleteSwap) {
        const result = await window.electronAPI.deleteSwap(id) as ApiResponse<boolean>;
        return {
          success: result.success,
          error: result.error
        };
      }
      return { success: false, error: 'Electron IPC not available' };
    } catch (error) {
      console.error('Error deleting swap:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete swap'
      };
    }
  }

  // Get swaps by status
  async getSwapsByStatus(status: Swap['status']): Promise<ApiResponse<Swap[]>> {
    const result = await this.getAllSwaps();
    if (result.success && result.data) {
      const filtered = result.data.filter(swap => swap.status === status);
      return { success: true, data: filtered };
    }
    return result;
  }

  // Get swaps by customer
  async getSwapsByCustomer(customerId: string): Promise<ApiResponse<Swap[]>> {
    const result = await this.getAllSwaps();
    if (result.success && result.data) {
      const filtered = result.data.filter(swap => swap.customerId === customerId);
      return { success: true, data: filtered };
    }
    return result;
  }

  // Search swaps
  async searchSwaps(searchTerm: string): Promise<ApiResponse<Swap[]>> {
    const result = await this.getAllSwaps();
    if (result.success && result.data) {
      const term = searchTerm.toLowerCase();
      const filtered = result.data.filter(
        swap =>
          swap.swapNumber.toLowerCase().includes(term) ||
          swap.customerName?.toLowerCase().includes(term) ||
          swap.tradeInImei?.toLowerCase().includes(term) ||
          swap.purchasedProductName?.toLowerCase().includes(term) ||
          swap.tradeInProductName?.toLowerCase().includes(term) ||
          swap.notes?.toLowerCase().includes(term)
      );
      return { success: true, data: filtered };
    }
    return result;
  }
}

// Export singleton instance
export const swapService = new SwapService();

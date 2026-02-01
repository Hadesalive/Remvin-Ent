/**
 * Accessory Service
 * Handles product accessory operations via Electron IPC
 */

interface Accessory {
  id: string;
  productModelId: string;
  accessoryProductId: string;
  isMandatory: boolean;
  defaultQuantity: number;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  accessory?: {
    id: string;
    name: string;
    price: number;
    stock: number;
    image?: string;
  };
}

interface AddAccessoryOptions {
  isMandatory?: boolean;
  defaultQuantity?: number;
  displayOrder?: number;
  linkedProductId?: string;
}

class AccessoryService {
  async getAccessoriesForModel(productModelId: string): Promise<{ success: boolean; data?: Accessory[]; error?: string }> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getAccessoriesForModel(productModelId) as {
          success: boolean;
          data?: Accessory[];
          error?: string;
        };
        return result;
      }
      return { success: false, error: 'Electron API not available' };
    } catch (error) {
      console.error('Error fetching accessories for model:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async addAccessoryToModel(
    productModelId: string,
    accessoryProductId: string,
    options?: AddAccessoryOptions
  ): Promise<{ success: boolean; data?: Accessory; error?: string }> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.addAccessoryToModel(productModelId, accessoryProductId, options) as {
          success: boolean;
          data?: Accessory;
          error?: string;
        };
        return result;
      }
      return { success: false, error: 'Electron API not available' };
    } catch (error) {
      console.error('Error adding accessory to model:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateAccessory(
    id: string,
    updates: { isMandatory?: boolean; defaultQuantity?: number; displayOrder?: number }
  ): Promise<{ success: boolean; data?: Accessory; error?: string }> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateAccessory(id, updates) as {
          success: boolean;
          data?: Accessory;
          error?: string;
        };
        return result;
      }
      return { success: false, error: 'Electron API not available' };
    } catch (error) {
      console.error('Error updating accessory:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async removeAccessoryFromModel(id: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.removeAccessoryFromModel(id) as {
          success: boolean;
          data?: boolean;
          error?: string;
        };
        return result;
      }
      return { success: false, error: 'Electron API not available' };
    } catch (error) {
      console.error('Error removing accessory from model:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const accessoryService = new AccessoryService();

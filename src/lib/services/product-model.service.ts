import { BaseService } from './base.service';
import { ProductModel, ApiResponse } from '@/lib/types/core';

export class ProductModelService extends BaseService {
  constructor() {
    super();
  }

  async getAllProductModels(): Promise<ApiResponse<ProductModel[]>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProductModels() as {
          success: boolean;
          data?: ProductModel[];
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<ProductModel[]>(result.error || 'Failed to fetch product models');
        }

        return this.createSuccessResponse(result.data || []);
      }

      return this.createErrorResponse<ProductModel[]>('Electron IPC not available');
    } catch (error) {
      return this.handleError<ProductModel[]>(error);
    }
  }

  async getProductModelById(id: string): Promise<ApiResponse<ProductModel | null>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getProductModel(id) as {
          success: boolean;
          data?: ProductModel | null;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<ProductModel | null>(result.error || 'Failed to fetch product model');
        }

        return this.createSuccessResponse(result.data || null);
      }

      return this.createErrorResponse<ProductModel | null>('Electron IPC not available');
    } catch (error) {
      return this.handleError<ProductModel | null>(error);
    }
  }

  async createProductModel(modelData: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ProductModel>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.createProductModel(modelData) as {
          success: boolean;
          data?: ProductModel;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<ProductModel>(result.error || 'Failed to create product model');
        }

        return this.createSuccessResponse(result.data!);
      }

      return this.createErrorResponse<ProductModel>('Electron IPC not available');
    } catch (error) {
      return this.handleError<ProductModel>(error);
    }
  }

  async updateProductModel(id: string, updates: Partial<ProductModel>): Promise<ApiResponse<ProductModel>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.updateProductModel(id, updates) as {
          success: boolean;
          data?: ProductModel;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<ProductModel>(result.error || 'Failed to update product model');
        }

        return this.createSuccessResponse(result.data!);
      }

      return this.createErrorResponse<ProductModel>('Electron IPC not available');
    } catch (error) {
      return this.handleError<ProductModel>(error);
    }
  }

  async deleteProductModel(id: string): Promise<ApiResponse<boolean>> {
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.deleteProductModel(id) as {
          success: boolean;
          data?: boolean;
          error?: string;
        };

        if (!result.success) {
          return this.createErrorResponse<boolean>(result.error || 'Failed to delete product model');
        }

        return this.createSuccessResponse(result.data || true);
      }

      return this.createErrorResponse<boolean>('Electron IPC not available');
    } catch (error) {
      return this.handleError<boolean>(error);
    }
  }
}

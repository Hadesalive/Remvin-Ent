/**
 * Product Model Service
 * Handles product model operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { ProductModel } from '../types';

export const ProductModelService = {
  /**
   * Get all product models
   */
  async getProductModels(): Promise<{ data: ProductModel[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('product_models')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      const models = (data || []).map((model: any) => {
        // Parse colors - handle multiple formats
        let colors: string[] = [];
        if (model.colors) {
          if (Array.isArray(model.colors)) {
            colors = model.colors;
          } else if (typeof model.colors === 'string') {
            try {
              const parsed = JSON.parse(model.colors);
              colors = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('Failed to parse colors JSON:', e);
            }
          }
        }

        // Parse storage_options - handle multiple formats
        let storageOptions: string[] = [];
        if (model.storage_options) {
          if (Array.isArray(model.storage_options)) {
            storageOptions = model.storage_options;
          } else if (typeof model.storage_options === 'string') {
            try {
              const parsed = JSON.parse(model.storage_options);
              storageOptions = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('Failed to parse storage_options JSON:', e);
            }
          }
        }

        const parsedModel = {
          id: model.id,
          name: model.name,
          brand: model.brand || null,
          description: model.description || null,
          category: model.category || null,
          colors,
          storageOptions,
          supportsPhysicalSim: model.supports_physical_sim ?? null,
          supportsEsim: model.supports_esim ?? null,
          physicalSimPrice: model.physical_sim_price ?? null,
          eSimPrice: model.esim_price ?? null,
          isActive: model.is_active === 1 || model.is_active === true,
          createdAt: model.created_at,
          updatedAt: model.updated_at,
        };

        // Debug logging
        if (colors.length > 0 || storageOptions.length > 0) {
          console.log(`[ProductModel] ${model.name}: ${storageOptions.length} storage options, ${colors.length} colors`);
        }

        return parsedModel;
      });

      return { data: models, error: null };
    } catch (error: any) {
      console.error('Error fetching product models:', error);
      return { data: null, error };
    }
  },

  /**
   * Get product model by ID
   */
  async getProductModelById(id: string): Promise<{ data: ProductModel | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('product_models')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      // Handle PGRST116 error (no rows found) gracefully
      if (error) {
        // PGRST116 means no rows found - this is not an error, just return null
        if (error.code === 'PGRST116') {
          return { data: null, error: null };
        }
        throw error;
      }
      
      if (!data) return { data: null, error: null };

      // Parse colors - handle multiple formats
      let colors: string[] = [];
      if (data.colors) {
        if (Array.isArray(data.colors)) {
          colors = data.colors;
        } else if (typeof data.colors === 'string') {
          try {
            const parsed = JSON.parse(data.colors);
            colors = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse colors JSON:', e);
          }
        }
      }

      // Parse storage_options - handle multiple formats
      let storageOptions: string[] = [];
      if (data.storage_options) {
        if (Array.isArray(data.storage_options)) {
          storageOptions = data.storage_options;
        } else if (typeof data.storage_options === 'string') {
          try {
            const parsed = JSON.parse(data.storage_options);
            storageOptions = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse storage_options JSON:', e);
          }
        }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
          brand: data.brand || null,
          description: data.description || null,
          category: data.category || null,
          colors,
          storageOptions,
          supportsPhysicalSim: data.supports_physical_sim ?? null,
          supportsEsim: data.supports_esim ?? null,
          physicalSimPrice: data.physical_sim_price ?? null,
          eSimPrice: data.esim_price ?? null,
          isActive: data.is_active === 1 || data.is_active === true,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error fetching product model:', error);
      return { data: null, error };
    }
  },

  /**
   * Create a new product model
   */
  async createProductModel(
    modelData: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<{ data: ProductModel | null; error: any }> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('product_models')
        .insert({
          name: modelData.name,
          brand: modelData.brand || null,
          description: modelData.description || null,
          category: modelData.category || null,
          colors: modelData.colors && modelData.colors.length > 0 ? modelData.colors : [],
          storage_options: modelData.storageOptions && modelData.storageOptions.length > 0 ? modelData.storageOptions : [],
          supports_physical_sim: modelData.supportsPhysicalSim ?? null,
          supports_esim: modelData.supportsEsim ?? null,
          physical_sim_price: modelData.physicalSimPrice ?? null,
          esim_price: modelData.eSimPrice ?? null,
          is_active: modelData.isActive !== false ? 1 : 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      // Parse colors and storageOptions
      let colors: string[] = [];
      if (data.colors) {
        if (Array.isArray(data.colors)) {
          colors = data.colors;
        } else if (typeof data.colors === 'string') {
          try {
            const parsed = JSON.parse(data.colors);
            colors = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse colors JSON:', e);
          }
        }
      }

      let storageOptions: string[] = [];
      if (data.storage_options) {
        if (Array.isArray(data.storage_options)) {
          storageOptions = data.storage_options;
        } else if (typeof data.storage_options === 'string') {
          try {
            const parsed = JSON.parse(data.storage_options);
            storageOptions = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse storage_options JSON:', e);
          }
        }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
          brand: data.brand || null,
          description: data.description || null,
          category: data.category || null,
          colors,
          storageOptions,
          supportsPhysicalSim: data.supports_physical_sim ?? null,
          supportsEsim: data.supports_esim ?? null,
          physicalSimPrice: data.physical_sim_price ?? null,
          eSimPrice: data.esim_price ?? null,
          isActive: data.is_active === 1 || data.is_active === true,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error creating product model:', error);
      return { data: null, error };
    }
  },

  /**
   * Update a product model
   */
  async updateProductModel(
    id: string,
    updates: Partial<Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ data: ProductModel | null; error: any }> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.brand !== undefined) updateData.brand = updates.brand || null;
      if (updates.description !== undefined) updateData.description = updates.description || null;
      if (updates.category !== undefined) updateData.category = updates.category || null;
      if (updates.colors !== undefined) updateData.colors = updates.colors || [];
      if (updates.storageOptions !== undefined) updateData.storage_options = updates.storageOptions || [];
      if (updates.supportsPhysicalSim !== undefined) updateData.supports_physical_sim = updates.supportsPhysicalSim;
      if (updates.supportsEsim !== undefined) updateData.supports_esim = updates.supportsEsim;
      if (updates.physicalSimPrice !== undefined) updateData.physical_sim_price = updates.physicalSimPrice;
      if (updates.eSimPrice !== undefined) updateData.esim_price = updates.eSimPrice;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

      const { data, error } = await supabase
        .from('product_models')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Parse colors and storageOptions
      let colors: string[] = [];
      if (data.colors) {
        if (Array.isArray(data.colors)) {
          colors = data.colors;
        } else if (typeof data.colors === 'string') {
          try {
            const parsed = JSON.parse(data.colors);
            colors = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse colors JSON:', e);
          }
        }
      }

      let storageOptions: string[] = [];
      if (data.storage_options) {
        if (Array.isArray(data.storage_options)) {
          storageOptions = data.storage_options;
        } else if (typeof data.storage_options === 'string') {
          try {
            const parsed = JSON.parse(data.storage_options);
            storageOptions = Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            console.warn('Failed to parse storage_options JSON:', e);
          }
        }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
          brand: data.brand || null,
          description: data.description || null,
          category: data.category || null,
          colors,
          storageOptions,
          supportsPhysicalSim: data.supports_physical_sim ?? null,
          supportsEsim: data.supports_esim ?? null,
          physicalSimPrice: data.physical_sim_price ?? null,
          eSimPrice: data.esim_price ?? null,
          isActive: data.is_active === 1 || data.is_active === true,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Error updating product model:', error);
      return { data: null, error };
    }
  },

  /**
   * Delete a product model (soft delete)
   */
  async deleteProductModel(id: string): Promise<{ data: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('product_models')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error: any) {
      console.error('Error deleting product model:', error);
      return { data: false, error };
    }
  },
};

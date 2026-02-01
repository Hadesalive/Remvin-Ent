import { supabase } from '../lib/supabase';
import { Product, Customer } from '../types';
import { InventoryItemService } from './inventory-item.service';

export const DatabaseService = {
    // Products
    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null)
            .order('name');
        
        if (error) return { data: null, error };
        
        // Process products and calculate stock for IMEI-tracked products
        const products = await Promise.all((data || []).map(async (p: any) => {
            let stock = p.stock || 0;
            
            // If product has productModelId, calculate stock from inventory_items
            if (p.product_model_id) {
                const stockResult = await InventoryItemService.getInStockCount(p.id);
                if (stockResult.error) {
                    console.error(`Error calculating stock for product ${p.id}:`, stockResult.error);
                    // Keep original stock value on error
                } else {
                    stock = stockResult.data || 0;
                }
            }
            
            return {
                id: p.id,
                name: p.name,
                description: p.description || undefined,
                price: p.price,
                cost: p.cost || undefined,
                stock: stock,
                minStock: p.min_stock || undefined,
                sku: p.sku || undefined,
                category: p.category || undefined,
                image: p.image || undefined,
                productModelId: p.product_model_id || undefined,
                storage: p.storage || undefined,
                color: p.color || undefined,
                supportsPhysicalSim: p.supports_physical_sim ?? undefined,
                supportsEsim: p.supports_esim ?? undefined,
                physicalSimPrice: p.physical_sim_price ?? null,
                eSimPrice: p.esim_price ?? null,
                isActive: p.is_active === 1 || p.is_active === true,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
            } as Product;
        }));
        
        return { data: products, error: null };
    },

    async getProductById(id: string) {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single();
            
            if (error) return { data: null, error };
            if (!data) return { data: null, error: null };

            let stock = data.stock || 0;
            
            // If product has productModelId, calculate stock from inventory_items
            if (data.product_model_id) {
                const stockResult = await InventoryItemService.getInStockCount(id);
                if (stockResult.error) {
                    console.error(`Error calculating stock for product ${id}:`, stockResult.error);
                    // Keep original stock value on error
                } else {
                    stock = stockResult.data || 0;
                }
            }
            
            return {
                data: {
                    id: data.id,
                    name: data.name,
                    description: data.description || undefined,
                    price: data.price,
                    cost: data.cost || undefined,
                    stock: stock,
                    minStock: data.min_stock || undefined,
                    sku: data.sku || undefined,
                    category: data.category || undefined,
                    image: data.image || undefined,
                    productModelId: data.product_model_id || undefined,
                    storage: data.storage || undefined,
                    color: data.color || undefined,
                    supportsPhysicalSim: data.supports_physical_sim ?? undefined,
                    supportsEsim: data.supports_esim ?? undefined,
                    physicalSimPrice: data.physical_sim_price ?? null,
                    eSimPrice: data.esim_price ?? null,
                    isActive: data.is_active === 1 || data.is_active === true,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as Product,
                error: null,
            };
        } catch (error: any) {
            console.error('Error fetching product by ID:', error);
            return { data: null, error };
        }
    },

    async getProductBySku(sku: string) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('sku', sku)
            .single();
        return { data: data as Product, error };
    },

    // Customers
    async getCustomers() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .is('deleted_at', null)
            .order('name');
        return { data: data as Customer[], error };
    },

    async getCustomerById(id: string) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single();
        if (error) return { data: null, error };
        return {
            data: {
                id: data.id,
                name: data.name,
                email: data.email || undefined,
                phone: data.phone || undefined,
                address: data.address || undefined,
                city: data.city || undefined,
                state: data.state || undefined,
                zip: data.zip || undefined,
                country: data.country || undefined,
                company: data.company || undefined,
                notes: data.notes || undefined,
                storeCredit: data.store_credit || 0,
                isActive: data.is_active === 1 || data.is_active === true,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            } as Customer,
            error: null,
        };
    },

    async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) {
        try {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('customers')
                .insert({
                    name: customerData.name,
                    email: customerData.email || null,
                    phone: customerData.phone || null,
                    address: customerData.address || null,
                    city: customerData.city || null,
                    state: customerData.state || null,
                    zip: customerData.zip || null,
                    country: customerData.country || null,
                    company: customerData.company || null,
                    notes: customerData.notes || null,
                    store_credit: customerData.storeCredit || 0,
                    is_active: (customerData.isActive !== false) ? 1 : 0,
                    created_at: now,
                    updated_at: now,
                })
                .select()
                .single();

            if (error) throw error;

            return {
                data: {
                    id: data.id,
                    name: data.name,
                    email: data.email || undefined,
                    phone: data.phone || undefined,
                    address: data.address || undefined,
                    city: data.city || undefined,
                    state: data.state || undefined,
                    zip: data.zip || undefined,
                    country: data.country || undefined,
                    company: data.company || undefined,
                    notes: data.notes || undefined,
                    storeCredit: data.store_credit || 0,
                    isActive: data.is_active === 1 || data.is_active === true,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as Customer,
                error: null,
            };
        } catch (error: any) {
            console.error('Error creating customer:', error);
            return { data: null, error };
        }
    },

    async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) {
        try {
            const updateData: any = {
                updated_at: new Date().toISOString(),
            };

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.email !== undefined) updateData.email = updates.email || null;
            if (updates.phone !== undefined) updateData.phone = updates.phone || null;
            if (updates.address !== undefined) updateData.address = updates.address || null;
            if (updates.city !== undefined) updateData.city = updates.city || null;
            if (updates.state !== undefined) updateData.state = updates.state || null;
            if (updates.zip !== undefined) updateData.zip = updates.zip || null;
            if (updates.country !== undefined) updateData.country = updates.country || null;
            if (updates.company !== undefined) updateData.company = updates.company || null;
            if (updates.notes !== undefined) updateData.notes = updates.notes || null;
            if (updates.storeCredit !== undefined) updateData.store_credit = updates.storeCredit;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

            const { data, error } = await supabase
                .from('customers')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return {
                data: {
                    id: data.id,
                    name: data.name,
                    email: data.email || undefined,
                    phone: data.phone || undefined,
                    address: data.address || undefined,
                    city: data.city || undefined,
                    state: data.state || undefined,
                    zip: data.zip || undefined,
                    country: data.country || undefined,
                    company: data.company || undefined,
                    notes: data.notes || undefined,
                    storeCredit: data.store_credit || 0,
                    isActive: data.is_active === 1 || data.is_active === true,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as Customer,
                error: null,
            };
        } catch (error: any) {
            console.error('Error updating customer:', error);
            return { data: null, error };
        }
    },

    async deleteCustomer(id: string) {
        try {
            const { error } = await supabase
                .from('customers')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            return { data: true, error: null };
        } catch (error: any) {
            console.error('Error deleting customer:', error);
            return { data: null, error };
        }
    },

    async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
        try {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('products')
                .insert({
                    name: productData.name,
                    description: productData.description || null,
                    price: productData.price,
                    cost: productData.cost || null,
                    stock: productData.stock || 0,
                    min_stock: productData.minStock || null,
                    sku: productData.sku || null,
                    category: productData.category || null,
                    image: productData.image || null,
                    product_model_id: productData.productModelId || null,
                    storage: productData.storage || null,
                    color: productData.color || null,
                    supports_physical_sim: productData.supportsPhysicalSim ?? null,
                    supports_esim: productData.supportsEsim ?? null,
                    physical_sim_price: productData.physicalSimPrice ?? null,
                    esim_price: productData.eSimPrice ?? null,
                    is_active: (productData.isActive !== false) ? 1 : 0,
                    created_at: now,
                    updated_at: now,
                })
                .select()
                .single();

            if (error) throw error;

            return {
                data: {
                    id: data.id,
                    name: data.name,
                    description: data.description || undefined,
                    price: data.price,
                    cost: data.cost || undefined,
                    stock: data.stock || 0,
                    minStock: data.min_stock || undefined,
                    sku: data.sku || undefined,
                    category: data.category || undefined,
                    image: data.image || undefined,
                    productModelId: data.product_model_id || undefined,
                    storage: data.storage || undefined,
                    color: data.color || undefined,
                    supportsPhysicalSim: data.supports_physical_sim ?? undefined,
                    supportsEsim: data.supports_esim ?? undefined,
                    physicalSimPrice: data.physical_sim_price ?? null,
                    eSimPrice: data.esim_price ?? null,
                    isActive: data.is_active === 1 || data.is_active === true,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as Product,
                error: null,
            };
        } catch (error: any) {
            console.error('Error creating product:', error);
            return { data: null, error };
        }
    },

    async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) {
        try {
            const updateData: any = {
                updated_at: new Date().toISOString(),
            };

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description || null;
            if (updates.price !== undefined) updateData.price = updates.price;
            if (updates.cost !== undefined) updateData.cost = updates.cost || null;
            if (updates.stock !== undefined) updateData.stock = updates.stock;
            if (updates.minStock !== undefined) updateData.min_stock = updates.minStock || null;
            if (updates.sku !== undefined) updateData.sku = updates.sku || null;
            if (updates.category !== undefined) updateData.category = updates.category || null;
            if (updates.image !== undefined) updateData.image = updates.image || null;
            if (updates.productModelId !== undefined) updateData.product_model_id = updates.productModelId || null;
            if (updates.storage !== undefined) updateData.storage = updates.storage || null;
            if (updates.color !== undefined) updateData.color = updates.color || null;
            if (updates.supportsPhysicalSim !== undefined) updateData.supports_physical_sim = updates.supportsPhysicalSim ?? null;
            if (updates.supportsEsim !== undefined) updateData.supports_esim = updates.supportsEsim ?? null;
            if (updates.physicalSimPrice !== undefined) updateData.physical_sim_price = updates.physicalSimPrice ?? null;
            if (updates.eSimPrice !== undefined) updateData.esim_price = updates.eSimPrice ?? null;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

            const { data, error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            return {
                data: {
                    id: data.id,
                    name: data.name,
                    description: data.description || undefined,
                    price: data.price,
                    cost: data.cost || undefined,
                    stock: data.stock || 0,
                    minStock: data.min_stock || undefined,
                    sku: data.sku || undefined,
                    category: data.category || undefined,
                    image: data.image || undefined,
                    productModelId: data.product_model_id || undefined,
                    storage: data.storage || undefined,
                    color: data.color || undefined,
                    isActive: data.is_active === 1 || data.is_active === true,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at,
                } as Product,
                error: null,
            };
        } catch (error: any) {
            console.error('Error updating product:', error);
            return { data: null, error };
        }
    },

    async deleteProduct(id: string, options?: { forceDelete?: boolean }) {
        try {
            // First, get the product to check if it has productModelId (IMEI tracking)
            const productsResult = await this.getProducts();
            if (productsResult.error || !productsResult.data) {
                throw new Error('Failed to fetch product for deletion');
            }
            
            const product = productsResult.data.find(p => p.id === id);
            if (!product) {
                throw new Error('Product not found');
            }
            
            // If product has IMEI tracking (productModelId), handle inventory items
            if (product.productModelId) {
                // If forceDelete is true, delete all inventory items
                // Otherwise, check if any inventory items exist and warn
                const inventoryResult = await InventoryItemService.getInventoryItems({ productId: id });
                
                if (inventoryResult.data && inventoryResult.data.length > 0) {
                    if (options?.forceDelete) {
                        // Soft delete all inventory items
                        await Promise.all(
                            inventoryResult.data.map(item => 
                                InventoryItemService.deleteInventoryItem(item.id)
                            )
                        );
                    } else {
                        // Don't delete if there are inventory items (unless forceDelete)
                        // In Supabase, we'll allow deletion but log a warning
                        console.warn(`Product ${id} has ${inventoryResult.data.length} inventory items. Consider using forceDelete option.`);
                    }
                }
            }
            
            // Delete the product (soft delete)
            const { error } = await supabase
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            return { data: true, error: null };
        } catch (error: any) {
            console.error('Error deleting product:', error);
            return { data: null, error };
        }
    },

    // Invoices (To be expanded)
    async createInvoiceLineItem(invoiceId: string, item: any) {
        // Placeholder for future logic if we save to DB directly
    }
};

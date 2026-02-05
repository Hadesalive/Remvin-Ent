import { supabase } from '../lib/supabase';
import { Product, Customer } from '../types';
import { InventoryItemService } from './inventory-item.service';
import { CacheService } from './cache.service';

// Helper function to process product data from database
async function processProductData(p: Record<string, unknown>): Promise<Product> {
    let stock = typeof p.stock === 'number' ? p.stock : 0;
    
    // If product has productModelId, calculate stock from inventory_items
    if (p.product_model_id) {
        const productId = typeof p.id === 'string' ? p.id : '';
        const stockResult = await InventoryItemService.getInStockCount(productId);
        if (stockResult.error) {
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
        newPrice: p.new_price ?? null,
        usedPrice: p.used_price ?? null,
        isActive: p.is_active === 1 || p.is_active === true,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    } as Product;
}

export const DatabaseService = {
    // Products
    async getProducts(forceRefresh = false) {
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = await CacheService.getCachedProducts();
            if (cached) {
                return { data: cached, error: null };
            }
        }
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null)
            .order('name');
        
        if (error) return { data: null, error };
        
        // Process products and calculate stock for IMEI-tracked products
        const products = await Promise.all((data || []).map(processProductData));
        
        // Cache the results
        await CacheService.setCachedProducts(products);
        
        return { data: products, error: null };
    },

    async getProductById(id: string) {
        try {
            // Try cache first
            const cached = await CacheService.getCachedProducts();
            if (cached) {
                const cachedProduct = cached.find(p => p.id === id);
                if (cachedProduct) {
                    return { data: cachedProduct, error: null };
                }
            }
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single();
            
            if (error) return { data: null, error };
            if (!data) return { data: null, error: null };

            const product = await processProductData(data);
            
            // Update cache with this single product
            if (cached) {
                const index = cached.findIndex(p => p.id === id);
                if (index >= 0) {
                    cached[index] = product;
                } else {
                    cached.push(product);
                }
                await CacheService.setCachedProducts(cached);
            }
            
            return { data: product, error: null };
        } catch (error: unknown) {
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
    async getCustomers(forceRefresh = false) {
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = await CacheService.getCachedCustomers();
            if (cached) {
                return { data: cached, error: null };
            }
        }
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .is('deleted_at', null)
            .order('name');
        
        if (error) return { data: null, error };
        
        const customers = (data || []).map((c: Record<string, unknown>) => ({
            id: c.id,
            name: c.name,
            email: c.email || undefined,
            phone: c.phone || undefined,
            address: c.address || undefined,
            city: c.city || undefined,
            state: c.state || undefined,
            zip: c.zip || undefined,
            country: c.country || undefined,
            company: c.company || undefined,
            notes: c.notes || undefined,
            storeCredit: c.store_credit || 0,
            isActive: c.is_active === 1 || c.is_active === true,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
        })) as Customer[];
        
        // Cache the results
        await CacheService.setCachedCustomers(customers);
        
        return { data: customers, error: null };
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

            const newCustomer = {
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
            } as Customer;
            
            // Update cache incrementally
            const cached = await CacheService.getCachedCustomers();
            if (cached) {
                cached.push(newCustomer);
                cached.sort((a, b) => a.name.localeCompare(b.name));
                await CacheService.setCachedCustomers(cached);
            } else {
                await CacheService.invalidateCustomersCache();
            }

            return { data: newCustomer, error: null };
        } catch (error: unknown) {
            return { data: null, error };
        }
    },

    async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) {
        try {
            const updateData: Record<string, unknown> = {
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

            const updatedCustomer = {
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
            } as Customer;
            
            // Update cache incrementally
            const cached = await CacheService.getCachedCustomers();
            if (cached) {
                const index = cached.findIndex(c => c.id === id);
                if (index >= 0) {
                    cached[index] = updatedCustomer;
                    await CacheService.setCachedCustomers(cached);
                } else {
                    cached.push(updatedCustomer);
                    cached.sort((a, b) => a.name.localeCompare(b.name));
                    await CacheService.setCachedCustomers(cached);
                }
            } else {
                await CacheService.invalidateCustomersCache();
            }

            return { data: updatedCustomer, error: null };
        } catch (error: unknown) {
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

            // Update cache incrementally - remove customer from cache
            const cached = await CacheService.getCachedCustomers();
            if (cached) {
                const filtered = cached.filter(c => c.id !== id);
                await CacheService.setCachedCustomers(filtered);
            } else {
                await CacheService.invalidateCustomersCache();
            }

            return { data: true, error: null };
        } catch (error: unknown) {
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
                    new_price: productData.newPrice ?? null,
                    used_price: productData.usedPrice ?? null,
                    is_active: (productData.isActive !== false) ? 1 : 0,
                    created_at: now,
                    updated_at: now,
                })
                .select()
                .single();

            if (error) throw error;

            // Process the product data (calculate stock for IMEI-tracked products)
            const newProduct = await processProductData(data);
            
            // Update cache incrementally - add new product to cache
            const cached = await CacheService.getCachedProducts();
            if (cached) {
                cached.push(newProduct);
                cached.sort((a, b) => a.name.localeCompare(b.name));
                await CacheService.setCachedProducts(cached);
            } else {
                // If no cache, invalidate to force refresh on next getProducts call
                await CacheService.invalidateProductsCache();
            }

            return { data: newProduct, error: null };
        } catch (error: unknown) {
            return { data: null, error };
        }
    },

    async updateProduct(id: string, updates: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) {
        try {
            const updateData: Record<string, unknown> = {
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
            if (updates.newPrice !== undefined) updateData.new_price = updates.newPrice ?? null;
            if (updates.usedPrice !== undefined) updateData.used_price = updates.usedPrice ?? null;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive ? 1 : 0;

            const { data, error } = await supabase
                .from('products')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Process the product data (calculate stock for IMEI-tracked products)
            const updatedProduct = await processProductData(data);
            
            // Update cache incrementally - update product in cache
            const cached = await CacheService.getCachedProducts();
            if (cached) {
                const index = cached.findIndex(p => p.id === id);
                if (index >= 0) {
                    cached[index] = updatedProduct;
                    await CacheService.setCachedProducts(cached);
                } else {
                    // Product not in cache, add it
                    cached.push(updatedProduct);
                    cached.sort((a, b) => a.name.localeCompare(b.name));
                    await CacheService.setCachedProducts(cached);
                }
            } else {
                // If no cache, invalidate to force refresh on next getProducts call
                await CacheService.invalidateProductsCache();
            }

            return { data: updatedProduct, error: null };
        } catch (error: unknown) {
            return { data: null, error };
        }
    },

    async deleteProduct(id: string, options?: { forceDelete?: boolean }) {
        try {
            // Try to get product from cache first (no API call)
            let product: Product | undefined;
            const cached = await CacheService.getCachedProducts();
            if (cached) {
                product = cached.find(p => p.id === id);
            }
            
            // If not in cache, fetch just this one product (single record)
            if (!product) {
                const productResult = await this.getProductById(id);
                if (productResult.error || !productResult.data) {
                    throw new Error('Failed to fetch product for deletion');
                }
                product = productResult.data;
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
                    }
                }
            }
            
            // Delete the product (soft delete)
            const { error } = await supabase
                .from('products')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // Update cache incrementally - remove product from cache (no API call needed)
            const cachedAfterDelete = await CacheService.getCachedProducts();
            if (cachedAfterDelete) {
                const filtered = cachedAfterDelete.filter(p => p.id !== id);
                await CacheService.setCachedProducts(filtered);
            } else {
                // If no cache, invalidate to force refresh on next getProducts call
                await CacheService.invalidateProductsCache();
            }

            return { data: true, error: null };
        } catch (error: unknown) {
            return { data: null, error };
        }
    },

};

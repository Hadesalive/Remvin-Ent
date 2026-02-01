import { supabase } from '../lib/supabase';
import { Product, Customer } from '../types';

export const DatabaseService = {
    // Products
    async getProducts() {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null)
            .order('name');
        return { data: data as Product[], error };
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
            const id = `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('customers')
                .insert({
                    id,
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
            const id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('products')
                .insert({
                    id,
                    name: productData.name,
                    description: productData.description || null,
                    price: productData.price,
                    cost: productData.cost || null,
                    stock: productData.stock || 0,
                    min_stock: productData.minStock || null,
                    sku: productData.sku || null,
                    category: productData.category || null,
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

    async deleteProduct(id: string) {
        try {
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

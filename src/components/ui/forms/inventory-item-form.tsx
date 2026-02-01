'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { FormSection } from '@/components/ui/forms';
import { InventoryItem, Product } from '@/lib/types/core';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { productService, inventoryItemService } from '@/lib/services';

interface InventoryItemFormProps {
  item?: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  title?: string;
  productId?: string; // Pre-select a product
}

interface InventoryItemFormData {
  productId: string;
  imei: string;
  condition: 'new' | 'refurbished' | 'used';
}

export function InventoryItemForm({ 
  item, 
  isOpen, 
  onClose, 
  onSave, 
  title = "Add Inventory Item",
  productId: preSelectedProductId
}: InventoryItemFormProps) {
  const [formData, setFormData] = useState<InventoryItemFormData>({
    productId: '',
    imei: '',
    condition: 'new'
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await productService.getAllProducts();
        if (response.success && response.data) {
          // Only show products that have a productModelId (electronics)
          setProducts(response.data.filter(p => p.productModelId && p.isActive !== false));
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      }
    };
    
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setFormData({
        productId: item.productId || '',
        imei: item.imei || '',
        condition: item.condition || 'new'
      });
    } else {
      setFormData({
        productId: preSelectedProductId || '',
        imei: '',
        condition: 'new'
      });
    }
    setErrors({});
  }, [item, isOpen, preSelectedProductId]);

  // Normalize IMEI: remove spaces, dashes, convert to uppercase
  const normalizeIMEI = (imei: string): string => {
    return imei.replace(/[\s-]/g, '').toUpperCase();
  };

  // Validate IMEI format (15 or 17 digits)
  const validateIMEIFormat = (imei: string): boolean => {
    const normalized = normalizeIMEI(imei);
    return /^\d{15}$|^\d{17}$/.test(normalized);
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId.trim()) {
      newErrors.productId = 'Product is required';
    }

    if (!formData.imei.trim()) {
      newErrors.imei = 'IMEI is required';
    } else {
      const normalizedIMEI = normalizeIMEI(formData.imei);
      
      // Validate format
      if (!validateIMEIFormat(formData.imei)) {
        newErrors.imei = 'IMEI must be exactly 15 or 17 digits';
      } else {
        // Check for duplicates (only if not editing the same item)
        try {
          const existingItem = await inventoryItemService.getInventoryItemByImei(normalizedIMEI);
          if (existingItem.success && existingItem.data) {
            // If editing, allow if it's the same item
            if (!item || existingItem.data.id !== item.id) {
              newErrors.imei = 'This IMEI is already registered to another item';
            }
          }
        } catch (error) {
          console.error('Error checking IMEI:', error);
          // Don't block on check error, let database constraint handle it
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) {
      return;
    }

    setLoading(true);
    try {
      // Normalize IMEI before saving
      const normalizedIMEI = normalizeIMEI(formData.imei);
      
      await onSave({
        productId: formData.productId.trim(),
        imei: normalizedIMEI,
        condition: formData.condition,
        status: 'in_stock'
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to save inventory item:', error);
      // Handle database constraint errors
      if (error.message?.includes('UNIQUE constraint') || error.message?.includes('duplicate')) {
        setErrors(prev => ({ ...prev, imei: 'This IMEI is already registered' }));
      } else {
        setErrors(prev => ({ ...prev, _general: error.message || 'Failed to save inventory item' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InventoryItemFormData, value: string | 'new' | 'refurbished' | 'used') => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/20 dark:bg-black/20 flex items-center justify-center p-4 z-50">
      <div 
        className="rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="p-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors._general && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{errors._general}</p>
            </div>
          )}
          <div className="space-y-6">
            <FormSection title="Item Information">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium block" 
                    style={{ color: 'var(--foreground)' }}
                  >
                    Product *
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => handleInputChange('productId', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--background)',
                      borderColor: errors.productId ? 'red' : 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                    required
                  >
                    <option value="">Select a product</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.storage ? `(${product.storage})` : ''} {product.color ? `- ${product.color}` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="text-sm text-red-600">{errors.productId}</p>
                  )}
                </div>

                <Input
                  label="IMEI *"
                  value={formData.imei}
                  onChange={(e) => {
                    // Auto-format: remove non-digits, limit to 17 chars
                    const value = e.target.value.replace(/\D/g, '').slice(0, 17);
                    handleInputChange('imei', value);
                  }}
                  error={errors.imei}
                  placeholder="Enter 15 or 17-digit IMEI number"
                  required
                />
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  IMEI must be exactly 15 or 17 digits (spaces and dashes will be removed automatically)
                </p>

                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium block" 
                    style={{ color: 'var(--foreground)' }}
                  >
                    Condition *
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => handleInputChange('condition', e.target.value as 'new' | 'refurbished' | 'used')}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                    required
                  >
                    <option value="new">New</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                  </select>
                </div>
              </div>
            </FormSection>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6" style={{ borderColor: 'var(--border)' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {item ? 'Update Item' : 'Add Item'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

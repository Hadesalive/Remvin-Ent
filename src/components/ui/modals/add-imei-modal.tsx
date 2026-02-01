import React, { useState, useEffect } from 'react';
import { Modal, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { productModelService, productService, inventoryItemService } from '@/lib/services';
import { ProductModel, Product } from '@/lib/types/core';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddImeiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product, imei: string) => void;
}

export function AddImeiModal({
  isOpen,
  onClose,
  onSuccess
}: AddImeiModalProps) {
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [imei, setImei] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProductModels();
      // Reset form
      setSelectedModelId('');
      setSelectedStorage('');
      setSelectedColor('');
      setImei('');
      setPrice(0);
    }
  }, [isOpen]);

  const loadProductModels = async () => {
    try {
      const response = await productModelService.getAllProductModels();
      if (response.success && response.data) {
        setProductModels(response.data.filter(m => m.isActive !== false));
      }
    } catch (error) {
      console.error('Failed to load product models:', error);
      setToast({ message: 'Failed to load product models', type: 'error' });
    }
  };

  const selectedModel = productModels.find(m => m.id === selectedModelId);
  const storageOptions = selectedModel?.storageOptions || [];
  const colorOptions = selectedModel?.colors || [];

  // Reset dependent fields when model changes
  useEffect(() => {
    if (selectedModelId) {
      setSelectedStorage('');
      setSelectedColor('');
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (selectedStorage) {
      setSelectedColor('');
    }
  }, [selectedStorage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedModelId || !selectedStorage || !selectedColor || !imei.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    if (price <= 0) {
      setToast({ message: 'Please enter a valid price', type: 'error' });
      return;
    }

    // Validate IMEI format (15 digits)
    if (!/^\d{15}$/.test(imei.trim())) {
      setToast({ message: 'IMEI must be exactly 15 digits', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Check if IMEI already exists
      const existingItemResponse = await inventoryItemService.getInventoryItemByImei(imei.trim());
      if (existingItemResponse.success && existingItemResponse.data) {
        setToast({ message: 'IMEI already exists in inventory', type: 'error' });
        setLoading(false);
        return;
      }

      // Find or create product variant
      const allProductsResponse = await productService.getAllProducts();
      if (!allProductsResponse.success || !allProductsResponse.data) {
        setToast({ message: 'Failed to load products', type: 'error' });
        setLoading(false);
        return;
      }

      let product = allProductsResponse.data.find(
        p => p.productModelId === selectedModelId &&
        p.storage === selectedStorage &&
        p.color === selectedColor
      );

      // Create product if it doesn't exist
      if (!product) {
        const productName = `${selectedModel?.name} ${selectedStorage} ${selectedColor}`;
        const createResponse = await productService.createProduct({
          name: productName,
          price: price,
          productModelId: selectedModelId,
          storage: selectedStorage,
          color: selectedColor,
          isActive: true,
        });

        if (!createResponse.success || !createResponse.data) {
          setToast({ message: createResponse.error || 'Failed to create product', type: 'error' });
          setLoading(false);
          return;
        }

        product = createResponse.data;
      } else {
        // Update price if different
        if (product.price !== price) {
          const updateResponse = await productService.updateProduct(product.id, { price });
          if (updateResponse.success && updateResponse.data) {
            product = updateResponse.data;
          }
        }
      }

      // Create inventory item with IMEI
      const createItemResponse = await inventoryItemService.createInventoryItem({
        productId: product.id,
        imei: imei.trim(),
        status: 'in_stock',
        condition: 'new',
      });

      if (!createItemResponse.success) {
        setToast({ message: createItemResponse.error || 'Failed to create inventory item', type: 'error' });
        setLoading(false);
        return;
      }

      // Success - call onSuccess callback
      onSuccess(product, imei.trim());
      setToast({ message: 'Product and IMEI added successfully', type: 'success' });
      
      // Reset and close after short delay
      setTimeout(() => {
        onClose();
        setSelectedModelId('');
        setSelectedStorage('');
        setSelectedColor('');
        setImei('');
        setPrice(0);
      }, 500);
    } catch (error) {
      console.error('Error adding IMEI:', error);
      setToast({ message: 'Failed to add IMEI', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
        onClick={onClose}
      >
        <div 
          className="rounded w-full max-w-md border shadow-lg"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                Add IMEI to Product
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <Select
              label="Product Model *"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              options={[
                { value: '', label: 'Select model...' },
                ...productModels.map(m => ({ value: m.id, label: m.name }))
              ]}
            />

            {selectedModel && storageOptions.length > 0 && (
              <Select
                label="Storage *"
                value={selectedStorage}
                onChange={(e) => setSelectedStorage(e.target.value)}
                options={[
                  { value: '', label: 'Select storage...' },
                  ...storageOptions.map(s => ({ value: s, label: s }))
                ]}
              />
            )}

            {selectedStorage && colorOptions.length > 0 && (
              <Select
                label="Color *"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                options={[
                  { value: '', label: 'Select color...' },
                  ...colorOptions.map(c => ({ value: c, label: c }))
                ]}
              />
            )}

            <Input
              label="IMEI *"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
              placeholder="15 digits"
              maxLength={15}
              className="font-mono"
            />

            <Input
              label="Price *"
              type="number"
              step="0.01"
              value={price || ''}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              min="0"
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-1.5 text-xs rounded hover:opacity-70 transition-opacity"
                style={{ 
                  color: 'var(--muted-foreground)',
                  backgroundColor: 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedModelId || !selectedStorage || !selectedColor || !imei.trim() || price <= 0}
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast, white)'
                }}
              >
                {loading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <Toast
          variant={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}
    </>
  );
}

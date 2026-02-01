import React, { useState, useEffect, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Textarea, Select } from '@/components/ui/forms';
import { accessoryService, productService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

interface Accessory {
  id: string;
  productModelId: string;
  accessoryProductId: string;
  linkedProductId?: string; // If set, this accessory is linked to a specific product variant
  isMandatory: boolean;
  defaultQuantity: number;
  displayOrder: number;
  accessory?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category?: string;
    sku?: string;
    image?: string;
    productModelId?: string; // To distinguish general vs model-specific
  };
  linkedProduct?: {
    id: string;
    name: string;
    storage?: string;
    color?: string;
  };
}

interface AccessoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  productModelId: string;
  productModelName: string;
  onUpdate?: () => void;
}

export function AccessoryManagementModal({
  isOpen,
  onClose,
  productModelId,
  productModelName,
  onUpdate
}: AccessoryManagementModalProps) {
  const { formatCurrency } = useSettings();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Create accessory form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [accessoryType, setAccessoryType] = useState<'general' | 'model-specific'>('model-specific');
  const [linkToProduct, setLinkToProduct] = useState(false); // If true, link to specific product; if false, link to model
  const [selectedProductId, setSelectedProductId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    isMandatory: false,
    defaultQuantity: 1
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && productModelId) {
      loadAccessories();
      loadProducts();
    }
  }, [isOpen, productModelId]);

  const loadProducts = async () => {
    try {
      const response = await productService.getAllProducts();
      if (response.success && response.data) {
        // Filter to only show products that belong to this model
        const modelProducts = response.data.filter(
          p => p.productModelId === productModelId
        );
        setProducts(modelProducts);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadAccessories = async () => {
    try {
      setLoading(true);
      const response = await accessoryService.getAccessoriesForModel(productModelId);
      if (response.success && response.data) {
        setAccessories(response.data as Accessory[]);
      }
    } catch (error) {
      console.error('Error loading accessories:', error);
      setToast({ message: 'Failed to load accessories', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    if (formData.defaultQuantity < 1) {
      newErrors.defaultQuantity = 'Quantity must be at least 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccessory = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      // Step 1: Create the product (always as a standalone product, no productModelId)
      // Accessories are independent products that can be sold on their own
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: formData.price,
        stock: formData.stock,
        category: formData.category.trim() || 'Accessories',
        // Accessories are standalone products - no productModelId
        productModelId: undefined,
        isActive: true
      };

      const productResponse = await productService.createProduct(productData);
      
      if (!productResponse.success || !productResponse.data) {
        throw new Error(productResponse.error || 'Failed to create product');
      }

      const newProduct = productResponse.data;

      // Step 2: Optionally link it to the model for suggestions (this is just for upselling, not required)
      // The product can be sold independently even without this link
      try {
        const accessoryResponse = await accessoryService.addAccessoryToModel(
          productModelId,
          newProduct.id,
          {
            linkedProductId: (accessoryType === 'model-specific' && linkToProduct && selectedProductId) ? selectedProductId : undefined,
            isMandatory: formData.isMandatory,
            defaultQuantity: formData.defaultQuantity
          }
        );

        // If linking fails, that's okay - the product is still created and can be sold
        if (!accessoryResponse.success) {
          console.warn('Failed to link accessory to model, but product was created:', accessoryResponse.error);
        }
      } catch (linkError) {
        // Linking is optional - product is still created and usable
        console.warn('Failed to link accessory, but product was created:', linkError);
      }

      setToast({ message: 'Accessory product created successfully! It can be sold independently and will appear in product searches.', type: 'success' });
      setShowAddForm(false);
      resetForm();
      loadAccessories();
      onUpdate?.();
    } catch (error) {
      console.error('Error creating accessory:', error);
      setToast({ 
        message: error instanceof Error ? error.message : 'Failed to create accessory', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      isMandatory: false,
      defaultQuantity: 1
    });
    setAccessoryType('model-specific');
    setLinkToProduct(false);
    setSelectedProductId('');
    setErrors({});
  };

  const handleRemoveAccessory = async (accessoryId: string, accessoryProductId: string) => {
    if (!confirm('Remove this accessory? The product will remain in your inventory but will no longer be linked to this model.')) return;

    try {
      const response = await accessoryService.removeAccessoryFromModel(accessoryId);
      if (response.success) {
        setToast({ message: 'Accessory removed successfully', type: 'success' });
        loadAccessories();
        onUpdate?.();
      } else {
        setToast({ message: response.error || 'Failed to remove accessory', type: 'error' });
      }
    } catch (error) {
      console.error('Error removing accessory:', error);
      setToast({ message: 'Failed to remove accessory', type: 'error' });
    }
  };

  const handleToggleMandatory = async (accessoryId: string, currentValue: boolean) => {
    try {
      const response = await accessoryService.updateAccessory(accessoryId, {
        isMandatory: !currentValue
      });
      if (response.success) {
        setToast({ 
          message: `Accessory marked as ${!currentValue ? 'mandatory' : 'optional'}`, 
          type: 'success' 
        });
        loadAccessories();
        onUpdate?.();
      } else {
        setToast({ message: response.error || 'Failed to update accessory', type: 'error' });
      }
    } catch (error) {
      console.error('Error updating accessory:', error);
      setToast({ message: 'Failed to update accessory', type: 'error' });
    }
  };

  // Group accessories by type
  const groupedAccessories = useMemo(() => {
    const general: Accessory[] = [];
    const modelLinked: Accessory[] = [];
    const productLinked: Accessory[] = [];

    accessories.forEach(acc => {
      if (acc.accessory?.productModelId) {
        if (acc.linkedProductId) {
          productLinked.push(acc);
        } else {
          modelLinked.push(acc);
        }
      } else {
        general.push(acc);
      }
    });

    return { general, modelLinked, productLinked };
  }, [accessories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)'
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
              Manage Accessories
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {productModelName}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && !showAddForm ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add Accessory Form */}
              {showAddForm ? (
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--background)',
                    borderColor: 'var(--border)'
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>
                      Create New Accessory
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}>
                      <XMarkIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Info message */}
                    <div className="p-3 rounded-lg text-xs" style={{ 
                      backgroundColor: 'var(--muted)', 
                      color: 'var(--muted-foreground)' 
                    }}>
                      <p className="font-medium mb-1">Note:</p>
                      <p>This will create a standalone product that can be sold independently. Linking to models is optional and only used for sales suggestions.</p>
                    </div>

                    {/* Accessory Type Selection - for linking suggestions only */}
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Suggestion Link (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setAccessoryType('model-specific')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            accessoryType === 'model-specific'
                              ? 'border-accent bg-accent/10'
                              : 'border-transparent hover:border-accent/50'
                          }`}
                          style={{ 
                            backgroundColor: accessoryType === 'model-specific' ? 'var(--accent)' + '1A' : 'var(--background)',
                            borderColor: accessoryType === 'model-specific' ? 'var(--accent)' : 'var(--border)'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <DevicePhoneMobileIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                            <div className="text-left">
                              <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                                Model-Specific
                              </div>
                              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                Suggest for this model
                              </div>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccessoryType('general')}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            accessoryType === 'general'
                              ? 'border-accent bg-accent/10'
                              : 'border-transparent hover:border-accent/50'
                          }`}
                          style={{ 
                            backgroundColor: accessoryType === 'general' ? 'var(--accent)' + '1A' : 'var(--background)',
                            borderColor: accessoryType === 'general' ? 'var(--accent)' : 'var(--border)'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <GlobeAltIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                            <div className="text-left">
                              <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                                General
                              </div>
                              <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                Suggest for all models
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Product Selection for Model-Specific */}
                    {accessoryType === 'model-specific' && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            id="linkToProduct"
                            checked={linkToProduct}
                            onChange={(e) => {
                              setLinkToProduct(e.target.checked);
                              if (!e.target.checked) {
                                setSelectedProductId('');
                              }
                            }}
                            className="rounded"
                          />
                          <label 
                            htmlFor="linkToProduct" 
                            className="text-sm"
                            style={{ color: 'var(--foreground)' }}
                          >
                            Link to specific product variant (optional)
                          </label>
                        </div>
                        {linkToProduct && (
                          <Select
                            label="Product Variant"
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            options={[
                              { value: '', label: 'Select a product variant' },
                              ...products.map(p => ({
                                value: p.id,
                                label: `${p.name}${p.storage ? ` - ${p.storage}` : ''}${p.color ? ` ${p.color}` : ''}`
                              }))
                            ]}
                          />
                        )}
                      </div>
                    )}

                    <Input
                      label="Accessory Name *"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      placeholder={accessoryType === 'model-specific' ? 'e.g., iPhone 17 Case' : 'e.g., USB-C Charger'}
                      error={errors.name}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        label="Price *"
                        step="0.01"
                        value={formData.price || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, price: val }));
                          if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                        }}
                        error={errors.price}
                        placeholder="0.00"
                      />
                      <Input
                        type="number"
                        label="Stock *"
                        value={formData.stock || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, stock: val }));
                          if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
                        }}
                        error={errors.stock}
                        placeholder="0"
                      />
                    </div>

                    <Input
                      label="Category"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="e.g., Cases, Chargers, Protectors"
                    />

                    <Textarea
                      label="Description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={2}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        label="Default Quantity"
                        value={formData.defaultQuantity || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setFormData(prev => ({ ...prev, defaultQuantity: val }));
                          if (errors.defaultQuantity) setErrors(prev => ({ ...prev, defaultQuantity: '' }));
                        }}
                        min="1"
                        error={errors.defaultQuantity}
                      />
                      
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="isMandatory"
                          checked={formData.isMandatory}
                          onChange={(e) => setFormData(prev => ({ ...prev, isMandatory: e.target.checked }))}
                          className="rounded"
                        />
                        <label 
                          htmlFor="isMandatory" 
                          className="text-sm"
                          style={{ color: 'var(--foreground)' }}
                        >
                          Mandatory
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={handleCreateAccessory} className="flex-1" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Accessory'}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="w-full"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create New Accessory
                </Button>
              )}

              {/* Accessories List */}
              {accessories.length === 0 ? (
                <div className="text-center py-12">
                  <AdjustmentsHorizontalIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No accessories linked to this model
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Create accessory products that can be sold independently. Linking them here will show suggestions when selling products from this model.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Model-Linked Accessories */}
                  {groupedAccessories.modelLinked.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <DevicePhoneMobileIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                          Model-Linked ({groupedAccessories.modelLinked.length})
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ 
                          backgroundColor: 'var(--muted)', 
                          color: 'var(--muted-foreground)' 
                        }}>
                          All variants
                        </span>
                      </div>
                      <div className="space-y-2">
                        {groupedAccessories.modelLinked.map((accessory) => (
                          <AccessoryCard
                            key={accessory.id}
                            accessory={accessory}
                            formatCurrency={formatCurrency}
                            onToggleMandatory={() => handleToggleMandatory(accessory.id, accessory.isMandatory)}
                            onRemove={() => handleRemoveAccessory(accessory.id, accessory.accessoryProductId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product-Linked Accessories */}
                  {groupedAccessories.productLinked.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <DevicePhoneMobileIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                          Product-Specific ({groupedAccessories.productLinked.length})
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ 
                          backgroundColor: 'var(--muted)', 
                          color: 'var(--muted-foreground)' 
                        }}>
                          Specific variants
                        </span>
                      </div>
                      <div className="space-y-2">
                        {groupedAccessories.productLinked.map((accessory) => (
                          <AccessoryCard
                            key={accessory.id}
                            accessory={accessory}
                            formatCurrency={formatCurrency}
                            onToggleMandatory={() => handleToggleMandatory(accessory.id, accessory.isMandatory)}
                            onRemove={() => handleRemoveAccessory(accessory.id, accessory.accessoryProductId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Accessories */}
                  {groupedAccessories.general.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GlobeAltIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                          General ({groupedAccessories.general.length})
                        </h3>
                      </div>
                      <div className="space-y-2">
                        {groupedAccessories.general.map((accessory) => (
                          <AccessoryCard
                            key={accessory.id}
                            accessory={accessory}
                            formatCurrency={formatCurrency}
                            onToggleMandatory={() => handleToggleMandatory(accessory.id, accessory.isMandatory)}
                            onRemove={() => handleRemoveAccessory(accessory.id, accessory.accessoryProductId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-end gap-3 p-6 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.type === 'success' ? 'success' : 'error'}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}
    </div>
  );
}

// Accessory Card Component
function AccessoryCard({
  accessory,
  formatCurrency,
  onToggleMandatory,
  onRemove
}: {
  accessory: Accessory;
  formatCurrency: (amount: number) => string;
  onToggleMandatory: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{ 
        backgroundColor: 'var(--background)',
        borderColor: 'var(--border)'
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>
                  {accessory.accessory?.name || 'Unknown Product'}
                </h4>
                {accessory.isMandatory && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300 whitespace-nowrap">
                    Mandatory
                  </span>
                )}
                {accessory.accessory?.category && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                    {accessory.accessory.category}
                  </span>
                )}
              </div>
              {accessory.accessory?.description && (
                <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                  {accessory.accessory.description}
                </p>
              )}
              {accessory.linkedProduct && (
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  For: {accessory.linkedProduct.name}
                  {accessory.linkedProduct.storage && ` - ${accessory.linkedProduct.storage}`}
                  {accessory.linkedProduct.color && ` ${accessory.linkedProduct.color}`}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Price:</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(accessory.accessory?.price || 0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Qty:</span>
              <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {accessory.defaultQuantity}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Stock:</span>
              <span className={`text-sm font-medium ${
                (accessory.accessory?.stock || 0) === 0 
                  ? 'text-red-600' 
                  : (accessory.accessory?.stock || 0) < 5 
                    ? 'text-orange-600' 
                    : 'text-green-600'
              }`}>
                {accessory.accessory?.stock || 0}
              </span>
            </div>
            {accessory.accessory?.sku && (
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>SKU:</span>
                <span className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                  {accessory.accessory.sku}
                </span>
              </div>
            )}
          </div>
        </div>
      
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleMandatory}
            title={accessory.isMandatory ? 'Mark as Optional' : 'Mark as Mandatory'}
          >
            {accessory.isMandatory ? (
              <CheckCircleIcon className="h-4 w-4 text-orange-600" />
            ) : (
              <CheckCircleIcon className="h-4 w-4 text-gray-400" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
            title="Remove Accessory"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

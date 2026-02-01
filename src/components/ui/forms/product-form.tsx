'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/core';
import { Input, Textarea, Switch } from '@/components/ui/forms';
import { FormSection } from '@/components/ui/forms';
import { Product, ProductModel } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { productService, productModelService } from '@/lib/services';
import { XMarkIcon, PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ProductFormProps {
  product?: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | void>;
  title?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  cost?: number; // Optional cost
  category: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  productModelId?: string;
  storage?: string;
  color?: string;
}

export function ProductForm({ 
  product, 
  isOpen, 
  onClose, 
  onSave, 
  title = "Add Product" 
}: ProductFormProps) {
  const { formatCurrency } = useSettings();
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    cost: undefined as any, // Allow undefined for optional cost
    category: '',
    stock: 0,
    minStock: 0,
    isActive: true,
    productModelId: undefined,
    storage: undefined,
    color: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  
  // Category management
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  // Product Models
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);

  // Load existing categories from products
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await productService.getAllProducts();
        if (response.success && response.data) {
          const uniqueCategories = Array.from(
            new Set(
              response.data
                .map(p => p.category)
                .filter((cat): cat is string => Boolean(cat?.trim()))
            )
          ).sort();
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);
  
  // Load product models
  useEffect(() => {
    const loadProductModels = async () => {
      try {
        const response = await productModelService.getAllProductModels();
        if (response.success && response.data) {
          setProductModels(response.data.filter(m => m.isActive !== false));
        }
      } catch (error) {
        console.error('Failed to load product models:', error);
      }
    };
    
    if (isOpen) {
      loadProductModels();
      // Refresh models every 30 seconds while form is open to catch deletions
      const interval = setInterval(loadProductModels, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);
  
  // Update selected model when productModelId changes
  useEffect(() => {
    if (formData.productModelId) {
      const model = productModels.find(m => m.id === formData.productModelId);
      setSelectedModel(model || null);
      
      // If model not found, clear the selection and show error
      if (!model) {
        setErrors(prev => ({ ...prev, productModelId: 'Selected model no longer exists. Please select a different model.' }));
        setFormData(prev => ({ ...prev, productModelId: undefined, storage: undefined, color: undefined }));
      } else {
        // Clear model error if model exists
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.productModelId;
          return newErrors;
        });
      }
    } else {
      setSelectedModel(null);
    }
  }, [formData.productModelId, productModels]);
  
  // Auto-generate product name from model + storage + color
  useEffect(() => {
    if (selectedModel && formData.storage && formData.color) {
      const generatedName = `${selectedModel.name} ${formData.storage} ${formData.color}`;
      setFormData(prev => ({ ...prev, name: generatedName }));
    } else if (selectedModel && formData.storage) {
      const generatedName = `${selectedModel.name} ${formData.storage}`;
      setFormData(prev => ({ ...prev, name: generatedName }));
    } else if (selectedModel) {
      setFormData(prev => ({ ...prev, name: selectedModel.name }));
    }
  }, [selectedModel, formData.storage, formData.color]);

  // Update category input when formData.category changes
  useEffect(() => {
    setCategoryInput(formData.category || '');
  }, [formData.category]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown]);

  useEffect(() => {
    // Check for model in URL params
    const params = new URLSearchParams(window.location.search);
    const modelIdFromUrl = params.get('model');

    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost !== undefined && product.cost !== null ? product.cost : undefined as any,
        category: product.category || '',
        stock: product.stock || 0,
        minStock: product.minStock || 0,
        isActive: product.isActive !== false,
        productModelId: product.productModelId,
        storage: product.storage,
        color: product.color
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        cost: undefined as any,
        category: '',
        stock: 0,
        minStock: 0,
        isActive: true,
        productModelId: modelIdFromUrl || undefined,
        storage: undefined,
        color: undefined
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    // Price validation - allow 0 for free products, but not negative
    if (formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    // Cost validation - warn if cost > price (negative margin)
    if (formData.cost !== undefined && formData.cost !== null) {
      if (formData.cost < 0) {
        newErrors.cost = 'Cost cannot be negative';
      } else if (formData.cost > formData.price && formData.price > 0) {
        // Warning, not error - allow but warn user
        newErrors.cost = 'Cost is higher than price. This will result in a loss per unit.';
      }
    }

    // Model validation
    if (formData.productModelId) {
      const model = productModels.find(m => m.id === formData.productModelId);
      if (!model) {
        newErrors.productModelId = 'Selected model no longer exists';
      } else {
        // Validate storage option exists in model
        if (formData.storage) {
          if (!model.storageOptions || model.storageOptions.length === 0) {
            newErrors.storage = 'Selected model has no storage options defined';
          } else if (!model.storageOptions.includes(formData.storage)) {
            newErrors.storage = `"${formData.storage}" is not a valid option for this model`;
          }
        }
        
        // Validate color option exists in model
        if (formData.color) {
          if (!model.colors || model.colors.length === 0) {
            newErrors.color = 'Selected model has no color options defined';
          } else if (!model.colors.includes(formData.color)) {
            newErrors.color = `"${formData.color}" is not a valid option for this model`;
          }
        }
        
        // Require storage and color if model is selected
        if (!formData.storage && model.storageOptions && model.storageOptions.length > 0) {
          newErrors.storage = 'Storage capacity is required for this model';
        }
        if (!formData.color && model.colors && model.colors.length > 0) {
          newErrors.color = 'Color is required for this model';
        }
      }
    }

    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }

    if (formData.minStock < 0) {
      newErrors.minStock = 'Minimum stock cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: formData.price,
        cost: formData.cost !== undefined && formData.cost !== null ? formData.cost : undefined,
        category: formData.category.trim() || undefined,
        stock: formData.stock,
        minStock: formData.minStock || undefined,
        isActive: formData.isActive,
        productModelId: formData.productModelId || undefined,
        storage: formData.storage || undefined,
        color: formData.color || undefined,
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      // Handle database constraint errors
      if (error.message?.includes('FOREIGN KEY') || error.message?.includes('product_model_id')) {
        setErrors(prev => ({ ...prev, productModelId: 'Selected model no longer exists. Please select a different model.' }));
      } else {
        setErrors(prev => ({ ...prev, _general: error.message || 'Failed to save product' }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean) => {
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
        className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
            {/* Product Information - Simplified */}
            <FormSection title="Product Details">
              <div className="space-y-4">
                {/* Product Model Selection */}
                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium block" 
                    style={{ color: 'var(--foreground)' }}
                  >
                    Product Model (optional)
                  </label>
                  <select
                    value={formData.productModelId || ''}
                    onChange={(e) => {
                      handleInputChange('productModelId', e.target.value || '');
                      // Clear storage and color when model changes
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, storage: undefined, color: undefined }));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--background)',
                      borderColor: errors.productModelId ? 'red' : 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="">Select a model (optional)</option>
                    {productModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.brand ? `(${model.brand})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.productModelId && (
                    <p className="text-sm text-red-600">{errors.productModelId}</p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Select a product model to auto-generate the product name
                  </p>
                </div>
                
                {/* Storage Selection */}
                {formData.productModelId && selectedModel && selectedModel.storageOptions && selectedModel.storageOptions.length > 0 && (
                  <div className="space-y-2">
                    <label 
                      className="text-sm font-medium block" 
                      style={{ color: 'var(--foreground)' }}
                    >
                      Storage Capacity *
                    </label>
                    <select
                      value={formData.storage || ''}
                      onChange={(e) => handleInputChange('storage', e.target.value || '' as any)}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{ 
                        backgroundColor: 'var(--background)',
                        borderColor: errors.storage ? 'red' : 'var(--border)',
                        color: 'var(--foreground)'
                      }}
                      required
                    >
                      <option value="">Select storage</option>
                      {selectedModel.storageOptions.map(storage => (
                        <option key={storage} value={storage}>{storage}</option>
                      ))}
                    </select>
                    {errors.storage && (
                      <p className="text-sm text-red-600">{errors.storage}</p>
                    )}
                  </div>
                )}
                
                {/* Color Selection */}
                {formData.productModelId && selectedModel && selectedModel.colors && selectedModel.colors.length > 0 && (
                  <div className="space-y-2">
                    <label 
                      className="text-sm font-medium block" 
                      style={{ color: 'var(--foreground)' }}
                    >
                      Color *
                    </label>
                    <select
                      value={formData.color || ''}
                      onChange={(e) => handleInputChange('color', e.target.value || '' as any)}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{ 
                        backgroundColor: 'var(--background)',
                        borderColor: errors.color ? 'red' : 'var(--border)',
                        color: 'var(--foreground)'
                      }}
                      required
                    >
                      <option value="">Select color</option>
                      {selectedModel.colors.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                    {errors.color && (
                      <p className="text-sm text-red-600">{errors.color}</p>
                    )}
                  </div>
                )}
                
                <Input
                  label="What is this product called? *"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder="Example: Samsung Galaxy Phone (or auto-generated from model)"
                  required
                />
                
                <Textarea
                  label="Tell us about this product (optional)"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what this product is or does..."
                  rows={3}
                />

                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium block" 
                    style={{ color: 'var(--foreground)' }}
                  >
                    Category (optional)
                  </label>
                  <div className="relative" ref={categoryRef}>
                    <div className="relative">
                      <Input
                        value={categoryInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCategoryInput(value);
                          handleInputChange('category', value);
                          setShowCategoryDropdown(true);
                        }}
                        onFocus={() => setShowCategoryDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (categoryInput.trim()) {
                              handleInputChange('category', categoryInput.trim());
                              setShowCategoryDropdown(false);
                            }
                          } else if (e.key === 'Escape') {
                            setShowCategoryDropdown(false);
                          }
                        }}
                        placeholder="Select or type a new category..."
                      />
                      {categoryInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryInput('');
                            handleInputChange('category', '');
                            setShowCategoryDropdown(false);
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {showCategoryDropdown && (
                      <div 
                        className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border max-h-60 overflow-y-auto"
                        style={{ 
                          backgroundColor: 'var(--card)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        {/* Filtered categories */}
                        {categories
                          .filter(cat => 
                            cat.toLowerCase().includes(categoryInput.toLowerCase())
                          )
                          .map(category => (
                            <button
                              key={category}
                              type="button"
                              onClick={() => {
                                setCategoryInput(category);
                                handleInputChange('category', category);
                                setShowCategoryDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                              style={{ color: 'var(--foreground)' }}
                            >
                              <span>{category}</span>
                              {categoryInput === category && (
                                <CheckIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                              )}
                            </button>
                          ))}
                        
                        {/* Create new category option */}
                        {categoryInput && 
                         !categories.some(cat => cat.toLowerCase() === categoryInput.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => {
                              handleInputChange('category', categoryInput.trim());
                              setShowCategoryDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-2 border-t"
                            style={{ 
                              color: 'var(--accent)',
                              borderColor: 'var(--border)'
                            }}
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span>Create "{categoryInput.trim()}"</span>
                          </button>
                        )}
                        
                        {/* Empty state */}
                        {categories.length === 0 && !categoryInput && (
                          <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
                            No categories yet. Type to create one.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    Select an existing category or type to create a new one
                  </p>
                </div>
              </div>
            </FormSection>

            {/* Pricing */}
            <FormSection title="Pricing">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="How much will you sell it for? *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  error={errors.price}
                  placeholder="0.00"
                  required
                />

                <Input
                  label="How much did it cost you? (optional)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost !== undefined && formData.cost !== null ? formData.cost : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // If empty string, set to undefined (not set)
                    // If valid number, parse it (including 0)
                    if (value === '' || value === null || value === undefined) {
                      handleInputChange('cost', undefined as any);
                    } else {
                      const numValue = parseFloat(value);
                      handleInputChange('cost', isNaN(numValue) ? undefined as any : numValue);
                    }
                  }}
                  error={errors.cost}
                  placeholder="Leave empty if unknown"
                />
              </div>

              {/* Profit Margin Display - Simplified */}
              {formData.price > 0 && formData.cost !== undefined && formData.cost !== null && formData.cost >= 0 && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      Profit per item:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(formData.price - formData.cost)}
                    </span>
                  </div>
                </div>
              )}
            </FormSection>

            {/* Inventory */}
            <FormSection title="Stock & Inventory">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="How many do you have right now? *"
                  type="number"
                  min="0"
                  value={formData.stock || ''}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  error={errors.stock}
                  placeholder="0"
                  required
                />

                <Input
                  label="When should we warn you to order more? (optional)"
                  type="number"
                  min="0"
                  value={formData.minStock || ''}
                  onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                  error={errors.minStock}
                  placeholder="Example: 5"
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                We'll alert you when stock gets low.
              </p>
            </FormSection>

            {/* Status - Hidden by default to keep it simple, only shows when editing */}
            {product && (
              <FormSection title="Product Status">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {formData.isActive ? 'Product is Active' : 'Product is Inactive'}
                    </label>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {formData.isActive 
                        ? 'This product will appear in your product list'
                        : 'This product will be hidden from your product list'
                      }
                    </p>
                  </div>
                </div>
              </FormSection>
            )}

            {/* Product Info (for editing) */}
            {product && (
              <FormSection title="Product Information">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Product ID:</span>
                    <p style={{ color: 'var(--muted-foreground)' }}>{product.id}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Created:</span>
                    <p style={{ color: 'var(--muted-foreground)' }}>{new Date(product.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>Last Updated:</span>
                    <p style={{ color: 'var(--muted-foreground)' }}>{new Date(product.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </FormSection>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
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
                  {product ? 'Update Product' : 'Add Product'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

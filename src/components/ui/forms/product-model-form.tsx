'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/core';
import { Input, Textarea, Switch } from '@/components/ui/forms';
import { FormSection } from '@/components/ui/forms';
import { ProductModel } from '@/lib/types/core';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ProductModelFormProps {
  model?: ProductModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (model: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  title?: string;
}

interface ProductModelFormData {
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  image?: string;
  colors: string[];
  storageOptions: string[];
  isActive: boolean;
}

const BRANDS = ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Oppo', 'Vivo', 'OnePlus', 'Google', 'Other'];
const CATEGORIES = ['Smartphones', 'Tablets', 'Accessories', 'Other'];

export function ProductModelForm({ 
  model, 
  isOpen, 
  onClose, 
  onSave, 
  title = "Add Product Model" 
}: ProductModelFormProps) {
  const [formData, setFormData] = useState<ProductModelFormData>({
    name: '',
    brand: undefined,
    category: undefined,
    description: '',
    image: undefined,
    colors: [],
    storageOptions: [],
    isActive: true
  });
  const [newColor, setNewColor] = useState('');
  const [newStorageOption, setNewStorageOption] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (model) {
      setFormData({
        name: model.name || '',
        brand: model.brand || undefined,
        category: model.category || undefined,
        description: model.description || '',
        image: model.image || undefined,
        colors: model.colors || [],
        storageOptions: model.storageOptions || [],
        isActive: model.isActive !== false
      });
    } else {
      setFormData({
        name: '',
        brand: undefined,
        category: undefined,
        description: '',
        image: undefined,
        colors: [],
        storageOptions: [],
        isActive: true
      });
    }
    setNewColor('');
    setNewStorageOption('');
    setErrors({});
  }, [model, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Model name is required';
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
        brand: formData.brand || undefined,
        category: formData.category || undefined,
        description: formData.description?.trim() || undefined,
        image: formData.image || undefined,
        colors: formData.colors,
        storageOptions: formData.storageOptions,
        isActive: formData.isActive,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save product model:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductModelFormData, value: string | boolean | undefined) => {
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
        className="rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
          <div className="space-y-6">
            <FormSection title="Model Information">
              <div className="space-y-4">
                <Input
                  label="Model Name *"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder="Example: iPhone 17, iPhone 17 Pro, Galaxy S24"
                  required
                />
                
                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium block" 
                    style={{ color: 'var(--foreground)' }}
                  >
                    Brand (optional)
                  </label>
                  <select
                    value={formData.brand || ''}
                    onChange={(e) => handleInputChange('brand', e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="">Select a brand (optional)</option>
                    {BRANDS.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label 
                    className="text-sm font-medium block" 
                    style={{ color: 'var(--foreground)' }}
                  >
                    Category (optional)
                  </label>
                  <select
                    value={formData.category || ''}
                    onChange={(e) => handleInputChange('category', e.target.value || undefined)}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      backgroundColor: 'var(--background)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                  >
                    <option value="">Select a category (optional)</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <Textarea
                  label="Description (optional)"
                  value={formData.description ?? ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe this product model..."
                  rows={3}
                />
              </div>
            </FormSection>

            <FormSection title="Colors">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a color (e.g., Red, Blue, Natural Titanium)"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newColor.trim() && !formData.colors.includes(newColor.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            colors: [...prev.colors, newColor.trim()]
                          }));
                          setNewColor('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newColor.trim() && !formData.colors.includes(newColor.trim())) {
                        setFormData(prev => ({
                          ...prev,
                          colors: [...prev.colors, newColor.trim()]
                        }));
                        setNewColor('');
                      }
                    }}
                    disabled={!newColor.trim() || formData.colors.includes(newColor.trim())}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                {formData.colors.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.colors.map((color, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        <span style={{ color: 'var(--foreground)' }}>{color}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              colors: prev.colors.filter((_, i) => i !== index)
                            }));
                          }}
                          className="hover:opacity-70"
                        >
                          <TrashIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.colors.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No colors added yet. Add colors that are available for this model.
                  </p>
                )}
              </div>
            </FormSection>

            <FormSection title="Storage Options">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add storage option (e.g., 64GB, 128GB, 256GB, 512GB, 1TB)"
                    value={newStorageOption}
                    onChange={(e) => setNewStorageOption(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newStorageOption.trim() && !formData.storageOptions.includes(newStorageOption.trim())) {
                          setFormData(prev => ({
                            ...prev,
                            storageOptions: [...prev.storageOptions, newStorageOption.trim()]
                          }));
                          setNewStorageOption('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (newStorageOption.trim() && !formData.storageOptions.includes(newStorageOption.trim())) {
                        setFormData(prev => ({
                          ...prev,
                          storageOptions: [...prev.storageOptions, newStorageOption.trim()]
                        }));
                        setNewStorageOption('');
                      }
                    }}
                    disabled={!newStorageOption.trim() || formData.storageOptions.includes(newStorageOption.trim())}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                {formData.storageOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.storageOptions.map((storage, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--background)',
                          borderColor: 'var(--border)'
                        }}
                      >
                        <span style={{ color: 'var(--foreground)' }}>{storage}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              storageOptions: prev.storageOptions.filter((_, i) => i !== index)
                            }));
                          }}
                          className="hover:opacity-70"
                        >
                          <TrashIcon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formData.storageOptions.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                    No storage options added yet. Add storage capacities available for this model.
                  </p>
                )}
              </div>
            </FormSection>

            {model && (
              <FormSection title="Status">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  />
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {formData.isActive ? 'Model is Active' : 'Model is Inactive'}
                    </label>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {formData.isActive 
                        ? 'This model will appear in your product list'
                        : 'This model will be hidden from your product list'
                      }
                    </p>
                  </div>
                </div>
              </FormSection>
            )}
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
                  {model ? 'Update Model' : 'Create Model'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

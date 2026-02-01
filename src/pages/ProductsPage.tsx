import React, { useState, useEffect, useMemo } from 'react';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { ProductForm } from '@/components/ui/forms/product-form';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { productService, productModelService } from '@/lib/services';
import { Product, ProductModel } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CubeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // View mode: 'hierarchical' (models → products) or 'list' (flat list)
  const [viewMode, setViewMode] = useState<'hierarchical' | 'list'>('hierarchical');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  // Load model from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modelId = params.get('model');
    if (modelId) {
      setSelectedModelId(modelId);
      setExpandedModels(new Set([modelId]));
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsResponse, modelsResponse] = await Promise.all([
        productService.getAllProducts(),
        productModelService.getAllProductModels()
      ]);
      
      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data);
      } else {
        setProducts([]);
        setToast({ message: productsResponse.error || 'Failed to load products', type: 'error' });
      }

      if (modelsResponse.success && modelsResponse.data) {
        setProductModels(modelsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setProducts([]);
      setToast({ message: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | void> => {
    try {
      let response;
      
      if (editingProduct) {
        response = await productService.updateProduct(editingProduct.id, productData);
      } else {
        response = await productService.createProduct(productData);
      }

      if (response.success) {
        setToast({ 
          message: editingProduct ? 'Product updated successfully!' : 'Product added successfully!', 
          type: 'success' 
        });
        setShowForm(false);
        setEditingProduct(null);
        loadData();
        
        // Return the product so the form can use it to create inventory items
        return response.data;
      } else {
        setToast({ message: response.error || 'Failed to save product', type: 'error' });
        throw new Error(response.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Failed to save product:', error);
      setToast({ message: 'Failed to save product', type: 'error' });
      throw error;
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = (productId: string) => {
    const currentProducts = products || [];
    const product = currentProducts.find(p => p.id === productId);
    
    let message = `Are you sure you want to delete "${product?.name}"?`;
    
    // Check if product has IMEI tracking (might have inventory items)
    const hasImeiTracking = product?.productModelId;
    if (hasImeiTracking) {
      message += '\n\nNote: If this product has inventory items, all items (including sold/returned) will be permanently deleted.';
    }
    
    message += '\n\n⚠️ This action cannot be undone.';
    
    confirm({
      title: 'Delete Product',
      message,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        // Force delete all inventory items if any exist
        const response = await productService.deleteProduct(productId, { forceDelete: true });
        if (response.success) {
          setToast({ message: 'Product deleted successfully', type: 'success' });
          loadData();
        } else {
          setToast({ message: response.error || 'Failed to delete product', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete product:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete product';
        setToast({ message: errorMessage, type: 'error' });
      }
    });
  };

  const handleViewProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const currentProducts = products || [];
    const categorySet = new Set(currentProducts.map(p => p.category).filter((cat): cat is string => Boolean(cat)));
    return Array.from(categorySet).sort();
  }, [products]);

  // Group products by model for hierarchical view
  const productsByModel = useMemo(() => {
    const grouped: Record<string, { model: ProductModel | null; products: Product[] }> = {
      'no-model': { model: null, products: [] }
    };

    // Add all models
    productModels.forEach(model => {
      grouped[model.id] = { model, products: [] };
    });

    // Group products by model
    products.forEach(product => {
      if (product.productModelId && grouped[product.productModelId]) {
        grouped[product.productModelId].products.push(product);
      } else {
        grouped['no-model'].products.push(product);
      }
    });

    return grouped;
  }, [products, productModels]);

  // Filter products by model
  const filteredProductsByModel = useMemo(() => {
    const filtered: typeof productsByModel = {};
    
    Object.entries(productsByModel).forEach(([modelId, data]) => {
      const filteredProducts = data.products.filter(product => {
        const matchesSearch = !searchTerm || 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = !selectedCategory || product.category === selectedCategory;
        const matchesActive = showInactive || product.isActive !== false;
        const matchesModel = !selectedModelId || product.productModelId === selectedModelId;
        
        return matchesSearch && matchesCategory && matchesActive && matchesModel;
      });

      if (filteredProducts.length > 0 || (data.model && selectedModelId === modelId)) {
        filtered[modelId] = { ...data, products: filteredProducts };
      }
    });

    return filtered;
  }, [productsByModel, searchTerm, selectedCategory, selectedModelId, showInactive]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const currentProducts = products || [];
    const filtered = currentProducts.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesActive = showInactive || product.isActive !== false;
      
      return matchesSearch && matchesCategory && matchesActive;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: string | number | Date = a[sortBy];
      let bValue: string | number | Date = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, sortBy, sortOrder, showInactive]);

  // Table configuration
  const tableColumns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'sku', label: 'SKU', sortable: false },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'stock', label: 'Stock', sortable: true },
    { key: 'category', label: 'Category', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
    { key: 'actions', label: 'Actions', sortable: false }
  ];

  const tableData = filteredAndSortedProducts.map(product => ({
    id: product.id,
    name: (
      <div className="flex items-center space-x-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-8 w-8 rounded-lg object-cover border"
            style={{ borderColor: 'var(--border)' }}
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <div className="font-medium">{product.name}</div>
          {product.description && (
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {product.description.length > 50 
                ? `${product.description.substring(0, 50)}...` 
                : product.description
              }
            </div>
          )}
        </div>
      </div>
    ),
    sku: product.sku || '-',
    price: formatCurrency(product.price),
    stock: (
      <div className="flex items-center gap-2">
        <span className={product.stock <= (product.minStock || 0) ? 'text-red-600 font-medium' : ''}>
          {product.stock}
        </span>
        {product.stock <= (product.minStock || 0) && (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
        )}
      </div>
    ),
    category: product.category || '-',
    createdAt: formatDate(product.createdAt),
    actions: (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)}>
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleDeleteProduct(product.id)}
          className="text-red-600 hover:text-red-700"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  // Calculate stats
  const stats = useMemo(() => {
    const currentProducts = products || [];
    const totalProducts = currentProducts.length;
    const activeProducts = currentProducts.filter(p => p.isActive !== false).length;
    const lowStockProducts = currentProducts.filter(p => p.minStock && p.stock <= p.minStock).length;
    const totalValue = currentProducts.reduce((sum, p) => {
      // Use cost if available, otherwise use price
      const unitValue = (p.cost !== undefined && p.cost !== null) ? p.cost : p.price;
      return sum + (unitValue * p.stock);
    }, 0);
    
    return {
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalValue
    };
  }, [products]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Products
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Manage products organized by models. Create models first, then add products under each model.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate('/product-models')}
              className="flex items-center gap-2"
            >
              Manage Models
            </Button>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <KPICard 
            title="Total Products" 
            value={stats.totalProducts.toString()}
            icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#06b6d4"
          />
          <KPICard 
            title="Active Products" 
            value={stats.activeProducts.toString()}
            icon={<ChartBarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#3b82f6"
          />
          <KPICard 
            title="Low Stock Items" 
            value={stats.lowStockProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-500" />}
            accentColor="#ef4444"
          />
          <KPICard 
            title="Total Inventory Value" 
            value={formatCurrency(stats.totalValue)}
            icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#10b981"
          />
        </div>

        {/* Search and Filters */}
        <div 
          className="p-6 rounded-xl"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            border: '1px solid var(--border)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent)10' }}>
              <FunnelIcon className="h-4 w-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Search & Filters
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Find and organize your products
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                <Input
                  placeholder="Search products by name, SKU, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(category => ({ value: category, label: category }))
                ]}
                placeholder="Select Category"
              />
            </div>
            <div>
              <Select
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                options={[
                  { value: '', label: 'All Models' },
                  ...productModels
                    .filter(m => m.isActive !== false)
                    .map(model => ({ value: model.id, label: model.name }))
                ]}
                placeholder="Select Model"
              />
            </div>
            <div>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'price' | 'stock' | 'createdAt')}
                options={[
                  { value: 'name', label: 'Sort by Name' },
                  { value: 'price', label: 'Sort by Price' },
                  { value: 'stock', label: 'Sort by Stock' },
                  { value: 'createdAt', label: 'Sort by Date' }
                ]}
                placeholder="Sort by"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-2"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </Button>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded"
                />
                Show inactive products
              </label>
            </div>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {filteredAndSortedProducts.length} of {(products || []).length} products
            </div>
          </div>
        </div>


        {/* View Mode Toggle */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button
            variant={viewMode === 'hierarchical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('hierarchical')}
          >
            Hierarchical
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
        </div>

        {/* Hierarchical View */}
        {viewMode === 'hierarchical' ? (
          <div 
            className="rounded-xl p-6"
            style={{ 
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)'
            }}
          >
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--foreground)' }}>
              Products by Model
            </h2>

            <div className="space-y-4">
              {Object.entries(filteredProductsByModel).map(([modelId, data]) => {
                if (modelId === 'no-model' && data.products.length === 0) return null;
                
                const isExpanded = expandedModels.has(modelId);
                const modelProducts = data.products;

                return (
                  <div 
                    key={modelId}
                    className="border rounded-lg overflow-hidden"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Model Header */}
                    {data.model && (
                      <div 
                        className="p-4 cursor-pointer hover:bg-opacity-50 transition-colors flex items-center justify-between"
                        style={{ backgroundColor: 'var(--background)' }}
                        onClick={() => {
                          const newExpanded = new Set(expandedModels);
                          if (isExpanded) {
                            newExpanded.delete(modelId);
                          } else {
                            newExpanded.add(modelId);
                          }
                          setExpandedModels(newExpanded);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CubeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                          <div>
                            <div className="font-semibold" style={{ color: 'var(--foreground)' }}>
                              {data.model.name}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                              {data.model.brand && `${data.model.brand} • `}
                              {modelProducts.length} product{modelProducts.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProduct(null);
                              setShowForm(true);
                            }}
                          >
                            <PlusIcon className="h-4 w-4" />
                            Add Product
                          </Button>
                          {isExpanded ? (
                            <ChevronDownIcon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Products List */}
                    {(isExpanded || !data.model) && modelProducts.length > 0 && (
                      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-sm font-medium" style={{ color: 'var(--muted-foreground)', backgroundColor: 'var(--background)' }}>
                              <th className="p-3">Name</th>
                              <th className="p-3">Storage</th>
                              <th className="p-3">Color</th>
                              <th className="p-3">Price</th>
                              <th className="p-3">Stock</th>
                              <th className="p-3">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modelProducts.map((product, idx) => (
                              <tr 
                                key={product.id}
                                className="hover:bg-opacity-50 transition-colors"
                                style={{ 
                                  backgroundColor: idx % 2 === 0 ? 'var(--card)' : 'var(--background)'
                                }}
                              >
                                <td className="p-3">
                                  <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                                    {product.name}
                                  </div>
                                  {product.sku && (
                                    <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                      SKU: {product.sku}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3" style={{ color: 'var(--muted-foreground)' }}>
                                  {product.storage || '-'}
                                </td>
                                <td className="p-3" style={{ color: 'var(--muted-foreground)' }}>
                                  {product.color || '-'}
                                </td>
                                <td className="p-3" style={{ color: 'var(--foreground)' }}>
                                  {formatCurrency(product.price)}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <span className={product.stock <= (product.minStock || 0) ? 'text-red-600 font-medium' : ''}>
                                      {product.stock}
                                    </span>
                                    {product.stock <= (product.minStock || 0) && (
                                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleViewProduct(product)}>
                                      <EyeIcon className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                                      <PencilIcon className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteProduct(product.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* No products message */}
                    {data.model && isExpanded && modelProducts.length === 0 && (
                      <div className="p-8 text-center border-t" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          No products under this model yet.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4"
                          onClick={() => {
                            setEditingProduct(null);
                            setShowForm(true);
                          }}
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Add First Product
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(filteredProductsByModel).length === 0 && (
                <div className="text-center p-12">
                  <CubeIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                    No products found
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                    {productModels.length === 0 
                      ? 'Create a product model first, then add products under it.'
                      : 'Try adjusting your filters or create a new product.'
                    }
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {productModels.length === 0 && (
                      <Button
                        variant="outline"
                        onClick={() => navigate('/product-models')}
                      >
                        Create Model
                      </Button>
                    )}
                    <Button onClick={() => setShowForm(true)}>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <PaginatedTableCard 
            title="Products"
            columns={tableColumns}
            data={tableData}
            itemsPerPage={10}
            loading={loading}
            empty={!loading && tableData.length === 0}
            emptyTitle="No products found"
            emptyDescription={searchTerm || selectedCategory ? "Try adjusting your filters" : "Get started by adding your first product"}
            emptyAction={!searchTerm && !selectedCategory ? (
              <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                <PlusIcon className="h-4 w-4" />
                Add Product
              </Button>
            ) : undefined}
            headerActions={
              <div className="flex items-center gap-2 flex-wrap">
                {searchTerm && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--accent)10', color: 'var(--accent)' }}>
                    &quot;{searchTerm}&quot;
                  </span>
                )}
                {selectedCategory && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                    {selectedCategory}
                  </span>
                )}
              </div>
            }
          />
        )}

        {/* Product Form Modal */}
        <ProductForm
          product={editingProduct}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
        />


        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isOpen}
          title={options.title}
          message={options.message}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />

        {/* Toast Notifications */}
        {toast && (
          <Toast
            title={toast.message}
            variant={toast.type}
            onClose={() => setToast(null)}
          >
            {toast.message}
          </Toast>
        )}
    </div>
  );
}


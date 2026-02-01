import React, { useState, useEffect, useMemo } from 'react';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select } from '@/components/ui/forms';
import { productService } from '@/lib/services';
import { Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  PlusIcon,
  DevicePhoneMobileIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function InventoryPage() {
  const { formatCurrency, formatDate } = useSettings();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'imei' | 'regular'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Stock adjustment states
  const [adjustingStock, setAdjustingStock] = useState<string | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAllProducts();
      
      if (response.success && response.data) {
        // Ensure all products have valid cost values
        const sanitizedProducts = response.data.map(product => ({
          ...product,
          cost: product.cost !== undefined && product.cost !== null ? product.cost : 0
        }));
        setProducts(sanitizedProducts);
      } else {
        setProducts([]);
        setToast({ message: response.error || 'Failed to load products', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
      setToast({ message: 'Failed to load products', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdjustment = async (productId: string, adjustment: number) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // For products with IMEI tracking (productModelId), stock is calculated automatically
      // Warn user that manual adjustments won't work
      if (product.productModelId) {
        setToast({ 
          message: 'Stock for this product is automatically calculated from inventory items. Add or remove inventory items from the product detail page instead.', 
          type: 'error' 
        });
        setAdjustingStock(null);
        setStockAdjustment(0);
        return;
      }

      const newStock = Math.max(0, product.stock + adjustment);
      const response = await productService.updateProduct(productId, { stock: newStock });

      if (response.success) {
        setToast({ 
          message: `Stock ${adjustment >= 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`, 
          type: 'success' 
        });
        loadProducts();
        setAdjustingStock(null);
        setStockAdjustment(0);
      } else {
        setToast({ message: response.error || 'Failed to update stock', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
      setToast({ message: 'Failed to update stock', type: 'error' });
    }
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const categorySet = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(categorySet).sort();
  }, [products]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      const matchesTrackingFilter = trackingFilter === 'all' || 
        (trackingFilter === 'imei' && !!product.productModelId) ||
        (trackingFilter === 'regular' && !product.productModelId);
      
      const matchesStockFilter = (() => {
        const stock = product.stock || 0;
        const minStock = product.minStock || 0;
        
        switch (stockFilter) {
          case 'low':
            // Low stock: has minStock set and stock is at or below minimum
            return minStock > 0 && stock > 0 && stock <= minStock;
          case 'out':
            // Out of stock: stock is exactly 0
            return stock === 0;
          case 'normal':
            // Normal stock: stock is above minimum (or no minimum set and stock > 0)
            return stock > 0 && (minStock === 0 || stock > minStock);
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesCategory && matchesStockFilter && matchesTrackingFilter;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: string | number = a[sortBy] || '';
      let bValue: string | number = b[sortBy] || '';
      
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
  }, [products, searchTerm, selectedCategory, stockFilter, trackingFilter, sortBy, sortOrder]);

  const tableColumns = [
    { key: 'name', label: 'Product', sortable: true },
    { key: 'tracking', label: 'Tracking', sortable: false },
    { key: 'sku', label: 'SKU', sortable: false },
    { key: 'stock', label: 'Current Stock', sortable: true },
    { key: 'minStock', label: 'Min Stock', sortable: true },
    { key: 'status', label: 'Status', sortable: false },
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
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {product.category || 'No category'}
            {product.storage && product.color && (
              <span className="ml-2">
                • {product.storage} - {product.color}
              </span>
            )}
          </div>
        </div>
      </div>
    ),
    tracking: product.productModelId ? (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
        <span className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 whitespace-nowrap"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'rgb(59, 130, 246)'
          }}
        >
          <DevicePhoneMobileIcon className="h-3 w-3 flex-shrink-0" />
          <span className="hidden sm:inline">IMEI Tracking</span>
          <span className="sm:hidden">IMEI</span>
        </span>
        <span className="text-xs hidden sm:inline" style={{ color: 'var(--muted-foreground)' }}>
          Auto-calculated
        </span>
      </div>
    ) : (
      <span className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
        style={{
          backgroundColor: 'var(--muted)',
          color: 'var(--muted-foreground)'
        }}
      >
        Manual
      </span>
    ),
    sku: product.sku || '-',
    stock: (() => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      
      let textColor = 'text-green-600';
      let showWarning = false;
      
      if (stock === 0) {
        textColor = 'text-red-600';
        showWarning = true;
      } else if (minStock > 0 && stock <= minStock) {
        textColor = 'text-orange-600';
        showWarning = true;
      } else if (minStock > 0 && stock < minStock * 2) {
        textColor = 'text-yellow-600';
      }
      
      return (
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`font-semibold text-base sm:text-lg ${textColor}`}>
            {stock}
          </span>
          {showWarning && (
            <ExclamationTriangleIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${stock === 0 ? 'text-red-500' : 'text-orange-500'}`} />
          )}
        </div>
      );
    })(),
    minStock: product.minStock !== undefined && product.minStock !== null ? product.minStock.toString() : '-',
    status: (() => {
      const stock = product.stock || 0;
      const minStock = product.minStock || 0;
      
      // Check for out of stock first
      if (stock === 0) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
            <span className="hidden sm:inline">Out of Stock</span>
            <span className="sm:hidden">Out</span>
          </span>
        );
      }
      
      // Check for low stock (at or below minimum)
      if (minStock > 0 && stock <= minStock) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
            <span className="hidden sm:inline">Low Stock</span>
            <span className="sm:hidden">Low</span>
          </span>
        );
      }
      
      // Check for getting low (below 2x minimum)
      if (minStock > 0 && stock < minStock * 2) {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 whitespace-nowrap">
            <span className="hidden sm:inline">Getting Low</span>
            <span className="sm:hidden">Getting Low</span>
          </span>
        );
      }
      
      // In stock
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
          <span className="hidden sm:inline">In Stock</span>
          <span className="sm:hidden">In Stock</span>
        </span>
      );
    })(),
    actions: (
      <div className="flex items-center gap-2">
        {product.productModelId ? (
          // IMEI-tracked products: Show "Manage Items" button
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/products/${product.id}`)}
            title="View product and manage inventory items"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            Manage Items
          </Button>
        ) : (
          // Regular products: Show stock adjustment
          <>
            {adjustingStock === product.id ? (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStockAdjustment(product.id, -1)}
                  disabled={product.stock <= 0}
                >
                  <MinusIcon className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium min-w-[2rem] text-center">
                  {product.stock}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStockAdjustment(product.id, 1)}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdjustingStock(null);
                    setStockAdjustment(0);
                  }}
                >
                  ✓
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdjustingStock(product.id)}
                title="Adjust stock manually"
              >
                Adjust
              </Button>
            )}
          </>
        )}
      </div>
    ),
  }));

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const imeiTrackedProducts = products.filter(p => !!p.productModelId).length;
    const regularProducts = products.filter(p => !p.productModelId).length;
    const lowStockProducts = products.filter(p => {
      const stock = p.stock || 0;
      const minStock = p.minStock || 0;
      return minStock > 0 && stock > 0 && stock <= minStock;
    }).length;
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0).length;
    const totalValue = products.reduce((sum, p) => {
      try {
        const stock = p.stock || 0;
        // Use cost if available and valid, otherwise use price
        const unitValue = (p.cost !== undefined && p.cost !== null && !isNaN(p.cost) && p.cost >= 0) 
          ? p.cost 
          : (p.price || 0);
        return sum + (unitValue * stock);
      } catch (error) {
        console.warn('Error calculating value for product:', p.name, error);
        const stock = p.stock || 0;
        return sum + ((p.price || 0) * stock);
      }
    }, 0);
    
    return {
      totalProducts,
      imeiTrackedProducts,
      regularProducts,
      lowStockProducts,
      outOfStockProducts,
      totalValue
    };
  }, [products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Inventory Management
          </h1>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
          <KPICard 
            title="Total Products" 
            value={stats.totalProducts.toString()}
            icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
            accentColor="#06b6d4"
          />
          <KPICard 
            title="IMEI Tracked" 
            value={stats.imeiTrackedProducts.toString()}
            icon={<DevicePhoneMobileIcon className="h-6 w-6" style={{ color: '#3b82f6' }} />}
            accentColor="#3b82f6"
          />
          <KPICard 
            title="Regular Products" 
            value={stats.regularProducts.toString()}
            icon={<ArchiveBoxIcon className="h-6 w-6" style={{ color: '#8b5cf6' }} />}
            accentColor="#8b5cf6"
          />
          <KPICard 
            title="Low Stock Items" 
            value={stats.lowStockProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />}
            accentColor="#f59e0b"
          />
          <KPICard 
            title="Out of Stock" 
            value={stats.outOfStockProducts.toString()}
            icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
            accentColor="#ef4444"
          />
          <KPICard 
            title="Inventory Value" 
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
                Find and organize your inventory
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
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
                value={trackingFilter}
                onChange={(e) => setTrackingFilter(e.target.value as 'all' | 'imei' | 'regular')}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'imei', label: 'IMEI Tracked' },
                  { value: 'regular', label: 'Regular' }
                ]}
                placeholder="Tracking Type"
              />
            </div>
            <div>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(category => ({ value: category || '', label: category || '' }))
                ]}
                placeholder="Select Category"
              />
            </div>
            <div>
              <Select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out' | 'normal')}
                options={[
                  { value: 'all', label: 'All Stock' },
                  { value: 'low', label: 'Low Stock' },
                  { value: 'out', label: 'Out of Stock' },
                  { value: 'normal', label: 'Normal Stock' }
                ]}
                placeholder="Stock Filter"
              />
            </div>
            <div>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'price' | 'category')}
                options={[
                  { value: 'name', label: 'Sort by Name' },
                  { value: 'stock', label: 'Sort by Stock' },
                  { value: 'price', label: 'Sort by Price' },
                  { value: 'category', label: 'Sort by Category' }
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
            </div>
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {filteredAndSortedProducts.length} of {products.length} products
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <PaginatedTableCard 
          title="Inventory Overview"
          columns={tableColumns}
          data={tableData}
          itemsPerPage={10}
          loading={loading}
          empty={!loading && tableData.length === 0}
          emptyTitle="No products found"
          emptyDescription={searchTerm || selectedCategory || stockFilter !== 'all' ? "Try adjusting your filters" : "No products in inventory"}
          headerActions={
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {searchTerm && (
                <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap truncate max-w-[120px] sm:max-w-none" style={{ backgroundColor: 'var(--accent)10', color: 'var(--accent)' }} title={searchTerm}>
                  <span className="hidden sm:inline">&quot;{searchTerm}&quot;</span>
                  <span className="sm:hidden">&quot;{searchTerm.length > 10 ? searchTerm.substring(0, 10) + '...' : searchTerm}&quot;</span>
                </span>
              )}
              {trackingFilter !== 'all' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap" style={{ 
                  backgroundColor: trackingFilter === 'imei' ? 'rgba(59, 130, 246, 0.1)' : 'var(--muted)',
                  color: trackingFilter === 'imei' ? 'rgb(59, 130, 246)' : 'var(--muted-foreground)'
                }}>
                  {trackingFilter === 'imei' && <DevicePhoneMobileIcon className="h-3 w-3 flex-shrink-0" />}
                  <span className="hidden sm:inline">{trackingFilter === 'imei' ? 'IMEI Tracked' : 'Regular'}</span>
                  <span className="sm:hidden">{trackingFilter === 'imei' ? 'IMEI' : 'Regular'}</span>
                </span>
              )}
              {selectedCategory && (
                <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap truncate max-w-[100px] sm:max-w-none" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }} title={selectedCategory}>
                  <span className="hidden sm:inline">{selectedCategory}</span>
                  <span className="sm:hidden">{selectedCategory.length > 10 ? selectedCategory.substring(0, 10) + '...' : selectedCategory}</span>
                </span>
              )}
              {stockFilter !== 'all' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap" style={{ 
                  backgroundColor: stockFilter === 'out' ? 'rgba(239, 68, 68, 0.1)' : stockFilter === 'low' ? 'rgba(249, 115, 22, 0.1)' : 'var(--muted)',
                  color: stockFilter === 'out' ? 'rgb(239, 68, 68)' : stockFilter === 'low' ? 'rgb(249, 115, 22)' : 'var(--muted-foreground)'
                }}>
                  <span className="hidden sm:inline">
                    {stockFilter === 'low' ? 'Low Stock' : 
                     stockFilter === 'out' ? 'Out of Stock' : 'Normal Stock'}
                  </span>
                  <span className="sm:hidden">
                    {stockFilter === 'low' ? 'Low' : 
                     stockFilter === 'out' ? 'Out' : 'Normal'}
                  </span>
                </span>
              )}
            </div>
          }
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

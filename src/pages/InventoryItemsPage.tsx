import React, { useState, useEffect, useMemo } from 'react';
import { PaginatedTableCard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { InventoryItemForm } from '@/components/ui/forms/inventory-item-form';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { inventoryItemService, productService } from '@/lib/services';
import { InventoryItem, Product } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  DevicePhoneMobileIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function InventoryItemsPage() {
  const { formatDate } = useSettings();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'sold' | 'returned' | 'defective'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new' | 'refurbished' | 'used'>('all');
  const [productFilter, setProductFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, productsResponse] = await Promise.all([
        inventoryItemService.getInventoryItems(),
        productService.getAllProducts()
      ]);

      if (itemsResponse.success && itemsResponse.data) {
        setInventoryItems(itemsResponse.data);
      }

      if (productsResponse.success && productsResponse.data) {
        setProducts(productsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setToast({ message: 'Failed to load inventory items', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      let response;
      if (editingItem) {
        response = await inventoryItemService.updateInventoryItem(editingItem.id, itemData);
      } else {
        response = await inventoryItemService.createInventoryItem(itemData);
      }

      if (response.success) {
        setToast({ 
          message: editingItem ? 'Inventory item updated successfully!' : 'Inventory item added successfully!', 
          type: 'success' 
        });
        setShowForm(false);
        setEditingItem(null);
        loadData();
      } else {
        setToast({ message: response.error || 'Failed to save inventory item', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save inventory item:', error);
      setToast({ message: 'Failed to save inventory item', type: 'error' });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    confirm({
      title: 'Delete Inventory Item',
      message: `Are you sure you want to delete this inventory item (IMEI: ${item?.imei})? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await inventoryItemService.deleteInventoryItem(itemId);
        if (response.success) {
          setToast({ message: 'Inventory item deleted successfully!', type: 'success' });
          loadData();
        } else {
          setToast({ message: response.error || 'Failed to delete inventory item', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete inventory item:', error);
        setToast({ message: 'Failed to delete inventory item', type: 'error' });
      }
    });
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  // Removed handleAddItem - users should add items from product detail page

  // Filter and search inventory items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (products.find(p => p.id === item.productId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
      const matchesProduct = !productFilter || item.productId === productFilter;
      
      return matchesSearch && matchesStatus && matchesCondition && matchesProduct;
    });
  }, [inventoryItems, searchTerm, statusFilter, conditionFilter, productFilter, products]);

  const columns = [
    { key: 'product', label: 'Product', sortable: true },
    { key: 'imei', label: 'IMEI', sortable: true },
    { key: 'condition', label: 'Condition', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'createdAt', label: 'Added Date', sortable: true },
    { key: 'actions', label: 'Actions' }
  ];

  const tableData = filteredItems.map(item => {
    const product = products.find(p => p.id === item.productId);
    return {
      id: item.id,
      product: (
        <div>
          <div className="font-medium" style={{ color: 'var(--foreground)' }}>
            {product?.name || 'Unknown Product'}
          </div>
          {product?.storage && product?.color && (
            <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {product.storage} - {product.color}
            </div>
          )}
        </div>
      ),
      imei: <span style={{ color: 'var(--foreground)', fontFamily: 'monospace' }}>{item.imei}</span>,
      condition: (
        <span 
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: item.condition === 'new' ? 'rgba(34, 197, 94, 0.1)' : 
                           item.condition === 'refurbished' ? 'rgba(251, 191, 36, 0.1)' : 
                           'rgba(107, 114, 128, 0.1)',
            color: item.condition === 'new' ? 'rgb(34, 197, 94)' : 
                   item.condition === 'refurbished' ? 'rgb(251, 191, 36)' : 
                   'rgb(107, 114, 128)'
          }}
        >
          {item.condition === 'new' ? 'New' : item.condition === 'refurbished' ? 'Refurbished' : 'Used'}
        </span>
      ),
      status: (
        <span 
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: item.status === 'in_stock' ? 'rgba(34, 197, 94, 0.1)' : 
                           item.status === 'sold' ? 'rgba(59, 130, 246, 0.1)' : 
                           item.status === 'defective' ? 'rgba(239, 68, 68, 0.1)' : 
                           'rgba(107, 114, 128, 0.1)',
            color: item.status === 'in_stock' ? 'rgb(34, 197, 94)' : 
                   item.status === 'sold' ? 'rgb(59, 130, 246)' : 
                   item.status === 'defective' ? 'rgb(239, 68, 68)' : 
                   'rgb(107, 114, 128)'
          }}
        >
          {item.status === 'in_stock' ? 'In Stock' : 
           item.status === 'sold' ? 'Sold' : 
           item.status === 'defective' ? 'Defective' : 
           item.status === 'returned' ? 'Returned' : item.status}
        </span>
      ),
      createdAt: formatDate(item.createdAt),
      actions: (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = `/products/${item.productId}`}
            title="View Product"
          >
            <DevicePhoneMobileIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditItem(item)}
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteItem(item.id)}
            title="Delete"
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            IMEI Search & Audit
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Search and audit inventory items by IMEI across all products. To add items, go to the product detail page.
          </p>
        </div>
      </div>

      {/* Filters */}
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
              Find and filter inventory items
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                placeholder="Search by IMEI or product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="sold">Sold</option>
              <option value="returned">Returned</option>
              <option value="defective">Defective</option>
            </select>
          </div>

          <div>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="all">All Conditions</option>
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>

        {products.length > 0 && (
          <div className="mt-4">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border"
              style={{ 
                backgroundColor: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              <option value="">All Products</option>
              {products.filter(p => p.productModelId).map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.storage ? `(${product.storage})` : ''} {product.color ? `- ${product.color}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Inventory Items Table */}
      <PaginatedTableCard
        title="IMEI Inventory"
        data={tableData}
        columns={columns}
        loading={loading}
        itemsPerPage={20}
        empty={!loading && tableData.length === 0}
        emptyTitle="No inventory items found"
        emptyDescription={searchTerm || productFilter 
          ? "No items match your search criteria. Try adjusting your filters."
          : "No inventory items with IMEI tracking found. Add items from product detail pages."}
        emptyAction={!searchTerm && !productFilter ? (
          <Button onClick={() => window.location.href = '/products'} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Go to Products
          </Button>
        ) : undefined}
      />

      {/* Inventory Item Form - Only for editing, not adding */}
      {editingItem && (
        <InventoryItemForm
          item={editingItem}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          title="Edit Inventory Item"
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.type === 'success' ? 'success' : 'error'}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={options?.title || ''}
        message={options?.message || ''}
        confirmText={options?.confirmText || 'Confirm'}
        variant={options?.variant || 'info'}
      />
    </div>
  );
}

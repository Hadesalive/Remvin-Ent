import React, { useState, useEffect, useMemo } from 'react';
import { PaginatedTableCard } from '@/components/ui/dashboard';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { ProductModelForm } from '@/components/ui/forms/product-model-form';
import { ConfirmationDialog } from '@/components/ui/dialogs/confirmation-dialog';
import { useConfirmation } from '@/lib/hooks/useConfirmation';
import { productModelService } from '@/lib/services';
import { ProductModel } from '@/lib/types/core';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

export default function ProductModelsPage() {
  const navigate = useNavigate();
  const { isOpen, options, confirm, handleConfirm, handleClose } = useConfirmation();
  
  const [models, setModels] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<ProductModel | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'brand' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await productModelService.getAllProductModels();
      
      if (response.success && response.data) {
        setModels(response.data);
      } else {
        setModels([]);
        setToast({ message: response.error || 'Failed to load product models', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to load product models:', error);
      setModels([]);
      setToast({ message: 'Failed to load product models', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModel = async (modelData: Omit<ProductModel, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      let response;
      if (editingModel) {
        response = await productModelService.updateProductModel(editingModel.id, modelData);
      } else {
        response = await productModelService.createProductModel(modelData);
      }

      if (response.success) {
        setToast({ 
          message: editingModel ? 'Model updated successfully!' : 'Model created successfully!', 
          type: 'success' 
        });
        setShowForm(false);
        setEditingModel(null);
        loadModels();
      } else {
        setToast({ message: response.error || 'Failed to save model', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to save model:', error);
      setToast({ message: 'Failed to save model', type: 'error' });
    }
  };

  const handleEditModel = (model: ProductModel) => {
    setEditingModel(model);
    setShowForm(true);
  };

  const handleDeleteModel = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    confirm({
      title: 'Delete Product Model',
      message: `Are you sure you want to delete "${model?.name}"? This will not delete products under this model, but you won't be able to create new products with this model.`,
      confirmText: 'Delete',
      variant: 'danger'
    }, async () => {
      try {
        const response = await productModelService.deleteProductModel(modelId);
        if (response.success) {
          setToast({ message: 'Model deleted successfully', type: 'success' });
          loadModels();
        } else {
          setToast({ message: response.error || 'Failed to delete model', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to delete model:', error);
        setToast({ message: 'Failed to delete model', type: 'error' });
      }
    });
  };

  // Get unique brands for filter
  const brands = useMemo(() => {
    const brandSet = new Set(models.map(m => m.brand).filter((brand): brand is string => Boolean(brand)));
    return Array.from(brandSet).sort();
  }, [models]);

  // Filter and sort models
  const filteredAndSortedModels = useMemo(() => {
    const filtered = models.filter(model => {
      const matchesSearch = !searchTerm || 
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.brand?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesBrand = !selectedBrand || model.brand === selectedBrand;
      const matchesActive = showInactive || model.isActive !== false;
      
      return matchesSearch && matchesBrand && matchesActive;
    });

    // Sort models
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'brand':
          aValue = (a.brand || '').toLowerCase();
          bValue = (b.brand || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [models, searchTerm, selectedBrand, sortBy, sortOrder, showInactive]);

  const columns = [
    { key: 'name', label: 'Model Name', sortable: true },
    { key: 'brand', label: 'Brand', sortable: true },
    { key: 'category', label: 'Category' },
    { key: 'actions', label: 'Actions' }
  ];

  // Transform models to table data format
  const tableData = filteredAndSortedModels.map((model) => ({
    id: model.id,
    name: (
      <div className="flex items-center gap-2">
        <CubeIcon className="h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
        <span className="font-medium" style={{ color: 'var(--foreground)' }}>
          {model.name}
        </span>
      </div>
    ),
    brand: <span style={{ color: 'var(--muted-foreground)' }}>{model.brand || '-'}</span>,
    category: <span style={{ color: 'var(--muted-foreground)' }}>{model.category || '-'}</span>,
    actions: (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/products?model=${model.id}`);
          }}
          title="View Products"
        >
          View Products
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEditModel(model);
          }}
          title="Edit"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteModel(model.id);
          }}
          title="Delete"
          className="text-red-600 hover:text-red-700"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Product Models
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Manage product models (e.g., iPhone 17, iPhone 17 Pro). Create products under each model.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingModel(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Model
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
            <Input
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="min-w-[150px]">
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border"
            style={{ 
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--foreground)'
            }}
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="showInactive"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="showInactive" className="text-sm" style={{ color: 'var(--foreground)' }}>
            Show Inactive
          </label>
        </div>
      </div>

      {/* Models Table */}
      <PaginatedTableCard
        title="Product Models"
        data={tableData}
        columns={columns}
        loading={loading}
        itemsPerPage={20}
        empty={!loading && tableData.length === 0}
        emptyTitle="No product models found"
        emptyDescription="Create your first product model to get started"
        emptyAction={
          <Button onClick={() => {
            setEditingModel(null);
            setShowForm(true);
          }} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Model
          </Button>
        }
      />

      {/* Form Modal */}
      <ProductModelForm
        model={editingModel}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingModel(null);
        }}
        onSave={handleSaveModel}
        title={editingModel ? 'Edit Product Model' : 'New Product Model'}
      />

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

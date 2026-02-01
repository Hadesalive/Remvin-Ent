import React, { useState, useEffect } from 'react';
import { Modal, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { inventoryItemService } from '@/lib/services';
import { InventoryItem, Product } from '@/lib/types/core';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ImeiSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (imeis: string[]) => void;
  product: Product;
  quantity: number;
}

export function ImeiSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  product,
  quantity
}: ImeiSelectionModalProps) {
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [selectedImeis, setSelectedImeis] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen && product.id) {
      loadAvailableItems();
    } else {
      setSelectedImeis(new Set());
      setSearchTerm('');
    }
  }, [isOpen, product.id]);

  const loadAvailableItems = async () => {
    setLoading(true);
    try {
      const response = await inventoryItemService.getInventoryItems({
        productId: product.id,
        status: 'in_stock'
      });

      if (response.success && response.data) {
        setAvailableItems(response.data);
      } else {
        setToast({ message: 'Failed to load available items', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading inventory items:', error);
      setToast({ message: 'Failed to load available items', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.imei.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleImei = (imei: string) => {
    const newSelected = new Set(selectedImeis);
    if (newSelected.has(imei)) {
      newSelected.delete(imei);
    } else {
      if (newSelected.size < quantity) {
        newSelected.add(imei);
      } else {
        setToast({ 
          message: `You can only select ${quantity} IMEI(s) for quantity ${quantity}`, 
          type: 'error' 
        });
        return;
      }
    }
    setSelectedImeis(newSelected);
  };

  const handleConfirm = () => {
    if (selectedImeis.size !== quantity) {
      setToast({ 
        message: `Please select exactly ${quantity} IMEI(s) to match the quantity`, 
        type: 'error' 
      });
      return;
    }
    onConfirm(Array.from(selectedImeis));
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Select IMEI for ${product.name}`}
        size="lg"
        closeOnOverlayClick={false}
      >
        <div className="space-y-3">
          {/* Info */}
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Select {quantity} IMEI(s) • {selectedImeis.size} selected
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
            <Input
              placeholder="Search IMEIs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>

          {/* IMEI List */}
          <div className="border rounded max-h-80 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
            {loading ? (
              <div className="p-6 text-center">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {searchTerm ? 'No matches' : 'No available items'}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {filteredItems.map((item) => {
                  const isSelected = selectedImeis.has(item.imei);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleImei(item.imei)}
                      className={`w-full px-3 py-2 text-left hover:bg-[var(--muted)]/30 transition-colors ${
                        isSelected ? 'bg-[var(--accent)]/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>
                            {item.imei}
                          </p>
                          {item.condition && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              {item.condition}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckIcon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded hover:opacity-70 transition-opacity"
              style={{ 
                color: 'var(--muted-foreground)',
                backgroundColor: 'transparent'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedImeis.size !== quantity}
              className="px-3 py-1.5 text-xs font-medium rounded disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-contrast, white)'
              }}
            >
              Confirm ({selectedImeis.size}/{quantity})
            </button>
          </div>
        </div>
      </Modal>

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

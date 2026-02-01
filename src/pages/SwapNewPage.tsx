import React, { useState, useEffect, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { swapService, customerService, productService, productModelService } from '@/lib/services';
import { Customer, Product, Swap, ProductModel } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  UserIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import { CompactCustomerForm } from '@/components/ui/forms/compact-customer-form';

export default function SwapNewPage() {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  
  // Product selection
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  // Trade-in details
  const [tradeInProductName, setTradeInProductName] = useState('');
  const [tradeInModelId, setTradeInModelId] = useState<string>('');
  const [tradeInStorage, setTradeInStorage] = useState<string>('');
  const [tradeInColor, setTradeInColor] = useState<string>('');
  const [tradeInImei, setTradeInImei] = useState('');
  const [tradeInCondition, setTradeInCondition] = useState<'new' | 'refurbished' | 'used' | 'fair' | 'poor'>('used');
  const [tradeInNotes, setTradeInNotes] = useState('');
  const [tradeInValue, setTradeInValue] = useState<number>(0);
  
  // Customer details (for new customers or override)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Update customer details when customer is selected
    if (selectedCustomer) {
      const customer = customers.find(c => c.id === selectedCustomer);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone || '');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
      }
    }
  }, [selectedCustomer, customers]);

  const loadData = async () => {
    try {
      const [customersRes, productsRes, modelsRes] = await Promise.all([
        customerService.getAllCustomers(),
        productService.getAllProducts(),
        productModelService.getAllProductModels()
      ]);

      if (customersRes.success && customersRes.data) setCustomers(customersRes.data);
      if (productsRes.success && productsRes.data) setProducts(productsRes.data);
      if (modelsRes.success && modelsRes.data) setProductModels(modelsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Failed to load data', type: 'error' });
    }
  };

  // Get selected trade-in model
  const selectedTradeInModel = useMemo(() => {
    if (!tradeInModelId) return null;
    return productModels.find(m => m.id === tradeInModelId);
  }, [productModels, tradeInModelId]);

  // Get available storage and color options from model
  const availableStorageOptions = useMemo(() => {
    if (!selectedTradeInModel?.storageOptions) return [];
    return selectedTradeInModel.storageOptions;
  }, [selectedTradeInModel]);

  const availableColorOptions = useMemo(() => {
    if (!selectedTradeInModel?.colors) return [];
    return selectedTradeInModel.colors;
  }, [selectedTradeInModel]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    const term = customerSearchTerm.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term)
    );
  }, [customers, customerSearchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products;
    const searchLower = productSearchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower)
    );
  }, [products, productSearchTerm]);

  const selectedProductData = useMemo(() => {
    if (!selectedProduct) return null;
    return products.find(p => p.id === selectedProduct);
  }, [products, selectedProduct]);

  // Calculate difference to pay
  const differencePaid = useMemo(() => {
    if (!selectedProductData) return 0;
    const productPrice = selectedProductData.price || 0;
    return Math.max(0, productPrice - tradeInValue);
  }, [selectedProductData, tradeInValue]);

  const handleCustomerSelect = (customerId: string, displayLabel = '') => {
    setSelectedCustomer(customerId);
    setCustomerSearchTerm(displayLabel);
    setShowCustomerDropdown(false);
  };

  const handleCustomerCreated = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    try {
      const response = await customerService.createCustomer(customerData);
      if (response.success && response.data) {
        setCustomers(prev => [...prev, response.data!]);
        setSelectedCustomer(response.data.id);
        setCustomerName(response.data.name);
        setCustomerPhone(response.data.phone || '');
        setCustomerEmail(response.data.email || '');
        setCustomerAddress(response.data.address || '');
        setCustomerSearchTerm(response.data.name);
        setShowCustomerForm(false);
        setToast({ message: 'Customer created successfully', type: 'success' });
      } else {
        setToast({ message: response.error || 'Failed to create customer', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      setToast({ message: 'Failed to create customer', type: 'error' });
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProduct(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setProductSearchTerm(product.name);
    }
    setShowProductDropdown(false);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedProductData) {
      setToast({ message: 'Please select a product to purchase', type: 'error' });
      return;
    }

    if (!customerName.trim()) {
      setToast({ message: 'Please enter customer name', type: 'error' });
      return;
    }

    if (!tradeInImei.trim()) {
      setToast({ message: 'Please enter IMEI of the trade-in device', type: 'error' });
      return;
    }

    if (!tradeInProductName.trim() && !tradeInModelId) {
      setToast({ message: 'Please select a device model or enter the device name', type: 'error' });
      return;
    }

    // If model is selected, require storage and color (if model has those options)
    if (tradeInModelId && selectedTradeInModel) {
      if (availableStorageOptions.length > 0 && !tradeInStorage) {
        setToast({ message: 'Please select storage capacity', type: 'error' });
        return;
      }
      if (availableColorOptions.length > 0 && !tradeInColor) {
        setToast({ message: 'Please select color', type: 'error' });
        return;
      }
    }

    if (tradeInValue < 0) {
      setToast({ message: 'Trade-in value cannot be negative', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      // Build trade-in product name with storage and color if available
      let finalTradeInProductName = tradeInProductName.trim();
      if (selectedTradeInModel && tradeInStorage && tradeInColor) {
        finalTradeInProductName = `${selectedTradeInModel.name} ${tradeInStorage} ${tradeInColor}`;
      } else if (selectedTradeInModel && tradeInStorage) {
        finalTradeInProductName = `${selectedTradeInModel.name} ${tradeInStorage}`;
      } else if (selectedTradeInModel) {
        finalTradeInProductName = selectedTradeInModel.name;
      }

      const swapData: Omit<Swap, 'id' | 'createdAt' | 'updatedAt' | 'swapNumber'> & {
        tradeInModelId?: string;
        tradeInStorage?: string;
        tradeInColor?: string;
      } = {
        customerId: selectedCustomer || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        purchasedProductId: selectedProduct,
        purchasedProductName: selectedProductData.name,
        purchasedProductPrice: selectedProductData.price,
        tradeInProductName: finalTradeInProductName,
        tradeInImei: tradeInImei.trim(),
        tradeInCondition: tradeInCondition,
        tradeInNotes: tradeInNotes.trim() || undefined,
        tradeInValue: tradeInValue,
        differencePaid: differencePaid,
        paymentMethod: paymentMethod,
        status: 'completed',
        notes: notes.trim() || undefined,
        // Additional fields for product matching
        tradeInModelId: tradeInModelId || undefined,
        tradeInStorage: tradeInStorage || undefined,
        tradeInColor: tradeInColor || undefined
      };

      const response = await swapService.createSwap(swapData);

      if (response.success && response.data) {
        setToast({ 
          message: `Swap completed successfully! Swap #${response.data.swapNumber}`, 
          type: 'success' 
        });
        
        // Navigate to swap detail page or swaps list
        setTimeout(() => {
          navigate(`/swaps/${response.data!.id}`);
        }, 1500);
      } else {
        setToast({ message: response.error || 'Failed to create swap', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to create swap:', error);
      setToast({ message: 'Failed to create swap', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/swaps')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Swaps
          </Button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              New Device Swap
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Record a device trade-in/swap transaction
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <div 
            className="p-5 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <UserIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Customer Information
              </h2>
            </div>

            <div className="space-y-4">
              {/* Customer Search */}
              <div className="relative">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    placeholder="Search or select customer..."
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="pl-10"
                  />
                </div>
                
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div 
                    className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg border shadow-lg"
                    style={{ 
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    {filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer.id, customer.name)}
                        className="w-full text-left px-4 py-2 hover:bg-opacity-50"
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'var(--foreground)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--muted)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="font-medium">{customer.name}</div>
                        {customer.phone && (
                          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                            {customer.phone}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomerForm(true)}
                className="w-full"
              >
                + New Customer
              </Button>

              {/* Customer Details */}
              <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <Input
                  label="Customer Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
                <Input
                  label="Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
                <Input
                  label="Email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter email address"
                />
                <Textarea
                  label="Address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Enter address"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div 
            className="p-5 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CubeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Product to Purchase
              </h2>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                  <Input
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="pl-10"
                  />
                </div>
                
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div 
                    className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg border shadow-lg"
                    style={{ 
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)'
                    }}
                  >
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product.id)}
                        className="w-full text-left px-4 py-2 hover:bg-opacity-50"
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'var(--foreground)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--muted)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          {formatCurrency(product.price)} • Stock: {product.stock}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProductData && (
                <div 
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--muted)' }}
                >
                  <div className="font-medium" style={{ color: 'var(--foreground)' }}>
                    {selectedProductData.name}
                  </div>
                  <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    Price: {formatCurrency(selectedProductData.price)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Trade-in Details */}
          <div 
            className="p-5 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <DevicePhoneMobileIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Trade-in Device
              </h2>
            </div>

            <div className="space-y-4">
              {/* Product Model Selection */}
              <div>
                <label className="text-sm font-medium block mb-2" style={{ color: 'var(--foreground)' }}>
                  Device Model *
                </label>
                <Select
                  value={tradeInModelId}
                  onChange={(e) => {
                    setTradeInModelId(e.target.value);
                    const model = productModels.find(m => m.id === e.target.value);
                    if (model) {
                      setTradeInProductName(model.name);
                    }
                    // Reset storage and color when model changes
                    setTradeInStorage('');
                    setTradeInColor('');
                  }}
                  placeholder="Select device model"
                  required
                  options={[
                    { value: '', label: 'Select a model...' },
                    ...productModels
                      .filter(m => m.isActive !== false)
                      .map(m => ({ value: m.id, label: `${m.name}${m.brand ? ` (${m.brand})` : ''}` }))
                  ]}
                />
              </div>

              {/* Manual Model Name (fallback) */}
              <Input
                label="Device Name (if model not listed)"
                value={tradeInProductName}
                onChange={(e) => setTradeInProductName(e.target.value)}
                placeholder="e.g., iPhone 16 Pro Max"
              />

              {/* Storage Selection */}
              {selectedTradeInModel && availableStorageOptions.length > 0 && (
                <Select
                  label="Storage *"
                  value={tradeInStorage}
                  onChange={(e) => setTradeInStorage(e.target.value)}
                  required
                  options={[
                    { value: '', label: 'Select storage...' },
                    ...availableStorageOptions.map(s => ({ value: s, label: s }))
                  ]}
                />
              )}

              {/* Color Selection */}
              {selectedTradeInModel && availableColorOptions.length > 0 && (
                <Select
                  label="Color *"
                  value={tradeInColor}
                  onChange={(e) => setTradeInColor(e.target.value)}
                  required
                  options={[
                    { value: '', label: 'Select color...' },
                    ...availableColorOptions.map(c => ({ value: c, label: c }))
                  ]}
                />
              )}

              {/* Manual Storage/Color (if model doesn't have options) */}
              {selectedTradeInModel && availableStorageOptions.length === 0 && (
                <Input
                  label="Storage"
                  value={tradeInStorage}
                  onChange={(e) => setTradeInStorage(e.target.value)}
                  placeholder="e.g., 256GB, 512GB"
                />
              )}

              {selectedTradeInModel && availableColorOptions.length === 0 && (
                <Input
                  label="Color"
                  value={tradeInColor}
                  onChange={(e) => setTradeInColor(e.target.value)}
                  placeholder="e.g., Red, Blue, Natural Titanium"
                />
              )}
              
              <Input
                label="IMEI *"
                value={tradeInImei}
                onChange={(e) => setTradeInImei(e.target.value)}
                placeholder="Enter IMEI number"
                required
              />

              <Select
                label="Condition *"
                value={tradeInCondition}
                onChange={(e) => setTradeInCondition(e.target.value as typeof tradeInCondition)}
                required
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'refurbished', label: 'Refurbished' },
                  { value: 'used', label: 'Used' },
                  { value: 'fair', label: 'Fair' },
                  { value: 'poor', label: 'Poor' }
                ]}
              />

              <Input
                label="Trade-in Value"
                type="number"
                value={tradeInValue}
                onChange={(e) => setTradeInValue(parseFloat(e.target.value) || 0)}
                placeholder="Enter trade-in value"
                min="0"
                step="0.01"
              />

              <Textarea
                label="Condition Notes"
                value={tradeInNotes}
                onChange={(e) => setTradeInNotes(e.target.value)}
                placeholder="Describe device condition, damage, etc."
                rows={3}
              />
            </div>
          </div>

          {/* Payment & Summary */}
          <div 
            className="p-5 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)'
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CurrencyDollarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                Payment Summary
              </h2>
            </div>

            <div className="space-y-4">
              {selectedProductData && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>Product Price:</span>
                    <span style={{ color: 'var(--foreground)' }}>{formatCurrency(selectedProductData.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--muted-foreground)' }}>Trade-in Value:</span>
                    <span style={{ color: 'var(--foreground)' }}>-{formatCurrency(tradeInValue)}</span>
                  </div>
                  <div className="border-t pt-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between font-semibold">
                      <span style={{ color: 'var(--foreground)' }}>Amount to Pay:</span>
                      <span style={{ color: 'var(--foreground)' }}>{formatCurrency(differencePaid)}</span>
                    </div>
                  </div>
                </div>
              )}

              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'credit', label: 'Store Credit' },
                  { value: 'other', label: 'Other' }
                ]}
              />

              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button
          variant="outline"
          onClick={() => navigate('/swaps')}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            loading || 
            !selectedProductData || 
            !customerName.trim() || 
            !tradeInImei.trim() || 
            (!tradeInProductName.trim() && !tradeInModelId) ||
            (tradeInModelId && selectedTradeInModel ? (availableStorageOptions.length > 0 && !tradeInStorage) : false) ||
            (tradeInModelId && selectedTradeInModel ? (availableColorOptions.length > 0 && !tradeInColor) : false)
          }
          className="min-w-[120px]"
        >
          {loading ? 'Processing...' : 'Complete Swap'}
        </Button>
      </div>

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <CompactCustomerForm
          isOpen={showCustomerForm}
          onClose={() => setShowCustomerForm(false)}
          onSave={handleCustomerCreated}
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
    </div>
  );
}

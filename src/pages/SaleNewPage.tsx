import React, { useState, useEffect, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input, Select, Textarea } from '@/components/ui/forms';
import { customerService, productService, salesService, inventoryItemService } from '@/lib/services';
import { Customer, Product, SaleItem, InventoryItem } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    PlusIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    UserIcon,
    CubeIcon,
    CurrencyDollarIcon,
    ReceiptPercentIcon,
    ArrowLeftIcon,
    PrinterIcon
} from '@heroicons/react/24/outline';
import { CompactCustomerForm } from '@/components/ui/forms/compact-customer-form';
import { SimpleReceipt, renderSimpleReceiptHTML } from '@/components/ui/receipt/SimpleReceipt';
import { makeSaleReceiptData } from '@/components/ui/receipt/formatSimpleReceiptData';
import { ImeiSelectionModal, AddImeiModal } from '@/components/ui/modals';
import { productModelService } from '@/lib/services';

export default function NewSalePage() {
    const navigate = useNavigate();
    const { formatCurrency, preferences, companySettings } = useSettings();
    const { user } = useAuth();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [notes, setNotes] = useState('');
    const [discount, setDiscount] = useState(preferences.defaultDiscountPercent || 0);
    const [taxEnabled, setTaxEnabled] = useState(true); // Tax toggle - enabled by default
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other'>(
        (preferences.defaultPaymentMethod as 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other') || 'cash'
    );
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Product search and selection
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [showProductDropdown, setShowProductDropdown] = useState(false);
    const [imeiSearchTerm, setImeiSearchTerm] = useState('');
    const [imeiSearching, setImeiSearching] = useState(false);

    // Modal states
    const [showAddImeiModal, setShowAddImeiModal] = useState(false);
    const [showCustomerForm, setShowCustomerForm] = useState(false);
    const [showImeiModal, setShowImeiModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
    

    // Credit state
    const [customerCredit, setCustomerCredit] = useState(0);
    const [creditAmount, setCreditAmount] = useState('');
    const [appliedCredit, setAppliedCredit] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [customersRes, productsRes] = await Promise.all([
                customerService.getAllCustomers(),
                productService.getAllProducts()
            ]);

            if (customersRes.success) setCustomers(customersRes.data || []);
            if (productsRes.success) setProducts(productsRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
            setToast({ message: 'Failed to load data', type: 'error' });
        }
    };

    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm.trim()) return customers;
        const term = customerSearchTerm.toLowerCase();
        return customers.filter((c) =>
            c.name.toLowerCase().includes(term) ||
            c.email?.toLowerCase().includes(term) ||
            c.phone?.toLowerCase().includes(term)
        );
    }, [customers, customerSearchTerm]);

    const loadCustomerCredit = async (customerId: string) => {
        if (!customerId) {
            setCustomerCredit(0);
            setAppliedCredit(0);
            setCreditAmount('');
            return;
        }

        try {
            const response = await customerService.getCustomerById(customerId);
            if (response.success && response.data) {
                setCustomerCredit(response.data.storeCredit || 0);
            }
        } catch (error) {
            console.error('Failed to load customer credit:', error);
        }
    };

    const handleCustomerSelect = async (customerId: string, displayLabel = '') => {
        setSelectedCustomer(customerId);
        setCustomerSearchTerm(displayLabel);
        setShowCustomerDropdown(false);
        await loadCustomerCredit(customerId);
    };

    const handleCustomerCreated = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
        try {
            const response = await customerService.createCustomer(customerData);
            if (response.success && response.data) {
                setCustomers(prev => [...prev, response.data!]);
                setSelectedCustomer(response.data.id);
                setCustomerSearchTerm(response.data.name);
                setShowCustomerForm(false);
                await loadCustomerCredit(response.data.id);
                setToast({ message: 'Customer created successfully', type: 'success' });
            } else {
                setToast({ message: response.error || 'Failed to create customer', type: 'error' });
            }
        } catch (error) {
            console.error('Failed to create customer:', error);
            setToast({ message: 'Failed to create customer', type: 'error' });
        }
    };


    // Filter products based on search term
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


    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.product-dropdown')) {
                setShowProductDropdown(false);
            }
            if (!target.closest('.customer-dropdown')) {
                setShowCustomerDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const handleImeiSearch = async (imei: string) => {
        if (!imei.trim()) return;

        setImeiSearching(true);
        try {
            const response = await inventoryItemService.getInventoryItemByImei(imei);
            
            if (response.success && response.data) {
                const inventoryItem = response.data;
                
                // Check if item is in stock
                if (inventoryItem.status !== 'in_stock') {
                    setToast({ 
                        message: `Item with IMEI ${imei} is not available (Status: ${inventoryItem.status})`, 
                        type: 'error' 
                    });
                    setImeiSearchTerm('');
                    setImeiSearching(false);
                    return;
                }

                // Get the product associated with this inventory item
                const productResponse = await productService.getProductById(inventoryItem.productId);
                
                if (productResponse.success && productResponse.data) {
                    const product = productResponse.data;
                    
                    // Check if product already exists in cart
                    const existingItemIndex = saleItems.findIndex(item => item.productId === product.id);

                    if (existingItemIndex >= 0) {
                        // Update existing item - add IMEI to the list
                        const updatedItems = [...saleItems];
                        const existingImeis = updatedItems[existingItemIndex].imeis || [];
                        
                        // Check if IMEI already added
                        if (existingImeis.includes(imei)) {
                            setToast({ message: `IMEI ${imei} already added to this item`, type: 'error' });
                            setImeiSearchTerm('');
                            setImeiSearching(false);
                            return;
                        }

                        updatedItems[existingItemIndex].imeis = [...existingImeis, imei];
                        updatedItems[existingItemIndex].quantity += 1;
                        updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
                        setSaleItems(updatedItems);
                        setToast({ message: `${product.name} quantity increased (IMEI: ${imei})`, type: 'success' });
                    } else {
                        // Add new item with IMEI
                        const newItem: SaleItem = {
                            productId: product.id,
                            productName: product.name,
                            quantity: 1,
                            unitPrice: product.price,
                            total: product.price,
                            imeis: [imei],
                        };
                        setSaleItems([...saleItems, newItem]);
                        setToast({ message: `${product.name} added to sale (IMEI: ${imei})`, type: 'success' });
                    }

                    setImeiSearchTerm('');
                } else {
                    setToast({ message: 'Product not found for this IMEI', type: 'error' });
                }
            } else {
                setToast({ message: `No inventory item found with IMEI: ${imei}`, type: 'error' });
            }
        } catch (error) {
            console.error('Failed to search by IMEI:', error);
            setToast({ message: 'Failed to search by IMEI', type: 'error' });
        } finally {
            setImeiSearching(false);
        }
    };



    const updateItem = (index: number, field: keyof SaleItem, value: string | number | boolean | undefined) => {
        const updatedItems = [...saleItems];
        if (value === undefined && field === 'cost') {
            const { cost, ...rest } = updatedItems[index];
            updatedItems[index] = rest as SaleItem;
        } else if (value !== undefined) {
            updatedItems[index] = { ...updatedItems[index], [field]: value };
        }

        // Recalculate total if quantity or unitPrice changed
        if (field === 'quantity' || field === 'unitPrice') {
            updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
        }

        setSaleItems(updatedItems);
    };

    const removeItem = (index: number) => {
        const currentSaleItems = saleItems || [];
        setSaleItems(currentSaleItems.filter((_, i) => i !== index));
    };

    const calculateTotals = () => {
        const currentSaleItems = saleItems || [];
        const subtotal = currentSaleItems.reduce((sum, item) => sum + item.total, 0);

        // Apply discount if set
        const discountAmount = (subtotal * discount) / 100;
        const discountedSubtotal = subtotal - discountAmount;

        // Calculate tax on discounted amount only if tax is enabled
        const taxRate = companySettings.taxRate || 0.15;
        const tax = taxEnabled ? discountedSubtotal * taxRate : 0;

        // Total is always the original amount (don't subtract credit)
        const total = discountedSubtotal + tax;

        // Calculate cash needed (if credit is applied)
        const creditApplied = appliedCredit;
        const cashNeeded = Math.max(0, total - creditApplied);

        return { subtotal, discount: discountAmount, tax, creditApplied, total, cashNeeded };
    };

    const handleApplyCredit = () => {
        if (!creditAmount || parseFloat(creditAmount) <= 0) {
            setToast({ message: 'Please enter a valid credit amount', type: 'error' });
            return;
        }

        const creditToApply = parseFloat(creditAmount);
        const currentTotal = calculateTotals().total;

        if (creditToApply > customerCredit) {
            setToast({ message: `Only ${formatCurrency(customerCredit)} credit available`, type: 'error' });
            return;
        }

        if (creditToApply > currentTotal) {
            setToast({ message: `Credit cannot exceed sale total of ${formatCurrency(currentTotal)}`, type: 'error' });
            return;
        }

        setAppliedCredit(creditToApply);
        setCreditAmount('');
        setToast({ message: `${formatCurrency(creditToApply)} credit applied`, type: 'success' });
    };

    // Prepare receipt data
    const getReceiptData = () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tax, total } = calculateTotals();
        const selectedCustomerData = customers.find(c => c.id === selectedCustomer);
        const now = new Date();

        return {
            receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
            date: now.toISOString().split('T')[0],
            time: now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            }),
            company: {
                name: companySettings.companyName || "House of Electronics",
                address: companySettings.address || "Pultney Street",
                city: "Freetown",
                state: "Western Area Urban, BO etc",
                zip: "94105",
                phone: companySettings.phone || "+232 74 123-4567",
                email: companySettings.email || "info@houseofelectronics.com",
                logo: "/images/house-of-electronics-logo-dark.png"
            },
            customer: {
                name: selectedCustomerData?.name || 'Walk-in Customer',
                email: selectedCustomerData?.email || '',
                phone: selectedCustomerData?.phone || ''
            },
            items: saleItems.map(item => ({
                id: item.productId,
                description: item.productName,
                quantity: item.quantity,
                rate: item.unitPrice,
                amount: item.total
            })),
            paymentMethod: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace('_', ' '),
            taxRate: taxEnabled ? Math.round((companySettings.taxRate || 0.15) * 100) : 0,
            discount: discount,
            footerMessage: preferences.receiptFooter || 'Thank you for your business!'
        };
    };

    // Print receipt
    const handlePrintReceipt = () => {
        if (saleItems.length === 0) {
            setToast({ message: 'Please add at least one item to print receipt', type: 'error' });
            return;
        }
        const receiptData = makeSaleReceiptData({
            id: 'TEMP',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtotal: calculateTotals().subtotal,
            tax: calculateTotals().tax,
            discount: calculateTotals().discount,
            total: calculateTotals().total,
            status: 'completed',
            paymentMethod,
            customerName: customers.find(c => c.id === selectedCustomer)?.name || 'Walk-in Customer',
            items: saleItems,
            // ...other Sale fields used by the converter
        }, {
            company: {
                name: companySettings.companyName,
                address: companySettings.address,
                city: (companySettings as any).city || '',
                state: (companySettings as any).state || '',
                zip: (companySettings as any).zip || '',
                phone: companySettings.phone,
                email: companySettings.email,
            },
            preferences,
        });
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
            printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt Print</title></head><body>${renderSimpleReceiptHTML(receiptData, formatCurrency)}</body></html>`);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const currentSaleItems = saleItems || [];
        if (currentSaleItems.length === 0) {
            setToast({ message: 'Please add at least one item to the sale', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            const { subtotal, discount: discountAmount, tax, creditApplied, total } = calculateTotals();
            const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

            // Use selected customer
            const finalCustomerId = selectedCustomer;
            const finalCustomerName = selectedCustomerData?.name || 'Walk-in Customer';

            // Determine final credit applied and payment method
            let finalCreditApplied = creditApplied;
            let finalPaymentMethod = paymentMethod;

            if (paymentMethod === 'credit') {
                if (!finalCustomerId) {
                    setToast({ message: 'Customer is required when using credit payment', type: 'error' });
                    setLoading(false);
                    return;
                }

                if (customerCredit <= 0) {
                    setToast({ message: 'Customer has no store credit available', type: 'error' });
                    setLoading(false);
                    return;
                }

                // Auto-apply maximum credit if not already applied
                const totalBeforeCredit = subtotal + tax - discountAmount;
                finalCreditApplied = Math.min(customerCredit, totalBeforeCredit);

                if (finalCreditApplied <= 0) {
                    setToast({ message: 'Cannot use credit payment - no balance to cover', type: 'error' });
                    setLoading(false);
                    return;
                }

                // Payment method is credit (keep as is)
                finalPaymentMethod = 'credit';
            } else if (finalCreditApplied > 0) {
                // Credit was manually applied with another payment method
                // Determine if it's fully paid by credit or mixed payment
                const remainingBalance = total - finalCreditApplied;
                if (remainingBalance <= 0) {
                    // Fully paid by credit
                    finalPaymentMethod = 'credit';
                } else {
                    // Mixed payment - keep original payment method for remaining cash
                    finalPaymentMethod = paymentMethod; // Keep original method for cash portion
                }
            }

            // Update customer credit if credit was applied
            let finalNotes = notes || '';
            if (finalCreditApplied > 0 && finalCustomerId) {
                try {
                    const customer = await customerService.getCustomerById(finalCustomerId);
                    if (customer.success && customer.data) {
                        const currentCredit = customer.data.storeCredit || 0;
                        const newCredit = Math.max(0, currentCredit - finalCreditApplied);

                        // Ensure updates is a valid object
                        const updates = { storeCredit: newCredit };
                        const updateResponse = await customerService.updateCustomer(finalCustomerId, updates);

                        if (!updateResponse.success) {
                            throw new Error(updateResponse.error || 'Failed to update customer credit');
                        }

                        const cashNeeded = total - finalCreditApplied;
                        if (cashNeeded > 0) {
                            finalNotes = finalNotes
                                ? `${finalNotes}\nStore credit applied: ${formatCurrency(finalCreditApplied)}. Cash needed: ${formatCurrency(cashNeeded)}`
                                : `Store credit applied: ${formatCurrency(finalCreditApplied)}. Cash needed: ${formatCurrency(cashNeeded)}`;
                        } else {
                            finalNotes = finalNotes
                                ? `${finalNotes}\nStore credit applied: ${formatCurrency(finalCreditApplied)} (Fully paid by credit)`
                                : `Store credit applied: ${formatCurrency(finalCreditApplied)} (Fully paid by credit)`;
                        }
                    }
                } catch (error) {
                    console.error('Failed to apply credit:', error);
                    setToast({ message: `Failed to apply credit: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
                    setLoading(false);
                    return;
                }
            }

            // Total is always the original amount (subtotal + tax - discount)
            // Don't subtract credit from total
            const saleData = {
                customerId: finalCustomerId || undefined,
                customerName: finalCustomerName,
                items: saleItems,
                subtotal,
                tax,
                discount: discountAmount,
                total, // Original total, credit is separate
                status: 'completed' as const,
                paymentMethod: finalPaymentMethod, // Will be 'credit' if credit covers all or selected
                notes: finalNotes || undefined,
                // Add user info for RBAC tracking
                userId: user?.id,
                cashierName: user?.fullName,
                cashierEmployeeId: user?.employeeId,
            };

            const response = await salesService.createSale(saleData);

            if (response.success) {
                // Check for stock warnings (backorders) - if warnings exist in response
                if ((response as any).warnings && (response as any).warnings.length > 0) {
                    const warningMessage = `Sale created with backorders:\n${(response as any).warnings.map((w: any) =>
                        `${w.product}: ${w.available} available, ${w.requested} requested (${w.backorder} backordered)`
                    ).join('\n')}`;
                    setToast({ message: warningMessage, type: 'error' });
                } else {
                    setToast({ message: 'Sale created successfully!', type: 'success' });
                }

                setTimeout(() => {
                    navigate('/sales');
                }, 1000);
            } else {
                // Handle stock validation errors with details
                if (response.error === 'Stock validation failed' && (response as { details?: string[] }).details) {
                    const details = (response as { details?: string[] }).details!;
                    const errorMessage = details.join('\n');
                    setToast({ message: errorMessage, type: 'error' });
                } else {
                    setToast({ message: response.error || 'Failed to create sale', type: 'error' });
                }
            }
        } catch (error) {
            console.error('Error creating sale:', error);
            setToast({ message: 'Failed to create sale', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const totalDetails = calculateTotals();
    const { subtotal, discount: discountAmount, tax, creditApplied, total, cashNeeded } = totalDetails;

    return (
        <div
            className="min-h-screen"
            style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)'
            }}
        >
            <form onSubmit={handleSubmit} className="h-screen flex flex-col">
                {/* Minimal Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: 'var(--background)' }}>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/sales')}
                            className="p-1 hover:opacity-70 transition-opacity"
                            style={{ color: 'var(--muted-foreground)' }}
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                            New Sale
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrintReceipt}
                            disabled={(saleItems || []).length === 0}
                            className="px-3 py-1.5 text-sm rounded hover:opacity-70 transition-opacity disabled:opacity-50"
                            style={{ 
                                color: 'var(--muted-foreground)',
                                backgroundColor: 'transparent'
                            }}
                        >
                            Print
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (saleItems || []).length === 0}
                            className="px-4 py-1.5 text-sm font-medium rounded disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--accent)',
                                color: 'var(--accent-contrast, white)'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 flex flex-col overflow-hidden">
                        {/* Minimal Top Bar - Customer & Product Search */}
                        <div className="px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--background)' }}>
                            {/* Customer Search */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 customer-dropdown">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                                    <Input
                                        placeholder="Customer..."
                                        value={selectedCustomer ? customers.find(c => c.id === selectedCustomer)?.name || customerSearchTerm : customerSearchTerm}
                                        onChange={(e) => {
                                            setCustomerSearchTerm(e.target.value);
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setShowCustomerDropdown(false);
                                            }
                                        }}
                                        className="pl-9 text-sm"
                                    />
                                    {showCustomerDropdown && (
                                        <div
                                            className="absolute top-full left-0 right-0 z-50 mt-1 rounded shadow-lg overflow-hidden border"
                                            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                                        >
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredCustomers.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowCustomerDropdown(false);
                                                                setShowCustomerForm(true);
                                                            }}
                                                            className="px-3 py-1.5 text-xs rounded hover:opacity-70 transition-opacity"
                                                            style={{ 
                                                                color: 'var(--muted-foreground)',
                                                                backgroundColor: 'transparent'
                                                            }}
                                                        >
                                                            Create New Customer
                                                        </button>
                                                    </div>
                                                ) : (
                                                    filteredCustomers.slice(0, 8).map((customer) => {
                                                        const label = `${customer.name}${customer.email ? ` (${customer.email})` : ''}`;
                                                        return (
                                                            <button
                                                                key={customer.id}
                                                                type="button"
                                                                onClick={() => handleCustomerSelect(customer.id, label)}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors border-b last:border-b-0"
                                                                style={{
                                                                    color: 'var(--foreground)',
                                                                    borderColor: 'var(--border)'
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="font-medium truncate">{customer.name}</span>
                                                                    {customer.storeCredit && customer.storeCredit > 0 && (
                                                                        <span className="text-xs px-1.5 py-0.5 rounded font-medium text-green-600 bg-green-50 dark:bg-green-900/20">
                                                                            {formatCurrency(customer.storeCredit)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCustomerForm(true)}
                                    className="flex items-center gap-1 flex-shrink-0"
                                >
                                    <UserIcon className="h-4 w-4" />
                                    New
                                </Button>
                                {selectedCustomer && customerCredit > 0 && (
                                    <div className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium">
                                        Credit: {formatCurrency(customerCredit)}
                                    </div>
                                )}
                            </div>

                            {/* Product Search */}
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1 product-dropdown">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                                    <Input
                                        placeholder="Search by IMEI or product name..."
                                        value={imeiSearchTerm || productSearchTerm}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value.length === 15 && /^\d+$/.test(value)) {
                                                // Looks like an IMEI
                                                setImeiSearchTerm(value);
                                                setProductSearchTerm('');
                                            } else {
                                                setProductSearchTerm(value);
                                                setImeiSearchTerm('');
                                                setShowProductDropdown(true);
                                            }
                                        }}
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter' && imeiSearchTerm.trim()) {
                                                e.preventDefault();
                                                await handleImeiSearch(imeiSearchTerm.trim());
                                            } else if (e.key === 'Escape') {
                                                setShowProductDropdown(false);
                                                setProductSearchTerm('');
                                                setImeiSearchTerm('');
                                            }
                                        }}
                                        onFocus={() => {
                                            if (filteredProducts.length > 0) {
                                                setShowProductDropdown(true);
                                            }
                                        }}
                                        disabled={imeiSearching}
                                        className="pl-9 text-sm"
                                    />
                                    {imeiSearching && (
                                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                                            Searching...
                                        </span>
                                    )}
                                    {showProductDropdown && (
                                        <div
                                            className="absolute top-full left-0 right-0 z-50 mt-1 rounded shadow-lg overflow-hidden border"
                                            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
                                        >
                                            <div className="max-h-48 overflow-y-auto">
                                                {filteredProducts.length === 0 ? (
                                                    <div className="px-3 py-2 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowProductDropdown(false);
                                                                setShowAddImeiModal(true);
                                                            }}
                                                            className="px-3 py-1.5 text-xs rounded hover:opacity-70 transition-opacity"
                                                            style={{ 
                                                                color: 'var(--muted-foreground)',
                                                                backgroundColor: 'transparent'
                                                            }}
                                                        >
                                                            Add IMEI
                                                        </button>
                                                    </div>
                                                ) : (
                                                    filteredProducts.slice(0, 8).map((product) => (
                                                        <button
                                                            key={product.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (product.productModelId) {
                                                                    setPendingProduct(product);
                                                                    setShowImeiModal(true);
                                                                    setProductSearchTerm('');
                                                                    setShowProductDropdown(false);
                                                                } else {
                                                                    const existingItemIndex = saleItems.findIndex(item => item.productId === product.id);
                                                                    if (existingItemIndex >= 0) {
                                                                        const updatedItems = [...saleItems];
                                                                        updatedItems[existingItemIndex].quantity += 1;
                                                                        updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
                                                                        setSaleItems(updatedItems);
                                                                        setToast({ message: `${product.name} quantity increased`, type: 'success' });
                                                                    } else {
                                                                        const newItem: SaleItem = {
                                                                            productId: product.id,
                                                                            productName: product.name,
                                                                            quantity: 1,
                                                                            unitPrice: product.price,
                                                                            total: product.price,
                                                                        };
                                                                        setSaleItems([...saleItems, newItem]);
                                                                        setToast({ message: `${product.name} added`, type: 'success' });
                                                                    }
                                                                    setProductSearchTerm('');
                                                                    setShowProductDropdown(false);
                                                                }
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors border-b last:border-b-0"
                                                            style={{ borderColor: 'var(--border)' }}
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium truncate">{product.name}</p>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        {product.sku && (
                                                                            <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                                                                                {product.sku}
                                                                            </span>
                                                                        )}
                                                                        {product.stock !== undefined && (
                                                                            <span className={`text-xs px-1 py-0.5 rounded ${product.stock > 0 ? 'text-green-700 bg-green-50 dark:bg-green-900/20' : 'text-red-700 bg-red-50 dark:bg-red-900/20'}`}>
                                                                                Stock: {product.stock}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <span className="font-semibold text-sm flex-shrink-0" style={{ color: 'var(--accent)' }}>
                                                                    {formatCurrency(product.price)}
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddImeiModal(true)}
                                    className="px-3 py-1.5 text-xs rounded hover:opacity-70 transition-opacity flex items-center gap-1 flex-shrink-0"
                                    style={{ 
                                        color: 'var(--muted-foreground)',
                                        backgroundColor: 'transparent',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <PlusIcon className="h-3.5 w-3.5" />
                                    Add IMEI
                                </button>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="flex-1 overflow-auto">
                            {saleItems.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <CubeIcon className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} />
                                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                            No items added yet. Search for products above.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--background)' }}>
                                            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                                                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>#</th>
                                                <th className="text-left px-3 py-2 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Product</th>
                                                <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Qty</th>
                                                <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Price</th>
                                                <th className="text-right px-3 py-2 text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Total</th>
                                                <th className="w-10 px-3 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {saleItems.map((item, index) => (
                                                <tr key={index} className="border-b hover:bg-[var(--muted)]/20 transition-colors" style={{ borderColor: 'var(--border)' }}>
                                                    <td className="px-3 py-2 text-xs" style={{ color: 'var(--muted-foreground)' }}>{index + 1}</td>
                                                    <td className="px-3 py-2">
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{item.productName}</p>
                                                            {item.imeis && item.imeis.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {item.imeis.slice(0, 2).map((imei, idx) => (
                                                                        <span key={idx} className="text-[10px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                                                                            {imei}
                                                                        </span>
                                                                    ))}
                                                                    {item.imeis.length > 2 && (
                                                                        <span className="text-[10px] px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                                                                            +{item.imeis.length - 2}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                            min="1"
                                                            className="w-14 text-sm text-right py-1"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            step="0.01"
                                                            className="w-20 text-sm text-right py-1"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                            {formatCurrency(item.total)}
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="p-1 rounded hover:opacity-70 transition-opacity"
                                                            style={{ color: 'var(--muted-foreground)' }}
                                                        >
                                                            <TrashIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar - Sticky */}
                    <div className="lg:col-span-1 overflow-y-auto border-l" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
                        <div className="p-4 space-y-3 sticky top-0" style={{ backgroundColor: 'var(--background)' }}>
                            {/* Payment Method */}
                            <div>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                                    Payment Method
                                </label>
                                <Select
                                    value={paymentMethod}
                                    onChange={(e) => {
                                        const newMethod = e.target.value as 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
                                        setPaymentMethod(newMethod);
                                        if (newMethod === 'credit' && selectedCustomer && customerCredit > 0) {
                                            const totals = calculateTotals();
                                            const totalBeforeCredit = totals.subtotal + totals.tax - totals.discount;
                                            const maxCredit = Math.min(customerCredit, totalBeforeCredit);
                                            if (maxCredit > 0) {
                                                setAppliedCredit(maxCredit);
                                            }
                                        }
                                    }}
                                    options={[
                                        { value: 'cash', label: 'Cash' },
                                        { value: 'card', label: 'Card' },
                                        { value: 'bank_transfer', label: 'Bank Transfer' },
                                        { value: 'credit', label: 'Store Credit' },
                                        { value: 'other', label: 'Other' }
                                    ]}
                                />
                            </div>

                            {/* Discount & Tax */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                                        Discount (%)
                                    </label>
                                    <Input
                                        type="number"
                                        value={discount}
                                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="text-sm"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={taxEnabled}
                                            onChange={(e) => setTaxEnabled(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <span style={{ color: 'var(--foreground)' }}>
                                            Tax ({Math.round((companySettings.taxRate || 0.15) * 100)}%)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Store Credit */}
                            {selectedCustomer && customerCredit > 0 && paymentMethod !== 'credit' && (
                                <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                                            Credit Available
                                        </span>
                                        <span className="text-xs font-semibold text-green-600">
                                            {formatCurrency(customerCredit)}
                                        </span>
                                    </div>
                                    {appliedCredit > 0 && (
                                        <div className="mb-2 p-1.5 rounded text-xs bg-green-50 dark:bg-green-900/20">
                                            <span className="text-green-700 dark:text-green-300">Applied: {formatCurrency(appliedCredit)}</span>
                                        </div>
                                    )}
                                    <div className="flex gap-1">
                                        <Input
                                            type="number"
                                            min="0"
                                            max={Math.min(customerCredit, calculateTotals().total + creditApplied)}
                                            step="0.01"
                                            placeholder="Amount"
                                            value={creditAmount}
                                            onChange={(e) => setCreditAmount(e.target.value)}
                                            className="flex-1 text-xs"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const totals = calculateTotals();
                                                const totalBeforeCredit = totals.subtotal + totals.tax - totals.discount;
                                                const maxCredit = Math.min(customerCredit, totalBeforeCredit);
                                                setCreditAmount(maxCredit.toString());
                                            }}
                                            className="text-xs px-2"
                                        >
                                            Max
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleApplyCredit}
                                            disabled={!creditAmount || parseFloat(creditAmount) <= 0}
                                            className="text-xs px-2"
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Totals */}
                            <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex justify-between text-xs">
                                    <span style={{ color: 'var(--muted-foreground)' }}>Subtotal</span>
                                    <span style={{ color: 'var(--foreground)' }}>{formatCurrency(subtotal)}</span>
                                </div>
                                {discount > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--muted-foreground)' }}>Discount</span>
                                        <span className="text-red-600">-{formatCurrency(discountAmount)}</span>
                                    </div>
                                )}
                                {taxEnabled && (
                                    <div className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--muted-foreground)' }}>Tax</span>
                                        <span style={{ color: 'var(--foreground)' }}>{formatCurrency(tax)}</span>
                                    </div>
                                )}
                                {creditApplied > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span style={{ color: 'var(--muted-foreground)' }}>Credit</span>
                                        <span className="text-green-600">-{formatCurrency(creditApplied)}</span>
                                    </div>
                                )}
                                {creditApplied > 0 && cashNeeded > 0 && (
                                    <div className="flex justify-between text-xs pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                                        <span style={{ color: 'var(--muted-foreground)' }}>Cash Due</span>
                                        <span className="font-medium text-orange-600">{formatCurrency(cashNeeded)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <span className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>Total</span>
                                    <span className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                                    Notes
                                </label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes..."
                                    rows={3}
                                    className="resize-none text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </form>

                {/* Add IMEI Modal */}
                <AddImeiModal
                    isOpen={showAddImeiModal}
                    onClose={() => setShowAddImeiModal(false)}
                    onSuccess={async (product, imei) => {
                        // Add the product to sale with the IMEI
                        const existingItemIndex = saleItems.findIndex(item => item.productId === product.id);
                        
                        if (existingItemIndex >= 0) {
                            const updatedItems = [...saleItems];
                            const existingImeis = updatedItems[existingItemIndex].imeis || [];
                            updatedItems[existingItemIndex].imeis = [...existingImeis, imei];
                            updatedItems[existingItemIndex].quantity += 1;
                            updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
                            setSaleItems(updatedItems);
                            setToast({ message: `${product.name} quantity increased (IMEI: ${imei})`, type: 'success' });
                        } else {
                            const newItem: SaleItem = {
                                productId: product.id,
                                productName: product.name,
                                quantity: 1,
                                unitPrice: product.price,
                                total: product.price,
                                imeis: [imei],
                            };
                            setSaleItems([...saleItems, newItem]);
                            setToast({ message: `${product.name} added to sale (IMEI: ${imei})`, type: 'success' });
                        }
                        
                        // Refresh products list
                        const productsRes = await productService.getAllProducts();
                        if (productsRes.success) setProducts(productsRes.data || []);
                    }}
                />

                {/* Compact Customer Form Modal */}
                <CompactCustomerForm
                    isOpen={showCustomerForm}
                    onClose={() => setShowCustomerForm(false)}
                    onSave={handleCustomerCreated}
                />

                {/* IMEI Selection Modal */}
                {pendingProduct && (
                    <ImeiSelectionModal
                        isOpen={showImeiModal}
                        onClose={() => {
                            setShowImeiModal(false);
                            setPendingProduct(null);
                        }}
                        onConfirm={(imeis) => {
                            if (!pendingProduct) return;

                            // Check if product already exists in cart
                            const existingItemIndex = saleItems.findIndex(item => item.productId === pendingProduct.id);

                            if (existingItemIndex >= 0) {
                                // Update existing item - add IMEIs
                                const updatedItems = [...saleItems];
                                const existingImeis = updatedItems[existingItemIndex].imeis || [];
                                updatedItems[existingItemIndex].imeis = [...existingImeis, ...imeis];
                                updatedItems[existingItemIndex].quantity += imeis.length;
                                updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unitPrice;
                                setSaleItems(updatedItems);
                                setToast({ message: `${imeis.length} IMEI(s) added to ${pendingProduct.name}`, type: 'success' });
                            } else {
                                // Add new item with IMEIs
                                const newItem: SaleItem = {
                                    productId: pendingProduct.id,
                                    productName: pendingProduct.name,
                                    quantity: imeis.length,
                                    unitPrice: pendingProduct.price,
                                    total: pendingProduct.price * imeis.length,
                                    imeis: imeis,
                                };
                                setSaleItems([...saleItems, newItem]);
                                setToast({ message: `${pendingProduct.name} added to sale with ${imeis.length} IMEI(s)`, type: 'success' });
                            }

                            setShowImeiModal(false);
                            setPendingProduct(null);
                        }}
                        product={pendingProduct}
                        quantity={1}
                    />
                )}

            {/* Toast Notifications */}
            {toast && (
                <Toast
                    variant={toast.type}
                    onClose={() => setToast(null)}
                >
                    {toast.message}
                </Toast>
            )}
        </div>
    );
}
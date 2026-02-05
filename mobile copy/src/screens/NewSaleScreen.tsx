/**
 * New Sale Screen
 * Clean, elegant POS interface matching sales screen style
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database.service';
import { SalesService } from '../services/sales.service';
import { InventoryItemService } from '../services/inventory-item.service';
import { Product, SaleItem, Customer, InventoryItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

const TAX_RATE = 0;

export default function NewSaleScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  
  const saleId = route?.params?.saleId;
  const isEditMode = !!saleId;
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerCredit, setCustomerCredit] = useState(0);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other'>('cash');
  const [discount, setDiscount] = useState('0');
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [appliedCredit, setAppliedCredit] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductStock, setNewProductStock] = useState('0');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSale, setLoadingSale] = useState(false);
  
  // IMEI selection modal
  const [showImeiModal, setShowImeiModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [availableInventoryItems, setAvailableInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<string[]>([]);
  const [loadingInventoryItems, setLoadingInventoryItems] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Load sale data after customers and products are loaded
    if (isEditMode && saleId && customers.length > 0 && products.length > 0) {
      loadSaleData();
    }
  }, [saleId, customers.length, products.length]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, productsRes] = await Promise.all([
        DatabaseService.getCustomers(),
        DatabaseService.getProducts(),
      ]);
      
      if (customersRes.error) {
      } else if (customersRes.data) {
        setCustomers(customersRes.data);
      }
      
      if (productsRes.error) {
        Alert.alert('Error', `Failed to load products: ${productsRes.error.message || 'Unknown error'}`);
      } else if (productsRes.data) {
        setProducts(productsRes.data);
      } else {
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerCredit = async (customerId: string) => {
    if (!customerId) {
      setCustomerCredit(0);
      setAppliedCredit(0);
      setCreditAmount('');
      return;
    }

    try {
      const { data, error } = await DatabaseService.getCustomerById(customerId);
      if (error || !data) {
        setCustomerCredit(0);
        return;
      }
      setCustomerCredit(data.storeCredit || 0);
    } catch (error: any) {
      setCustomerCredit(0);
    }
  };

  const loadSaleData = async () => {
    if (!saleId) return;
    
    try {
      setLoadingSale(true);
      const sale = await SalesService.getSaleById(saleId);
      
      if (!sale) {
        Alert.alert('Error', 'Sale not found');
        navigation.goBack();
        return;
      }

      // Parse sale items
      let items: SaleItem[] = [];
      try {
        const parsed = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
        if (Array.isArray(parsed)) {
          // Ensure all items have unique IDs
          items = parsed.map((item: any, index: number) => ({
            id: item.id || `${Date.now()}-${index}-${Math.random()}`,
            productId: item.productId || '',
            productName: item.productName || '',
            quantity: typeof item.quantity === 'number' ? item.quantity : 0,
            price: typeof item.price === 'number' ? item.price : 0,
            total: typeof item.total === 'number' ? item.total : 0,
            sku: item.sku || undefined,
          }));
        }
      } catch (e) {
      }

      // Pre-populate all fields
      if (sale.customerId) {
        setSelectedCustomer(sale.customerId);
        setCustomerSearchTerm(sale.customerName || '');
        await loadCustomerCredit(sale.customerId);
      } else if (sale.customerName) {
        setCustomerSearchTerm(sale.customerName);
      }

      setSaleItems(items);
      setPaymentMethod(sale.paymentMethod || 'cash');
      setDiscount(sale.discount?.toString() || '0');
      setTaxEnabled((sale.tax || 0) > 0);
      setNotes(sale.notes || '');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load sale data');
      navigation.goBack();
    } finally {
      setLoadingSale(false);
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

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) {
      // Show all products when dropdown is open but no search term
      return products;
    }
    const searchLower = productSearchTerm.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower)
    );
  }, [products, productSearchTerm]);

  const handleCustomerSelect = async (customerId: string, customerName: string) => {
    setSelectedCustomer(customerId);
    setCustomerSearchTerm(customerName);
    setShowCustomerDropdown(false);
    await loadCustomerCredit(customerId);
  };

  const handleProductSelect = async (product: Product) => {
    // Check if product uses IMEI tracking
    if (product.productModelId) {
      // Show inventory item selection modal
      setPendingProduct(product);
      setSelectedInventoryItems([]);
      setLoadingInventoryItems(true);
      setShowImeiModal(true);
      
      // Load available inventory items
      try {
        const result = await InventoryItemService.getInventoryItems({
          productId: product.id,
          status: 'in_stock'
        });
        if (result.data) {
          // Sort by created_at ascending (oldest first)
          const sorted = result.data.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
          setAvailableInventoryItems(sorted);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load inventory items');
      } finally {
        setLoadingInventoryItems(false);
      }
      
      setProductSearchTerm('');
      setShowProductDropdown(false);
    } else {
      // Regular product - add directly
      const existingItemIndex = saleItems.findIndex(item => item.productId === product.id);
      if (existingItemIndex >= 0) {
        const updatedItems = [...saleItems];
        updatedItems[existingItemIndex].quantity += 1;
        updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].price;
        setSaleItems(updatedItems);
      } else {
        const newItem: SaleItem = {
          id: `${Date.now()}-${Math.random()}`,
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          total: product.price,
          sku: product.sku || undefined,
        };
        setSaleItems([...saleItems, newItem]);
      }
      setProductSearchTerm('');
      setShowProductDropdown(false);
    }
  };

  const handleConfirmImeiSelection = () => {
    if (!pendingProduct || selectedInventoryItems.length === 0) {
      Alert.alert('Error', 'Please select at least one inventory item');
      return;
    }

    const selectedItems = availableInventoryItems.filter(item => 
      selectedInventoryItems.includes(item.id)
    );
    
    const imeis = selectedItems.map(item => item.imei);
    const inventoryItemIds = selectedItems.map(item => item.id);

    // Calculate total price based on SIM type for each inventory item
    // If inventory item has simType set, use the corresponding product SIM price
    // Otherwise, use the default product price
    let totalPrice = 0;
    const itemPrices: number[] = [];
    
    selectedItems.forEach(item => {
      let itemPrice = pendingProduct.price; // Default to product price
      
      // Priority: IMEI-specific selling price > Condition-based price > SIM type price > product price
      if (item.sellingPrice !== null && item.sellingPrice !== undefined && item.sellingPrice > 0) {
        // Use IMEI-specific selling price (for trade-in items with condition-based pricing)
        itemPrice = item.sellingPrice;
      } else if (item.condition === 'new' && pendingProduct.newPrice !== null && pendingProduct.newPrice !== undefined && pendingProduct.newPrice > 0) {
        // Use new condition price
        itemPrice = pendingProduct.newPrice;
      } else if (item.condition === 'used' && pendingProduct.usedPrice !== null && pendingProduct.usedPrice !== undefined && pendingProduct.usedPrice > 0) {
        // Use used condition price
        itemPrice = pendingProduct.usedPrice;
      } else if (item.simType === 'physical' && pendingProduct.physicalSimPrice !== null && pendingProduct.physicalSimPrice !== undefined) {
        itemPrice = pendingProduct.physicalSimPrice;
      } else if (item.simType === 'esim' && pendingProduct.eSimPrice !== null && pendingProduct.eSimPrice !== undefined) {
        itemPrice = pendingProduct.eSimPrice;
      }
      
      itemPrices.push(itemPrice);
      totalPrice += itemPrice;
    });

    // Use average price for the sale item (or we could store individual prices)
    const averagePrice = totalPrice / selectedItems.length;

    const existingItemIndex = saleItems.findIndex(item => item.productId === pendingProduct.id);
    
    if (existingItemIndex >= 0) {
      // Merge with existing item - combine IMEIs and inventory item IDs
      const updatedItems = [...saleItems];
      const existingItem = updatedItems[existingItemIndex];
      const existingImeis = existingItem.imeis || [];
      const existingIds = existingItem.inventoryItemIds || [];
      
      // Recalculate total including new items
      const existingTotal = existingItem.total;
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + selectedItems.length,
        imeis: [...existingImeis, ...imeis],
        inventoryItemIds: [...existingIds, ...inventoryItemIds],
        total: existingTotal + totalPrice,
        // Update price to reflect the average of all items
        price: (existingTotal + totalPrice) / (existingItem.quantity + selectedItems.length),
      };
      setSaleItems(updatedItems);
    } else {
      // Create new item with IMEI information
      const newItem: SaleItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: pendingProduct.id,
        productName: pendingProduct.name,
        quantity: selectedItems.length,
        price: averagePrice,
        total: totalPrice,
        sku: pendingProduct.sku || undefined,
        imeis,
        inventoryItemIds,
      };
      setSaleItems([...saleItems, newItem]);
    }

    setShowImeiModal(false);
    setPendingProduct(null);
    setSelectedInventoryItems([]);
    setAvailableInventoryItems([]);
  };

  const updateItem = (index: number, field: 'quantity' | 'price', value: number) => {
    const updatedItems = [...saleItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    setSaleItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setSaleItems(saleItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = parseFloat(discount) || 0;
    const discountAmount = (subtotal * discountPercent) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const tax = taxEnabled ? discountedSubtotal * TAX_RATE : 0;
    const total = discountedSubtotal + tax;
    const cashNeeded = Math.max(0, total - appliedCredit);
    return { subtotal, discount: discountAmount, tax, creditApplied: appliedCredit, total, cashNeeded };
  };

  const handleApplyCredit = () => {
    if (!creditAmount || parseFloat(creditAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid credit amount');
      return;
    }
    const creditToApply = parseFloat(creditAmount);
    const currentTotal = calculateTotals().total;
    if (creditToApply > customerCredit) {
      Alert.alert('Error', `Only NLe ${customerCredit.toLocaleString()} credit available`);
      return;
    }
    if (creditToApply > currentTotal) {
      Alert.alert('Error', `Credit cannot exceed sale total`);
      return;
    }
    setAppliedCredit(creditToApply);
    setCreditAmount('');
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    try {
      const result = await DatabaseService.createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
        storeCredit: 0,
        isActive: true,
      });

      if (result.error || !result.data) {
        Alert.alert('Error', result.error?.message || 'Failed to create customer');
        return;
      }

      const newCustomer = result.data;
      setCustomers([...customers, newCustomer]);
      handleCustomerSelect(newCustomer.id, newCustomer.name);
      setShowCustomerModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      Alert.alert('Success', 'Customer created!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create customer');
    }
  };

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    if (!newProductPrice || parseFloat(newProductPrice) <= 0) {
      Alert.alert('Error', 'Product price must be greater than 0');
      return;
    }
    const stockValue = parseInt(newProductStock) || 0;
    if (stockValue < 0) {
      Alert.alert('Error', 'Stock cannot be negative');
      return;
    }
    try {
      const result = await DatabaseService.createProduct({
        name: newProductName.trim(),
        price: parseFloat(newProductPrice),
        sku: newProductSku.trim() || undefined,
        stock: stockValue,
        category: newProductCategory.trim() || undefined,
        description: newProductDescription.trim() || undefined,
        isActive: true,
      });

      if (result.error || !result.data) {
        Alert.alert('Error', result.error?.message || 'Failed to create product');
        return;
      }

      const newProduct = result.data;
      setProducts([...products, newProduct]);
      handleProductSelect(newProduct);
      setShowProductModal(false);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductSku('');
      setNewProductStock('0');
      setNewProductCategory('');
      setNewProductDescription('');
      Alert.alert('Success', 'Product created and added to cart!');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create product');
    }
  };

  const handleSubmit = async () => {
    if (saleItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }
    if (paymentMethod === 'credit' && !selectedCustomer) {
      Alert.alert('Error', 'Customer is required for credit payment');
      return;
    }

    setSubmitting(true);
    try {
      const { subtotal, discount: discountAmount, tax, creditApplied, total } = calculateTotals();
      
      let finalCreditApplied = 0;
      let finalPaymentMethod = paymentMethod;
      
      // Calculate the total amount that needs to be paid
      const totalNeeded = subtotal + tax - discountAmount;
      
      if (paymentMethod === 'credit') {
        // For credit payment method, apply credit up to the total amount needed
        // Only apply what's actually needed, not the full available credit
        finalCreditApplied = Math.min(customerCredit, totalNeeded);
        finalPaymentMethod = 'credit';
      } else {
        // For other payment methods, only use manually applied credit
        // Ensure it doesn't exceed available credit or total needed
        finalCreditApplied = Math.min(creditApplied || 0, customerCredit, totalNeeded);
      }
      
      // Ensure we never apply more credit than is available or needed
      finalCreditApplied = Math.max(0, Math.min(finalCreditApplied, customerCredit, totalNeeded));

      let finalNotes = notes || '';
      if (finalCreditApplied > 0 && selectedCustomer) {
        const cashNeeded = total - finalCreditApplied;
        if (cashNeeded > 0) {
          finalNotes = finalNotes
            ? `${finalNotes}\nCredit: NLe ${finalCreditApplied.toLocaleString()}. Cash: NLe ${cashNeeded.toLocaleString()}`
            : `Credit: NLe ${finalCreditApplied.toLocaleString()}. Cash: NLe ${cashNeeded.toLocaleString()}`;
        } else {
          finalNotes = finalNotes
            ? `${finalNotes}\nCredit: NLe ${finalCreditApplied.toLocaleString()} (Fully paid)`
            : `Credit: NLe ${finalCreditApplied.toLocaleString()} (Fully paid)`;
        }
      }

      // Handle credit deduction/restoration
      if (selectedCustomer && finalCreditApplied > 0) {
        // Fetch latest customer data to ensure we have the current credit balance
        const { data: latestCustomerData, error: customerError } = await DatabaseService.getCustomerById(selectedCustomer);
        
        if (customerError || !latestCustomerData) {
          Alert.alert('Error', 'Failed to fetch customer data for credit deduction');
          return;
        }

        if (isEditMode && saleId) {
          // In edit mode, we need to restore original credit and apply new credit
          // Try to extract original credit from notes
          const originalSale = await SalesService.getSaleById(saleId);
          let originalCredit = 0;
          if (originalSale?.notes) {
            const creditMatch = originalSale.notes.match(/Credit: NLe ([\d,]+)/);
            if (creditMatch) {
              originalCredit = parseFloat(creditMatch[1].replace(/,/g, ''));
            }
          }
          
          // Restore original credit
          const currentBalance = latestCustomerData.storeCredit || 0;
          const restoredBalance = currentBalance + originalCredit;
          
          // Apply new credit (only deduct what was actually applied)
          const newCreditBalance = Math.max(0, restoredBalance - finalCreditApplied);
          await DatabaseService.updateCustomer(selectedCustomer, {
            storeCredit: newCreditBalance,
          });
        } else {
          // New sale - deduct only the credit that was actually applied
          const currentBalance = latestCustomerData.storeCredit || 0;
          const newCreditBalance = Math.max(0, currentBalance - finalCreditApplied);
          await DatabaseService.updateCustomer(selectedCustomer, {
            storeCredit: newCreditBalance,
          });
        }
      }

      if (isEditMode && saleId) {
        // Update existing sale
        await SalesService.updateSale(saleId, {
          items: saleItems,
          subtotal,
          tax,
          discount: discountAmount,
          total,
          paymentMethod: finalPaymentMethod,
          notes: finalNotes || null,
        });

        Alert.alert('Success', 'Sale updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        // Create new sale
        await SalesService.createSale({
          customerId: selectedCustomer || null,
          customerName: selectedCustomerData?.name || 'Walk-in Customer',
          items: saleItems,
          subtotal,
          tax,
          discount: discountAmount,
          total,
          status: 'completed',
          paymentMethod: finalPaymentMethod,
          notes: finalNotes || null,
          userId: user?.id || null,
          cashierName: user?.fullName || null,
        });

        Alert.alert('Success', 'Sale created!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} sale`);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();
  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  if (loading || (isEditMode && loadingSale)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {isEditMode ? 'Loading sale...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              {isEditMode ? 'Edit Sale' : 'New Sale'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              {isEditMode ? 'Update sale details' : `${products.length} products available`}
            </Text>
          </View>
        </View>
        {saleItems.length > 0 && (
          <View style={styles.headerRight}>
            <View>
              <Text style={[styles.headerTotalLabel, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.headerTotalAmount, { color: colors.accent }]}>
                NLe {totals.total.toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Stats - Unique Design */}
            <View style={styles.statsContainer}>
              <LinearGradient
                colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statsGradientCard}
              >
                <View style={styles.statsGradientContent}>
                  <View style={styles.statsGradientLeft}>
                    <View style={styles.statsGradientIcon}>
                      <Ionicons name="cube" size={28} color="white" />
                    </View>
                    <View style={styles.statsGradientText}>
                      <Text style={styles.statsGradientValue}>{products.length}</Text>
                      <Text style={styles.statsGradientLabel}>Products</Text>
                    </View>
                  </View>
                  
                  <View style={styles.statsGradientDivider} />
                  
                  <View style={styles.statsGradientRight}>
                    <View style={styles.statsGradientMiniRow}>
                      <View style={styles.statsGradientMiniItem}>
                        <Ionicons name="person" size={18} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.statsGradientMiniValue}>{customers.length}</Text>
                        <Text style={styles.statsGradientMiniLabel}>Customers</Text>
                      </View>
                      <View style={styles.statsGradientMiniItem}>
                        <Ionicons name="cart" size={18} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.statsGradientMiniValue}>{saleItems.length}</Text>
                        <Text style={styles.statsGradientMiniLabel}>In Cart</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Customer Selection */}
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
              <View style={styles.inputHeader}>
                <View style={styles.inputHeaderLeft}>
                  <Ionicons name="person-outline" size={18} color={colors.accent} />
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>Customer</Text>
                </View>
                <TouchableOpacity
                  style={[styles.createInlineButton, { backgroundColor: colors.accent + '15' }]}
                  onPress={() => {
                    setShowCustomerDropdown(false);
                    setShowCustomerModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={18} color={colors.accent} />
                  <Text style={[styles.createInlineButtonText, { color: colors.accent }]}>New</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Search or select customer..."
                placeholderTextColor={colors.mutedForeground}
                value={selectedCustomer ? selectedCustomerData?.name : customerSearchTerm}
                onChangeText={(text) => {
                  setCustomerSearchTerm(text);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
              />
              {selectedCustomer && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSelectedCustomer('');
                    setCustomerSearchTerm('');
                    setCustomerCredit(0);
                    setAppliedCredit(0);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}

              {showCustomerDropdown && (
                <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.slice(0, 5).map((customer) => (
                      <TouchableOpacity
                        key={customer.id}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                        onPress={() => handleCustomerSelect(customer.id, customer.name)}
                      >
                        <Text style={[styles.dropdownText, { color: colors.foreground }]}>{customer.name}</Text>
                        {customer.storeCredit && customer.storeCredit > 0 && (
                          <Text style={[styles.creditBadge, { color: colors.success }]}>
                            NLe {customer.storeCredit.toLocaleString()}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.dropdownEmpty}>
                      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No customers found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Product Search */}
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
              <View style={styles.inputHeader}>
                <View style={styles.inputHeaderLeft}>
                  <Ionicons name="cube-outline" size={18} color={colors.accent} />
                  <Text style={[styles.inputLabel, { color: colors.foreground }]}>Add Products</Text>
                </View>
                <TouchableOpacity
                  style={[styles.createInlineButton, { backgroundColor: colors.accent + '15' }]}
                  onPress={() => {
                    setShowProductDropdown(false);
                    setShowProductModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={18} color={colors.accent} />
                  <Text style={[styles.createInlineButtonText, { color: colors.accent }]}>New</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.searchInput, { color: colors.foreground }]}
                  placeholder="Search products by name, IMEI/Serial..."
                  placeholderTextColor={colors.mutedForeground}
                  value={productSearchTerm}
                  onChangeText={(text) => {
                    setProductSearchTerm(text);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                />
                {productSearchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearchTerm('')}>
                    <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              {showProductDropdown && (
                <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView
                    style={styles.dropdownScroll}
                    contentContainerStyle={styles.dropdownScrollContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                          onPress={() => handleProductSelect(product)}
                        >
                          <View style={styles.productItem}>
                            <View style={styles.productInfo}>
                              <Text style={[styles.productName, { color: colors.foreground }]}>{product.name || ''}</Text>
                              {product.sku && product.sku.trim() ? (
                                <Text style={[styles.productSku, { color: colors.mutedForeground }]}>IMEI/Serial: {product.sku}</Text>
                              ) : null}
                            </View>
                            <Text style={[styles.productPrice, { color: colors.accent }]}>
                              NLe {product.price.toLocaleString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))
                    ) : productSearchTerm ? (
                      <View style={styles.dropdownEmpty}>
                        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products found</Text>
                      </View>
                    ) : (
                      <View style={styles.dropdownEmpty}>
                        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Start typing to search...</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>


            {/* Empty State */}
            {saleItems.length === 0 && products.length > 0 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.accent + '15' }]}>
                  <Ionicons name="cart-outline" size={32} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No items in cart</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  Search and add products to start a sale
                </Text>
              </View>
            )}

            {products.length === 0 && !loading && (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.accent + '15' }]}>
                  <Ionicons name="cube-outline" size={32} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products available</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  Create a product to get started
                </Text>
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                  onPress={() => setShowProductModal(true)}
                >
                  <Ionicons name="add-circle" size={18} color={colors.accentContrast} />
                  <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>Create Product</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Cart Items */}
            {saleItems.length > 0 && (
              <View style={[styles.cartCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
                <View style={styles.cartHeader}>
                  <View>
                    <Text style={[styles.cartTitle, { color: colors.foreground }]}>Cart</Text>
                    <Text style={[styles.cartCount, { color: colors.mutedForeground }]}>
                      {saleItems.length} {saleItems.length === 1 ? 'item' : 'items'}
                    </Text>
                  </View>
                  <View style={styles.cartTotal}>
                    <Text style={[styles.cartTotalLabel, { color: colors.mutedForeground }]}>Total</Text>
                    <Text style={[styles.cartTotalAmount, { color: colors.accent }]}>
                      NLe {totals.total.toLocaleString()}
                    </Text>
                  </View>
                </View>
                
                {/* Payment Details Button in Cart */}
                <TouchableOpacity
                  style={[styles.cartPaymentButton, { borderColor: colors.border }]}
                  onPress={() => setShowPaymentModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="card-outline" size={18} color={colors.accent} />
                  <Text style={[styles.cartPaymentButtonText, { color: colors.accent }]}>Payment Details</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                {saleItems.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  const isImeiTracked = product?.productModelId;
                  
                  return (
                    <View key={item.id || `item-${index}`} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.cartItemLeft}>
                        <View style={styles.cartItemHeader}>
                          <Text style={[styles.cartItemName, { color: colors.foreground }]}>{item.productName}</Text>
                          {isImeiTracked && item.imeis && item.imeis.length > 0 && (
                            <View style={[styles.imeiBadgeSmall, { backgroundColor: colors.accent + '15' }]}>
                              <Ionicons name="barcode" size={12} color={colors.accent} />
                              <Text style={[styles.imeiBadgeTextSmall, { color: colors.accent }]}>
                                {item.imeis.length} {item.imeis.length === 1 ? 'IMEI' : 'IMEIs'}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {isImeiTracked && item.imeis && item.imeis.length > 0 && (
                          <View style={styles.imeiList}>
                            {item.imeis.slice(0, 3).map((imei, imeiIndex) => (
                              <Text key={imeiIndex} style={[styles.imeiItemText, { color: colors.mutedForeground }]} numberOfLines={1}>
                                • {imei}
                              </Text>
                            ))}
                            {item.imeis.length > 3 && (
                              <Text style={[styles.imeiMoreText, { color: colors.mutedForeground }]}>
                                +{item.imeis.length - 3} more
                              </Text>
                            )}
                          </View>
                        )}
                        
                        {!isImeiTracked && (
                          <View style={styles.quantityRow}>
                            <TouchableOpacity
                              style={[styles.qtyButton, { backgroundColor: colors.muted }]}
                              onPress={() => {
                                if (item.quantity > 1) {
                                  updateItem(index, 'quantity', item.quantity - 1);
                                } else {
                                  removeItem(index);
                                }
                              }}
                            >
                              <Ionicons name="remove" size={14} color={colors.foreground} />
                            </TouchableOpacity>
                            <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={[styles.qtyButton, { backgroundColor: colors.muted }]}
                              onPress={() => updateItem(index, 'quantity', item.quantity + 1)}
                            >
                              <Ionicons name="add" size={14} color={colors.foreground} />
                            </TouchableOpacity>
                          </View>
                        )}
                        
                        {isImeiTracked && (
                          <Text style={[styles.imeiQuantityText, { color: colors.mutedForeground }]}>
                            Quantity: {item.quantity} (auto from IMEI selection)
                          </Text>
                        )}
                      </View>
                      <View style={styles.cartItemRight}>
                        <Text style={[styles.cartItemTotal, { color: colors.foreground }]}>
                          NLe {item.total.toLocaleString()}
                        </Text>
                        <TouchableOpacity onPress={() => removeItem(index)}>
                          <Ionicons name="trash-outline" size={18} color={colors.destructive || '#ef4444'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                
                {/* Complete Sale Button */}
                <TouchableOpacity
                  style={[styles.completeButton, { backgroundColor: colors.accent }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.accentContrast} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={24} color={colors.accentContrast} />
                      <Text style={[styles.completeButtonText, { color: colors.accentContrast }]}>
                        {isEditMode ? 'Update Sale' : 'Complete Sale'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlayContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Payment Details</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    Configure payment method and adjustments
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowPaymentModal(false)}
                  style={[styles.modalCloseButton, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.foreground }]}>Payment Method</Text>
                <View style={styles.paymentGrid}>
                  {['cash', 'card', 'bank_transfer', 'credit', 'other'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        {
                          backgroundColor: paymentMethod === method ? colors.accent : 'transparent',
                          borderColor: paymentMethod === method ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setPaymentMethod(method as any);
                        if (method === 'credit' && selectedCustomer && customerCredit > 0) {
                          const totals = calculateTotals();
                          const totalBeforeCredit = totals.subtotal + totals.tax - totals.discount;
                          const maxCredit = Math.min(customerCredit, totalBeforeCredit);
                          if (maxCredit > 0) setAppliedCredit(maxCredit);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.paymentMethodButtonText,
                          { color: paymentMethod === method ? colors.accentContrast : colors.foreground },
                        ]}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.foreground }]}>Discount</Text>
                <View style={styles.discountInputContainer}>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={discount}
                    onChangeText={setDiscount}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                  <View style={[styles.discountSuffix, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.discountSuffixText, { color: colors.mutedForeground }]}>%</Text>
                  </View>
                </View>
              </View>

              <View style={[styles.modalSection, styles.toggleRow]}>
                <View>
                  <Text style={[styles.modalLabel, { color: colors.foreground }]}>Tax</Text>
                  <Text style={[styles.toggleSubtext, { color: colors.mutedForeground }]}>
                    {Math.round(TAX_RATE * 100)}% tax rate (default: 0%)
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, { backgroundColor: taxEnabled ? colors.accent : colors.muted }]}
                  onPress={() => setTaxEnabled(!taxEnabled)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleThumb, { left: taxEnabled ? 20 : 2 }]} />
                </TouchableOpacity>
              </View>

              {selectedCustomer && customerCredit > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.creditHeader}>
                    <View style={styles.creditHeaderLeft}>
                      <Ionicons name="wallet" size={20} color={colors.success} />
                      <Text style={[styles.modalLabel, { color: colors.foreground }]}>Store Credit</Text>
                    </View>
                    <Text style={[styles.creditAmount, { color: colors.success }]}>
                      NLe {customerCredit.toLocaleString()} available
                    </Text>
                  </View>
                  
                  {paymentMethod === 'credit' ? (
                    <View style={[styles.creditInfoCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                      <View style={styles.creditInfoRow}>
                        <Ionicons name="information-circle" size={18} color={colors.success} />
                        <View style={styles.creditInfoText}>
                          <Text style={[styles.creditInfoTitle, { color: colors.foreground }]}>
                            Credit Payment Selected
                          </Text>
                          <Text style={[styles.creditInfoSubtitle, { color: colors.mutedForeground }]}>
                            {(() => {
                              const totals = calculateTotals();
                              const totalBeforeCredit = totals.subtotal + totals.tax - totals.discount;
                              const creditToApply = Math.min(customerCredit, totalBeforeCredit);
                              const cashNeeded = Math.max(0, totalBeforeCredit - creditToApply);
                              if (cashNeeded > 0) {
                                return `NLe ${creditToApply.toLocaleString()} credit will be applied. NLe ${cashNeeded.toLocaleString()} cash needed.`;
                              } else {
                                return `Full payment of NLe ${creditToApply.toLocaleString()} will be applied from credit.`;
                              }
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      {appliedCredit > 0 && (
                        <View style={[styles.appliedCredit, { backgroundColor: colors.success + '20' }]}>
                          <Text style={[styles.appliedCreditText, { color: colors.success }]}>
                            Applied: NLe {appliedCredit.toLocaleString()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.creditInputRow}>
                        <TextInput
                          style={[styles.creditInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                          placeholder="Credit amount"
                          placeholderTextColor={colors.mutedForeground}
                          value={creditAmount}
                          onChangeText={setCreditAmount}
                          keyboardType="numeric"
                        />
                        <TouchableOpacity
                          style={[styles.useMaxButton, { backgroundColor: colors.muted }]}
                          onPress={() => {
                            const totals = calculateTotals();
                            const maxCredit = Math.min(customerCredit, totals.subtotal + totals.tax - totals.discount);
                            setCreditAmount(maxCredit.toString());
                          }}
                        >
                          <Text style={[styles.useMaxText, { color: colors.foreground }]}>Max</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.applyButton, { backgroundColor: colors.accent }]}
                          onPress={handleApplyCredit}
                        >
                          <Text style={[styles.applyText, { color: colors.accentContrast }]}>Apply</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}
              
              {paymentMethod === 'credit' && (!selectedCustomer || customerCredit === 0) && (
                <View style={[styles.modalSection, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '40', borderWidth: 1, borderRadius: 12, padding: spacing.md }]}>
                  <View style={styles.creditInfoRow}>
                    <Ionicons name="alert-circle" size={20} color={colors.destructive} />
                    <View style={styles.creditInfoText}>
                      <Text style={[styles.creditInfoTitle, { color: colors.destructive }]}>
                        Credit Payment Not Available
                      </Text>
                      <Text style={[styles.creditInfoSubtitle, { color: colors.mutedForeground }]}>
                        {!selectedCustomer 
                          ? 'Please select a customer with store credit to use credit payment.'
                          : 'This customer has no available store credit.'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View style={[styles.modalSection, styles.summaryCard, { backgroundColor: colors.muted + '30', borderColor: colors.border }]}>
                <Text style={[styles.modalLabel, { color: colors.foreground, marginBottom: spacing.md }]}>Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    NLe {totals.subtotal.toLocaleString()}
                  </Text>
                </View>
                {totals.discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: colors.destructive }]}>
                      -NLe {totals.discount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {taxEnabled && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax</Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                      NLe {totals.tax.toLocaleString()}
                    </Text>
                  </View>
                )}
                {totals.creditApplied > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Credit Applied</Text>
                    <Text style={[styles.summaryValue, { color: colors.success }]}>
                      -NLe {totals.creditApplied.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={[styles.modalLabel, { color: colors.foreground }]}>Notes</Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Optional notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            
            {/* Modal Footer with Total and Done Button */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
              <View style={styles.modalFooterTotal}>
                <Text style={[styles.modalFooterLabel, { color: colors.mutedForeground }]}>Total</Text>
                <Text style={[styles.modalFooterAmount, { color: colors.accent }]}>
                  NLe {totals.total.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalDoneButton, { backgroundColor: colors.accent }]}
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalDoneButtonText, { color: colors.accentContrast }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      </Modal>

      {/* Customer Creation Modal */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlayContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Customer</Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Name *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newCustomerName}
                    onChangeText={setNewCustomerName}
                    placeholder="Enter customer name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Phone</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newCustomerPhone}
                    onChangeText={setNewCustomerPhone}
                    placeholder="Optional"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Email</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newCustomerEmail}
                    onChangeText={setNewCustomerEmail}
                    placeholder="Optional"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.createSubmitButton, { backgroundColor: colors.accent }]}
                  onPress={handleCreateCustomer}
                >
                  <Ionicons name="person-add" size={20} color={colors.accentContrast} />
                  <Text style={[styles.createSubmitText, { color: colors.accentContrast }]}>
                    Create Customer
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* IMEI Selection Modal */}
      <Modal
        visible={showImeiModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowImeiModal(false);
          setPendingProduct(null);
          setSelectedInventoryItems([]);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlayContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Select Inventory Items
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    {pendingProduct?.name}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => {
                    setShowImeiModal(false);
                    setPendingProduct(null);
                    setSelectedInventoryItems([]);
                  }}
                  style={[styles.modalCloseButton, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
              >
                {loadingInventoryItems ? (
                  <View style={styles.modalLoadingContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={[styles.modalLoadingText, { color: colors.mutedForeground }]}>
                      Loading inventory items...
                    </Text>
                  </View>
                ) : availableInventoryItems.length === 0 ? (
                  <View style={styles.modalEmptyContainer}>
                    <Ionicons name="barcode-outline" size={48} color={colors.mutedForeground} />
                    <Text style={[styles.modalEmptyText, { color: colors.mutedForeground }]}>
                      No in-stock inventory items available
                    </Text>
                    <Text style={[styles.modalEmptySubtext, { color: colors.mutedForeground }]}>
                      Add inventory items for this product first
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={[styles.modalLabel, { color: colors.foreground }]}>
                        Select items to sell ({selectedInventoryItems.length} selected)
                      </Text>
                      <Text style={[styles.helperText, { color: colors.mutedForeground, marginBottom: spacing.md }]}>
                        Available: {availableInventoryItems.length} items
                      </Text>
                    </View>

                    {availableInventoryItems.map((item) => {
                      const isSelected = selectedInventoryItems.includes(item.id);
                      const conditionColor = item.condition === 'new' ? '#10B981' :
                                            item.condition === 'refurbished' ? '#F59E0B' : '#6B7280';
                      
                      // Determine selling price: IMEI-specific > SIM type > product price
                      let sellingPrice = pendingProduct?.price || 0;
                      if (item.sellingPrice !== null && item.sellingPrice !== undefined && item.sellingPrice > 0) {
                        // Use IMEI-specific selling price (for trade-in items)
                        sellingPrice = item.sellingPrice;
                      } else if (item.simType === 'physical' && pendingProduct?.physicalSimPrice !== null && pendingProduct?.physicalSimPrice !== undefined) {
                        sellingPrice = pendingProduct.physicalSimPrice;
                      } else if (item.simType === 'esim' && pendingProduct?.eSimPrice !== null && pendingProduct?.eSimPrice !== undefined) {
                        sellingPrice = pendingProduct.eSimPrice;
                      }
                      
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.imeiItemCard,
                            { 
                              backgroundColor: isSelected ? colors.accent + '15' : colors.input,
                              borderColor: isSelected ? colors.accent : colors.border,
                            }
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedInventoryItems(prev => prev.filter(id => id !== item.id));
                            } else {
                              setSelectedInventoryItems(prev => [...prev, item.id]);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.imeiItemLeft}>
                            <View style={styles.imeiCheckbox}>
                              {isSelected && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                              )}
                              {!isSelected && (
                                <View style={[styles.imeiCheckboxEmpty, { borderColor: colors.border }]} />
                              )}
                            </View>
                            <View style={styles.imeiItemInfo}>
                              <View style={styles.imeiItemTopRow}>
                                <View style={[styles.imeiBadgeContainer, { backgroundColor: colors.accent + '10' }]}>
                                  <Ionicons name="barcode" size={14} color={colors.accent} />
                                  <Text style={[styles.imeiText, { color: colors.accent }]}>{item.imei}</Text>
                                </View>
                                <Text style={[styles.imeiPriceText, { color: colors.accent }]}>
                                  NLe {sellingPrice.toLocaleString()}
                                </Text>
                              </View>
                              <View style={styles.imeiItemMeta}>
                                <View style={[styles.imeiConditionBadge, { backgroundColor: conditionColor + '15' }]}>
                                  <Text style={[styles.imeiConditionText, { color: conditionColor }]}>
                                    {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                                  </Text>
                                </View>
                                {item.simType && (
                                  <View style={[styles.imeiSimBadge, { backgroundColor: colors.success + '15' }]}>
                                    <Text style={[styles.imeiSimText, { color: colors.success }]}>
                                      {item.simType === 'physical' ? 'Physical SIM' : 'eSIM'}
                                    </Text>
                                  </View>
                                )}
                                {item.sellingPrice && item.sellingPrice > 0 && (
                                  <View style={[styles.imeiCustomPriceBadge, { backgroundColor: colors.accent + '15' }]}>
                                    <Ionicons name="pricetag" size={10} color={colors.accent} />
                                    <Text style={[styles.imeiCustomPriceText, { color: colors.accent }]}>
                                      Custom Price
                                    </Text>
                                  </View>
                                )}
                                {item.purchaseCost && (
                                  <Text style={[styles.imeiCostText, { color: colors.mutedForeground }]}>
                                    Cost: NLe {item.purchaseCost.toLocaleString()}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}
              </ScrollView>

              {availableInventoryItems.length > 0 && (() => {
                // Calculate total: IMEI-specific price > SIM type price > product price
                const selectedItems = availableInventoryItems.filter(item => 
                  selectedInventoryItems.includes(item.id)
                );
                let calculatedTotal = 0;
                selectedItems.forEach(item => {
                  let itemPrice = pendingProduct?.price || 0;
                  // Priority: IMEI-specific selling price > SIM type price > product price
                  if (item.sellingPrice !== null && item.sellingPrice !== undefined && item.sellingPrice > 0) {
                    itemPrice = item.sellingPrice;
                  } else if (item.simType === 'physical' && pendingProduct?.physicalSimPrice !== null && pendingProduct?.physicalSimPrice !== undefined) {
                    itemPrice = pendingProduct.physicalSimPrice;
                  } else if (item.simType === 'esim' && pendingProduct?.eSimPrice !== null && pendingProduct?.eSimPrice !== undefined) {
                    itemPrice = pendingProduct.eSimPrice;
                  }
                  calculatedTotal += itemPrice;
                });
                
                return (
                  <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={styles.modalFooterInfo}>
                      <Text style={[styles.modalFooterLabel, { color: colors.mutedForeground }]}>
                        Selected: {selectedInventoryItems.length} item(s)
                      </Text>
                      <Text style={[styles.modalFooterAmount, { color: colors.accent }]}>
                        Total: NLe {calculatedTotal.toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.modalDoneButton, 
                        { 
                          backgroundColor: selectedInventoryItems.length > 0 ? colors.accent : colors.muted,
                        }
                      ]}
                      onPress={handleConfirmImeiSelection}
                      disabled={selectedInventoryItems.length === 0}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.modalDoneButtonText,
                        { color: selectedInventoryItems.length > 0 ? colors.accentContrast : colors.mutedForeground }
                      ]}>
                        Add to Cart
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Product Creation Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalOverlayContent}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Product</Text>
                <TouchableOpacity 
                  onPress={() => setShowProductModal(false)}
                  style={[styles.modalCloseButton, { backgroundColor: colors.muted }]}
                >
                  <Ionicons name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Product Name *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newProductName}
                    onChangeText={setNewProductName}
                    placeholder="Enter product name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Price (NLe) *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newProductPrice}
                    onChangeText={setNewProductPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>IMEI/Serial Number</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newProductSku}
                    onChangeText={setNewProductSku}
                    placeholder="Optional"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Stock *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newProductStock}
                    onChangeText={setNewProductStock}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Category</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newProductCategory}
                    onChangeText={setNewProductCategory}
                    placeholder="Optional"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>Description</Text>
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={newProductDescription}
                    onChangeText={setNewProductDescription}
                    placeholder="Optional description"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.createSubmitButton, { backgroundColor: colors.accent }]}
                  onPress={handleCreateProduct}
                >
                  <Ionicons name="cube" size={20} color={colors.accentContrast} />
                  <Text style={[styles.createSubmitText, { color: colors.accentContrast }]}>
                    Create & Add to Cart
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  backButton: {
    marginRight: spacing.xs,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTotalLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  headerTotalAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statsContainer: {
    marginBottom: spacing.lg,
  },
  statsGradientCard: {
    borderRadius: 20,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  statsGradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsGradientLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statsGradientIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGradientText: {
    flex: 1,
  },
  statsGradientValue: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statsGradientLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: fontWeight.medium,
  },
  statsGradientDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: spacing.lg,
  },
  statsGradientRight: {
    flex: 1,
  },
  statsGradientMiniRow: {
    gap: spacing.md,
  },
  statsGradientMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statsGradientMiniValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: 'white',
    marginRight: 'auto',
  },
  statsGradientMiniLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: fontWeight.medium,
  },
  inputCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inputHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  createInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  createInlineButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  inputLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md + 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  dropdown: {
    maxHeight: 400,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownScroll: {
    maxHeight: 350,
    flexGrow: 0,
  },
  dropdownScrollContent: {
    paddingBottom: spacing.xs,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  dropdownText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  creditBadge: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  dropdownEmpty: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  createButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  productSku: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  productPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  cartCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  cartCount: {
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  cartTotal: {
    alignItems: 'flex-end',
  },
  cartTotalLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  cartTotalAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  cartPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  cartPaymentButtonText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cartItemTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginTop: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  completeButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalBodyContent: {
    padding: 0,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  paymentMethodButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  modalInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
  },
  discountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  discountSuffix: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  discountSuffixText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    position: 'relative',
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleSubtext: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  creditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  creditHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creditAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  creditInfoCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  creditInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  creditInfoText: {
    flex: 1,
  },
  creditInfoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  creditInfoSubtitle: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  appliedCredit: {
    padding: spacing.sm,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  appliedCreditText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  creditInputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  creditInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
  },
  useMaxButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useMaxText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  applyButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: 'white',
  },
  summaryCard: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  modalFooterTotal: {
    flex: 1,
  },
  modalFooterLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  modalFooterAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  modalDoneButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  notesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: fontSize.base,
    textAlignVertical: 'top',
  },
  createSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  createSubmitText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  emptyCard: {
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  // IMEI Modal Styles
  imeiItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  imeiItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  imeiCheckbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imeiCheckboxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  imeiItemInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  imeiItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  imeiBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  imeiText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'monospace',
  },
  imeiPriceText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  imeiItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  imeiConditionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imeiConditionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  imeiSimBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imeiSimText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  imeiCostText: {
    fontSize: fontSize.xs,
  },
  imeiCustomPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  imeiCustomPriceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  modalLoadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalLoadingText: {
    fontSize: fontSize.base,
  },
  modalEmptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    gap: spacing.md,
  },
  modalEmptyText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  modalEmptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  modalFooterInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  helperText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  // Cart IMEI Display Styles
  cartItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  imeiBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    gap: spacing.xs,
  },
  imeiBadgeTextSmall: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  imeiList: {
    marginTop: spacing.xs,
    gap: 2,
  },
  imeiItemText: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  imeiMoreText: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },
  imeiQuantityText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});


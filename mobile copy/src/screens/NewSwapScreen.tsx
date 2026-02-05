/**
 * New Swap Screen
 * Create device trade-in/swap transactions
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database.service';
import { SwapService } from '../services/swap.service';
import { ProductModelService } from '../services/product-model.service';
import { SalesService } from '../services/sales.service';
import { InventoryItemService } from '../services/inventory-item.service';
import { Product, Customer, ProductModel, InventoryItem, Swap } from '../types';
import { Header } from '../components/ui/Header';
import { SelectionModal } from '../components/ui/SelectionModal';
import { spacing, fontSize, fontWeight } from '../lib/theme';

/**
 * Safely format a number
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
    return '0';
  }
  try {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return String(value || '0');
  }
}

export default function NewSwapScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const swapId = route?.params?.swapId;
  const swapData = route?.params?.swapData;
  const isEditMode = !!swapId;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSwap, setLoadingSwap] = useState(false);
  
  // Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const hasLoadedInitialData = useRef(false);
  
  // Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  
  // Purchased Product
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // Trade-in Device
  const [tradeInProductId, setTradeInProductId] = useState<string>('');
  const [tradeInProductName, setTradeInProductName] = useState('');
  const [tradeInImei, setTradeInImei] = useState('');
  const [tradeInCondition, setTradeInCondition] = useState<'new' | 'refurbished' | 'used' | 'fair' | 'poor'>('used');
  const [tradeInValue, setTradeInValue] = useState('');
  const [tradeInSellingPrice, setTradeInSellingPrice] = useState('');
  const [tradeInNotes, setTradeInNotes] = useState('');
  const [showTradeInProductModal, setShowTradeInProductModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Purchased product IMEI / inventory item selection
  const [purchaseInventoryItems, setPurchaseInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedPurchaseInventoryItemId, setSelectedPurchaseInventoryItemId] = useState<string | null>(null);
  const [showPurchaseImeiModal, setShowPurchaseImeiModal] = useState(false);
  const [loadingPurchaseInventory, setLoadingPurchaseInventory] = useState(false);
  const [pendingPurchaseProductId, setPendingPurchaseProductId] = useState<string | null>(null);
  const [manualPurchaseImei, setManualPurchaseImei] = useState('');
  
  // Load initial data once
  const loadInitialData = useCallback(async () => {
    if (hasLoadedInitialData.current) return;
    hasLoadedInitialData.current = true;
    
    try {
      const [customersRes, productsRes, modelsRes] = await Promise.all([
        DatabaseService.getCustomers(),
        DatabaseService.getProducts(),
        ProductModelService.getProductModels(),
      ]);
      
      if (customersRes.data) setCustomers(customersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (modelsRes.data) setProductModels(modelsRes.data);
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  // Load swap data when in edit mode
  useEffect(() => {
    if (isEditMode && swapId && customers.length > 0 && products.length > 0) {
      loadSwapData();
    }
  }, [swapId, customers.length, products.length, isEditMode]);
  
  // Update customer details when customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone || '');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
      }
    }
  }, [selectedCustomerId, customers]);
  
  const loadSwapData = async () => {
    if (!swapId) return;
    
    try {
      setLoadingSwap(true);
      const result = await SwapService.getSwapById(swapId);
      
      if (result.error || !result.data) {
        Alert.alert('Error', 'Failed to load swap data');
        navigation.goBack();
        return;
      }
      
      const swap = result.data;
      
      // Set customer
      if (swap.customerId) {
        setSelectedCustomerId(swap.customerId);
      }
      setCustomerName(swap.customerName || '');
      setCustomerPhone(swap.customerPhone || '');
      setCustomerEmail(swap.customerEmail || '');
      setCustomerAddress(swap.customerAddress || '');
      
      // Set purchased product
      setSelectedProductId(swap.purchasedProductId);
      if (swap.inventoryItemId) {
        setSelectedPurchaseInventoryItemId(swap.inventoryItemId);
      }
      if ((swap as any).purchasedImei) {
        setManualPurchaseImei((swap as any).purchasedImei);
      }
      
      // Set trade-in details
      // Try to find the product from the product name
      const productMatch = products.find(p => 
        p.name.toLowerCase() === swap.tradeInProductName?.toLowerCase()
      );
      if (productMatch) {
        setTradeInProductId(productMatch.id);
      }
      setTradeInProductName(swap.tradeInProductName || '');
      setTradeInImei(swap.tradeInImei);
      setTradeInCondition(swap.tradeInCondition);
      setTradeInValue(String(swap.tradeInValue || 0));
      setTradeInNotes(swap.tradeInNotes || '');
      
      // Set payment
      setPaymentMethod(swap.paymentMethod as typeof paymentMethod);
      setNotes(swap.notes || '');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load swap data');
      navigation.goBack();
    } finally {
      setLoadingSwap(false);
    }
  };
  
  // Get selected product data
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);
  
  // Get selected inventory item for purchased product
  const selectedPurchaseInventoryItem = useMemo(() => {
    if (!selectedPurchaseInventoryItemId) return null;
    return purchaseInventoryItems.find(item => item.id === selectedPurchaseInventoryItemId);
  }, [purchaseInventoryItems, selectedPurchaseInventoryItemId]);
  
  // Get selected trade-in product
  const selectedTradeInProduct = useMemo(() => {
    if (!tradeInProductId) return null;
    return products.find(p => p.id === tradeInProductId);
  }, [products, tradeInProductId]);
  
  // Calculate purchase price considering SIM type and IMEI-specific pricing
  const purchasePrice = useMemo(() => {
    if (!selectedProduct) return 0;
    
    // If an inventory item is selected, use its pricing
    if (selectedPurchaseInventoryItem) {
      // Priority: IMEI-specific selling price > Condition-based price > SIM type price > product price
      if (selectedPurchaseInventoryItem.sellingPrice !== null && 
          selectedPurchaseInventoryItem.sellingPrice !== undefined && 
          selectedPurchaseInventoryItem.sellingPrice > 0) {
        return selectedPurchaseInventoryItem.sellingPrice;
      } else if (selectedPurchaseInventoryItem.condition === 'new' && 
                 selectedProduct.newPrice !== null && 
                 selectedProduct.newPrice !== undefined && 
                 selectedProduct.newPrice > 0) {
        return selectedProduct.newPrice;
      } else if (selectedPurchaseInventoryItem.condition === 'used' && 
                 selectedProduct.usedPrice !== null && 
                 selectedProduct.usedPrice !== undefined && 
                 selectedProduct.usedPrice > 0) {
        return selectedProduct.usedPrice;
      } else if (selectedPurchaseInventoryItem.simType === 'physical' && 
                 selectedProduct.physicalSimPrice !== null && 
                 selectedProduct.physicalSimPrice !== undefined) {
        return selectedProduct.physicalSimPrice;
      } else if (selectedPurchaseInventoryItem.simType === 'esim' && 
                 selectedProduct.eSimPrice !== null && 
                 selectedProduct.eSimPrice !== undefined) {
        return selectedProduct.eSimPrice;
      }
    }
    
    // Default to product price
    return selectedProduct.price || 0;
  }, [selectedProduct, selectedPurchaseInventoryItem]);
  
  // Calculate difference to pay
  const differencePaid = useMemo(() => {
    const tradeInValueNum = parseFloat(tradeInValue) || 0;
    return Math.max(0, purchasePrice - tradeInValueNum);
  }, [purchasePrice, tradeInValue]);
  
  // Filtered products
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
  
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }
    
    try {
      setSubmitting(true);
      const result = await DatabaseService.createCustomer({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        email: newCustomerEmail.trim() || undefined,
        address: newCustomerAddress.trim() || undefined,
      });
      
      if (result.error) {
        Alert.alert('Error', result.error.message || 'Failed to create customer');
      } else if (result.data) {
        setCustomers([...customers, result.data]);
        setSelectedCustomerId(result.data.id);
        setCustomerName(result.data.name);
        setCustomerPhone(result.data.phone || '');
        setCustomerEmail(result.data.email || '');
        setCustomerAddress(result.data.address || '');
        setShowNewCustomerModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerEmail('');
        setNewCustomerAddress('');
        Alert.alert('Success', 'Customer created successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleSubmit = async () => {
    // Validation
    if (!selectedProduct) {
      Alert.alert('Error', 'Please select a product to purchase');
      return;
    }
    
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    
    if (!tradeInImei.trim()) {
      Alert.alert('Error', 'Please enter IMEI of the trade-in device');
      return;
    }
    
    if (!tradeInProductName.trim() && !tradeInProductId) {
      Alert.alert('Error', 'Please select a product or enter the device name');
      return;
    }
    
    const tradeInValueNum = parseFloat(tradeInValue) || 0;
    if (tradeInValueNum < 0) {
      Alert.alert('Error', 'Trade-in value cannot be negative');
      return;
    }
    
    if (tradeInValueNum > purchasePrice) {
      Alert.alert('Error', 'Trade-in value cannot exceed purchase price');
      return;
    }
    
    try {
      setSubmitting(true);
      
      if (isEditMode && swapId) {
        // Update existing swap - only certain fields can be updated
        const updateData: Partial<Swap> = {
          paymentMethod: paymentMethod,
          notes: notes.trim() || null,
          tradeInNotes: tradeInNotes.trim() || null,
          status: 'completed', // Can also be changed if needed
        };
        
        const result = await SwapService.updateSwap(swapId, updateData);
        
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to update swap');
        } else if (result.data) {
          Alert.alert('Success', 'Swap updated successfully!', [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SwapDetail', { swapId: swapId }),
            },
          ]);
        }
      } else {
        // Create new swap
        // Use selected product name or manual name
        let finalTradeInProductName = tradeInProductName.trim();
        if (selectedTradeInProduct) {
          finalTradeInProductName = selectedTradeInProduct.name;
        }
        
        // IMPORTANT: For mobile, we need to handle the full transaction like desktop
        // This includes creating the sale, updating inventory, creating trade-in product, etc.
        // For now, we'll create the swap record and let desktop sync handle the complex parts
        // But we should still validate and prepare all the data
        
        const swapData: Omit<any, 'id' | 'createdAt' | 'updatedAt' | 'swapNumber'> = {
          customerId: selectedCustomerId || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || null,
          customerEmail: customerEmail.trim() || null,
          customerAddress: customerAddress.trim() || null,
          purchasedProductId: selectedProductId,
          purchasedProductName: selectedProduct.name,
          purchasedProductPrice: purchasePrice,
          purchasedImei: manualPurchaseImei.trim() || null,
          tradeInProductName: finalTradeInProductName,
          tradeInImei: tradeInImei.trim(),
          tradeInCondition: tradeInCondition,
          tradeInNotes: tradeInNotes.trim() || null,
          tradeInValue: tradeInValueNum,
          differencePaid: differencePaid,
          paymentMethod: paymentMethod,
          status: 'completed',
          notes: notes.trim() || null,
          inventoryItemId: selectedPurchaseInventoryItemId || null,
          // Additional fields for product matching
          tradeInProductId: tradeInProductId || null,
          // User info
          userId: user?.id || null,
          cashierName: user?.fullName || null,
          cashierEmployeeId: user?.employeeId || null,
        };
        
        const result = await SwapService.createSwap(swapData);
        
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to create swap');
        } else if (result.data) {
          // Remove purchased product from inventory
          let purchasedInventoryItemId: string | null = null;
          try {
            // Check if product uses IMEI tracking
            if (selectedProduct.productModelId) {
              // IMEI-tracked product: mark inventory item as sold
              if (selectedPurchaseInventoryItemId) {
                purchasedInventoryItemId = selectedPurchaseInventoryItemId;
                await InventoryItemService.updateInventoryItem(selectedPurchaseInventoryItemId, {
                  status: 'sold',
                  saleId: null, // Swaps don't have sale IDs
                  customerId: selectedCustomerId || null,
                  soldDate: new Date().toISOString(),
                });
              } else if (manualPurchaseImei.trim()) {
                // Manual IMEI entry - try to find and mark it
                const imeiResult = await InventoryItemService.getInventoryItemByImei(manualPurchaseImei.trim());
                if (imeiResult.data && imeiResult.data.productId === selectedProductId && imeiResult.data.status === 'in_stock') {
                  purchasedInventoryItemId = imeiResult.data.id;
                  await InventoryItemService.updateInventoryItem(imeiResult.data.id, {
                    status: 'sold',
                    saleId: null,
                    customerId: selectedCustomerId || null,
                    soldDate: new Date().toISOString(),
                  });
                  
                  // Update swap record with the found inventory item ID
                  await SwapService.updateSwap(result.data.id, {
                    inventoryItemId: imeiResult.data.id,
                  });
                }
              }
            } else {
              // Regular product: decrease stock
              const newStock = Math.max(0, (selectedProduct.stock || 0) - 1);
              await DatabaseService.updateProduct(selectedProductId, {
                stock: newStock,
              });
            }
          } catch (inventoryError: any) {
            // Don't show error to user - swap is already created
            // Just log it for debugging
          }
          
          // Automatically add trade-in device to inventory
          try {
            let finalTradeInProductId: string | null = null;
            
            // Build the trade-in product name for matching
            const tradeInNameToMatch = finalTradeInProductName.toLowerCase().trim();
            
            // Search for existing product that matches the trade-in device
            // If a product was selected, use it; otherwise match by name
            let matchingProduct: Product | undefined;
            
            if (tradeInProductId) {
              matchingProduct = products.find(p => p.id === tradeInProductId);
            } else {
              // Match by name
              matchingProduct = products.find(p => 
                p.name.toLowerCase().trim() === tradeInNameToMatch
              );
            }
            
            if (matchingProduct) {
              // Use existing product
              finalTradeInProductId = matchingProduct.id;
            } else {
              // Create new product for the trade-in device
              // Determine price: use selling price if set, otherwise try to find similar product price, or calculate default
              let productPrice = 0;
              
              if (tradeInSellingPrice.trim()) {
                // User provided selling price
                productPrice = parseFloat(tradeInSellingPrice) || 0;
              } else {
                // Calculate default: trade-in value * 2 (or minimum trade-in value + 200)
                productPrice = Math.max(tradeInValueNum * 2, tradeInValueNum + 200);
              }
              
              if (productPrice <= 0) {
                // Fallback: use trade-in value * 2
                productPrice = Math.max(tradeInValueNum * 2, 100);
              }
              
              // Create new product for trade-in device
              // Try to get productModelId from selected product if available
              const productModelId = selectedTradeInProduct?.productModelId || undefined;
              
              const newProductResult = await DatabaseService.createProduct({
                name: finalTradeInProductName,
                price: productPrice,
                productModelId: productModelId, // For IMEI tracking if available
                storage: selectedTradeInProduct?.storage || undefined,
                color: selectedTradeInProduct?.color || undefined,
                stock: 0, // Will be calculated from inventory items
                isActive: true,
              });
              
              if (newProductResult.error || !newProductResult.data) {
                Alert.alert('Warning', `Swap created but failed to add inventory: ${newProductResult.error?.message || 'Unknown error'}`);
                // Continue anyway - swap is already created
              } else {
                finalTradeInProductId = newProductResult.data.id;
                // Refresh products list
                const productsRes = await DatabaseService.getProducts();
                if (productsRes.data) {
                  setProducts(productsRes.data);
                }
              }
            }
            
            // Add IMEI as inventory item if we have a product
            if (finalTradeInProductId && tradeInImei.trim()) {
              // Check if IMEI already exists
              const existingImeiCheck = await InventoryItemService.getInventoryItemByImei(tradeInImei.trim());
              
              if (existingImeiCheck.data) {
                // IMEI already exists - show warning to user
                Alert.alert('Warning', `IMEI ${tradeInImei.trim()} already exists in inventory. Inventory item not created.`);
              } else {
                // Determine selling price: use IMEI-specific price if set, otherwise null (will use product/SIM price)
                const sellingPrice = tradeInSellingPrice.trim() 
                  ? parseFloat(tradeInSellingPrice) 
                  : null;
                
                // Create inventory item with IMEI-specific selling price
                const inventoryItemResult = await InventoryItemService.createInventoryItem({
                  productId: finalTradeInProductId,
                  imei: tradeInImei.trim(),
                  status: 'in_stock',
                  condition: tradeInCondition === 'fair' || tradeInCondition === 'poor' ? 'used' : tradeInCondition,
                  sellingPrice: sellingPrice, // IMEI-specific price for this trade-in device (optional)
                  notes: tradeInNotes.trim() || `Trade-in from swap #${result.data.swapNumber}`,
                });
                
                if (inventoryItemResult.error) {
                  Alert.alert('Warning', `Swap created but failed to add inventory item: ${inventoryItemResult.error?.message || 'Unknown error'}`);
                  // Continue anyway - swap is already created
                } else if (inventoryItemResult.data) {
                }
              }
            } else {
              if (!finalTradeInProductId) {
              }
              if (!tradeInImei.trim()) {
              }
            }
          } catch (inventoryError: any) {
            // Don't show error to user - swap is already created successfully
            // Just log it for debugging
          }
          
          Alert.alert('Success', `Swap completed successfully! Swap #${result.data.swapNumber}`, [
            {
              text: 'OK',
              onPress: () => navigation.navigate('SwapDetail', { swapId: result.data!.id }),
            },
          ]);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create swap');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading || (isEditMode && loadingSwap)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {isEditMode ? 'Loading swap...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Header
        title={isEditMode ? 'Edit Device Swap' : 'New Device Swap'}
        subtitle={isEditMode ? 'Update swap details' : 'Trade-in transaction'}
        showBackButton
        onBackPress={() => navigation.goBack()}
        useSafeArea={false}
        rightContent={
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={
                submitting ||
                !selectedProduct ||
                !customerName.trim() ||
                !tradeInImei.trim() ||
                    (!tradeInProductName.trim() && !tradeInProductId)
              }
              style={[
                styles.submitButton,
                {
                  backgroundColor:
                    submitting ||
                    !selectedProduct ||
                    !customerName.trim() ||
                    !tradeInImei.trim() ||
                    (!tradeInProductName.trim() && !tradeInModelId)
                      ? colors.muted
                      : colors.accent,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.accentContrast} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  {isEditMode ? 'Update' : 'Complete'}
                </Text>
              )}
            </TouchableOpacity>
          }
        />
        
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Customer Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer</Text>
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.selectButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    { backgroundColor: colors.input, borderColor: colors.border, flex: 1 },
                    isEditMode && styles.disabledField
                  ]}
                  onPress={() => !isEditMode && setShowCustomerModal(true)}
                  disabled={isEditMode}
                >
                  <Text style={[styles.selectButtonText, { color: selectedCustomerId ? colors.foreground : colors.mutedForeground }]}>
                    {selectedCustomerId ? customerName : 'Select Customer'}
                  </Text>
                  {!isEditMode && <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />}
                </TouchableOpacity>
                {!isEditMode && (
                  <TouchableOpacity
                    style={[styles.addButtonSmall, { backgroundColor: colors.accent + '15', marginLeft: spacing.sm }]}
                    onPress={() => setShowNewCustomerModal(true)}
                  >
                    <Ionicons name="add" size={20} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Customer Name *"
                placeholderTextColor={colors.mutedForeground}
                value={customerName}
                onChangeText={setCustomerName}
                editable={!isEditMode}
              />
            </View>
            
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Phone"
                placeholderTextColor={colors.mutedForeground}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                editable={!isEditMode}
              />
            </View>
            
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Email"
                placeholderTextColor={colors.mutedForeground}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isEditMode}
              />
            </View>
            
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Address"
                placeholderTextColor={colors.mutedForeground}
                value={customerAddress}
                onChangeText={setCustomerAddress}
                multiline
                editable={!isEditMode}
              />
            </View>
          </View>
          
          {/* Purchased Product Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Product to Purchase</Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.input, borderColor: colors.border },
                isEditMode && styles.disabledField
              ]}
              onPress={() => !isEditMode && setShowProductModal(true)}
              disabled={isEditMode}
            >
              <Text style={[styles.selectButtonText, { color: selectedProductId ? colors.foreground : colors.mutedForeground }]}>
                {selectedProduct ? `${selectedProduct.name} - NLe ${formatNumber(purchasePrice)}` : 'Select Product *'}
              </Text>
              {!isEditMode && <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />}
            </TouchableOpacity>
            
            {selectedProduct && (
              <>
                <View style={[styles.productInfo, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.productInfoText, { color: colors.foreground }]}>
                    {selectedProduct.name}
                  </Text>
                  <Text style={[styles.productInfoPrice, { color: colors.mutedForeground }]}>
                    Price: NLe {formatNumber(purchasePrice)}
                    {selectedPurchaseInventoryItem && (
                      <>
                        {selectedPurchaseInventoryItem.sellingPrice !== null && 
                         selectedPurchaseInventoryItem.sellingPrice !== undefined && 
                         selectedPurchaseInventoryItem.sellingPrice > 0 && (
                          <Text style={{ color: colors.info, fontSize: fontSize.xs, marginLeft: spacing.xs }}>
                            {' '}(IMEI-specific)
                          </Text>
                        )}
                        {selectedPurchaseInventoryItem.simType && (
                          <Text style={{ color: colors.success, fontSize: fontSize.xs, marginLeft: spacing.xs }}>
                            {' '}({selectedPurchaseInventoryItem.simType === 'physical' ? 'Physical SIM' : 'eSIM'})
                          </Text>
                        )}
                      </>
                    )}
                  </Text>
                  {selectedProduct.stock !== undefined && (
                    <Text style={[styles.productInfoStock, { color: colors.mutedForeground }]}>
                      Stock: {selectedProduct.stock}
                    </Text>
                  )}
                </View>

                {/* Manual IMEI entry for purchased device */}
                <View style={styles.formRow}>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                    ]}
                    placeholder="Purchased Device IMEI (optional)"
                    placeholderTextColor={colors.mutedForeground}
                    value={manualPurchaseImei}
                    onChangeText={(text) =>
                      setManualPurchaseImei(text.toUpperCase().replace(/[^0-9]/g, ''))
                    }
                    keyboardType="number-pad"
                    maxLength={17}
                  />
                </View>
              </>
            )}
          </View>
          
          {/* Trade-in Device Section */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trade-in Device</Text>
            </View>
            
            {/* Product Selection */}
            <View style={styles.formRow}>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { backgroundColor: colors.input, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                onPress={() => !isEditMode && setShowTradeInProductModal(true)}
                disabled={isEditMode}
              >
                <Text style={[styles.selectButtonText, { color: tradeInProductId ? colors.foreground : colors.mutedForeground }]}>
                  {selectedTradeInProduct ? `${selectedTradeInProduct.name} - NLe ${formatNumber(selectedTradeInProduct.price)}` : 'Select Product'}
                </Text>
                {!isEditMode && <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />}
              </TouchableOpacity>
            </View>
            
            {/* Manual Device Name (fallback) */}
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Device Name (if product not listed)"
                placeholderTextColor={colors.mutedForeground}
                value={tradeInProductName}
                onChangeText={setTradeInProductName}
                editable={!isEditMode}
              />
            </View>
            
            {/* IMEI */}
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="IMEI *"
                placeholderTextColor={colors.mutedForeground}
                value={tradeInImei}
                onChangeText={(text) => setTradeInImei(text.toUpperCase().replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={17}
                editable={!isEditMode}
              />
            </View>
            
            {/* Condition */}
            <View style={styles.formRow}>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  { backgroundColor: colors.input, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                onPress={() => !isEditMode && setShowConditionModal(true)}
                disabled={isEditMode}
              >
                <Text style={[styles.selectButtonText, { color: colors.foreground }]}>
                  {tradeInCondition.charAt(0).toUpperCase() + tradeInCondition.slice(1)}
                </Text>
                {!isEditMode && <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />}
              </TouchableOpacity>
            </View>
            
            {/* Trade-in Value */}
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Trade-in Value"
                placeholderTextColor={colors.mutedForeground}
                value={tradeInValue}
                onChangeText={(text) => setTradeInValue(text.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                editable={!isEditMode}
              />
            </View>
            
            {/* Trade-in Selling Price (IMEI-specific pricing) */}
            <View style={styles.formRow}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isEditMode && styles.disabledField
                ]}
                placeholder="Trade-in Selling Price (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={tradeInSellingPrice}
                onChangeText={(text) => {
                  setTradeInSellingPrice(text.replace(/[^0-9.]/g, ''));
                }}
                keyboardType="decimal-pad"
                editable={!isEditMode}
              />
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                IMEI-specific pricing for this trade-in device
              </Text>
            </View>
            
            {/* Condition Notes */}
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Condition Notes (describe damage, etc.)"
                placeholderTextColor={colors.mutedForeground}
                value={tradeInNotes}
                onChangeText={setTradeInNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
          
          {/* Payment Summary */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Payment Summary</Text>
            </View>
            
            {selectedProduct && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Product Price:</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    NLe {formatNumber(purchasePrice)}
                  </Text>
                </View>
                {/* Purchased device IMEI display – prefer manual IMEI if provided */}
                {(manualPurchaseImei.trim() || selectedPurchaseInventoryItemId) && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Selected Device IMEI:</Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                      {manualPurchaseImei.trim() ||
                        purchaseInventoryItems.find(i => i.id === selectedPurchaseInventoryItemId)?.imei ||
                        '—'}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Trade-in Value:</Text>
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                    -NLe {formatNumber(parseFloat(tradeInValue) || 0)}
                  </Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, styles.summaryTotal, { color: colors.foreground }]}>Amount to Pay:</Text>
                  <Text style={[styles.summaryValue, styles.summaryTotal, { color: colors.accent }]}>
                    NLe {formatNumber(differencePaid)}
                  </Text>
                </View>
              </View>
            )}
            
            {/* Payment Method */}
            <View style={styles.formRow}>
              <TouchableOpacity
                style={[styles.selectButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <Text style={[styles.selectButtonText, { color: colors.foreground }]}>
                  {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace('_', ' ')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            
            {/* Notes */}
            <View style={styles.formRow}>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Additional Notes"
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Customer Selection Modal */}
      <SelectionModal
        visible={showCustomerModal}
        title="Select Customer"
        options={customers.map(c => ({ label: c.name, value: c.id }))}
        selectedValue={selectedCustomerId}
        onSelect={(value) => {
          setSelectedCustomerId(value);
          setShowCustomerModal(false);
        }}
        onClose={() => setShowCustomerModal(false)}
      />
      
        {/* Product Selection Modal */}
      <SelectionModal
        visible={showProductModal}
        title="Select Product"
        options={filteredProducts.map(p => ({ 
          label: `${p.name}${
            p.sku && p.sku.trim()
              ? `  •  IMEI/Serial: ${p.sku}`
              : ''
          } - NLe ${formatNumber(p.price)}${
            p.stock !== undefined ? ` (Stock: ${p.stock})` : ''
          }`, 
          value: p.id 
        }))}
        selectedValue={selectedProductId}
        onSelect={async (value) => {
          const product = products.find(p => p.id === value);
          setShowProductModal(false);
          setProductSearchTerm('');

          // If product uses IMEI tracking, load inventory items and let user pick specific device
          if (product && product.productModelId) {
            try {
              setLoadingPurchaseInventory(true);
              setPendingPurchaseProductId(product.id);
              const result = await InventoryItemService.getInventoryItems({
                productId: product.id,
                status: 'in_stock',
              });
              if (result.data) {
                setPurchaseInventoryItems(result.data);
              } else {
                setPurchaseInventoryItems([]);
              }
            } catch (error) {
              setPurchaseInventoryItems([]);
              Alert.alert('Error', 'Failed to load available devices for this product');
            } finally {
              setLoadingPurchaseInventory(false);
              setShowPurchaseImeiModal(true);
            }
          } else {
            // Regular product without IMEI tracking
            setSelectedProductId(value);
            setSelectedPurchaseInventoryItemId(null);
            setPurchaseInventoryItems([]);
          }
        }}
        onClose={() => {
          setShowProductModal(false);
          setProductSearchTerm('');
        }}
      />
      
      {/* Trade-in Product Selection Modal */}
      <SelectionModal
        visible={showTradeInProductModal}
        title="Select Trade-in Product"
        options={products
          .filter(p => p.isActive !== false)
          .map(p => ({ 
            label: `${p.name}${p.storage ? ` ${p.storage}` : ''}${p.color ? ` ${p.color}` : ''} - NLe ${formatNumber(p.price)}`, 
            value: p.id 
          }))}
        selectedValue={tradeInProductId}
        onSelect={(value) => {
          setTradeInProductId(value);
          const product = products.find(p => p.id === value);
          if (product) {
            setTradeInProductName(product.name);
          }
          setShowTradeInProductModal(false);
        }}
        onClose={() => setShowTradeInProductModal(false)}
      />
      
      {/* Condition Selection Modal */}
      <SelectionModal
        visible={showConditionModal}
        title="Select Condition"
        options={[
          { label: 'New', value: 'new' },
          { label: 'Refurbished', value: 'refurbished' },
          { label: 'Used', value: 'used' },
          { label: 'Fair', value: 'fair' },
          { label: 'Poor', value: 'poor' },
        ]}
        selectedValue={tradeInCondition}
        onSelect={(value) => {
          setTradeInCondition(value as typeof tradeInCondition);
          setShowConditionModal(false);
        }}
        onClose={() => setShowConditionModal(false)}
      />
      
      {/* Payment Method Selection Modal */}
      <SelectionModal
        visible={showPaymentModal}
        title="Select Payment Method"
        options={[
          { label: 'Cash', value: 'cash' },
          { label: 'Card', value: 'card' },
          { label: 'Bank Transfer', value: 'bank_transfer' },
          { label: 'Store Credit', value: 'credit' },
          { label: 'Other', value: 'other' },
        ]}
        selectedValue={paymentMethod}
        onSelect={(value) => {
          setPaymentMethod(value as typeof paymentMethod);
          setShowPaymentModal(false);
        }}
        onClose={() => setShowPaymentModal(false)}
      />

      {/* Purchased Device IMEI Selection Modal */}
      <SelectionModal
        visible={showPurchaseImeiModal}
        title={loadingPurchaseInventory ? 'Loading devices...' : 'Select Device (IMEI)'}
        options={purchaseInventoryItems.map(item => {
          // Determine selling price based on IMEI-specific price, then SIM type, then product price
          let sellingPrice = selectedProduct?.price || 0;
          if (item.sellingPrice !== null && item.sellingPrice !== undefined && item.sellingPrice > 0) {
            sellingPrice = item.sellingPrice;
          } else if (item.simType === 'physical' && selectedProduct?.physicalSimPrice !== null && selectedProduct?.physicalSimPrice !== undefined) {
            sellingPrice = selectedProduct.physicalSimPrice;
          } else if (item.simType === 'esim' && selectedProduct?.eSimPrice !== null && selectedProduct?.eSimPrice !== undefined) {
            sellingPrice = selectedProduct.eSimPrice;
          }
          
          return {
            label: `${item.imei}  •  ${item.condition.toUpperCase()}${item.simType ? ` • ${item.simType === 'physical' ? 'Physical SIM' : 'eSIM'}` : ''}  •  NLe ${sellingPrice.toLocaleString()}`,
            value: item.id,
          };
        })}
        selectedValue={selectedPurchaseInventoryItemId || ''}
        onSelect={(value) => {
          const item = purchaseInventoryItems.find(i => i.id === value);
          if (item && pendingPurchaseProductId) {
            setSelectedProductId(pendingPurchaseProductId);
            setSelectedPurchaseInventoryItemId(item.id);
          }
          setShowPurchaseImeiModal(false);
        }}
        onClose={() => setShowPurchaseImeiModal(false)}
      />
      
      {/* New Customer Modal */}
      <Modal
        visible={showNewCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNewCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Customer</Text>
              <TouchableOpacity onPress={() => setShowNewCustomerModal(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Name *"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                />
              </View>
              
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Phone"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Email"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCustomerEmail}
                  onChangeText={setNewCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.formRow}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  placeholder="Address"
                  placeholderTextColor={colors.mutedForeground}
                  value={newCustomerAddress}
                  onChangeText={setNewCustomerAddress}
                  multiline
                />
              </View>
            </ScrollView>
            
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.muted }]}
                onPress={() => setShowNewCustomerModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: colors.accent }]}
                onPress={handleCreateCustomer}
                disabled={submitting || !newCustomerName.trim()}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.accentContrast} />
                ) : (
                  <Text style={[styles.modalButtonText, { color: colors.accentContrast }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  submitButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  formRow: {
    marginBottom: spacing.md,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  selectButton: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: fontSize.base,
    flex: 1,
  },
  selectButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  productInfo: {
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  productInfoText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  productInfoPrice: {
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  productInfoStock: {
    fontSize: fontSize.sm,
  },
  summaryContainer: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.base,
  },
  summaryValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  summaryTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  summaryDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '40%',
    borderWidth: 1,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
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
  modalBody: {
    padding: spacing.lg,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  disabledField: {
    opacity: 0.5,
  },
});

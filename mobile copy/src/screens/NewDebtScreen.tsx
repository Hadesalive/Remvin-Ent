/**
 * New Debt Screen
 * Create a new debt record
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DebtService } from '../services/debt.service';
import { DatabaseService } from '../services/database.service';
import { InventoryItemService } from '../services/inventory-item.service';
import { Customer, Product, InventoryItem, SaleItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { SelectionModal } from '../components/ui/SelectionModal';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

interface DebtItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  inventoryItemIds?: string[];
  imeis?: string[];
}

interface NewDebtScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route?: {
    params?: Record<string, unknown>;
  };
}

export default function NewDebtScreen({ navigation, route }: NewDebtScreenProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [debtAmount, setDebtAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  
  // Item selection state
  const [debtItems, setDebtItems] = useState<DebtItem[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [availableInventoryItems, setAvailableInventoryItems] = useState<InventoryItem[]>([]);
  const [loadingInventoryItems, setLoadingInventoryItems] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes, productsRes] = await Promise.all([
        DatabaseService.getCustomers(),
        DatabaseService.getProducts(),
      ]);
      
      if (customersRes.data) {
        setCustomers(customersRes.data);
      }
      if (productsRes.data) {
        setProducts(productsRes.data);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate total from items
  const calculatedTotal = useMemo(() => {
    return debtItems.reduce((sum, item) => sum + item.total, 0);
  }, [debtItems]);
  
  // Update debt amount when items change
  useEffect(() => {
    if (calculatedTotal > 0) {
      setDebtAmount(calculatedTotal.toFixed(2));
    }
  }, [calculatedTotal]);
  
  // Filter products for selection
  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products.filter(p => p.isActive !== false && (p.stock || 0) > 0);
    const term = productSearchTerm.toLowerCase();
    return products.filter(p => 
      p.isActive !== false && 
      (p.stock || 0) > 0 &&
      (p.name.toLowerCase().includes(term) || 
       p.sku?.toLowerCase().includes(term))
    );
  }, [products, productSearchTerm]);
  
  // Handle product selection
  const handleProductSelect = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    setShowProductModal(false);
    setProductSearchTerm('');
    
    // Check if product uses IMEI tracking
    if (product.productModelId) {
      // Show inventory item selection modal
      setPendingProduct(product);
      setSelectedInventoryItems([]);
      setLoadingInventoryItems(true);
      setShowInventoryModal(true);
      
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
    } else {
      // Regular product - add directly
      const existingItemIndex = debtItems.findIndex(item => item.productId === product.id);
      if (existingItemIndex >= 0) {
        // Update quantity
        const updatedItems = [...debtItems];
        updatedItems[existingItemIndex].quantity += 1;
        updatedItems[existingItemIndex].total = updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].price;
        setDebtItems(updatedItems);
      } else {
        // Add new item
        const price = product.price || 0;
        setDebtItems([...debtItems, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: price,
          total: price,
        }]);
      }
    }
  };
  
  // Handle inventory item selection
  const handleInventoryItemSelect = (inventoryItemId: string) => {
    if (!pendingProduct) return;
    
    const inventoryItem = availableInventoryItems.find(item => item.id === inventoryItemId);
    if (!inventoryItem) return;
    
    // Toggle selection
    if (selectedInventoryItems.includes(inventoryItemId)) {
      setSelectedInventoryItems(selectedInventoryItems.filter(id => id !== inventoryItemId));
    } else {
      setSelectedInventoryItems([...selectedInventoryItems, inventoryItemId]);
    }
  };
  
  // Confirm inventory item selection
  const handleConfirmInventorySelection = () => {
    if (!pendingProduct || selectedInventoryItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item');
      return;
    }
    
    const selectedItems = availableInventoryItems.filter(item => selectedInventoryItems.includes(item.id));
    const imeis = selectedItems.map(item => item.imei);
    
    // Calculate price (use IMEI-specific price, condition-based price, or product price)
    let price = pendingProduct.price || 0;
    if (selectedItems.length > 0) {
      const firstItem = selectedItems[0];
      if (firstItem.sellingPrice) {
        price = firstItem.sellingPrice;
      } else if (pendingProduct.newPrice && firstItem.condition === 'new') {
        price = pendingProduct.newPrice;
      } else if (pendingProduct.usedPrice && firstItem.condition === 'used') {
        price = pendingProduct.usedPrice;
      } else if (pendingProduct.physicalSimPrice && firstItem.simType === 'physical') {
        price = pendingProduct.physicalSimPrice;
      } else if (pendingProduct.eSimPrice && firstItem.simType === 'esim') {
        price = pendingProduct.eSimPrice;
      }
    }
    
    const total = price * selectedItems.length;
    
    // Add to debt items
    const existingItemIndex = debtItems.findIndex(item => item.productId === pendingProduct.id);
    if (existingItemIndex >= 0) {
      const updatedItems = [...debtItems];
      const existingItem = updatedItems[existingItemIndex];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + selectedItems.length,
        inventoryItemIds: [...(existingItem.inventoryItemIds || []), ...selectedInventoryItems],
        imeis: [...(existingItem.imeis || []), ...imeis],
        total: existingItem.total + total,
      };
      setDebtItems(updatedItems);
    } else {
      setDebtItems([...debtItems, {
        productId: pendingProduct.id,
        productName: pendingProduct.name,
        quantity: selectedItems.length,
        price: price,
        total: total,
        inventoryItemIds: selectedInventoryItems,
        imeis: imeis,
      }]);
    }
    
    // Reset state
    setShowInventoryModal(false);
    setPendingProduct(null);
    setSelectedInventoryItems([]);
    setAvailableInventoryItems([]);
  };
  
  // Remove item from debt
  const handleRemoveItem = (index: number) => {
    const updatedItems = debtItems.filter((_, i) => i !== index);
    setDebtItems(updatedItems);
  };
  
  // Update item quantity
  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(index);
      return;
    }
    
    const updatedItems = [...debtItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].total = updatedItems[index].price * quantity;
    setDebtItems(updatedItems);
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

  const handleCustomerSelect = (customerId: string, customerName: string) => {
    setSelectedCustomer(customerId);
    setCustomerSearchTerm(customerName);
    setShowCustomerDropdown(false);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleSubmit = async () => {
    const finalAmount = debtItems.length > 0 ? calculatedTotal : parseFloat(debtAmount || '0');
    
    if (finalAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid debt amount or add items');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    setSubmitting(true);
    try {
      // Convert debt items to SaleItem format for storage
      const itemsToStore: SaleItem[] = debtItems.map((item, index) => ({
        id: `item-${index}`,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        inventoryItemIds: item.inventoryItemIds,
        imeis: item.imeis,
      }));
      
      const itemsJson = JSON.stringify(itemsToStore);
      
      // Create debt
      const debt = await DebtService.createDebt({
        customerId: selectedCustomer,
        amount: finalAmount,
        description: description.trim() || null,
        items: itemsJson,
        saleId: null,
      });
      
      // Mark inventory items as sold
      if (debtItems.length > 0) {
        const soldDate = new Date().toISOString();
        
        for (const item of debtItems) {
          if (item.inventoryItemIds && item.inventoryItemIds.length > 0) {
            // Mark each inventory item as sold
            for (const inventoryItemId of item.inventoryItemIds) {
              try {
                await InventoryItemService.updateInventoryItem(inventoryItemId, {
                  status: 'sold',
                  customerId: selectedCustomer,
                  soldDate: soldDate,
                });
              } catch (inventoryError) {
                // Continue with other items even if one fails
              }
            }
          } else {
            // Regular product - update stock
            try {
              const product = products.find(p => p.id === item.productId);
              if (product && !product.productModelId) {
                const newStock = Math.max(0, (product.stock || 0) - item.quantity);
                await DatabaseService.updateProduct(item.productId, {
                  stock: newStock,
                });
              }
            } catch (stockError) {
              // Continue with other products even if one fails
            }
          }
        }
      }

      Alert.alert('Success', 'Debt created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create debt';
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Debt</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Create a new debt record
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Customer Selection */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="person-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButtonSmall, { backgroundColor: colors.accent }]}
                onPress={() => setShowCustomerModal(true)}
              >
                <Ionicons name="add" size={16} color={colors.accentContrast} />
                <Text style={[styles.addButtonSmallText, { color: colors.accentContrast }]}>New</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}
            >
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <Text
                style={[
                  styles.inputText,
                  { color: selectedCustomer ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {selectedCustomer
                  ? customers.find((c) => c.id === selectedCustomer)?.name || 'Select customer'
                  : 'Select customer'}
              </Text>
              <Ionicons
                name={showCustomerDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showCustomerDropdown && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder="Search customers..."
                    placeholderTextColor={colors.mutedForeground}
                    value={customerSearchTerm}
                    onChangeText={setCustomerSearchTerm}
                  />
                </View>
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <TouchableOpacity
                        key={customer.id}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                        onPress={() => handleCustomerSelect(customer.id, customer.name)}
                      >
                        <Text style={[styles.dropdownText, { color: colors.foreground }]}>
                          {customer.name}
                        </Text>
                        {customer.phone && (
                          <Text style={[styles.dropdownSubtext, { color: colors.mutedForeground }]}>
                            {customer.phone}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyDropdown}>
                      <Text style={[styles.emptyDropdownText, { color: colors.mutedForeground }]}>
                        No customers found
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Items Selection */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="cube-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Items</Text>
              </View>
              <TouchableOpacity
                style={[styles.addButtonSmall, { backgroundColor: colors.accent }]}
                onPress={() => setShowProductModal(true)}
              >
                <Ionicons name="add" size={16} color={colors.accentContrast} />
                <Text style={[styles.addButtonSmallText, { color: colors.accentContrast }]}>Add</Text>
              </TouchableOpacity>
            </View>

            {debtItems.length === 0 ? (
              <View style={styles.emptyItemsContainer}>
                <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyItemsText, { color: colors.mutedForeground }]}>
                  No items added
                </Text>
                <Text style={[styles.emptyItemsSubtext, { color: colors.mutedForeground }]}>
                  Tap "Add" to select products
                </Text>
              </View>
            ) : (
              <View style={styles.itemsList}>
                {debtItems.map((item, index) => (
                  <View key={index} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                        {item.productName}
                      </Text>
                      {item.imeis && item.imeis.length > 0 && (
                        <Text style={[styles.itemImei, { color: colors.mutedForeground }]} numberOfLines={1}>
                          IMEI: {item.imeis.join(', ')}
                        </Text>
                      )}
                      <View style={styles.itemQuantityRow}>
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                          onPress={() => handleUpdateQuantity(index, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={[styles.quantityText, { color: colors.foreground }]}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                          onPress={() => handleUpdateQuantity(index, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={16} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                        NLe {formatNumber(item.total)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(index)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View style={[styles.itemsTotal, { borderTopColor: colors.border }]}>
                  <Text style={[styles.itemsTotalLabel, { color: colors.foreground }]}>Total:</Text>
                  <Text style={[styles.itemsTotalAmount, { color: colors.accent }]}>
                    NLe {formatNumber(calculatedTotal)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Debt Amount */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="cash-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Debt Amount</Text>
              </View>
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Text style={[styles.currencyPrefix, { color: colors.mutedForeground }]}>NLe</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.foreground }]}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                value={debtAmount}
                onChangeText={setDebtAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Description */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Description</Text>
              </View>
            </View>

            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Optional description or notes..."
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
            onPress={handleSubmit}
            disabled={submitting || !selectedCustomer || (debtItems.length === 0 && (!debtAmount || parseFloat(debtAmount) <= 0))}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentContrast} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.accentContrast} />
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  Create Debt
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* New Customer Modal */}
      <Modal
        visible={showCustomerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="person-add" size={24} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Customer</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    Create a new customer
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                  placeholder="Customer name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  placeholder="Phone number"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={newCustomerEmail}
                  onChangeText={setNewCustomerEmail}
                  placeholder="Email address"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCustomerModal(false);
                  setNewCustomerName('');
                  setNewCustomerPhone('');
                  setNewCustomerEmail('');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.accent }]}
                onPress={handleCreateCustomer}
                disabled={!newCustomerName.trim()}
              >
                <Text style={[styles.confirmButtonText, { color: colors.accentContrast }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowProductModal(false);
          setProductSearchTerm('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="cube-outline" size={24} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Product</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    Choose a product to add
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => {
                setShowProductModal(false);
                setProductSearchTerm('');
              }}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search products..."
                placeholderTextColor={colors.mutedForeground}
                value={productSearchTerm}
                onChangeText={setProductSearchTerm}
              />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {filteredProducts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No products found
                  </Text>
                </View>
              ) : (
                filteredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productItemRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleProductSelect(product.id)}
                  >
                    <View style={styles.productItemInfo}>
                      <Text style={[styles.productItemName, { color: colors.foreground }]}>
                        {product.name}
                      </Text>
                      <Text style={[styles.productItemDetails, { color: colors.mutedForeground }]}>
                        Stock: {product.stock || 0} • NLe {formatNumber(product.price)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Inventory Item Selection Modal */}
      <Modal
        visible={showInventoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowInventoryModal(false);
          setPendingProduct(null);
          setSelectedInventoryItems([]);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="cube" size={24} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Select {pendingProduct?.name || 'Items'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    Choose specific inventory items
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => {
                setShowInventoryModal(false);
                setPendingProduct(null);
                setSelectedInventoryItems([]);
              }}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {loadingInventoryItems ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                    Loading items...
                  </Text>
                </View>
              ) : availableInventoryItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No items available
                  </Text>
                </View>
              ) : (
                availableInventoryItems.map((item) => {
                  const isSelected = selectedInventoryItems.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.inventoryItemRow,
                        { 
                          borderBottomColor: colors.border,
                          backgroundColor: isSelected ? colors.accent + '15' : 'transparent',
                        },
                      ]}
                      onPress={() => handleInventoryItemSelect(item.id)}
                    >
                      <View style={styles.inventoryItemInfo}>
                        <Text style={[styles.inventoryItemImei, { color: colors.foreground }]}>
                          IMEI: {item.imei}
                        </Text>
                        <Text style={[styles.inventoryItemDetails, { color: colors.mutedForeground }]}>
                          {item.condition} • {item.simType || 'N/A'}
                        </Text>
                        {item.sellingPrice && (
                          <Text style={[styles.inventoryItemPrice, { color: colors.accent }]}>
                            NLe {formatNumber(item.sellingPrice)}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowInventoryModal(false);
                  setPendingProduct(null);
                  setSelectedInventoryItems([]);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.accent }]}
                onPress={handleConfirmInventorySelection}
                disabled={selectedInventoryItems.length === 0}
              >
                <Text style={[styles.confirmButtonText, { color: colors.accentContrast }]}>
                  Add {selectedInventoryItems.length > 0 ? `(${selectedInventoryItems.length})` : ''}
                </Text>
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  addButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  addButtonSmallText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  inputText: {
    flex: 1,
    fontSize: fontSize.base,
  },
  currencyPrefix: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  amountInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    minHeight: 100,
  },
  dropdown: {
    marginTop: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 300,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.xs,
  },
  dropdownList: {
    maxHeight: 250,
  },
  dropdownItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  dropdownText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  dropdownSubtext: {
    fontSize: fontSize.xs,
  },
  emptyDropdown: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyDropdownText: {
    fontSize: fontSize.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  modalContainer: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
  },
  modalBody: {
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  confirmButton: {
    // backgroundColor set inline
  },
  confirmButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyItemsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyItemsText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  emptyItemsSubtext: {
    fontSize: fontSize.sm,
  },
  itemsList: {
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  itemImei: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  itemQuantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    minWidth: 30,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  removeButton: {
    padding: spacing.xs,
  },
  itemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 2,
  },
  itemsTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  itemsTotalAmount: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  inventoryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inventoryItemInfo: {
    flex: 1,
  },
  inventoryItemImei: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  inventoryItemDetails: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  inventoryItemPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  productItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productItemInfo: {
    flex: 1,
  },
  productItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  productItemDetails: {
    fontSize: fontSize.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});


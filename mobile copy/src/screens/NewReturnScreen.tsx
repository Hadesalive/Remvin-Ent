/**
 * New Return Screen
 * Create a new return with exchange/replacement option
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { ReturnsService } from '../services/returns.service';
import { SalesService } from '../services/sales.service';
import { DatabaseService } from '../services/database.service';
import { Sale, SaleItem, Product, Customer } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

const TAX_RATE = 0.15;

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

function parseSaleItems(items: string): SaleItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      id: item.id || '',
      productId: item.productId || '',
      productName: item.productName || '',
      quantity: typeof item.quantity === 'number' ? item.quantity : 0,
      price: typeof item.price === 'number' ? item.price : 0,
      total: typeof item.total === 'number' ? item.total : 0,
      sku: item.sku || undefined,
    }));
  } catch {
    return [];
  }
}

export default function NewReturnScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [showSaleDropdown, setShowSaleDropdown] = useState(false);
  const [returnItems, setReturnItems] = useState<SaleItem[]>([]);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'store_credit' | 'original_payment' | 'exchange'>('cash');
  const [exchangeItems, setExchangeItems] = useState<SaleItem[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [salesData, productsRes] = await Promise.all([
        SalesService.getSales(),
        DatabaseService.getProducts(),
      ]);
      
      setSales(salesData);
      if (productsRes.data) {
        setProducts(productsRes.data);
      }
    } catch (error: any) {

      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = useMemo(() => {
    if (!saleSearchTerm.trim()) return sales.slice(0, 20); // Limit to recent 20
    const term = saleSearchTerm.toLowerCase();
    return sales.filter((sale) => {
      const customerName = sale.customerName?.toLowerCase() || '';
      const saleId = sale.id?.toLowerCase() || '';
      return customerName.includes(term) || saleId.includes(term);
    }).slice(0, 20);
  }, [sales, saleSearchTerm]);

  const filteredProducts = useMemo(() => {
    if (!productSearchTerm.trim()) return products.filter(p => p.isActive !== false).slice(0, 50);
    const term = productSearchTerm.toLowerCase();
    return products.filter((p) => {
      const name = p.name?.toLowerCase() || '';
      const sku = p.sku?.toLowerCase() || '';
      return (name.includes(term) || sku.includes(term)) && p.isActive !== false;
    }).slice(0, 50);
  }, [products, productSearchTerm]);

  const handleSaleSelect = (sale: Sale) => {
    setSelectedSale(sale);
    setSaleSearchTerm(`Sale #${sale.id.substring(0, 8)} - ${sale.customerName || 'Walk-in'}`);
    setShowSaleDropdown(false);
    setReturnItems([]);
  };

  const handleAddReturnItem = (item: SaleItem) => {
    const existingIndex = returnItems.findIndex(ri => ri.productId === item.productId);
    if (existingIndex >= 0) {
      const updated = [...returnItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setReturnItems(updated);
    } else {
      setReturnItems([...returnItems, { ...item, quantity: 1, total: item.price }]);
    }
  };

  const handleRemoveReturnItem = (productId: string) => {
    setReturnItems(returnItems.filter(item => item.productId !== productId));
  };

  const handleUpdateReturnItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveReturnItem(productId);
      return;
    }
    const updated = returnItems.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity, total: quantity * item.price };
      }
      return item;
    });
    setReturnItems(updated);
  };

  const handleAddExchangeItem = (product: Product) => {
    const existingIndex = exchangeItems.findIndex(ei => ei.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...exchangeItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total = updated[existingIndex].quantity * updated[existingIndex].price;
      setExchangeItems(updated);
    } else {
      setExchangeItems([...exchangeItems, {
        id: `ex-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        sku: product.sku,
      }]);
    }
    setShowProductDropdown(false);
    setProductSearchTerm('');
  };

  const handleRemoveExchangeItem = (productId: string) => {
    setExchangeItems(exchangeItems.filter(item => item.productId !== productId));
  };

  const handleUpdateExchangeItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveExchangeItem(productId);
      return;
    }
    const updated = exchangeItems.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity, total: quantity * item.price };
      }
      return item;
    });
    setExchangeItems(updated);
  };

  const calculations = useMemo(() => {
    const subtotal = returnItems.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    // For exchange, refund is the difference (if exchange items cost more, no refund)
    let refundAmount = total;
    if (refundMethod === 'exchange') {
      const exchangeSubtotal = exchangeItems.reduce((sum, item) => sum + item.total, 0);
      const exchangeTax = exchangeSubtotal * TAX_RATE;
      const exchangeTotal = exchangeSubtotal + exchangeTax;
      refundAmount = Math.max(0, total - exchangeTotal); // Customer pays difference if exchange is more expensive
    }

    return { subtotal, tax, total, refundAmount };
  }, [returnItems, exchangeItems, refundMethod]);

  const handleSubmit = async () => {
    if (!selectedSale) {
      Alert.alert('Error', 'Please select a sale');
      return;
    }

    if (returnItems.length === 0) {
      Alert.alert('Error', 'Please add items to return');
      return;
    }

    if (refundMethod === 'exchange' && exchangeItems.length === 0) {
      Alert.alert('Error', 'Please add exchange items');
      return;
    }

    setSubmitting(true);
    try {
      await ReturnsService.createReturn({
        saleId: selectedSale.id,
        customerId: selectedSale.customerId || null,
        customerName: selectedSale.customerName || null,
        items: returnItems,
        subtotal: calculations.subtotal,
        tax: calculations.tax,
        total: calculations.total,
        refundAmount: calculations.refundAmount,
        refundMethod,
        status: 'pending',
        notes: notes.trim() || null,
        exchangeItems: refundMethod === 'exchange' ? exchangeItems : undefined,
      });

      Alert.alert('Success', 'Return created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {

      Alert.alert('Error', error.message || 'Failed to create return');
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>New Return</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            Create a new return
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
          {/* Sale Selection */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Select Sale</Text>
            </View>

            <TouchableOpacity
              style={[styles.inputContainer, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setShowSaleDropdown(!showSaleDropdown)}
            >
              <Ionicons name="receipt-outline" size={18} color={colors.mutedForeground} />
              <Text
                style={[
                  styles.inputText,
                  { color: selectedSale ? colors.foreground : colors.mutedForeground },
                ]}
              >
                {selectedSale
                  ? `Sale #${selectedSale.id.substring(0, 8)} - ${selectedSale.customerName || 'Walk-in'}`
                  : 'Select sale'}
              </Text>
              <Ionicons
                name={showSaleDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>

            {showSaleDropdown && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder="Search sales..."
                    placeholderTextColor={colors.mutedForeground}
                    value={saleSearchTerm}
                    onChangeText={setSaleSearchTerm}
                  />
                </View>
                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {filteredSales.length > 0 ? (
                    filteredSales.map((sale) => {
                      const saleItems = parseSaleItems(sale.items);
                      return (
                        <TouchableOpacity
                          key={sale.id}
                          style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                          onPress={() => handleSaleSelect(sale)}
                        >
                          <Text style={[styles.dropdownText, { color: colors.foreground }]}>
                            {sale.customerName || 'Walk-in'}
                          </Text>
                          <Text style={[styles.dropdownSubtext, { color: colors.mutedForeground }]}>
                            {saleItems.length} items • NLe {formatNumber(sale.total)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.emptyDropdown}>
                      <Text style={[styles.emptyDropdownText, { color: colors.mutedForeground }]}>
                        No sales found
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Return Items */}
          {selectedSale && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="cube-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Items to Return</Text>
              </View>

              {returnItems.length === 0 ? (
                <View style={styles.emptyItemsContainer}>
                  <Text style={[styles.emptyItemsText, { color: colors.mutedForeground }]}>
                    Select items from the sale below
                  </Text>
                </View>
              ) : (
                returnItems.map((item) => (
                  <View key={item.productId} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.itemLeft}>
                      <Text style={[styles.itemName, { color: colors.foreground }]}>
                        {item.productName}
                      </Text>
                      {item.sku && (
                        <Text style={[styles.itemSku, { color: colors.mutedForeground }]}>
                          SKU: {item.sku}
                        </Text>
                      )}
                    </View>
                    <View style={styles.itemRight}>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: colors.muted }]}
                          onPress={() => handleUpdateReturnItemQuantity(item.productId, item.quantity - 1)}
                        >
                          <Ionicons name="remove" size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={[styles.quantityText, { color: colors.foreground }]}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          style={[styles.quantityButton, { backgroundColor: colors.muted }]}
                          onPress={() => handleUpdateReturnItemQuantity(item.productId, item.quantity + 1)}
                        >
                          <Ionicons name="add" size={16} color={colors.foreground} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                        NLe {formatNumber(item.total)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveReturnItem(item.productId)}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {/* Available items from sale */}
              {returnItems.length === 0 && (
                <View style={styles.availableItemsContainer}>
                  <Text style={[styles.availableItemsTitle, { color: colors.foreground }]}>
                    Available Items:
                  </Text>
                  {parseSaleItems(selectedSale.items).map((item) => (
                    <TouchableOpacity
                      key={item.productId}
                      style={[styles.availableItem, { backgroundColor: colors.input, borderColor: colors.border }]}
                      onPress={() => handleAddReturnItem(item)}
                    >
                      <View style={styles.availableItemLeft}>
                        <Text style={[styles.availableItemName, { color: colors.foreground }]}>
                          {item.productName}
                        </Text>
                        <Text style={[styles.availableItemPrice, { color: colors.mutedForeground }]}>
                          NLe {formatNumber(item.price)} × {item.quantity}
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Refund Method */}
          {returnItems.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="card-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Refund Method</Text>
              </View>

              <View style={styles.refundMethodContainer}>
                {['cash', 'store_credit', 'original_payment', 'exchange'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.refundMethodOption,
                      {
                        backgroundColor: refundMethod === method ? colors.accent : colors.input,
                        borderColor: refundMethod === method ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setRefundMethod(method as any);
                      if (method !== 'exchange') {
                        setExchangeItems([]);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.refundMethodText,
                        {
                          color: refundMethod === method ? colors.accentContrast : colors.foreground,
                        },
                      ]}
                    >
                      {method === 'cash' ? 'Cash' :
                       method === 'store_credit' ? 'Store Credit' :
                       method === 'original_payment' ? 'Original Payment' :
                       'Exchange'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Exchange Items */}
              {refundMethod === 'exchange' && (
                <View style={styles.exchangeSection}>
                  <View style={styles.exchangeHeader}>
                    <Text style={[styles.exchangeTitle, { color: colors.foreground }]}>
                      Replacement Items
                    </Text>
                    <TouchableOpacity
                      style={[styles.addExchangeButton, { backgroundColor: colors.accent }]}
                      onPress={() => setShowExchangeModal(true)}
                    >
                      <Ionicons name="add" size={18} color={colors.accentContrast} />
                      <Text style={[styles.addExchangeButtonText, { color: colors.accentContrast }]}>
                        Add Item
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {exchangeItems.length === 0 ? (
                    <Text style={[styles.emptyExchangeText, { color: colors.mutedForeground }]}>
                      No replacement items added
                    </Text>
                  ) : (
                    exchangeItems.map((item) => (
                      <View key={item.productId} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                        <View style={styles.itemLeft}>
                          <Text style={[styles.itemName, { color: colors.foreground }]}>
                            {item.productName}
                          </Text>
                          {item.sku && (
                            <Text style={[styles.itemSku, { color: colors.mutedForeground }]}>
                              SKU: {item.sku}
                            </Text>
                          )}
                        </View>
                        <View style={styles.itemRight}>
                          <View style={styles.quantityControls}>
                            <TouchableOpacity
                              style={[styles.quantityButton, { backgroundColor: colors.muted }]}
                              onPress={() => handleUpdateExchangeItemQuantity(item.productId, item.quantity - 1)}
                            >
                              <Ionicons name="remove" size={16} color={colors.foreground} />
                            </TouchableOpacity>
                            <Text style={[styles.quantityText, { color: colors.foreground }]}>
                              {item.quantity}
                            </Text>
                            <TouchableOpacity
                              style={[styles.quantityButton, { backgroundColor: colors.muted }]}
                              onPress={() => handleUpdateExchangeItemQuantity(item.productId, item.quantity + 1)}
                            >
                              <Ionicons name="add" size={16} color={colors.foreground} />
                            </TouchableOpacity>
                          </View>
                          <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                            NLe {formatNumber(item.total)}
                          </Text>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveExchangeItem(item.productId)}
                          >
                            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          )}

          {/* Summary */}
          {returnItems.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="calculator-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Summary</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal:</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  NLe {formatNumber(calculations.subtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax:</Text>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  NLe {formatNumber(calculations.tax)}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: fontWeight.bold }]}>
                  Total:
                </Text>
                <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: fontWeight.bold }]}>
                  NLe {formatNumber(calculations.total)}
                </Text>
              </View>

              {refundMethod === 'exchange' && exchangeItems.length > 0 && (
                <>
                  <View style={styles.summaryDivider} />
                  <Text style={[styles.exchangeLabel, { color: colors.mutedForeground }]}>
                    Exchange Items Total:
                  </Text>
                  <Text style={[styles.exchangeValue, { color: colors.foreground }]}>
                    NLe {formatNumber(exchangeItems.reduce((sum, item) => sum + item.total, 0) * (1 + TAX_RATE))}
                  </Text>
                </>
              )}

              <View style={[styles.summaryRow, styles.summaryRefund]}>
                <Text style={[styles.summaryLabel, { color: colors.accent, fontWeight: fontWeight.bold }]}>
                  {refundMethod === 'exchange' && calculations.refundAmount === 0
                    ? 'Customer Pays:'
                    : 'Refund Amount:'}
                </Text>
                <Text style={[styles.summaryValue, { color: colors.accent, fontWeight: fontWeight.bold, fontSize: fontSize.lg }]}>
                  NLe {formatNumber(calculations.refundAmount)}
                </Text>
              </View>
            </View>
          )}

          {/* Notes */}
          {returnItems.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
              </View>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes about this return..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Submit Button */}
          {returnItems.length > 0 && (
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.accent }]}
              onPress={handleSubmit}
              disabled={submitting || (refundMethod === 'exchange' && exchangeItems.length === 0)}
            >
              {submitting ? (
                <ActivityIndicator color={colors.accentContrast} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.accentContrast} />
                  <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                    Create Return
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exchange Items Modal */}
      <Modal
        visible={showExchangeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExchangeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Replacement Item</Text>
              <TouchableOpacity onPress={() => {
                setShowExchangeModal(false);
                setProductSearchTerm('');
              }}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border, margin: spacing.md }]}>
              <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search products..."
                placeholderTextColor={colors.mutedForeground}
                value={productSearchTerm}
                onChangeText={setProductSearchTerm}
                autoFocus
              />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={[styles.productItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      handleAddExchangeItem(product);
                      setShowExchangeModal(false);
                      setProductSearchTerm('');
                    }}
                  >
                    <View style={styles.productItemLeft}>
                      <Text style={[styles.productItemName, { color: colors.foreground }]}>
                        {product.name}
                      </Text>
                      {product.sku && (
                        <Text style={[styles.productItemSku, { color: colors.mutedForeground }]}>
                          SKU: {product.sku}
                        </Text>
                      )}
                      <Text style={[styles.productItemPrice, { color: colors.accent }]}>
                        NLe {formatNumber(product.price)}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={colors.accent} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyProducts}>
                  <Text style={[styles.emptyProductsText, { color: colors.mutedForeground }]}>
                    No products found
                  </Text>
                </View>
              )}
            </ScrollView>
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
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
  emptyItemsContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  availableItemsContainer: {
    marginTop: spacing.md,
  },
  availableItemsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  availableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  availableItemLeft: {
    flex: 1,
  },
  availableItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  availableItemPrice: {
    fontSize: fontSize.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  itemSku: {
    fontSize: fontSize.xs,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    minWidth: 80,
    textAlign: 'right',
  },
  removeButton: {
    padding: spacing.xs,
  },
  refundMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  refundMethodOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  refundMethodText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  exchangeSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  exchangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  exchangeTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  addExchangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  addExchangeButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyExchangeText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  summaryRefund: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.base,
  },
  summaryValue: {
    fontSize: fontSize.base,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: spacing.sm,
  },
  exchangeLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  exchangeValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    minHeight: 100,
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
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalBody: {
    padding: spacing.md,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  productItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  productItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  productItemSku: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  productItemPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyProducts: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyProductsText: {
    fontSize: fontSize.sm,
  },
});

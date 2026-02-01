/**
 * New Debt Screen
 * Create a new debt record
 */

import React, { useEffect, useState, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DebtService } from '../services/debt.service';
import { DatabaseService } from '../services/database.service';
import { Customer, Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

export default function NewDebtScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
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
    } catch (error: any) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
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
    } catch (error: any) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', error?.message || 'Failed to create customer');
    }
  };

  const handleSubmit = async () => {
    if (!debtAmount || parseFloat(debtAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid debt amount');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    setSubmitting(true);
    try {
      await DebtService.createDebt({
        customerId: selectedCustomer,
        amount: parseFloat(debtAmount),
        description: description.trim() || null,
        items: null,
        saleId: null,
      });

      Alert.alert('Success', 'Debt created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Failed to create debt:', error);
      Alert.alert('Error', error.message || 'Failed to create debt');
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            disabled={submitting || !selectedCustomer || !debtAmount || parseFloat(debtAmount) <= 0}
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
});


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { InvoiceItem, Customer } from '../types';
import { InvoiceService } from '../services/invoice.service';
import { DatabaseService } from '../services/database.service';
import { createAndShareInvoicePDF } from '../services/invoice-generator';
import { getThemeColors, spacing, borderRadius, fontSize, fontWeight } from '../lib/theme';
import { SelectionModal } from '../components/ui/SelectionModal';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  style?: object;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  action?: React.ReactNode;
}

interface InvoiceEditorScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: unknown) => void;
  };
  route: {
    params?: {
      saleId?: string;
    };
  };
}

// --- Reusable Components (Matching Desktop) ---

const ChartCard = ({ title, children, headerActions, style }: ChartCardProps) => {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  return (
    <View style={[
      styles.chartCard, 
      { 
        backgroundColor: colors.card, 
        borderColor: colors.border 
      },
      style
    ]}>
      <View style={[styles.chartCardHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.chartCardTitle, { color: colors.foreground }]}>{title}</Text>
        {headerActions && <View>{headerActions}</View>}
      </View>
      <View style={styles.chartCardContent}>
        {children}
      </View>
    </View>
  );
};

const EmptyState = ({ title, description, icon, action }: EmptyStateProps) => {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
        <Ionicons name={icon || "document-text-outline"} size={24} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: colors.mutedForeground }]}>{description}</Text>
      {action && <View style={styles.emptyAction}>{action}</View>}
    </View>
  );
};

// --- Main Screen ---

export default function InvoiceEditorScreen({ navigation, route }: InvoiceEditorScreenProps) {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');
  const insets = useSafeAreaInsets();
  const saleId = route?.params?.saleId;

  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery'>('invoice');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data } = await DatabaseService.getCustomers();
      if (data) {
        setCustomers(data.filter(c => c.isActive !== false));
      }
    } catch (error) {

    }
  };

  const addItem = () => {
    if (!newItemDesc || !newItemRate) {
      Alert.alert('Error', 'Please enter description and rate');
      return;
    }
    const rate = parseFloat(newItemRate);
    const qty = parseFloat(newItemQty) || 1;

    if (isNaN(rate)) return;

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: newItemDesc,
      quantity: qty,
      rate: rate,
      amount: rate * qty,
    };

    setItems([...items, newItem]);
    setNewItemDesc('');
    setNewItemQty('1');
    setNewItemRate('');
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleSaveInvoice = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please select or enter a customer name');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    setSaving(true);
    try {
      const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
      const tax = subtotal * 0.15;
      const total = subtotal + tax;

      const invoice = await InvoiceService.createInvoice({
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerPhone: customerPhone.trim() || null,
        customerAddress: customerAddress.trim() || null,
        items,
        subtotal,
        tax,
        discount: 0,
        total,
        paidAmount: 0,
        status: 'draft',
        invoiceType,
        currency: 'NLe',
        dueDate: dueDate.trim() || null,
        notes: notes.trim() || null,
        saleId: saleId || null,
      });

      Alert.alert('Success', `Invoice ${invoice.number} created successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!customerName || items.length === 0) {
      Alert.alert('Error', 'Please add customer name and at least one item');
      return;
    }

    setLoading(true);
    try {
      const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
      const tax = subtotal * 0.15;
      const total = subtotal + tax;

      await createAndShareInvoicePDF({
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        date: new Date().toLocaleDateString(),
        dueDate: dueDate || new Date(Date.now() + 86400000 * 30).toLocaleDateString(),
        customer: {
          name: customerName,
          address: customerAddress || 'Freetown, Sierra Leone',
        },
        items,
        subtotal,
        tax,
        discount: 0,
        total,
        currency: 'NLe',
      });
    } catch (error: unknown) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerEmail(customer.email || '');
    setCustomerPhone(customer.phone || '');
    setCustomerAddress([
      customer.address,
      customer.city,
      customer.state,
      customer.zip,
      customer.country,
    ].filter(Boolean).join(', '));
    setShowCustomerModal(false);
  };

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Create Invoice</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={generatePDF} disabled={loading || saving} style={styles.headerButton}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="print-outline" size={24} color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
        {/* Customer Details Card */}
        <ChartCard title="Customer Details">
          <TouchableOpacity
            style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}
            onPress={() => setShowCustomerModal(true)}
          >
            <Text style={[styles.selectText, { color: customerName ? colors.foreground : colors.mutedForeground }]}>
              {customerName || 'Select Customer'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          {customerName && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Email (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Phone (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Address (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={customerAddress}
                onChangeText={setCustomerAddress}
                multiline
              />
            </>
          )}
        </ChartCard>

        {/* Invoice Settings */}
        <ChartCard title="Invoice Settings">
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
              <TouchableOpacity
                style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={() => setShowTypeModal(true)}
              >
                <Text style={[styles.selectText, { color: colors.foreground }]}>
                  {invoiceType.charAt(0).toUpperCase() + invoiceType.slice(1).replace('_', ' ')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.halfInput}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Due Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </ChartCard>

        {/* Invoice Items Card */}
        <ChartCard 
          title="Invoice Items"
          headerActions={
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {items.length} items
            </Text>
          }
        >
          {items.length === 0 ? (
            <EmptyState 
              title="No items added" 
              description="Add products or services to this invoice."
              icon="cart-outline"
            />
          ) : (
            <View style={styles.itemList}>
              {items.map((item) => (
                <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemDesc, { color: colors.foreground }]}>{item.description}</Text>
                    <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                      {item.quantity} x {item.rate.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Text style={[styles.itemAmount, { color: colors.foreground }]}>
                      {item.amount.toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ChartCard>

        {/* Add Item Card */}
        <ChartCard title="Add New Item">
          <View style={styles.addItemForm}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.input, 
                borderColor: colors.border, 
                color: colors.foreground 
              }]}
              placeholder="Description"
              placeholderTextColor={colors.mutedForeground}
              value={newItemDesc}
              onChangeText={setNewItemDesc}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput, { 
                  backgroundColor: colors.input, 
                  borderColor: colors.border, 
                  color: colors.foreground 
                }]}
                placeholder="Qty"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={newItemQty}
                onChangeText={setNewItemQty}
              />
              <TextInput
                style={[styles.input, styles.halfInput, { 
                  backgroundColor: colors.input, 
                  borderColor: colors.border, 
                  color: colors.foreground 
                }]}
                placeholder="Rate"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
                value={newItemRate}
                onChangeText={setNewItemRate}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.accent }]}
              onPress={addItem}
            >
              <Text style={styles.buttonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </ChartCard>

        {/* Summary Card */}
        <ChartCard title="Summary">
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal:</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>NLe {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax (15%):</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>NLe {tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLabel, styles.totalLabel, { color: colors.foreground }]}>Total:</Text>
            <Text style={[styles.summaryValue, styles.totalValue, { color: colors.accent }]}>NLe {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </ChartCard>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
          onPress={handleSaveInvoice}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.saveButtonText}>Save Invoice</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={showCustomerModal}
        title="Select Customer"
        options={customers.map(c => ({ label: c.name, value: c.id }))}
        selectedValue={customerId || undefined}
        onSelect={(value) => {
          const customer = customers.find(c => c.id === value);
          if (customer) handleCustomerSelect(customer);
        }}
        onClose={() => setShowCustomerModal(false)}
      />

      <SelectionModal
        visible={showTypeModal}
        title="Invoice Type"
        options={[
          { label: 'Invoice', value: 'invoice' },
          { label: 'Proforma', value: 'proforma' },
          { label: 'Quote', value: 'quote' },
          { label: 'Credit Note', value: 'credit_note' },
          { label: 'Delivery Note', value: 'delivery' },
        ]}
        selectedValue={invoiceType}
        onSelect={(value) => {
          setInvoiceType(value as 'invoice' | 'proforma' | 'quote' | 'credit_note' | 'delivery');
          setShowTypeModal(false);
        }}
        onClose={() => setShowTypeModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  backButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: 4,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  selectText: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  totalRow: {
    borderTopWidth: 1,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  totalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  saveButtonText: {
    color: 'white',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  
  // ChartCard Styles
  chartCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chartCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  chartCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  chartCardContent: {
    padding: spacing.lg,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.md,
  },

  // Form Elements
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  button: {
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },

  // Items List
  itemList: {
    gap: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemDesc: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  itemSub: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemAmount: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  removeButton: {
    padding: 4,
  },
  addItemForm: {
    gap: 0,
  }
});

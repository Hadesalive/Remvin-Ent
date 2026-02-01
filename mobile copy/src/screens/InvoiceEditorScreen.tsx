import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { InvoiceItem } from '../types';
import { createAndShareInvoicePDF } from '../services/invoice-generator';
import { getThemeColors, spacing, borderRadius, fontSize, fontWeight } from '../lib/theme';

// --- Reusable Components (Matching Desktop) ---

const ChartCard = ({ title, children, headerActions, style }: any) => {
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

const EmptyState = ({ title, description, icon, action }: any) => {
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

export default function InvoiceEditorScreen({ navigation }: any) {
  const colorScheme = useColorScheme();
  const colors = getThemeColors(colorScheme === 'dark');

  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemRate, setNewItemRate] = useState('');
  const [loading, setLoading] = useState(false);

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
        dueDate: new Date(Date.now() + 86400000 * 30).toLocaleDateString(),
        customer: {
          name: customerName,
          address: 'Freetown, Sierra Leone',
        },
        items,
        subtotal,
        tax,
        discount: 0,
        total,
        currency: 'NLe',
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Create Invoice</Text>
        <TouchableOpacity onPress={generatePDF} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="print-outline" size={24} color={colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Customer Details Card */}
        <ChartCard title="Customer Details">
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.input, 
              borderColor: colors.border, 
              color: colors.foreground 
            }]}
            placeholder="Client Name / Company"
            placeholderTextColor={colors.mutedForeground}
            value={customerName}
            onChangeText={setCustomerName}
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
        
        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
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

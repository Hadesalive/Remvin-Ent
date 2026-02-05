/**
 * Customer Detail Screen
 * Clean design matching SaleDetailScreen pattern
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { SalesService } from '../services/sales.service';
import { Customer, Sale } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

interface CustomerDetailScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: { customerId?: string; saleId?: string }) => void;
  };
  route: {
    params: {
      customerId: string;
    };
  };
}

export default function CustomerDetailScreen({ navigation, route }: CustomerDetailScreenProps) {
  const { colors, isDark } = useTheme();
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, lastOrderDate: null as string | null });
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [addingCredit, setAddingCredit] = useState(false);

  const loadCustomer = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getCustomerById(customerId);
      if (error || !data) {
        Alert.alert('Error', 'Customer not found');
        navigation.goBack();
        return;
      }
      setCustomer(data);
    } catch (error: unknown) {
      Alert.alert('Error', 'Failed to load customer');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [customerId, navigation]);

  const loadCustomerSales = useCallback(async () => {
    try {
      setLoadingSales(true);
      const sales = await SalesService.getSales();
      const customerSalesData = sales.filter(sale => sale.customerId === customerId);
      setCustomerSales(customerSalesData);

      const totalOrders = customerSalesData.length;
      const totalSpent = customerSalesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const lastOrderDate = customerSalesData.length > 0
        ? customerSalesData.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          })[0].createdAt || null
        : null;

      setStats({ totalOrders, totalSpent, lastOrderDate });
    } catch (error: unknown) {
    } finally {
      setLoadingSales(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadCustomer();
    void loadCustomerSales();
  }, [loadCustomer, loadCustomerSales]);

  const handleAddCredit = async () => {
    const amount = parseFloat(creditAmount);
    if (!creditAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid credit amount greater than 0');
      return;
    }

    if (!customer) return;

    setAddingCredit(true);
    try {
      const currentCredit = customer.storeCredit || 0;
      const newCredit = currentCredit + amount;

      const result = await DatabaseService.updateCustomer(customerId, {
        storeCredit: newCredit,
      });

      if (result.error) {
        Alert.alert('Error', result.error.message || 'Failed to add credit');
        return;
      }

      await loadCustomer();
      setShowCreditModal(false);
      setCreditAmount('');
      setCreditReason('');
      Alert.alert('Success', `Added NLe ${formatNumber(amount)} credit. New balance: NLe ${formatNumber(newCredit)}`);
    } catch (error: unknown) {
      Alert.alert('Error', 'Failed to add credit');
    } finally {
      setAddingCredit(false);
    }
  };

  const handleEdit = () => {
    if (!customer) return;
    navigation.navigate('NewCustomer', { customerId: customer.id });
  };

  const handleDelete = () => {
    if (!customer) return;

    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await DatabaseService.deleteCustomer(customerId);
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete customer');
                return;
              }
              Alert.alert('Success', 'Customer deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete customer. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading customer...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="person-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Customer not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.accentContrast }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentCredit = customer.storeCredit || 0;
  const newBalance = creditAmount && !isNaN(parseFloat(creditAmount)) && parseFloat(creditAmount) > 0
    ? currentCredit + parseFloat(creditAmount)
    : currentCredit;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Header
        title="Customer Details"
        subtitle={customer.id.substring(0, 8).toUpperCase()}
        showBackButton
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil',
            onPress: handleEdit,
            color: colors.accent,
            disabled: deleting,
            accessibilityLabel: 'Edit customer',
          },
          {
            icon: 'trash-outline',
            onPress: handleDelete,
            color: colors.destructive || '#EF4444',
            disabled: deleting,
            loading: deleting,
            accessibilityLabel: 'Delete customer',
          },
        ]}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Card */}
        <LinearGradient
          colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientContent}>
            <View style={styles.gradientLeft}>
              <View style={styles.gradientIcon}>
                <Ionicons name="person" size={28} color="white" />
              </View>
              <View style={styles.gradientText}>
                <Text style={styles.gradientLabel}>Total Spent</Text>
                <Text style={styles.gradientValue}>NLe {formatNumber(stats.totalSpent)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadgeGradient,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={styles.statusTextGradient}>
                {stats.totalOrders} {stats.totalOrders === 1 ? 'Order' : 'Orders'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Store Credit Card */}
        <View style={[styles.creditCard, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
          <View style={styles.creditCardHeader}>
            <View style={styles.creditCardHeaderLeft}>
              <View style={[styles.creditIconContainer, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="wallet" size={20} color={colors.success} />
              </View>
              <View>
                <Text style={[styles.creditCardTitle, { color: colors.foreground }]}>Store Credit</Text>
                <Text style={[styles.creditCardSubtitle, { color: colors.mutedForeground }]}>Available balance</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.addCreditButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowCreditModal(true)}
            >
              <Ionicons name="add" size={18} color={colors.accentContrast} />
              <Text style={[styles.addCreditButtonText, { color: colors.accentContrast }]}>Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.creditAmountContainer}>
            <Text style={[styles.creditAmount, { color: colors.success }]}>
              NLe {formatNumber(currentCredit)}
            </Text>
          </View>
        </View>

        {/* Customer Information Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Information</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Name</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {customer.name}
            </Text>
          </View>

          {customer.company && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="business-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Company</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.company}
              </Text>
            </View>
          )}

          {customer.email && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.email}
              </Text>
            </View>
          )}

          {customer.phone && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="call-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Phone</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.phone}
              </Text>
            </View>
          )}

          {customer.address && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Address</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground, flexShrink: 1, textAlign: 'right' }]}>
                {customer.address}
                {customer.city && `, ${customer.city}`}
                {customer.state && `, ${customer.state}`}
                {customer.zip && ` ${customer.zip}`}
              </Text>
            </View>
          )}

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="stats-chart-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Total Orders</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {stats.totalOrders}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="cash-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Total Spent</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              NLe {formatNumber(stats.totalSpent)}
            </Text>
          </View>

          {stats.lastOrderDate && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last Order</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(stats.lastOrderDate)}
              </Text>
            </View>
          )}

          {customer.notes && (
            <>
              <View style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: customer.notes ? 1 : 0 }]}>
                <View style={styles.infoRowLeft}>
                  <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Notes</Text>
                </View>
              </View>
              {customer.notes && (
                <Text style={[styles.notesText, { color: colors.foreground }]}>{customer.notes}</Text>
              )}
            </>
          )}
        </View>

        {/* Sales History Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="receipt-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Sales History ({customerSales.length})
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.newSaleButton, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('NewSale', { customerId: customer.id })}
            >
              <Ionicons name="add" size={16} color={colors.accentContrast} />
              <Text style={[styles.newSaleButtonText, { color: colors.accentContrast }]}>New Sale</Text>
            </TouchableOpacity>
          </View>

          {loadingSales ? (
            <View style={styles.loadingSalesContainer}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.loadingSalesText, { color: colors.mutedForeground }]}>Loading sales...</Text>
            </View>
          ) : customerSales.length === 0 ? (
            <View style={styles.emptySalesContainer}>
              <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptySalesText, { color: colors.mutedForeground }]}>No sales yet</Text>
            </View>
          ) : (
            customerSales.map((sale, index) => {
              return (
                <TouchableOpacity
                  key={sale.id}
                  style={[
                    styles.saleItem,
                    index < customerSales.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                  ]}
                  onPress={() => navigation.navigate('SaleDetail', { saleId: sale.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.saleItemLeft}>
                    <Text style={[styles.saleId, { color: colors.foreground }]}>
                      #{sale.id.substring(0, 8)}
                    </Text>
                    <Text style={[styles.saleDate, { color: colors.mutedForeground }]}>
                      {formatDate(sale.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.saleItemRight}>
                    <Text style={[styles.saleTotal, { color: colors.foreground }]}>
                      NLe {formatNumber(sale.total)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Metadata Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Metadata</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: (customer.isActive !== false ? colors.success : colors.mutedForeground) + '15' }]}>
              <Text style={[styles.statusText, { color: customer.isActive !== false ? colors.success : colors.mutedForeground }]}>
                {customer.isActive !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {customer.createdAt && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Created</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(customer.createdAt)}
              </Text>
            </View>
          )}

          {customer.updatedAt && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(customer.updatedAt)}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Credit Modal */}
      <Modal
        visible={showCreditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="wallet" size={24} color={colors.success} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Store Credit</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    {customer.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCreditModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalInfo}>
                <Text style={[styles.modalInfoText, { color: colors.mutedForeground }]}>
                  Current Balance: <Text style={{ color: colors.foreground, fontWeight: fontWeight.semibold }}>
                    NLe {formatNumber(currentCredit)}
                  </Text>
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Credit Amount *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={creditAmount}
                  onChangeText={setCreditAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Reason (Optional)</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={creditReason}
                  onChangeText={setCreditReason}
                  placeholder="e.g., Return refund, Customer service, Promotion"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {creditAmount && !isNaN(parseFloat(creditAmount)) && parseFloat(creditAmount) > 0 && (
                <View style={[styles.previewCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                  <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                    New Balance: <Text style={{ color: colors.success, fontWeight: fontWeight.bold }}>
                      NLe {formatNumber(newBalance)}
                    </Text>
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowCreditModal(false);
                  setCreditAmount('');
                  setCreditReason('');
                }}
                disabled={addingCredit}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.success }]}
                onPress={handleAddCredit}
                disabled={addingCredit || !creditAmount || parseFloat(creditAmount) <= 0}
              >
                {addingCredit ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Add Credit</Text>
                )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl * 2,
  },
  emptyText: {
    fontSize: fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  gradientCard: {
    borderRadius: 16,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  gradientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  gradientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gradientIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  gradientText: {
    flex: 1,
  },
  gradientLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  gradientValue: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -1,
  },
  statusBadgeGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusTextGradient: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: 'white',
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
  creditCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  creditCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  creditIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditCardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  creditCardSubtitle: {
    fontSize: fontSize.xs,
  },
  creditAmountContainer: {
    alignItems: 'flex-start',
  },
  creditAmount: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  addCreditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addCreditButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    flexShrink: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  notesText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  newSaleButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  loadingSalesContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingSalesText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
  },
  emptySalesContainer: {
    padding: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptySalesText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  saleItemLeft: {
    flex: 1,
  },
  saleId: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  saleDate: {
    fontSize: fontSize.xs,
  },
  saleItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  saleTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
  modalInfo: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
  },
  modalInfoText: {
    fontSize: fontSize.sm,
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
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    minHeight: 80,
  },
  previewCard: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  previewText: {
    fontSize: fontSize.sm,
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
    color: 'white',
  },
});

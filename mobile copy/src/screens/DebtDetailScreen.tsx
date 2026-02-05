/**
 * Debt Detail Screen
 * View debt details and manage payments
 */

import React, { useEffect, useState } from 'react';
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
import { DebtService } from '../services/debt.service';
import { DatabaseService } from '../services/database.service';
import { Debt, DebtPayment, Customer } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy hh:mm a');
  } catch {
    return 'N/A';
  }
}

export default function DebtDetailScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { debtId } = route.params;
  const [debt, setDebt] = useState<Debt | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'other'>('cash');
  const [addingPayment, setAddingPayment] = useState(false);

  useEffect(() => {
    loadDebt();
  }, [debtId]);

  const loadDebt = async () => {
    try {
      setLoading(true);
      const [debtData, paymentsData] = await Promise.all([
        DebtService.getDebtById(debtId),
        DebtService.getDebtPayments(debtId),
      ]);

      if (!debtData) {
        Alert.alert('Error', 'Debt not found');
        navigation.goBack();
        return;
      }

      setDebt(debtData);
      setPayments(paymentsData);

      // Load customer if exists
      if (debtData.customerId) {
        const { data: customerData } = await DatabaseService.getCustomerById(debtData.customerId);
        if (customerData) {
          setCustomer(customerData);
        }
      }
    } catch (error: any) {

      Alert.alert('Error', 'Failed to load debt');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    if (!debt) return;

    const balance = debt.amount - debt.paid;
    if (amount > balance) {
      Alert.alert('Error', `Payment cannot exceed balance of NLe ${formatNumber(balance)}`);
      return;
    }

    setAddingPayment(true);
    try {
      await DebtService.addDebtPayment({
        debtId: debt.id,
        amount,
        method: paymentMethod,
      });

      await loadDebt();
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      Alert.alert('Success', 'Payment recorded successfully');
    } catch (error: any) {

      Alert.alert('Error', error.message || 'Failed to record payment');
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDelete = () => {
    if (!debt) return;

    Alert.alert(
      'Delete Debt',
      'Are you sure you want to delete this debt? This action cannot be undone.',
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
              await DebtService.deleteDebt(debtId);
              Alert.alert('Success', 'Debt deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {

              Alert.alert('Error', 'Failed to delete debt. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading debt...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!debt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Debt not found</Text>
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

  const balance = debt.amount - debt.paid;
  const paidPercent = debt.amount > 0 ? (debt.paid / debt.amount) * 100 : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Header
        title="Debt Details"
        subtitle={debt.id.substring(0, 8).toUpperCase()}
        showBackButton
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'trash-outline',
            onPress: handleDelete,
            color: colors.destructive || '#EF4444',
            disabled: deleting,
            loading: deleting,
            accessibilityLabel: 'Delete debt',
          },
        ]}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Balance Card */}
        <LinearGradient
          colors={isDark ? ['#DC2626', '#EF4444'] : ['#EF4444', '#F87171']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientContent}>
            <View style={styles.gradientLeft}>
              <View style={styles.gradientIcon}>
                <Ionicons name="receipt" size={28} color="white" />
              </View>
              <View style={styles.gradientText}>
                <Text style={styles.gradientLabel}>Balance Owed</Text>
                <Text style={styles.gradientValue}>NLe {formatNumber(balance)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadgeGradient,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={styles.statusTextGradient}>
                {debt.status === 'paid' ? 'Paid' : 'Active'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Debt Information Card */}
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
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {customer?.name || 'Unknown Customer'}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(debt.createdAt)}
            </Text>
          </View>

          {debt.description && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Description</Text>
              </View>
            </View>
          )}
        </View>

        {debt.description && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.descriptionText, { color: colors.foreground }]}>
              {debt.description}
            </Text>
          </View>
        )}

        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calculator-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Summary</Text>
            </View>
          </View>

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              NLe {formatNumber(debt.amount)}
            </Text>
          </View>

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Amount Paid</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>
              NLe {formatNumber(debt.paid)}
            </Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Balance</Text>
            <Text style={[styles.grandTotalValue, { color: colors.destructive }]}>
              NLe {formatNumber(balance)}
            </Text>
          </View>

          {debt.amount > 0 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${paidPercent}%`,
                      backgroundColor: colors.success,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                {paidPercent.toFixed(0)}% paid
              </Text>
            </View>
          )}
        </View>

        {/* Payment History Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cash-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Payment History ({payments.length})
              </Text>
            </View>
            {debt.status === 'active' && balance > 0 && (
              <TouchableOpacity
                style={[styles.addPaymentButton, { backgroundColor: colors.accent }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <Ionicons name="add" size={16} color={colors.accentContrast} />
                <Text style={[styles.addPaymentButtonText, { color: colors.accentContrast }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyPaymentsContainer}>
              <Ionicons name="cash-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyPaymentsText, { color: colors.mutedForeground }]}>
                No payments yet
              </Text>
            </View>
          ) : (
            payments.map((payment, index) => (
              <View
                key={payment.id}
                style={[
                  styles.paymentRow,
                  index < payments.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                ]}
              >
                <View style={styles.paymentRowLeft}>
                  <View style={[styles.paymentIconContainer, { backgroundColor: colors.success + '15' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, { color: colors.foreground }]}>
                      NLe {formatNumber(payment.amount)}
                    </Text>
                    <Text style={[styles.paymentDate, { color: colors.mutedForeground }]}>
                      {formatDate(payment.date)}
                    </Text>
                  </View>
                </View>
                {payment.method && (
                  <View style={[styles.paymentMethodBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.paymentMethodText, { color: colors.mutedForeground }]}>
                      {payment.method.charAt(0).toUpperCase() + payment.method.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
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
                  <Ionicons name="cash" size={24} color={colors.success} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Payment</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                    Balance: NLe {formatNumber(balance)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Payment Amount *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Payment Method</Text>
                <View style={styles.paymentMethodGrid}>
                  {['cash', 'card', 'bank_transfer', 'other'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodButton,
                        {
                          backgroundColor: paymentMethod === method ? colors.accent : colors.muted,
                          borderColor: paymentMethod === method ? colors.accent : colors.border,
                        },
                      ]}
                      onPress={() => setPaymentMethod(method as any)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.paymentMethodButtonText,
                          {
                            color: paymentMethod === method ? colors.accentContrast : colors.foreground,
                          },
                        ]}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {paymentAmount && !isNaN(parseFloat(paymentAmount)) && parseFloat(paymentAmount) > 0 && (
                <View style={[styles.previewCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
                  <Text style={[styles.previewText, { color: colors.mutedForeground }]}>
                    New Balance: <Text style={{ color: colors.success, fontWeight: fontWeight.bold }}>
                      NLe {formatNumber(Math.max(0, balance - parseFloat(paymentAmount)))}
                    </Text>
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowPaymentModal(false);
                  setPaymentAmount('');
                  setPaymentMethod('cash');
                }}
                disabled={addingPayment}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.success }]}
                onPress={handleAddPayment}
                disabled={addingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                {addingPayment ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Record Payment</Text>
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
  descriptionText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  totalLabel: {
    fontSize: fontSize.sm,
  },
  totalValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  grandTotalRow: {
    borderBottomWidth: 0,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  grandTotalLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  grandTotalValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  progressContainer: {
    marginTop: spacing.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.xs,
    textAlign: 'right',
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  addPaymentButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  emptyPaymentsContainer: {
    padding: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyPaymentsText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  paymentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: fontSize.xs,
  },
  paymentMethodBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  paymentMethodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
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


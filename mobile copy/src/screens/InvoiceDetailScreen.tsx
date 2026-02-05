/**
 * Invoice Detail Screen
 * View invoice details
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { InvoiceService } from '../services/invoice.service';
import { Invoice, InvoiceItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

function parseInvoiceItems(items: string): InvoiceItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'N/A';
  }
}

function getStatusColor(status: string, colors: ThemeColors): string {
  switch (status) {
    case 'paid':
      return '#10B981';
    case 'sent':
      return '#3B82F6';
    case 'overdue':
      return '#EF4444';
    case 'draft':
      return colors.mutedForeground;
    case 'cancelled':
      return '#6B7280';
    default:
      return colors.mutedForeground;
  }
}

interface InvoiceDetailScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: { invoiceId?: string }) => void;
  };
  route: {
    params: {
      invoiceId: string;
    };
  };
}

export default function InvoiceDetailScreen({ navigation, route }: InvoiceDetailScreenProps) {
  const { colors, isDark } = useTheme();
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadInvoice = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await InvoiceService.getInvoiceById(invoiceId);
      if (!data) {
        Alert.alert('Error', 'Invoice not found');
        navigation.goBack();
        return;
      }
      setInvoice(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load invoice';

      Alert.alert('Error', errorMessage);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [invoiceId, navigation]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  const handleDelete = () => {
    if (!invoice) return;

    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${invoice.number}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await InvoiceService.deleteInvoice(invoiceId);
              Alert.alert('Success', 'Invoice deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice';
              Alert.alert('Error', errorMessage);
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading invoice...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return null;
  }

  const items = parseInvoiceItems(invoice.items) || [];
  const statusColor = getStatusColor(invoice.status, colors);
  const balance = invoice.total - (invoice.paidAmount || 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Invoice Details"
        subtitle={invoice.number}
        showBackButton
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'trash-outline',
            onPress: handleDelete,
            color: '#EF4444',
            disabled: deleting,
            loading: deleting,
            accessibilityLabel: 'Delete invoice',
          },
        ]}
        useSafeArea={false}
        showBorder={false}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Amount Card */}
        <LinearGradient
          colors={isDark ? ['#3B82F6', '#2563EB'] : ['#3B82F6', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientContent}>
            <View style={styles.gradientLeft}>
              <View style={styles.gradientIcon}>
                <Ionicons name="document-text" size={28} color="white" />
              </View>
              <View style={styles.gradientText}>
                <Text style={styles.gradientLabel}>Total Amount</Text>
                <Text style={styles.gradientValue}>
                  {invoice.currency || 'NLe'} {formatNumber(invoice.total)}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
              <Text style={styles.statusTextWhite}>{invoice.status.toUpperCase()}</Text>
            </View>
          </View>
          {balance > 0 && invoice.status !== 'paid' && (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance Due:</Text>
              <Text style={styles.balanceValue}>
                {invoice.currency || 'NLe'} {formatNumber(balance)}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Customer Information */}
        {invoice.customerName && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Customer</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>{invoice.customerName}</Text>
            {invoice.customerEmail && (
              <Text style={[styles.cardSubValue, { color: colors.mutedForeground }]}>
                {invoice.customerEmail}
              </Text>
            )}
            {invoice.customerPhone && (
              <Text style={[styles.cardSubValue, { color: colors.mutedForeground }]}>
                {invoice.customerPhone}
              </Text>
            )}
            {invoice.customerAddress && (
              <Text style={[styles.cardSubValue, { color: colors.mutedForeground }]}>
                {invoice.customerAddress}
              </Text>
            )}
          </View>
        )}

        {/* Invoice Information */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Invoice Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Invoice Number:</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{invoice.number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Type:</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {invoice.invoiceType.charAt(0).toUpperCase() + invoice.invoiceType.slice(1).replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date:</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(invoice.createdAt)}
            </Text>
          </View>
          {invoice.dueDate && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Due Date:</Text>
              <Text style={[styles.infoValue, { color: invoice.status === 'overdue' ? '#EF4444' : colors.foreground }]}>
                {formatDate(invoice.dueDate)}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status:</Text>
            <View style={[styles.statusBadgeSmall, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusTextSmall, { color: statusColor }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="list-outline" size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Items ({items?.length || 0})</Text>
          </View>
          {(items && Array.isArray(items) && items.length > 0) ? items.map((item, index) => (
            <View key={item.id || index} style={[styles.itemRow, index < (items?.length || 0) - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: spacing.sm, marginBottom: spacing.sm }]}>
              <View style={styles.itemLeft}>
                <Text style={[styles.itemDescription, { color: colors.foreground }]}>
                  {item.description}
                </Text>
                <Text style={[styles.itemDetails, { color: colors.mutedForeground }]}>
                  {item.quantity} x {invoice.currency || 'NLe'} {formatNumber(item.rate)}
                </Text>
              </View>
              <Text style={[styles.itemAmount, { color: colors.foreground }]}>
                {invoice.currency || 'NLe'} {formatNumber(item.amount)}
              </Text>
            </View>
          )) : (
            <View style={styles.emptyItemsContainer}>
              <Text style={[styles.emptyItemsText, { color: colors.mutedForeground }]}>No items</Text>
            </View>
          )}
        </View>

        {/* Summary */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="calculator-outline" size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Summary</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal:</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {invoice.currency || 'NLe'} {formatNumber(invoice.subtotal)}
            </Text>
          </View>
          {invoice.tax > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax:</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {invoice.currency || 'NLe'} {formatNumber(invoice.tax)}
              </Text>
            </View>
          )}
          {invoice.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Discount:</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                -{invoice.currency || 'NLe'} {formatNumber(invoice.discount)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.summaryLabel, styles.totalLabel, { color: colors.foreground }]}>Total:</Text>
            <Text style={[styles.summaryValue, styles.totalValue, { color: colors.accent }]}>
              {invoice.currency || 'NLe'} {formatNumber(invoice.total)}
            </Text>
          </View>
          {invoice.paidAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Paid:</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {invoice.currency || 'NLe'} {formatNumber(invoice.paidAmount)}
              </Text>
            </View>
          )}
          {balance > 0 && invoice.status !== 'paid' && (
            <View style={[styles.summaryRow, { marginTop: spacing.sm }]}>
              <Text style={[styles.summaryLabel, { color: '#EF4444' }]}>Balance Due:</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444', fontWeight: fontWeight.bold }]}>
                {invoice.currency || 'NLe'} {formatNumber(balance)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{invoice.notes}</Text>
          </View>
        )}
      </ScrollView>
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  gradientCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  gradientText: {
    flex: 1,
  },
  gradientLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  gradientValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusTextWhite: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  card: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  cardValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  cardSubValue: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  statusBadgeSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusTextSmall: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemDescription: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  itemDetails: {
    fontSize: fontSize.sm,
  },
  itemAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  notesText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  emptyItemsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: fontSize.sm,
  },
});

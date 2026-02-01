/**
 * Sale Detail Screen
 * View and edit individual sale details
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { SalesService } from '../services/sales.service';
import { Sale, SaleItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';

/**
 * Safely parse sale items
 */
function parseSaleItems(items: string): SaleItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return [];
    // Ensure all numeric fields are properly set
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

/**
 * Safely format a number for display
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

export default function SaleDetailScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { saleId } = route.params;
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSale();
  }, [saleId]);

  const loadSale = async () => {
    try {
      setLoading(true);
      const data = await SalesService.getSaleById(saleId);
      setSale(data);
    } catch (error: any) {
      console.error('Failed to load sale:', error);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!sale) return;
    // Navigate to NewSaleScreen with edit mode
    navigation.navigate('NewSale', { saleId: sale.id, saleData: sale });
  };

  const handleDelete = () => {
    if (!sale) return;

    Alert.alert(
      'Delete Sale',
      'Are you sure you want to delete this sale? This action cannot be undone.',
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
              await SalesService.deleteSale(saleId);
              Alert.alert('Success', 'Sale deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              console.error('Failed to delete sale:', error);
              Alert.alert('Error', 'Failed to delete sale. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'refunded':
        return '#6B7280';
      default:
        return colors.mutedForeground;
    }
  };

  const formatDate = (dateString?: string) => {
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
            Loading sale...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Sale not found
          </Text>
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

  const items = parseSaleItems(sale.items);

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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sale Details</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {sale.id.substring(0, 8).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.actionButton, { backgroundColor: colors.accent + '15' }]}
            disabled={deleting}
          >
            <Ionicons name="pencil" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: '#EF4444' + '15' }]}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Total Card */}
        <LinearGradient
          colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
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
                <Text style={styles.gradientLabel}>Total Amount</Text>
                <Text style={styles.gradientValue}>NLe {formatNumber(sale.total)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadgeGradient,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={styles.statusTextGradient}>
                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sale Info Card */}
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
              {sale.customerName || 'Walk-in Customer'}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(sale.createdAt)}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="card-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Payment</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1).replace('_', ' ')}
            </Text>
          </View>

          {sale.invoiceNumber && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Invoice</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {sale.invoiceNumber}
              </Text>
            </View>
          )}

          {sale.cashierName && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="person-circle-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Cashier</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {sale.cashierName}
              </Text>
            </View>
          )}
        </View>

        {/* Items Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Items ({items.length})
              </Text>
            </View>
          </View>

          {items.map((item, index) => (
            <View 
              key={item.id || index} 
              style={[
                styles.itemRow,
                index < items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>
                  {item.productName}
                </Text>
                {item.sku && (
                  <Text style={[styles.itemSku, { color: colors.mutedForeground }]}>
                    IMEI/Serial: {item.sku}
                  </Text>
                )}
              </View>
              <View style={styles.itemRight}>
                <View style={styles.itemQuantity}>
                  <Text style={[styles.itemQuantityText, { color: colors.mutedForeground }]}>
                    {item.quantity}x
                  </Text>
                </View>
                <View style={styles.itemPrice}>
                  <Text style={[styles.itemPriceText, { color: colors.foreground }]}>
                    NLe {formatNumber(item.total)}
                  </Text>
                  <Text style={[styles.itemUnitPrice, { color: colors.mutedForeground }]}>
                    @ NLe {formatNumber(item.price)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calculator-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Summary</Text>
            </View>
          </View>

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              NLe {formatNumber(sale.subtotal)}
            </Text>
          </View>

          {(sale.discount || 0) > 0 && (
            <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                -NLe {formatNumber(sale.discount)}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              NLe {formatNumber(sale.tax)}
            </Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.accent }]}>
              NLe {formatNumber(sale.total)}
            </Text>
          </View>
        </View>

        {sale.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
              </View>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{sale.notes}</Text>
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  gradientCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradientLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gradientIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientText: {
    flex: 1,
  },
  gradientLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  gradientValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -0.5,
  },
  statusBadgeGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusTextGradient: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'white',
    textTransform: 'capitalize',
  },
  card: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.base,
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  itemSku: {
    fontSize: fontSize.xs,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemQuantity: {
    justifyContent: 'center',
  },
  itemQuantityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  itemPrice: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  itemPriceText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  itemUnitPrice: {
    fontSize: fontSize.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.base,
  },
  totalValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  grandTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  notesText: {
    fontSize: fontSize.base,
    lineHeight: 22,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});


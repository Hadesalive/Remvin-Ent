/**
 * Return Detail Screen
 * View and manage individual return details
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { ReturnsService } from '../services/returns.service';
import { Return, SaleItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { getThemeColors } from '../lib/theme';
import { format } from 'date-fns';

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
    return format(date, 'MMM dd, yyyy • h:mm a');
  } catch {
    return 'N/A';
  }
}

interface ParsedItem {
  id?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  total?: number;
  sku?: string;
}

function parseReturnItems(items: string): SaleItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: ParsedItem) => ({
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

type ThemeColors = ReturnType<typeof getThemeColors>;

function getStatusColor(status: string, colors: ThemeColors): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'approved':
      return '#10B981';
    case 'rejected':
      return colors.destructive;
    case 'pending':
    default:
      return '#F59E0B';
  }
}

function getRefundMethodLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'store_credit':
      return 'Store Credit';
    case 'original_payment':
      return 'Original Payment';
    case 'exchange':
      return 'Exchange';
    default:
      return method;
  }
}

interface ReturnDetailScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      returnId: string;
    };
  };
}

export default function ReturnDetailScreen({ navigation, route }: ReturnDetailScreenProps) {
  const { colors, isDark } = useTheme();
  const { returnId } = route.params;
  const [returnData, setReturnData] = useState<Return | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadReturn = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ReturnsService.getReturnById(returnId);
      if (!data) {
        Alert.alert('Error', 'Return not found', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      setReturnData(data);
    } catch (error: unknown) {

      Alert.alert('Error', 'Failed to load return');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [returnId, navigation]);

  useEffect(() => {
    loadReturn();
  }, [loadReturn]);

  const handleStatusUpdate = async (newStatus: 'approved' | 'rejected' | 'completed') => {
    setUpdating(true);
    try {
      const updated = await ReturnsService.updateReturnStatus(returnId, newStatus);
      setReturnData(updated);
      Alert.alert('Success', `Return ${newStatus} successfully`);
    } catch (error: unknown) {

      const errorMessage = error instanceof Error ? error.message : 'Failed to update return status';
      Alert.alert('Error', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Return',
      'Are you sure you want to delete this return? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await ReturnsService.deleteReturn(returnId);
              Alert.alert('Success', 'Return deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error: unknown) {

              const errorMessage = error instanceof Error ? error.message : 'Failed to delete return';
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
            Loading return...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!returnData) {
    return null;
  }

  const items = parseReturnItems(returnData.items);
  const statusColor = getStatusColor(returnData.status, colors);
  const isExchange = returnData.refundMethod === 'exchange';

  // Try to parse exchange items from notes
  let exchangeItems: SaleItem[] = [];
  if (isExchange && returnData.notes) {
    try {
      // Use [\s\S] instead of . with s flag for better compatibility
      const exchangeMatch = returnData.notes.match(/EXCHANGE ITEMS:\s*(\[[\s\S]*\])/);
      if (exchangeMatch) {
        exchangeItems = JSON.parse(exchangeMatch[1]);
      }
    } catch {
      // Ignore parsing errors
    }
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Return Details</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {returnData.returnNumber}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.destructive} />
          ) : (
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <LinearGradient
          colors={isDark ? [statusColor + '20', statusColor + '10'] : [statusColor + '15', statusColor + '08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <View>
              <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>Status</Text>
              <Text style={[styles.statusValue, { color: statusColor }]}>
                {returnData.status.charAt(0).toUpperCase() + returnData.status.slice(1)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Ionicons name="checkmark-circle" size={24} color="white" />
            </View>
          </View>
        </LinearGradient>

        {/* Return Information */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Return Information</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Return Number:</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {returnData.returnNumber}
            </Text>
          </View>

          {returnData.customerName && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer:</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {returnData.customerName}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Refund Method:</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {getRefundMethodLabel(returnData.refundMethod)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date:</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(returnData.createdAt)}
            </Text>
          </View>
        </View>

        {/* Returned Items */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube-outline" size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Returned Items</Text>
          </View>
          
          {items.length > 0 ? (
            items.map((item, index) => (
              <View key={item.id || index} style={[styles.itemRow, index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
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
                  <Text style={[styles.itemQuantity, { color: colors.foreground }]}>
                    Qty: {item.quantity}
                  </Text>
                  <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                    NLe {formatNumber(item.total)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No items</Text>
          )}
        </View>

        {/* Exchange Items (if exchange) */}
        {isExchange && exchangeItems.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="swap-horizontal-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Exchange Items</Text>
            </View>
            
            {exchangeItems.map((item, index) => (
              <View key={item.id || index} style={[styles.itemRow, index < exchangeItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
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
                  <Text style={[styles.itemQuantity, { color: colors.foreground }]}>
                    Qty: {item.quantity}
                  </Text>
                  <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                    NLe {formatNumber(item.total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Financial Summary */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={20} color={colors.accent} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Financial Summary</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Subtotal:</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              NLe {formatNumber(returnData.subtotal)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Tax:</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              NLe {formatNumber(returnData.tax)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={[styles.summaryLabel, { color: colors.foreground, fontWeight: fontWeight.bold }]}>Total:</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground, fontWeight: fontWeight.bold }]}>
              NLe {formatNumber(returnData.total)}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryRefund]}>
            <Text style={[styles.summaryLabel, { color: colors.accent, fontWeight: fontWeight.bold }]}>Refund Amount:</Text>
            <Text style={[styles.summaryValue, { color: colors.accent, fontWeight: fontWeight.bold, fontSize: fontSize.lg }]}>
              NLe {formatNumber(returnData.refundAmount)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {returnData.notes && !isExchange && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>
              {returnData.notes}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {returnData.status === 'pending' && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton, { backgroundColor: '#10B981' }]}
              onPress={() => handleStatusUpdate('approved')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton, { backgroundColor: colors.destructive }]}
              onPress={() => handleStatusUpdate('rejected')}
              disabled={updating}
            >
              {updating ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {returnData.status === 'approved' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton, { backgroundColor: colors.success }]}
            onPress={() => handleStatusUpdate('completed')}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle" size={20} color="white" />
                <Text style={styles.actionButtonText}>Mark as Completed</Text>
              </>
            )}
          </TouchableOpacity>
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
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statusCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: fontSize.sm,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  statusBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
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
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
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
  notesText: {
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  approveButton: {
    // backgroundColor set inline
  },
  rejectButton: {
    // backgroundColor set inline
  },
  completeButton: {
    // backgroundColor set inline
    marginTop: spacing.md,
  },
  actionButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

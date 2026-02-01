/**
 * Swap Detail Screen
 * View device swap transaction details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SwapService } from '../services/swap.service';
import { Swap } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

/**
 * Safely format a number
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
    return '0.00';
  }
  try {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return String(value || '0.00');
  }
}

export default function SwapDetailScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const swapId = route?.params?.swapId;
  
  const [swap, setSwap] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  
  useEffect(() => {
    loadSwap();
    const unsubscribe = navigation.addListener('focus', () => {
      loadSwap();
    });
    return unsubscribe;
  }, [navigation, swapId]);
  
  const loadSwap = async () => {
    if (!swapId) return;
    
    try {
      setLoading(true);
      const result = await SwapService.getSwapById(swapId);
      
      if (result.error) {
        console.error('Error loading swap:', result.error);
        Alert.alert('Error', 'Failed to load swap details');
      } else if (result.data) {
        setSwap(result.data);
      } else {
        Alert.alert('Error', 'Swap not found');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading swap:', error);
      Alert.alert('Error', 'Failed to load swap details');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (!swap) return;
    
    Alert.alert(
      'Delete Swap',
      'Are you sure you want to delete this swap? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await SwapService.deleteSwap(swapId);
              
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete swap');
              } else {
                Alert.alert('Success', 'Swap deleted successfully', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              }
            } catch (error: any) {
              console.error('Error deleting swap:', error);
              Alert.alert('Error', 'Failed to delete swap');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };
  
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return '';
    }
  };
  
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return '#22c55e';
      case 'refurbished':
        return '#fbbf24';
      case 'used':
        return '#6b7280';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#22c55e';
      case 'pending':
        return '#fbbf24';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading swap details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!swap) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="swap-horizontal-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Swap not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.accentContrast }]}>Back to Swaps</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Header
        title="Swap Details"
        subtitle={swap.swapNumber}
        showBackButton
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil',
            onPress: () => navigation.navigate('NewSwap', { swapId: swap.id, swapData: swap }),
            color: colors.accent,
            accessibilityLabel: 'Edit swap',
          },
          {
            icon: 'trash-outline',
            onPress: handleDelete,
            color: '#EF4444',
            disabled: deleting,
            loading: deleting,
            accessibilityLabel: 'Delete swap',
          },
        ]}
      />

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
                <Ionicons name="swap-horizontal" size={28} color="white" />
              </View>
              <View style={styles.gradientText}>
                <Text style={styles.gradientLabel}>Amount Paid</Text>
                <Text style={styles.gradientValue}>NLe {formatNumber(swap.differencePaid)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadgeGradient,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={styles.statusTextGradient}>
                {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Swap Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Information</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(swap.createdAt)} {formatTime(swap.createdAt)}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer</Text>
            </View>
            <View style={styles.infoValueContainer}>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {swap.customerName}
              </Text>
              {swap.customerPhone && (
                <Text style={[styles.infoSubValue, { color: colors.mutedForeground }]}>
                  {swap.customerPhone}
                </Text>
              )}
            </View>
          </View>
          
          {swap.customerEmail && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {swap.customerEmail}
              </Text>
            </View>
          )}
          
          {swap.customerAddress && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Address</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {swap.customerAddress}
              </Text>
            </View>
          )}
        </View>

        {/* Purchased Product Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Purchased Product</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="cube" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Product Name</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {swap.purchasedProductName}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="cash-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Price</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              NLe {formatNumber(swap.purchasedProductPrice)}
            </Text>
          </View>

          {swap.saleId && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('SaleDetail', { saleId: swap.saleId })}
            >
              <Text style={[styles.linkText, { color: colors.accent }]}>View Sale</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Trade-in Device Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Trade-in Device</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="phone-portrait" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Device Model</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {swap.tradeInProductName || 'Not specified'}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="barcode-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>IMEI</Text>
            </View>
            <Text style={[styles.infoValue, styles.infoValueMono, { color: colors.foreground }]}>
              {swap.tradeInImei}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Condition</Text>
            </View>
            <View
              style={[
                styles.conditionBadge,
                { backgroundColor: getConditionColor(swap.tradeInCondition) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.conditionText,
                  { color: getConditionColor(swap.tradeInCondition) },
                ]}
              >
                {swap.tradeInCondition.charAt(0).toUpperCase() + swap.tradeInCondition.slice(1)}
              </Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="cash-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Trade-in Value</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              NLe {formatNumber(swap.tradeInValue)}
            </Text>
          </View>

          {swap.tradeInNotes && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Notes</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {swap.tradeInNotes}
              </Text>
            </View>
          )}

          {swap.inventoryItemId && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('NewInventoryItem', { itemId: swap.inventoryItemId })}
            >
              <Text style={[styles.linkText, { color: colors.accent }]}>View Inventory Item</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calculator-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Payment Summary</Text>
            </View>
          </View>

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Product Price</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              NLe {formatNumber(swap.purchasedProductPrice)}
            </Text>
          </View>

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Trade-in Value</Text>
            <Text style={[styles.totalValue, { color: '#EF4444' }]}>
              -NLe {formatNumber(swap.tradeInValue)}
            </Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Amount Paid</Text>
            <Text style={[styles.grandTotalValue, { color: colors.accent }]}>
              NLe {formatNumber(swap.differencePaid)}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="card-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Payment Method</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {swap.paymentMethod.charAt(0).toUpperCase() + swap.paymentMethod.slice(1).replace('_', ' ')}
            </Text>
          </View>
        </View>

        {swap.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
              </View>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{swap.notes}</Text>
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
    gap: spacing.lg,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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
    textAlign: 'right',
    flex: 1,
  },
  infoValueContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  infoSubValue: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  infoValueMono: {
    fontFamily: 'monospace',
  },
  conditionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  conditionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  linkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
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
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  grandTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  notesText: {
    fontSize: fontSize.base,
    lineHeight: 24,
  },
});

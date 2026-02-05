/**
 * Returns List Screen
 * Display all returns
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ReturnsService } from '../services/returns.service';
import { Return } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
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
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'N/A';
  }
}

function getStatusColor(status: string, colors: any): string {
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

export default function ReturnsListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');

  useEffect(() => {
    loadReturns();
    const unsubscribe = navigation.addListener('focus', () => {
      loadReturns();
    });
    return unsubscribe;
  }, [navigation]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await ReturnsService.getReturns();
      setReturns(data);
    } catch (error: any) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReturns();
  }, []);

  const filteredReturns = useMemo(() => {
    let filtered = returns;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ret => ret.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ret => {
        const returnNumber = ret.returnNumber?.toLowerCase() || '';
        const customerName = ret.customerName?.toLowerCase() || '';
        return returnNumber.includes(term) || customerName.includes(term);
      });
    }

    return filtered;
  }, [returns, searchTerm, statusFilter]);

  const metricsData = useMemo(() => {
    const totalReturns = returns.length;
    const pendingReturns = returns.filter(r => r.status === 'pending').length;
    const totalRefundAmount = returns.reduce((sum, ret) => sum + ret.refundAmount, 0);
    return { total: totalReturns, pending: pendingReturns, totalRefundAmount };
  }, [returns]);

  const renderReturnItem = ({ item: ret, index }: { item: Return; index: number }) => {
    const statusColor = getStatusColor(ret.status, colors);

    return (
      <TouchableOpacity
        style={[
          styles.returnItem,
          { backgroundColor: colors.card, borderColor: colors.border },
          index < filteredReturns.length - 1 && { borderBottomWidth: 1 },
        ]}
        onPress={() => navigation.navigate('ReturnDetail', { returnId: ret.id })}
        activeOpacity={0.7}
      >
        <View style={styles.returnItemLeft}>
          <View style={styles.returnItemHeader}>
            <Text style={[styles.returnNumber, { color: colors.foreground }]}>
              {ret.returnNumber}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {ret.status.charAt(0).toUpperCase() + ret.status.slice(1)}
              </Text>
            </View>
          </View>
          {ret.customerName && (
            <Text style={[styles.customerName, { color: colors.mutedForeground }]}>
              {ret.customerName}
            </Text>
          )}
          <View style={styles.returnDetails}>
            <Text style={[styles.refundMethod, { color: colors.mutedForeground }]}>
              {getRefundMethodLabel(ret.refundMethod)}
            </Text>
            <Text style={[styles.returnDate, { color: colors.mutedForeground }]}>
              {formatDate(ret.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.returnItemRight}>
          <Text style={[styles.refundAmount, { color: colors.foreground }]}>
            NLe {formatNumber(ret.refundAmount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Returns</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {returns.length} {returns.length === 1 ? 'return' : 'returns'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('NewReturn')}
        >
          <Ionicons name="add" size={24} color={colors.accentContrast} />
        </TouchableOpacity>
      </View>

      {/* Metrics Card */}
      <LinearGradient
        colors={isDark ? ['#7C3AED', '#8B5CF6'] : ['#8B5CF6', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Returns</Text>
            <Text style={styles.metricValue}>{metricsData.total}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Pending</Text>
            <Text style={styles.metricValue}>{metricsData.pending}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel} numberOfLines={1}>Total Refunded</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumScaleFactor={0.6}>
              {metricsData.totalRefundAmount >= 1000000 
                ? `NLe ${(metricsData.totalRefundAmount / 1000000).toFixed(1)}M`
                : metricsData.totalRefundAmount >= 1000
                ? `NLe ${Math.floor(metricsData.totalRefundAmount / 1000)}K`
                : `NLe ${formatNumber(metricsData.totalRefundAmount)}`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by return number, customer..."
          placeholderTextColor={colors.mutedForeground}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {['all', 'pending', 'approved', 'rejected', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === status ? colors.accent : colors.muted,
                  borderColor: statusFilter === status ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(status as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: statusFilter === status ? colors.accentContrast : colors.mutedForeground,
                  },
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          All Returns ({filteredReturns.length})
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading returns...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={filteredReturns}
        renderItem={renderReturnItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="return-down-back-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No returns found</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new return to get started'}
            </Text>
            {!searchTerm && statusFilter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewReturn')}
              >
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Create Return
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsCard: {
    borderRadius: 16,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: fontWeight.normal,
    marginBottom: 6,
    color: 'rgba(255,255,255,0.8)',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    color: 'white',
    flexShrink: 1,
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.xs,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  returnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  returnItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  returnItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  returnNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  customerName: {
    fontSize: fontSize.sm,
    marginTop: 2,
    marginBottom: 4,
  },
  returnDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refundMethod: {
    fontSize: fontSize.xs,
  },
  returnDate: {
    fontSize: fontSize.xs,
  },
  returnItemRight: {
    alignItems: 'flex-end',
  },
  refundAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  emptyContainer: {
    padding: spacing.xxl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

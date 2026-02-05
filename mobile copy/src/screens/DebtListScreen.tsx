/**
 * Debt List Screen
 * Display all customer debts
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
import { DebtService } from '../services/debt.service';
import { DatabaseService } from '../services/database.service';
import { Debt, Customer } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
    return '0';
  }
  try {
    return value.toLocaleString();
  } catch {
    return String(value || '0');
  }
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

export default function DebtListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paid'>('all');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [debtsData, customersRes] = await Promise.all([
        DebtService.getDebts(),
        DatabaseService.getCustomers(),
      ]);
      setDebts(debtsData);
      if (customersRes.data) {
        setCustomers(customersRes.data);
      }
    } catch (error: any) {

    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const filteredDebts = useMemo(() => {
    let filtered = debts;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(debt => debt.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(debt => {
        const customer = customers.find(c => c.id === debt.customerId);
        const customerName = customer?.name?.toLowerCase() || '';
        const description = debt.description?.toLowerCase() || '';
        return customerName.includes(term) || description.includes(term);
      });
    }

    return filtered;
  }, [debts, customers, searchTerm, statusFilter]);

  const metricsData = useMemo(() => {
    const totalDebts = debts.length;
    const activeDebts = debts.filter(d => d.status === 'active').length;
    const totalAmount = debts.reduce((sum, debt) => sum + (debt.amount - debt.paid), 0);
    return { total: totalDebts, active: activeDebts, totalAmount };
  }, [debts]);

  const getCustomerName = (customerId?: string | null): string => {
    if (!customerId) return 'Unknown Customer';
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const renderDebtItem = ({ item: debt, index }: { item: Debt; index: number }) => {
    const customerName = getCustomerName(debt.customerId);
    const balance = debt.amount - debt.paid;
    const isOverdue = debt.status === 'active' && balance > 0;

    return (
      <TouchableOpacity
        style={[
          styles.debtItem,
          { backgroundColor: colors.card, borderColor: colors.border },
          index < filteredDebts.length - 1 && { borderBottomWidth: 1 },
        ]}
        onPress={() => navigation.navigate('DebtDetail', { debtId: debt.id })}
        activeOpacity={0.7}
      >
        <View style={styles.debtItemLeft}>
          <View style={styles.debtItemHeader}>
            <Text style={[styles.debtCustomerName, { color: colors.foreground }]}>
              {customerName}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: debt.status === 'paid' ? colors.success + '15' : colors.destructive + '15' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: debt.status === 'paid' ? colors.success : colors.destructive }
              ]}>
                {debt.status === 'paid' ? 'Paid' : 'Active'}
              </Text>
            </View>
          </View>
          <Text style={[styles.debtDate, { color: colors.mutedForeground }]}>
            {formatDate(debt.createdAt)}
          </Text>
          {debt.description && (
            <Text style={[styles.debtDescription, { color: colors.mutedForeground }]} numberOfLines={1}>
              {debt.description}
            </Text>
          )}
        </View>
        <View style={styles.debtItemRight}>
          <Text style={[styles.debtAmount, { color: colors.foreground }]}>
            NLe {formatNumber(balance)}
          </Text>
          <Text style={[styles.debtTotal, { color: colors.mutedForeground }]}>
            of NLe {formatNumber(debt.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View>

      {/* Metrics Card */}
      <LinearGradient
        colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Debts</Text>
            <Text style={styles.metricValue}>{metricsData.total}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Active</Text>
            <Text style={styles.metricValue}>{metricsData.active}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel} numberOfLines={1}>Total Owed</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
              {metricsData.totalAmount >= 1000000 
                ? `NLe ${formatNumber(metricsData.totalAmount)}`
                : `NLe ${formatNumber(metricsData.totalAmount)}`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by customer, description..."
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
          {['all', 'active', 'paid'].map((status) => (
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
          All Debts ({filteredDebts.length})
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
            Loading debts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Debts"
        subtitle={`${debts.length} ${debts.length === 1 ? 'debt' : 'debts'}`}
        actions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('NewDebt'),
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            accessibilityLabel: 'Add new debt',
          },
        ]}
        showBorder={false}
        useSafeArea={false}
      />
      <FlatList
        data={filteredDebts}
        renderItem={renderDebtItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No debts found</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new debt to get started'}
            </Text>
            {!searchTerm && statusFilter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewDebt')}
              >
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Create Debt
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
  debtItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  debtItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  debtItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  debtCustomerName: {
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
  debtDate: {
    fontSize: fontSize.xs,
    marginBottom: 2,
  },
  debtDescription: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  debtItemRight: {
    alignItems: 'flex-end',
  },
  debtAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  debtTotal: {
    fontSize: fontSize.xs,
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


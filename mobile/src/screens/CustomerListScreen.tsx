/**
 * Customer List Screen
 * Modern customer management matching Sales/Products design
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { SalesService } from '../services/sales.service';
import { Customer } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

export default function CustomerListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getCustomers();
      if (error) {
        console.error('Error loading customers:', error);
      } else if (data) {
        setCustomers(data);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCustomers();
  };

  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    if (statusFilter === 'active') {
      filtered = filtered.filter(c => c.isActive !== false);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(c => c.isActive === false);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.company?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [customers, statusFilter, searchTerm]);

  const metrics = useMemo(async () => {
    const total = customers.length;
    const active = customers.filter(c => c.isActive !== false).length;
    
    let totalRevenue = 0;
    try {
      const sales = await SalesService.getSales();
      totalRevenue = sales.reduce((sum, sale) => {
        if (sale.customerId) {
          return sum + (sale.total || 0);
        }
        return sum;
      }, 0);
    } catch (error) {
      console.error('Error calculating revenue:', error);
    }

    return { total, active, totalRevenue };
  }, [customers]);

  const [metricsData, setMetricsData] = useState({ total: 0, active: 0, totalRevenue: 0 });

  useEffect(() => {
    const calculateMetrics = async () => {
      const m = await metrics;
      setMetricsData(m);
    };
    calculateMetrics();
  }, [metrics]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderCustomer = (customer: Customer, index: number, total: number) => (
    <TouchableOpacity
      key={customer.id}
      style={[
        styles.customerRow,
        { borderBottomColor: colors.border },
        index === total - 1 && styles.lastRow,
      ]}
      onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
      activeOpacity={0.7}
    >
      <View style={styles.customerLeft}>
        <View style={[styles.customerAvatar, { backgroundColor: colors.accent + '20' }]}>
          <Text style={[styles.customerAvatarText, { color: colors.accent }]}>
            {getInitials(customer.name)}
          </Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={[styles.customerName, { color: colors.foreground }]} numberOfLines={1}>
            {customer.name}
          </Text>
          <View style={styles.customerMeta}>
            {customer.phone && (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {customer.phone}
                </Text>
              </View>
            )}
            {customer.email && (
              <View style={styles.metaItem}>
                <Ionicons name="mail-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {customer.email}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.customerRight}>
        {customer.storeCredit && customer.storeCredit > 0 && (
          <View style={[styles.creditBadge, { backgroundColor: '#10B981' + '15' }]}>
            <Ionicons name="wallet" size={12} color="#10B981" />
            <Text style={[styles.creditBadgeText, { color: '#10B981' }]}>
              NLe {customer.storeCredit.toLocaleString()}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Customers</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('NewCustomer')}
        >
          <Ionicons name="add" size={24} color={colors.accentContrast} />
        </TouchableOpacity>
      </View>

      {/* Metrics Card */}
      <LinearGradient
        colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Customers</Text>
            <Text style={styles.metricValue}>{metricsData.total}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Active</Text>
            <Text style={styles.metricValue}>{metricsData.active}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel} numberOfLines={1}>Total Revenue</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
              {metricsData.totalRevenue >= 1000000 
                ? `NLe ${(metricsData.totalRevenue / 1000000).toFixed(1)}M`
                : metricsData.totalRevenue >= 1000
                ? `NLe ${Math.floor(metricsData.totalRevenue / 1000)}K`
                : `NLe ${formatNumber(metricsData.totalRevenue)}`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, email, phone..."
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
          {['all', 'active', 'inactive'].map((status) => (
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
          Customers ({filteredCustomers.length})
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
            Loading customers...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {filteredCustomers.length > 0 ? (
          <>
            {renderHeader()}
            <View style={[styles.customersListCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
              {filteredCustomers.map((customer, index) =>
                renderCustomer(customer, index, filteredCustomers.length)
              )}
            </View>
          </>
        ) : (
          <>
            {renderHeader()}
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {searchTerm || statusFilter !== 'all'
                  ? 'No customers found'
                  : 'No customers yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters or search terms'
                  : 'Start by creating your first customer'}
              </Text>
              {!searchTerm && statusFilter === 'all' && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate('NewCustomer')}
                >
                  <Ionicons name="add" size={20} color={colors.accentContrast} />
                  <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                    Create First Customer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
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
    fontSize: 28,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
    letterSpacing: -0.5,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  metricsCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
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
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
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
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  customersListCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: 14,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  customerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  creditBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
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
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});

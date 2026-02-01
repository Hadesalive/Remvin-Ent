/**
 * Sales List Screen
 * Clean, scannable design following mobile UI/UX best practices
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SalesService } from '../services/sales.service';
import { Sale, SaleItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format, subDays, startOfDay } from 'date-fns';

const { width } = Dimensions.get('window');

/**
 * Safely parse sale items
 */
function parseSaleItems(items: string): SaleItem[] {
  try {
    if (!items) return [];
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed)) return [];
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
 * Safely format a number
 */
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

/**
 * Sales Chart Component
 */
function SalesChart({ data, colors }: any) {
  const chartHeight = 140;
  const chartWidth = width - 48;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const validData = data.map((val: any) => {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) || num < 0 ? 0 : num;
  });
  
  const maxValue = validData.length > 0 ? Math.max(...validData) : 0;
  const max = maxValue > 0 ? maxValue * 1.2 : 1;
  
  const generatePath = () => {
    if (validData.length === 0) {
      return { d: '', points: [] };
    }
    
    const stepX = chartWidth / (validData.length - 1);
    const points = validData.map((val: number, i: number) => ({
      x: i * stepX,
      y: chartHeight - (val / max) * chartHeight
    }));

    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.5;
      const cp1y = p0.y;
      const cp2x = p1.x - (p1.x - p0.x) * 0.5;
      const cp2y = p1.y;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
    return { d, points };
  };

  const { d: linePath, points } = generatePath();
  const fillPath = linePath ? `${linePath} L ${chartWidth},${chartHeight} L 0,${chartHeight} Z` : '';

  return (
    <View style={[styles.chartCard, { backgroundColor: colors.card, shadowColor: colors.shadow, borderColor: colors.border }]}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.foreground }]}>Last 7 Days</Text>
      </View>
      
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <SvgLinearGradient id="salesChartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2563EB" stopOpacity="0.2" />
            <Stop offset="1" stopColor="#2563EB" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Grid Lines */}
        {[0, 0.5, 1].map((t, i) => (
          <Path 
            key={i}
            d={`M 0,${chartHeight * t} L ${chartWidth},${chartHeight * t}`} 
            stroke={colors.border} 
            strokeWidth="1" 
            strokeDasharray="4,4"
          />
        ))}

        {/* Area Fill */}
        {fillPath && <Path d={fillPath} fill="url(#salesChartGrad)" />}
        
        {/* Line */}
        {linePath && <Path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" />}
        
        {/* Points */}
        {points.map((p: any, i: number) => (
          <SvgCircle 
            key={i} 
            cx={p.x} 
            cy={p.y} 
            r="4" 
            fill={colors.card} 
            stroke="#2563EB" 
            strokeWidth="2" 
          />
        ))}
      </Svg>
      
      {/* X-Axis Labels */}
      <View style={styles.chartLabels}>
        {days.map((day, i) => (
          <Text key={i} style={[styles.chartLabelText, { color: colors.mutedForeground }]}>
            {day}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function SalesListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [displayedSales, setDisplayedSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadSales();
    const unsubscribe = navigation.addListener('focus', () => {
      loadSales();
    });
    return unsubscribe;
  }, [navigation]);

  // Apply filters and pagination
  useEffect(() => {
    let filtered = [...allSales];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((sale) => sale.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter((sale) => {
        if (!sale.createdAt) return false;
        const saleDate = new Date(sale.createdAt);
        const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return saleDateOnly.getTime() === today.getTime();
          case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return saleDateOnly >= weekStart;
          case 'thisMonth':
            return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
          case 'last30Days':
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            return saleDateOnly >= thirtyDaysAgo;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (sale) =>
          sale.customerName?.toLowerCase().includes(term) ||
          sale.invoiceNumber?.toLowerCase().includes(term) ||
          sale.id.toLowerCase().includes(term)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'amount':
          comparison = (a.total || 0) - (b.total || 0);
          break;
        case 'customer':
          const nameA = (a.customerName || 'Walk-in Customer').toLowerCase();
          const nameB = (b.customerName || 'Walk-in Customer').toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Apply pagination
    const paginated = filtered.slice(0, currentPage * ITEMS_PER_PAGE);
    setDisplayedSales(paginated);
    setHasMore(paginated.length < filtered.length);
  }, [search, allSales, statusFilter, dateFilter, sortBy, sortOrder, currentPage]);

  const loadSales = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await SalesService.getSales();
      setAllSales(data);
      setCurrentPage(1); // Reset to first page
    } catch (error: any) {
      console.error('Failed to load sales:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreSales = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setLoadingMore(false);
      }, 300);
    }
  }, [loadingMore, hasMore]);

  const onRefresh = useCallback(() => {
    loadSales(true);
  }, []);

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
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Today';
      if (diffDays === 2) return 'Yesterday';
      if (diffDays <= 7) return format(date, 'EEE');
      return format(date, 'MMM dd');
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

  // Calculate key metrics and chart data
  const { metrics, chartData } = useMemo(() => {
    const totalRevenue = allSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const completedCount = allSales.filter((s) => s.status === 'completed').length;
    const pendingCount = allSales.filter((s) => s.status === 'pending').length;
    
    const today = new Date();
    const todaySales = allSales.filter((sale) => {
      if (!sale.createdAt) return false;
      const saleDate = new Date(sale.createdAt);
      return (
        saleDate.getDate() === today.getDate() &&
        saleDate.getMonth() === today.getMonth() &&
        saleDate.getFullYear() === today.getFullYear()
      );
    });
    const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);

    // Generate last 7 days chart data
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = startOfDay(subDays(today, 6 - i));
      const daySales = allSales.filter((sale) => {
        if (!sale.createdAt) return false;
        const saleDate = startOfDay(new Date(sale.createdAt));
        return saleDate.getTime() === date.getTime();
      });
      return daySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    });

    return {
      metrics: {
        totalRevenue,
        totalSales: allSales.length,
        todayRevenue,
        todaySales: todaySales.length,
        completedCount,
        pendingCount,
      },
      chartData: last7Days,
    };
  }, [allSales]);

  const renderItem = ({ item, index }: { item: Sale; index: number }) => {
    const isLastItem = index === displayedSales.length - 1;
    const items = parseSaleItems(item.items);
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.saleRow,
          isLastItem && styles.lastRow,
          { borderBottomColor: colors.border }
        ]}
        onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.saleLeft}>
          <View style={[styles.saleAvatar, { backgroundColor: colors.accent + '15' }]}>
            <Text style={[styles.saleAvatarText, { color: colors.accent }]}>
              {(item.customerName || 'W')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.customerName, { color: colors.foreground }]} numberOfLines={1}>
              {item.customerName || 'Walk-in Customer'}
            </Text>
            <Text style={[styles.saleDate, { color: colors.mutedForeground }]}>
              {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        
        <View style={styles.saleRight}>
          <Text style={[styles.saleAmount, { color: colors.foreground }]}>
            NLe {formatNumber(item.total)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Sales</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {allSales.length} {allSales.length === 1 ? 'transaction' : 'transactions'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('NewSale')}
        >
          <Ionicons name="add" size={24} color={colors.accentContrast} />
        </TouchableOpacity>
      </View>

      {/* Key Metrics - Colorful gradient card */}
      <LinearGradient
        colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValue}>
              NLe {formatNumber(metrics.totalRevenue)}
            </Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Today</Text>
            <Text style={styles.metricValueToday}>
              NLe {formatNumber(metrics.todayRevenue)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Sales Chart */}
      <SalesChart data={chartData} colors={colors} />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by customer, invoice..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {/* Status Filters */}
          {['all', 'completed', 'pending', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === status ? colors.accent : colors.muted,
                  borderColor: statusFilter === status ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(status)}
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

          {/* Date Filters */}
          {['all', 'today', 'thisWeek', 'thisMonth', 'last30Days'].map((date) => (
            <TouchableOpacity
              key={date}
              style={[
                styles.filterChip,
                {
                  backgroundColor: dateFilter === date ? colors.accent : colors.muted,
                  borderColor: dateFilter === date ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setDateFilter(date)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: dateFilter === date ? colors.accentContrast : colors.mutedForeground,
                  },
                ]}
              >
                {date === 'all' ? 'All Time' : date === 'thisWeek' ? 'This Week' : date === 'thisMonth' ? 'This Month' : date === 'last30Days' ? 'Last 30 Days' : 'Today'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <View style={styles.sortLeft}>
          <Ionicons name="swap-vertical-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>Sort:</Text>
          {['date', 'amount', 'customer'].map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.sortChip,
                {
                  backgroundColor: sortBy === sort ? colors.accent + '15' : 'transparent',
                  borderColor: sortBy === sort ? colors.accent : colors.border,
                },
              ]}
              onPress={() => {
                if (sortBy === sort) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(sort as any);
                  setSortOrder('desc');
                }
              }}
            >
              <Text
                style={[
                  styles.sortChipText,
                  {
                    color: sortBy === sort ? colors.accent : colors.mutedForeground,
                  },
                ]}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </Text>
              {sortBy === sort && (
                <Ionicons
                  name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={colors.accent}
                  style={{ marginLeft: 4 }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
          {displayedSales.length} {displayedSales.length === 1 ? 'result' : 'results'}
          {hasMore && ` of ${allSales.length}`}
        </Text>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Sales</Text>
      </View>

      {/* Sales List Card Container */}
      {displayedSales.length > 0 && (
        <View style={[styles.salesListCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          {displayedSales.map((item, index) => (
            <React.Fragment key={item.id}>
              {renderItem({ item, index })}
            </React.Fragment>
          ))}
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMoreSales}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.loadMoreText, { color: colors.accent }]}>
                  Load More ({allSales.length - displayedSales.length} remaining)
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading sales...
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
        {displayedSales.length > 0 ? (
          renderHeader()
        ) : (
          <>
            {renderHeader()}
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search || statusFilter !== 'all' || dateFilter !== 'all' 
                  ? 'No sales found' 
                  : 'No sales yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {search || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters or search terms' 
                  : 'Start by creating your first sale'}
              </Text>
              {!search && statusFilter === 'all' && dateFilter === 'all' && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate('NewSale')}
                >
                  <Ionicons name="add" size={20} color={colors.accentContrast} />
                  <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                    Create First Sale
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
  salesListCard: {
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
  },
  metricValueToday: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    color: '#FBBF24',
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  chartCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chartLabelText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  filtersContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filtersScroll: {
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sortLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
    marginRight: spacing.xs,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: spacing.xs,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
  resultsCount: {
    fontSize: 12,
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
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleAvatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  saleDate: {
    fontSize: 12,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.xs,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  loadMoreButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginTop: spacing.xs,
  },
  loadMoreText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});

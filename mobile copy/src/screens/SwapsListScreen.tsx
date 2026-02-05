/**
 * Swaps List Screen
 * Lists all device swap transactions
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
import { useTheme } from '../contexts/ThemeContext';
import { SwapService } from '../services/swap.service';
import { Swap } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format, subDays, startOfDay } from 'date-fns';
import { Header } from '../components/ui/Header';

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

export default function SwapsListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [allSwaps, setAllSwaps] = useState<Swap[]>([]);
  const [displayedSwaps, setDisplayedSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadSwaps();
    const unsubscribe = navigation.addListener('focus', () => {
      loadSwaps();
    });
    return unsubscribe;
  }, [navigation]);

  // Apply filters and pagination
  useEffect(() => {
    let filtered = [...allSwaps];

    // Apply search filter
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (swap) =>
          swap.swapNumber.toLowerCase().includes(term) ||
          swap.customerName?.toLowerCase().includes(term) ||
          swap.tradeInImei?.toLowerCase().includes(term) ||
          swap.purchasedProductName?.toLowerCase().includes(term) ||
          swap.tradeInProductName?.toLowerCase().includes(term)
      );
    }

    // Apply sorting (newest first)
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA; // Descending
    });

    // Apply pagination
    const paginated = filtered.slice(0, currentPage * ITEMS_PER_PAGE);
    setDisplayedSwaps(paginated);
    setHasMore(paginated.length < filtered.length);
  }, [search, allSwaps, currentPage]);

  const loadSwaps = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const result = await SwapService.getSwaps();
      if (result.error) {

      } else {
        setAllSwaps(result.data || []);
        setCurrentPage(1); // Reset to first page
      }
    } catch (error: any) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreSwaps = useCallback(() => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setLoadingMore(false);
      }, 300);
    }
  }, [loadingMore, hasMore]);

  const onRefresh = useCallback(() => {
    loadSwaps(true);
  }, []);

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

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalRevenue = allSwaps.reduce((sum, swap) => sum + (swap.differencePaid || 0), 0);
    const totalTradeInValue = allSwaps.reduce((sum, swap) => sum + (swap.tradeInValue || 0), 0);
    const today = new Date();
    const todaySwaps = allSwaps.filter((swap) => {
      if (!swap.createdAt) return false;
      const swapDate = new Date(swap.createdAt);
      return (
        swapDate.getDate() === today.getDate() &&
        swapDate.getMonth() === today.getMonth() &&
        swapDate.getFullYear() === today.getFullYear()
      );
    });
    const todayRevenue = todaySwaps.reduce((sum, swap) => sum + (swap.differencePaid || 0), 0);

    return {
      totalSwaps: allSwaps.length,
      totalRevenue,
      totalTradeInValue,
      todaySwaps: todaySwaps.length,
      todayRevenue,
    };
  }, [allSwaps]);

  const renderItem = ({ item, index }: { item: Swap; index: number }) => {
    const isLastItem = index === displayedSwaps.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.swapRow,
          isLastItem && styles.lastRow,
          { borderBottomColor: colors.border }
        ]}
        onPress={() => navigation.navigate('SwapDetail', { swapId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.swapLeft}>
          <View style={[styles.swapAvatar, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="swap-horizontal" size={20} color={colors.accent} />
          </View>
          <View style={styles.swapInfo}>
            <Text style={[styles.swapNumber, { color: colors.foreground }]} numberOfLines={1}>
              {item.swapNumber}
            </Text>
            <Text style={[styles.customerName, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.customerName || 'Walk-in Customer'}
            </Text>
            <Text style={[styles.swapDate, { color: colors.mutedForeground }]}>
              {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        
        <View style={styles.swapRight}>
          <Text style={[styles.swapAmount, { color: colors.foreground }]}>
            NLe {formatNumber(item.differencePaid)}
          </Text>
          <Text style={[styles.tradeInValue, { color: colors.mutedForeground }]}>
            Trade-in: NLe {formatNumber(item.tradeInValue)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View>
      {/* Key Metrics - Colorful gradient card */}
      <View style={{ marginTop: spacing.md }}>
        <LinearGradient
        colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsGrid}>
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
        <View style={styles.metricsDividerHorizontal} />
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Trade-in Value</Text>
            <Text style={styles.metricValue}>
              NLe {formatNumber(metrics.totalTradeInValue)}
            </Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Swaps</Text>
            <Text style={styles.metricValue}>
              {metrics.totalSwaps}
            </Text>
          </View>
        </View>
      </LinearGradient>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by swap #, customer, IMEI, product..."
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

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Swaps</Text>
      </View>

      {/* Swaps List Card Container */}
      {displayedSwaps.length > 0 && (
        <View style={[styles.swapsListCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          {displayedSwaps.map((item, index) => (
            <React.Fragment key={item.id}>
              {renderItem({ item, index })}
            </React.Fragment>
          ))}
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMoreSwaps}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text style={[styles.loadMoreText, { color: colors.accent }]}>
                  Load More ({allSwaps.length - displayedSwaps.length} remaining)
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
            Loading swaps...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Device Swaps"
        subtitle="Trade-in transactions"
        useSafeArea={false}
        showBorder={false}
        rightContent={
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('NewSwap')}
          >
            <Ionicons name="add" size={20} color={colors.accentContrast} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingTop: 0 }]}
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
        {displayedSwaps.length > 0 ? (
          renderContent()
        ) : (
          <>
            {renderContent()}
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
                <Ionicons name="swap-horizontal-outline" size={48} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {search 
                  ? 'No swaps found' 
                  : 'No swaps yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                {search
                  ? 'Try adjusting your search terms' 
                  : 'Start by creating your first device swap'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate('NewSwap')}
                >
                  <Ionicons name="add" size={20} color={colors.accentContrast} />
                  <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                    Create First Swap
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
  swapsListCard: {
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
  metricsGrid: {
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
    fontSize: 20,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    color: 'white',
  },
  metricValueToday: {
    fontSize: 20,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
    color: '#FBBF24',
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  metricsDividerHorizontal: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.3)',
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
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  swapLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  swapAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapInfo: {
    flex: 1,
    minWidth: 0,
  },
  swapNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  swapDate: {
    fontSize: 12,
  },
  swapRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  swapAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  tradeInValue: {
    fontSize: 11,
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

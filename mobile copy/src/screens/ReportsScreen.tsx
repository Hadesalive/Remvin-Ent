/**
 * Reports & Analytics Screen
 * Comprehensive reports with charts and accounting data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from '../components/ui/Header';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { DashboardService } from '../services/dashboard.service';
import { SalesService } from '../services/sales.service';
import { DatabaseService } from '../services/database.service';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { RevenueChart } from '../components/reports/RevenueChart';
import { ProductPerformanceChart } from '../components/reports/ProductPerformanceChart';
import { BusinessMetricsCard } from '../components/reports/BusinessMetricsCard';
import { ProfitLossCard } from '../components/reports/ProfitLossCard';
import { TopCustomersList } from '../components/reports/TopCustomersList';
import { TopProductsList } from '../components/reports/TopProductsList';
import { useResponsive, getResponsivePadding } from '../lib/responsive';

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: number | undefined | null): string {
  return `NLe ${formatNumber(value)}`;
}

function getResponsiveFontSize(text: string, isTablet: boolean, isLargeTablet: boolean): number {
  const baseSize = isLargeTablet ? fontSize['2xl'] : isTablet ? fontSize.xl : fontSize.lg;
  const textLength = text.length;
  
  // Adjust font size based on text length to prevent overflow
  if (textLength > 20) {
    return baseSize * 0.75;
  } else if (textLength > 15) {
    return baseSize * 0.85;
  } else if (textLength > 12) {
    return baseSize * 0.9;
  }
  return baseSize;
}

function getDateRange(range: DateRange): { startDate: Date; endDate: Date; label: string } {
  const today = new Date();
  let startDate: Date;
  let endDate: Date = endOfDay(today);
  let label: string;

  switch (range) {
    case 'today':
      startDate = startOfDay(today);
      label = 'Today';
      break;
    case 'week':
      startDate = startOfDay(subDays(today, 7));
      label = 'Last 7 Days';
      break;
    case 'month':
      startDate = startOfMonth(today);
      label = 'This Month';
      break;
    case 'quarter':
      startDate = startOfMonth(subMonths(today, 3));
      label = 'Last 3 Months';
      break;
    case 'year':
      startDate = startOfMonth(subMonths(today, 12));
      label = 'Last 12 Months';
      break;
    default:
      startDate = startOfMonth(today);
      endDate = endOfMonth(today);
      label = 'This Month';
  }

  return { startDate, endDate, label };
}

export default function ReportsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { isTablet, isLargeTablet, width } = useResponsive();
  const padding = getResponsivePadding(width);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  
  // Raw data cache
  const [rawSalesData, setRawSalesData] = useState<any[]>([]);
  const [rawProductsData, setRawProductsData] = useState<any[]>([]);
  const [rawCustomersData, setRawCustomersData] = useState<any[]>([]);
  
  // Report data
  const [revenueData, setRevenueData] = useState<number[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [businessMetrics, setBusinessMetrics] = useState<any>({});
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dateRangeLabel, setDateRangeLabel] = useState('');

  // Memoize date range calculation
  const dateRangeObj = useMemo(() => getDateRange(dateRange), [dateRange]);

  // Load raw data once (cached)
  const loadRawData = useCallback(async () => {
    try {
      // Only show loading on initial load
      if (rawSalesData.length === 0) {
        setLoading(true);
      }
      
      // Load all data in parallel
      const [salesData, productsData, customersData] = await Promise.all([
        SalesService.getSales(),
        DatabaseService.getProducts(),
        DatabaseService.getCustomers(),
      ]);

      setRawSalesData(salesData || []);
      setRawProductsData(productsData?.data || []);
      setRawCustomersData(customersData?.data || []);
    } catch (error: any) {
      console.error('Error loading raw data:', error);
    } finally {
      setLoading(false);
    }
  }, [rawSalesData.length]);

  // Optimized calculation using cached data
  const calculateReports = useCallback(() => {
    if (rawSalesData.length === 0 && rawProductsData.length === 0 && rawCustomersData.length === 0) {
      return;
    }

    // Use InteractionManager to defer heavy calculations after animations
    const handle = InteractionManager.runAfterInteractions(() => {
      const { startDate, endDate, label } = dateRangeObj;
      setDateRangeLabel(label);

      // Create lookup maps for O(1) access
      const productMap = new Map(rawProductsData.map((p: any) => [p.id, p]));
      const customerMap = new Map(rawCustomersData.map((c: any) => [c.id, c]));

      // Pre-parse sale dates for faster filtering
      const salesWithDates = rawSalesData.map((sale: any) => ({
        ...sale,
        _parsedDate: sale.createdAt ? new Date(sale.createdAt) : null,
        _parsedItems: (() => {
          try {
            return typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
          } catch {
            return [];
          }
        })(),
      }));

      // Single pass filter
      const filteredSales = salesWithDates.filter((sale: any) => {
        if (!sale._parsedDate) return false;
        return sale._parsedDate >= startDate && sale._parsedDate <= endDate;
      });

      // Initialize accumulators
      let revenue = 0;
      let cost = 0;
      let totalItemsSold = 0;
      const productStats = new Map<string, { name: string; revenue: number; quantity: number }>();
      const customerStats = new Map<string, { name: string; revenue: number; orders: number }>();
      const dailyRevenueMap = new Map<string, number>();

      // Single pass through filtered sales to calculate everything
      filteredSales.forEach((sale: any) => {
        const saleTotal = sale.total || 0;
        revenue += saleTotal;

        // Daily revenue for chart
        if (sale._parsedDate) {
          const dayKey = format(sale._parsedDate, 'yyyy-MM-dd');
          dailyRevenueMap.set(dayKey, (dailyRevenueMap.get(dayKey) || 0) + saleTotal);
        }

        // Process items
        if (Array.isArray(sale._parsedItems)) {
          sale._parsedItems.forEach((item: any) => {
            const product = productMap.get(item.productId);
            if (product) {
              const quantity = item.quantity || 1;
              const itemRevenue = item.price * quantity;
              
              // Product stats
              const existingProduct = productStats.get(item.productId) || {
                name: product.name,
                revenue: 0,
                quantity: 0,
              };
              existingProduct.revenue += itemRevenue;
              existingProduct.quantity += quantity;
              productStats.set(item.productId, existingProduct);

              // Cost calculation
              if (product.cost) {
                cost += product.cost * quantity;
              }

              totalItemsSold += quantity;
            }
          });
        }

        // Customer stats
        if (sale.customerId) {
          const customer = customerMap.get(sale.customerId);
          if (customer) {
            const existingCustomer = customerStats.get(sale.customerId) || {
              name: customer.name,
              revenue: 0,
              orders: 0,
            };
            existingCustomer.revenue += saleTotal;
            existingCustomer.orders += 1;
            customerStats.set(sale.customerId, existingCustomer);
          }
        }
      });

      // Calculate daily revenue array for chart
      const days = getDaysInRange(startDate, endDate);
      const dailyRevenue = days.map(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        return dailyRevenueMap.get(dayKey) || 0;
      });

      const totalOrders = filteredSales.length;
      const profit = revenue - cost;
      const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Previous period calculation
      const prevStartDate = new Date(startDate);
      const prevEndDate = new Date(startDate);
      const periodLength = endDate.getTime() - startDate.getTime();
      prevStartDate.setTime(prevStartDate.getTime() - periodLength);
      prevEndDate.setTime(prevEndDate.getTime() - periodLength);

      const prevSales = salesWithDates.filter((sale: any) => {
        if (!sale._parsedDate) return false;
        return sale._parsedDate >= prevStartDate && sale._parsedDate <= prevEndDate;
      });
      const prevRevenue = prevSales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
      const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue > 0 ? 100 : 0);

      // Inventory value
      const inventoryValue = rawProductsData.reduce((sum: number, product: any) => {
        return sum + ((product.stock || 0) * (product.price || 0));
      }, 0);

      // Batch all state updates together
      setRevenueData(dailyRevenue);
      setTotalRevenue(revenue);
      setTotalCost(cost);
      setTotalProfit(profit);
      setProductPerformance(
        Array.from(productStats.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
      );
      setTopCustomers(
        Array.from(customerStats.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
      );
      setTopProducts(
        Array.from(productStats.values())
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10)
      );
      setBusinessMetrics({
        totalOrders,
        averageOrderValue: totalOrders > 0 ? revenue / totalOrders : 0,
        totalItemsSold,
        avgItemsPerOrder: totalOrders > 0 ? totalItemsSold / totalOrders : 0,
        inventoryValue,
        inventoryTurnover: inventoryValue > 0 ? revenue / inventoryValue : 0,
        profitMarginPercent: revenue > 0 ? (profit / revenue) * 100 : 0,
        salesPerDay: totalOrders / daysDiff,
        revenuePerDay: revenue / daysDiff,
        revenueGrowth,
        uniqueCustomers: customerStats.size,
        avgRevenuePerCustomer: customerStats.size > 0 ? revenue / customerStats.size : 0,
      });
    });

    // Return cleanup function
    return () => handle.cancel();
  }, [dateRangeObj, rawSalesData, rawProductsData, rawCustomersData]);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      await loadRawData();
      setRefreshing(false);
    }
  }, [loadRawData]);

  const getDaysInRange = (start: Date, end: Date): Date[] => {
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const dateRangeOptions: { label: string; value: DateRange }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  const onRefresh = useCallback(() => {
    loadReports(true);
  }, [loadReports]);

  // Load raw data once on mount
  useEffect(() => {
    loadRawData();
  }, [loadRawData]);

  // Recalculate reports when date range changes (using cached data)
  useEffect(() => {
    if (rawSalesData.length > 0 || rawProductsData.length > 0 || rawCustomersData.length > 0) {
      calculateReports();
    }
  }, [dateRange, rawSalesData, rawProductsData, rawCustomersData, calculateReports]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Header
          title="Reports & Analytics"
          subtitle="Business insights"
          showBackButton
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading reports...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Reports & Analytics"
        subtitle={dateRangeLabel}
        showBackButton
        onBackPress={() => navigation.goBack()}
        useSafeArea={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: padding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {/* Date Range Selector */}
        <View style={[styles.dateRangeContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRangeScroll}>
            {dateRangeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dateRangeButton,
                  {
                    backgroundColor: dateRange === option.value ? colors.accent : colors.input,
                    borderColor: dateRange === option.value ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setDateRange(option.value)}
              >
                <Text
                  style={[
                    styles.dateRangeButtonText,
                    {
                      color: dateRange === option.value ? colors.accentContrast : colors.foreground,
                      fontWeight: dateRange === option.value ? fontWeight.semibold : fontWeight.normal,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Cards */}
        <View style={[styles.summaryRow, { gap: spacing.md }]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
            <LinearGradient
              colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryIcon}>
                <Ionicons name="cash" size={isTablet ? 28 : 24} color="white" />
              </View>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text 
                style={[
                  styles.summaryValue,
                  { fontSize: getResponsiveFontSize(formatCurrency(totalRevenue), isTablet, isLargeTablet) }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatCurrency(totalRevenue)}
              </Text>
            </LinearGradient>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, flex: 1 }]}>
            <View style={[styles.summaryContent, { backgroundColor: colors.success + '15' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="trending-up" size={isTablet ? 28 : 24} color={colors.success} />
              </View>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Profit</Text>
              <Text 
                style={[
                  styles.summaryValue, 
                  { color: colors.success },
                  { fontSize: getResponsiveFontSize(formatCurrency(totalProfit), isTablet, isLargeTablet) }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatCurrency(totalProfit)}
              </Text>
            </View>
          </View>
        </View>

        {/* Revenue Chart */}
        <RevenueChart data={revenueData} dateRange={dateRangeLabel} />

        {/* Profit & Loss Card */}
        <ProfitLossCard revenue={totalRevenue} cost={totalCost} profit={totalProfit} isTablet={isTablet} isLargeTablet={isLargeTablet} />

        {/* Product Performance */}
        <ProductPerformanceChart data={productPerformance} />

        {/* Business Metrics */}
        <BusinessMetricsCard metrics={businessMetrics} isTablet={isTablet} isLargeTablet={isLargeTablet} />

        {/* Top Customers */}
        <TopCustomersList data={topCustomers} />

        {/* Top Products */}
        <TopProductsList data={topProducts} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
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
  dateRangeContainer: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  dateRangeScroll: {
    gap: spacing.sm,
  },
  dateRangeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  dateRangeButtonText: {
    fontSize: fontSize.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 0, // Allows flex to shrink properly
  },
  summaryGradient: {
    padding: spacing.lg,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    padding: spacing.lg,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});

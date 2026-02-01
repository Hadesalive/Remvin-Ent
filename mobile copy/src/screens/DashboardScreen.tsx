/**
 * Dashboard Screen
 * Remvin Enterprise LTD Mobile App
 * Design: Modern Card Layout
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, ScrollView, ActivityIndicator, View, Text, TouchableOpacity, RefreshControl, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { DashboardService, DashboardData } from '../services/dashboard.service';
import { useResponsive, getResponsivePadding } from '../lib/responsive';

// Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { HeroCard } from '../components/dashboard/HeroCard';
import { FloatingActionButton } from '../components/dashboard/FloatingActionButton';
import { StatsGrid } from '../components/dashboard/StatsGrid';
import { RecentSales } from '../components/dashboard/RecentSales';
import { WeeklyChart } from '../components/dashboard/WeeklyChart';

// --- Types & Data ---

const DEMO_DATA = {
  profit: {
    amount: "NLe 15,237,000",
    growth: "+15%",
    label: "From the previous week"
  },
  stats: [
    { label: "Total Products", value: "25", icon: "cube", color: "#8B9DC3", trend: "+2 new", featured: false },
    { label: "Total Sold", value: "11.9k", icon: "receipt", color: "#86BC7A", trend: "+15%", featured: false },
    { label: "Low Stock", value: "8", icon: "alert-circle", color: "#E8B86D", trend: "Urgent", featured: false },
    { label: "Total Debt", value: "NLe 45.2k", icon: "cash", color: "#D4888F", trend: "12 Clients", featured: false },
    { label: "Active Customers", value: "156", icon: "people", color: "#7FB5B5", trend: "+8 this week", description: "Clients with recent activity", featured: true }, // Featured KPI
  ],
  recentSales: [
    { id: '1', customer: 'John Doe', date: 'Today, 10:23 AM', amount: 'NLe 1,200', status: 'Paid', statusColor: '#4CD964' },
    { id: '2', customer: 'Sarah Smith', date: 'Today, 09:45 AM', amount: 'NLe 450', status: 'Pending', statusColor: '#FF9500' },
    { id: '3', customer: 'Tech Solutions Ltd', date: 'Yesterday', amount: 'NLe 12,500', status: 'Paid', statusColor: '#4CD964' },
    { id: '4', customer: 'Mike Johnson', date: 'Yesterday', amount: 'NLe 3,200', status: 'Paid', statusColor: '#4CD964' },
  ],
  weeklySales: { data: [4500, 7200, 3100, 8900, 6500, 4800, 9200], growth: 24.5 },
  quickActions: [
    { id: '1', label: 'Invoice', icon: 'document-text', color: '#8B9DC3', route: 'Invoices' }, // Soft blue
    { id: '2', label: 'Product', icon: 'cube', color: '#86BC7A', route: 'Products' }, // Soft green
    { id: '3', label: 'Client', icon: 'person-add', color: '#7FB5B5', route: 'Customers' }, // Soft teal
    { id: '4', label: 'Sale', icon: 'cart', color: '#E8B86D', route: 'NewSale' }, // Soft amber
  ]
};

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isTablet, isLargeTablet, width } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Responsive padding
  const padding = getResponsivePadding(width);

  // Memoize demo data to prevent recreation
  const demoData = useMemo(() => ({
    revenue: DEMO_DATA.profit,
    stats: DEMO_DATA.stats,
    recentSales: DEMO_DATA.recentSales,
    weeklySales: DEMO_DATA.weeklySales,
  }), []);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!dashboardData) {
        setLoading(true);
      }
      setError(null);
      
      // Defer heavy data loading until after interactions
      InteractionManager.runAfterInteractions(async () => {
        try {
          const data = await DashboardService.getDashboardData();
          setDashboardData(data);
        } catch (err: any) {
          console.error('Failed to load dashboard:', err);
          setError(err.message || 'Failed to load dashboard data');
          // Fallback to demo data on error if no data exists
          if (!dashboardData) {
            setDashboardData(demoData as any);
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      });
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
      // Fallback to demo data on error if no data exists
      if (!dashboardData) {
        setDashboardData(demoData as any);
      }
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboardData, demoData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Memoize displayed data to prevent unnecessary re-renders
  const displayData = useMemo(() => dashboardData || demoData, [dashboardData, demoData]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.accent }]}
            onPress={() => loadDashboardData()}
          >
            <Text style={[styles.retryButtonText, { color: colors.accentContrast }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          { padding, maxWidth: isLargeTablet ? 1200 : '100%', alignSelf: 'center', width: '100%' }
        ]} 
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
        
        <DashboardHeader user={user} />
        
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '15' }]}>
            <Text style={[styles.errorBannerText, { color: colors.destructive }]}>
              Using cached data. {error}
            </Text>
          </View>
        )}
        
        <HeroCard data={displayData.revenue} />

        <StatsGrid 
          stats={displayData.stats} 
          showAllOnTablet={true}
        />

        {/* Two-column layout for large tablets */}
        {isLargeTablet ? (
          <View style={styles.twoColumnLayout}>
            <View style={styles.leftColumn}>
              <WeeklyChart data={displayData.weeklySales} />
            </View>
            <View style={styles.rightColumn}>
              <RecentSales data={displayData.recentSales} />
            </View>
          </View>
        ) : (
          <>
            <RecentSales data={displayData.recentSales} />
            <WeeklyChart data={displayData.weeklySales} />
          </>
        )}
        
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton actions={DEMO_DATA.quickActions} navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 0,
  },
  leftColumn: {
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

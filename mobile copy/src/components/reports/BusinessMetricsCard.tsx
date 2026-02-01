import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

function getResponsiveFontSize(text: string, isTablet: boolean, isLargeTablet: boolean, baseSize: number): number {
  const textLength = text.length;
  const scale = isLargeTablet ? 1.15 : isTablet ? 1.1 : 1;
  const scaledBase = baseSize * scale;
  
  // Adjust font size based on text length to prevent overflow
  if (textLength > 20) {
    return scaledBase * 0.7;
  } else if (textLength > 15) {
    return scaledBase * 0.8;
  } else if (textLength > 12) {
    return scaledBase * 0.9;
  }
  return scaledBase;
}

function formatCurrency(value: number): string {
  return `NLe ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const BusinessMetricsCard = ({ metrics, isTablet = false, isLargeTablet = false }: { metrics: any; isTablet?: boolean; isLargeTablet?: boolean }) => {
  const { colors, isDark } = useTheme();
  
  const {
    totalOrders = 0,
    averageOrderValue = 0,
    totalItemsSold = 0,
    avgItemsPerOrder = 0,
    inventoryValue = 0,
    inventoryTurnover = 0,
    profitMarginPercent = 0,
    salesPerDay = 0,
    revenuePerDay = 0,
    revenueGrowth = 0,
    uniqueCustomers = 0,
    avgRevenuePerCustomer = 0,
  } = metrics;

  const metricsData = [
    {
      label: 'Total Orders',
      value: formatNumber(totalOrders),
      icon: 'receipt-outline',
      color: colors.accent,
      gradient: isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9'],
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(averageOrderValue),
      icon: 'cash-outline',
      color: colors.success,
      gradient: isDark ? ['#065F46', '#10B981'] : ['#10B981', '#34D399'],
    },
    {
      label: 'Sales/Day',
      value: formatNumber(salesPerDay, 1),
      icon: 'speedometer-outline',
      color: colors.warning,
      gradient: isDark ? ['#78350F', '#F59E0B'] : ['#F59E0B', '#FBBF24'],
    },
    {
      label: 'Revenue/Day',
      value: formatCurrency(revenuePerDay),
      icon: 'trending-up-outline',
      color: colors.accentSecondary,
      gradient: isDark ? ['#0C4A6E', '#0EA5E9'] : ['#0EA5E9', '#38BDF8'],
    },
  ];

  const bottomMetrics = [
    {
      label: 'Growth Rate',
      value: `${revenueGrowth >= 0 ? '+' : ''}${formatNumber(revenueGrowth, 1)}%`,
      icon: 'arrow-up-outline',
      color: revenueGrowth >= 0 ? colors.success : colors.destructive,
    },
    {
      label: 'Active Customers',
      value: formatNumber(uniqueCustomers),
      icon: 'people-outline',
      color: colors.accent,
    },
    {
      label: 'Avg/Customer',
      value: formatCurrency(avgRevenuePerCustomer),
      icon: 'person-outline',
      color: colors.accentSecondary,
    },
    {
      label: 'Profit Margin',
      value: `${formatNumber(profitMarginPercent, 1)}%`,
      icon: 'trending-up-outline',
      color: profitMarginPercent >= 0 ? colors.success : colors.destructive,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Business Metrics</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Key Performance Indicators</Text>
        </View>
        <Ionicons name="analytics-outline" size={24} color={colors.accent} />
      </View>

      {/* Top Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metricsData.map((metric, index) => (
          <View key={index} style={styles.metricCard}>
            <LinearGradient
              colors={metric.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metricGradient}
            >
              <View style={styles.metricIcon}>
                <Ionicons name={metric.icon as any} size={isTablet ? 24 : 20} color="white" />
              </View>
              <Text 
                style={[
                  styles.metricValue,
                  { fontSize: getResponsiveFontSize(metric.value, isTablet, isLargeTablet, fontSize.lg) }
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {metric.value}
              </Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Bottom Metrics Row */}
      <View style={[styles.bottomRow, { borderTopColor: colors.border }]}>
        {bottomMetrics.map((metric, index) => (
          <View key={index} style={styles.bottomMetric}>
            <View style={[styles.bottomIconBox, { backgroundColor: metric.color + '15' }]}>
              <Ionicons name={metric.icon as any} size={18} color={metric.color} />
            </View>
            <Text 
              style={[
                styles.bottomValue, 
                { color: colors.foreground },
                { fontSize: getResponsiveFontSize(metric.value, isTablet, isLargeTablet, fontSize.base) }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {metric.value}
            </Text>
            <Text style={[styles.bottomLabel, { color: colors.mutedForeground }]}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    maxWidth: '47%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricGradient: {
    padding: spacing.md,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: 'white',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  bottomMetric: {
    flex: 1,
    alignItems: 'center',
  },
  bottomIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  bottomValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  bottomLabel: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});

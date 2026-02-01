import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

function formatCurrency(value: number): string {
  return `NLe ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getResponsiveFontSize(text: string, isTablet: boolean, isLargeTablet: boolean, baseSize: number): number {
  const textLength = text.length;
  const scale = isLargeTablet ? 1.15 : isTablet ? 1.1 : 1;
  const scaledBase = baseSize * scale;
  
  if (textLength > 20) {
    return scaledBase * 0.75;
  } else if (textLength > 15) {
    return scaledBase * 0.85;
  } else if (textLength > 12) {
    return scaledBase * 0.9;
  }
  return scaledBase;
}

export const ProfitLossCard = ({ revenue, cost, profit, isTablet = false, isLargeTablet = false }: { revenue: number; cost: number; profit: number; isTablet?: boolean; isLargeTablet?: boolean }) => {
  const { colors, isDark } = useTheme();
  
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;
  const isPositive = profit >= 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Profit & Loss</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Financial Summary</Text>
        </View>
        <Ionicons name="calculator-outline" size={24} color={colors.accent} />
      </View>

      <View style={styles.content}>
        {/* Revenue */}
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="arrow-up-circle" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Revenue</Text>
          </View>
          <Text 
            style={[
              styles.value, 
              { color: colors.foreground },
              { fontSize: getResponsiveFontSize(formatCurrency(revenue), isTablet, isLargeTablet, fontSize.base) }
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatCurrency(revenue)}
          </Text>
        </View>

        {/* Cost */}
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="arrow-down-circle" size={isTablet ? 22 : 20} color={colors.warning} />
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Cost of Goods</Text>
          </View>
          <Text 
            style={[
              styles.value, 
              { color: colors.foreground },
              { fontSize: getResponsiveFontSize(formatCurrency(cost), isTablet, isLargeTablet, fontSize.base) }
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatCurrency(cost)}
          </Text>
        </View>

        {/* Profit */}
        <LinearGradient
          colors={isPositive 
            ? (isDark ? ['#065F46', '#10B981'] : ['#10B981', '#34D399'])
            : (isDark ? ['#7F1D1D', '#EF4444'] : ['#EF4444', '#F87171'])
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profitRow}
        >
          <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons 
                name={isPositive ? "trending-up" : "trending-down"} 
                size={20} 
                color="white" 
              />
            </View>
            <Text style={styles.profitLabel}>Net Profit</Text>
          </View>
          <View style={styles.profitRight}>
            <Text 
              style={[
                styles.profitValue,
                { fontSize: getResponsiveFontSize(formatCurrency(profit), isTablet, isLargeTablet, fontSize.lg) }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatCurrency(profit)}
            </Text>
            <Text style={styles.profitMargin}>{profitMargin.toFixed(1)}% margin</Text>
          </View>
        </LinearGradient>
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
  content: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  value: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  profitLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: 'white',
  },
  profitRight: {
    alignItems: 'flex-end',
  },
  profitValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -0.5,
  },
  profitMargin: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});

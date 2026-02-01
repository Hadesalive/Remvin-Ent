import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const COLORS = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444'];

export const PaymentMethodChart = ({ data }: { data: any[] }) => {
  const { colors } = useTheme();
  
  const size = Math.min(width - 96, 200);
  const radius = size / 2 - 20;
  const center = size / 2;

  const total = data.reduce((sum, item) => sum + item.amount, 0);
  
  if (total === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Payment Methods</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Revenue Breakdown</Text>
          </View>
          <Ionicons name="card-outline" size={24} color={colors.accent} />
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No payment data available</Text>
        </View>
      </View>
    );
  }
  
  let currentAngle = -90; // Start from top
  const segments: any[] = [];

  data.forEach((item, index) => {
    const percentage = (item.amount / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    segments.push({
      path: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: COLORS[index % COLORS.length],
      percentage,
      method: item.method,
      amount: item.amount,
    });
    
    currentAngle = endAngle;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Payment Methods</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Revenue Breakdown</Text>
        </View>
        <Ionicons name="card-outline" size={24} color={colors.accent} />
      </View>

      {data.length === 0 || total === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No payment data available</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.chartContainer}>
            <Svg width={size} height={size}>
              {segments.map((segment, index) => (
                <Path
                  key={index}
                  d={segment.path}
                  fill={segment.color}
                  opacity={0.8}
                />
              ))}
              <Circle cx={center} cy={center} r={radius * 0.6} fill={colors.card} />
            </Svg>
          </View>

          <View style={styles.legend}>
            {segments.map((segment, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                <View style={styles.legendContent}>
                  <Text style={[styles.legendMethod, { color: colors.foreground }]}>
                    {segment.method}
                  </Text>
                  <View style={styles.legendRow}>
                    <Text style={[styles.legendAmount, { color: colors.accent }]}>
                      NLe {segment.amount.toLocaleString()}
                    </Text>
                    <Text style={[styles.legendPercentage, { color: colors.mutedForeground }]}>
                      {segment.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
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
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flex: 1,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendContent: {
    flex: 1,
  },
  legendMethod: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendAmount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  legendPercentage: {
    fontSize: fontSize.xs,
  },
});

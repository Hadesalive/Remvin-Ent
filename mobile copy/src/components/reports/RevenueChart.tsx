import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export const RevenueChart = ({ data, dateRange }: { data: number[]; dateRange: string }) => {
  const { colors } = useTheme();
  
  const chartWidth = width - 48;
  const chartHeight = 200;
  const padding = 20;
  const innerWidth = chartWidth - (padding * 2);
  const innerHeight = chartHeight - (padding * 2);

  // Ensure data is valid
  const validData = data.map((val: any) => {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) || num < 0 ? 0 : num;
  });

  const maxValue = validData.length > 0 ? Math.max(...validData) : 0;
  const max = maxValue > 0 ? maxValue * 1.15 : 1;

  // Generate bar chart
  const barWidth = validData.length > 0 ? innerWidth / validData.length - 4 : 0;
  const maxBarHeight = innerHeight;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Revenue Trend</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{dateRange}</Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg height={chartHeight} width={chartWidth}>
          <Defs>
            <SvgLinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2563EB" stopOpacity="0.8" />
              <Stop offset="1" stopColor="#0EA5E9" stopOpacity="0.4" />
            </SvgLinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <Path
              key={i}
              d={`M ${padding},${padding + innerHeight * t} L ${chartWidth - padding},${padding + innerHeight * t}`}
              stroke={colors.border}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}

          {/* Bars */}
          {validData.map((value: number, index: number) => {
            const barHeight = (value / max) * maxBarHeight;
            const x = padding + index * (barWidth + 4) + 2;
            const y = padding + innerHeight - barHeight;

            return (
              <Rect
                key={index}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="url(#barGrad)"
                rx={4}
              />
            );
          })}
        </Svg>

        {/* X-axis labels */}
        <View style={styles.labelsContainer}>
          {validData.map((_, index) => {
            const label = validData.length <= 7 
              ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index] || `${index + 1}`
              : `${index + 1}`;
            return (
              <Text key={index} style={[styles.label, { color: colors.mutedForeground }]}>
                {label}
              </Text>
            );
          })}
        </View>
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
  chartContainer: {
    alignItems: 'center',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.sm,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});

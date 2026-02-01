import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';

const { width } = Dimensions.get('window');

export const WeeklyChart = ({ data }: any) => {
  const { colors } = useTheme();
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Extract data array and growth from the data object
  const salesData = data?.data || data || [];
  const growth = data?.growth || 0;
  
  // Ensure data is valid and filter out invalid numbers
  const validData = salesData.map((val: any) => {
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) || num < 0 ? 0 : num;
  });
  
  const maxValue = validData.length > 0 ? Math.max(...validData) : 0;
  const max = maxValue > 0 ? maxValue * 1.2 : 1; // Avoid division by zero
  const chartHeight = 180;
  const chartWidth = width - 48; // Full card width

  // Generate smooth path
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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weekly Sales</Text>
        <View style={[styles.trendBadge, { backgroundColor: growth >= 0 ? '#F0FDF4' : '#FEF2F2' }]}>
          <Text style={[styles.trendText, { color: growth >= 0 ? '#10B981' : '#EF4444' }]}>
            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
          </Text>
        </View>
      </View>
      
      <View style={[styles.listCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <Svg height={chartHeight} width={chartWidth}>
          <Defs>
            <SvgLinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#2563EB" stopOpacity="0.2" />
              <Stop offset="1" stopColor="#2563EB" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <Path 
              key={i}
              d={`M 0,${chartHeight * t} L ${chartWidth},${chartHeight * t}`} 
              stroke={colors.border} 
              strokeWidth="1" 
              strokeDasharray="4,4"
            />
          ))}

          {/* Area Fill */}
          <Path d={fillPath} fill="url(#chartGrad)" />
          
          {/* Line */}
          <Path d={linePath} fill="none" stroke="#2563EB" strokeWidth="3" />
          
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
            <Text key={i} style={[styles.chartLabelText, { color: colors.mutedForeground }]}>{day}</Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: fontWeight.medium,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: fontWeight.medium,
  },
  listCard: {
    borderRadius: 16,
    padding: 0,
    overflow: 'hidden',
    paddingBottom: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  chartLabelText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
    width: 30,
  },
});

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Svg, { Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export const ProductPerformanceChart = ({ data }: { data: any[] }) => {
  const { colors } = useTheme();
  
  const chartWidth = width - 96;
  const maxRevenue = data.length > 0 ? Math.max(...data.map((d: any) => d.revenue)) : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Top Products</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>By Revenue</Text>
        </View>
        <Ionicons name="cube-outline" size={24} color={colors.accent} />
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No product data available</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {data.map((item: any, index: number) => {
            const percentage = (item.revenue / maxRevenue) * 100;
            return (
              <View key={index} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.itemValue, { color: colors.accent }]}>
                    NLe {item.revenue.toLocaleString()}
                  </Text>
                </View>
                <View style={[styles.barContainer, { backgroundColor: colors.input }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${percentage}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
                <View style={styles.itemFooter}>
                  <Text style={[styles.itemQuantity, { color: colors.mutedForeground }]}>
                    {item.quantity} sold
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
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
    maxHeight: 400,
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
  item: {
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginRight: spacing.sm,
  },
  itemValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  itemQuantity: {
    fontSize: fontSize.xs,
  },
});

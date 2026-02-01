import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

export const TopProductsList = ({ data }: { data: any[] }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Top Products</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>By Quantity Sold</Text>
        </View>
        <Ionicons name="cube-outline" size={24} color={colors.accent} />
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No product data available</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {data.map((product, index) => (
            <View
              key={index}
              style={[
                styles.item,
                index !== data.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.rankBadge, { backgroundColor: colors.accent + '15' }]}>
                  <Text style={[styles.rankText, { color: colors.accent }]}>#{index + 1}</Text>
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={[styles.revenue, { color: colors.mutedForeground }]}>
                    NLe {product.revenue.toLocaleString()} revenue
                  </Text>
                </View>
              </View>
              <View style={[styles.quantityBadge, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[styles.quantityText, { color: colors.accent }]}>
                  {product.quantity} {product.quantity === 1 ? 'unit' : 'units'}
                </Text>
              </View>
            </View>
          ))}
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
  list: {
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  itemContent: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  revenue: {
    fontSize: fontSize.xs,
  },
  quantityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  quantityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});

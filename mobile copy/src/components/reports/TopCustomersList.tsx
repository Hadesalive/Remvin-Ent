import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { Ionicons } from '@expo/vector-icons';

function formatCurrency(value: number): string {
  return `NLe ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TopCustomersList = ({ data }: { data: any[] }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Top Customers</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>By Revenue</Text>
        </View>
        <Ionicons name="people-outline" size={24} color={colors.accent} />
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No customer data available</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {data.map((customer, index) => (
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
                  <Text style={[styles.customerName, { color: colors.foreground }]} numberOfLines={1}>
                    {customer.name}
                  </Text>
                  <Text style={[styles.orderCount, { color: colors.mutedForeground }]}>
                    {customer.orders} {customer.orders === 1 ? 'order' : 'orders'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.revenue, { color: colors.accent }]}>
                {formatCurrency(customer.revenue)}
              </Text>
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
  customerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  orderCount: {
    fontSize: fontSize.xs,
  },
  revenue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

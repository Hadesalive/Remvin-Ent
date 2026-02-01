import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';

export const RecentSales = ({ data }: any) => {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Sales</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>View all</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.listCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        {data.map((sale: any, index: number) => (
          <View 
            key={sale.id} 
            style={[
              styles.saleRow, 
              index === data.length - 1 && styles.lastRow,
              { borderBottomColor: colors.border }
            ]}
          >
            <View style={styles.saleLeft}>
              <View style={[styles.saleAvatar, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[styles.saleAvatarText, { color: colors.accent }]}>
                  {sale.customer[0]}
                </Text>
              </View>
              <View>
                <Text style={[styles.customerName, { color: colors.foreground }]}>{sale.customer}</Text>
                <Text style={[styles.saleDate, { color: colors.mutedForeground }]}>{sale.date}</Text>
              </View>
            </View>
            
            <View style={styles.saleRight}>
              <Text style={[styles.saleAmount, { color: colors.foreground }]}>{sale.amount}</Text>
              <View style={[styles.statusBadge, { backgroundColor: sale.statusColor + '15' }]}>
                <Text style={[styles.statusText, { color: sale.statusColor }]}>{sale.status}</Text>
              </View>
            </View>
          </View>
        ))}
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
  seeAllText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: fontWeight.normal,
    textTransform: 'lowercase',
  },
  listCard: {
    borderRadius: 16,
    padding: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  saleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saleAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saleAvatarText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  customerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  saleDate: {
    fontSize: 12,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { useResponsive } from '../../lib/responsive';

export const RecentSales = ({ data }: any) => {
  const { colors } = useTheme();
  const { isTablet, isLargeTablet, width } = useResponsive();

  const avatarSize = isLargeTablet ? 56 : isTablet ? 52 : 40;
  const cardPadding = isLargeTablet ? 24 : isTablet ? 20 : 14;
  const rowPadding = isLargeTablet ? 20 : isTablet ? 18 : 12;
  const gapSize = isLargeTablet ? 16 : isTablet ? 14 : 12;
  const isEmpty = !data || data.length === 0;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[
          styles.sectionTitle, 
          { 
            color: colors.foreground,
            fontSize: isLargeTablet ? 20 : isTablet ? 18 : 16,
            fontWeight: isTablet ? fontWeight.semibold : fontWeight.medium,
          }
        ]}>Recent Sales</Text>
        {!isEmpty && (
          <TouchableOpacity style={{ padding: isLargeTablet ? 10 : isTablet ? 8 : 4 }}>
            <Text style={[
              styles.seeAllText, 
              { 
                fontSize: isLargeTablet ? 15 : isTablet ? 14 : 13,
                color: colors.accent,
              }
            ]}>View all</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={[
        styles.listCard, 
        { 
          backgroundColor: colors.card, 
          shadowColor: colors.shadow,
          padding: isEmpty ? (isLargeTablet ? 48 : isTablet ? 40 : 32) : cardPadding,
          borderRadius: isTablet ? 18 : 16,
          maxWidth: isLargeTablet ? width * 0.5 : undefined, // Constrain width on large tablets for two-column layout
        }
      ]}>
        {isEmpty ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
              <Text style={[styles.emptyIcon, { color: colors.mutedForeground }]}>📊</Text>
            </View>
            <Text style={[
              styles.emptyTitle, 
              { 
                color: colors.foreground,
                fontSize: isLargeTablet ? 18 : isTablet ? 16 : 14,
                fontWeight: fontWeight.semibold,
              }
            ]}>No Sales Yet</Text>
            <Text style={[
              styles.emptyDescription, 
              { 
                color: colors.mutedForeground,
                fontSize: isLargeTablet ? 15 : isTablet ? 14 : 12,
                maxWidth: isTablet ? 400 : 280,
                lineHeight: isTablet ? 22 : 18,
              }
            ]}>Recent sales will appear here once you start making transactions</Text>
          </View>
        ) : (
          data.map((sale: any, index: number) => (
          <View 
            key={sale.id} 
            style={[
              styles.saleRow, 
              index === data.length - 1 && styles.lastRow,
              { 
                borderBottomColor: colors.border,
                paddingVertical: rowPadding,
                gap: gapSize,
              }
            ]}
          >
            <View style={[styles.saleLeft, { gap: gapSize }]}>
              <View style={[
                styles.saleAvatar, 
                { 
                  backgroundColor: colors.accent + '15',
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                }
              ]}>
                <Text style={[
                  styles.saleAvatarText, 
                  { 
                    color: colors.accent,
                    fontSize: isLargeTablet ? 24 : isTablet ? 22 : fontSize.base,
                    fontWeight: fontWeight.bold,
                  }
                ]}>
                  {sale.customer[0]}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[
                  styles.customerName, 
                  { 
                    color: colors.foreground,
                    fontSize: isLargeTablet ? 16 : isTablet ? fontSize.base : fontSize.sm,
                    fontWeight: fontWeight.semibold,
                    marginBottom: isTablet ? 4 : 2,
                  }
                ]} numberOfLines={1} ellipsizeMode="tail">{sale.customer}</Text>
                <Text style={[
                  styles.saleDate, 
                  { 
                    color: colors.mutedForeground,
                    fontSize: isLargeTablet ? 14 : isTablet ? 13 : 12,
                  }
                ]}>{sale.date}</Text>
              </View>
            </View>
            
            <View style={styles.saleRight}>
              <Text style={[
                styles.saleAmount, 
                { 
                  color: colors.foreground,
                  fontSize: isLargeTablet ? 17 : isTablet ? fontSize.base : fontSize.sm,
                  fontWeight: fontWeight.bold,
                  marginBottom: isTablet ? 6 : 4,
                }
              ]}>{sale.amount}</Text>
              <View style={[
                styles.statusBadge, 
                { 
                  backgroundColor: sale.statusColor + '15',
                  paddingHorizontal: isLargeTablet ? 12 : isTablet ? 10 : 8,
                  paddingVertical: isLargeTablet ? 6 : isTablet ? 4 : 2,
                  borderRadius: isTablet ? 10 : 8,
                }
              ]}>
                <Text style={[
                  styles.statusText, 
                  { 
                    color: sale.statusColor,
                    fontSize: isLargeTablet ? 12 : isTablet ? 11 : 10,
                    fontWeight: fontWeight.semibold,
                  }
                ]}>{sale.status}</Text>
              </View>
            </View>
          </View>
          ))
        )}
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
    minHeight: 32, // Ensure consistent height
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
    flex: 1,
    minWidth: 0, // Allow text truncation
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
    marginLeft: 12, // Ensure spacing from left content
    flexShrink: 0, // Prevent shrinking
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
});

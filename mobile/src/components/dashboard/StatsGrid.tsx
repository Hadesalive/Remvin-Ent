import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';

const { width } = Dimensions.get('window');

const StatCard = ({ item, colors }: any) => (
  <View style={[styles.statCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
    <View style={styles.statTopRow}>
      <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon as any} size={18} color={item.color} />
      </View>
      <View style={[styles.trendPill, { backgroundColor: colors.muted }]}>
        <Text style={[styles.trendText, { color: colors.mutedForeground }]}>
          {item.trend}
        </Text>
      </View>
    </View>
    
    <View style={styles.statContent}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{item.value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
    </View>
  </View>
);

export const StatsGrid = ({ stats }: any) => {
  const { colors } = useTheme();

  return (
    <View style={styles.gridContainer}>
      {stats.map((stat: any, index: number) => (
        <StatCard key={index} item={stat} colors={colors} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: (width - 48 - 12) / 2,
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
    marginLeft: 2,
  },
  statContent: {
    marginTop: 'auto',
  },
  statValue: {
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: fontWeight.normal,
    textTransform: 'none',
    opacity: 0.5,
    letterSpacing: 0,
  },
});


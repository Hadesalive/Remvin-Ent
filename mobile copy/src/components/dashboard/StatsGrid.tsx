import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';
import { useResponsive } from '../../lib/responsive';

const StatCard = ({ item, colors, cardWidth, isTablet, isFeatured }: any) => (
  <View style={[
    styles.statCard, 
    { 
      backgroundColor: colors.card, 
      shadowColor: colors.shadow,
      width: cardWidth,
      minHeight: isFeatured ? (isTablet ? 160 : 140) : (isTablet ? 140 : 120),
      padding: isTablet ? 20 : 16,
    }
  ]}>
    <View style={styles.statTopRow}>
      <View style={[
        styles.iconBox, 
        { 
          backgroundColor: item.color + '15',
          width: isFeatured ? (isTablet ? 52 : 44) : (isTablet ? 44 : 36),
          height: isFeatured ? (isTablet ? 52 : 44) : (isTablet ? 44 : 36),
        }
      ]}>
        <Ionicons name={item.icon as any} size={isFeatured ? (isTablet ? 26 : 22) : (isTablet ? 22 : 18)} color={item.color} />
      </View>
      <View style={[styles.trendPill, { backgroundColor: colors.muted }]}>
        <Text style={[styles.trendText, { color: colors.mutedForeground, fontSize: isTablet ? 11 : 10 }]}>
          {item.trend}
        </Text>
      </View>
    </View>
    
    <View style={styles.statContent}>
      <Text style={[
        styles.statValue, 
        { 
          color: colors.foreground,
          fontSize: isFeatured ? (isTablet ? 28 : 24) : (isTablet ? 24 : 20),
        }
      ]}>{item.value}</Text>
      <Text style={[
        styles.statLabel, 
        { 
          color: colors.mutedForeground,
          fontSize: isTablet ? 12 : 11,
        }
      ]}>{item.label}</Text>
      {isFeatured && item.description && (
        <Text style={[
          styles.statDescription, 
          { 
            color: colors.mutedForeground,
            fontSize: isTablet ? 11 : 10,
            marginTop: 4,
          }
        ]}>
          {item.description}
        </Text>
      )}
    </View>
  </View>
);

export const StatsGrid = ({ stats, showAllOnTablet = true }: any) => {
  const { colors } = useTheme();
  const { isTablet, isLargeTablet, width, isPhone } = useResponsive();
  
  // Show 4 on phone, 5 on tablet
  const displayStats = (isTablet || isLargeTablet) ? stats.slice(0, 5) : stats.slice(0, 4);
  
  
  // Calculate spacing and widths
  const gap = (isTablet || isLargeTablet) ? 16 : 12;
  const containerPadding = isLargeTablet ? 32 : (isTablet ? 24 : 0);
  const maxWidth = isLargeTablet ? 1200 : width;
  const availableWidth = maxWidth - (containerPadding * 2);
  
  // On phone: 2 columns, on tablet: special layout with featured card
  // Tablet: 3 columns per row, with featured card taking exactly 2 columns (double width)
  const regularCardWidth = (isTablet || isLargeTablet)
    ? (availableWidth - (gap * 2)) / 3 // 3 cards per row on tablet
    : (availableWidth - gap) / 2; // 2 cards per row on phone
  
  // Featured card is exactly 2x regular card width + 1 gap for seamless layout
  const featuredCardWidth = (isTablet || isLargeTablet) 
    ? (regularCardWidth * 2) + gap // Exactly 2 regular cards + 1 gap between them
    : regularCardWidth;

  return (
    <View style={[styles.gridContainer, { gap }]}>
      {displayStats.map((stat: any, index: number) => {
        const isFeatured = stat.featured && (isTablet || isLargeTablet);
        const cardWidth = isFeatured ? featuredCardWidth : regularCardWidth;
        
        return (
          <StatCard 
            key={index} 
            item={stat} 
            colors={colors} 
            cardWidth={cardWidth}
            isTablet={isTablet || isLargeTablet}
            isFeatured={isFeatured}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  statCard: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
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
  statDescription: {
    fontWeight: fontWeight.normal,
    opacity: 0.6,
    lineHeight: 16,
  },
});


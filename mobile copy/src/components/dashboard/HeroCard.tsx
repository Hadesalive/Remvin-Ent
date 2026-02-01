import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../lib/theme';
import { useResponsive } from '../../lib/responsive';

export const HeroCard = ({ data }: any) => {
  const { isDark } = useTheme();
  const { isTablet, isLargeTablet } = useResponsive();
  
  // Theme-aware gradient colors
  const gradientColors: [string, string] = isDark 
    ? ['#1E3A8A', '#1E293B'] // Dark blue blended with dark slate
    : ['#2563EB', '#0EA5E9']; // Bright blue for light mode

  const iconSize = isLargeTablet ? 48 : isTablet ? 44 : 36;
  const iconInnerSize = isLargeTablet ? 28 : isTablet ? 24 : 20;
  const valueSize = isLargeTablet ? 36 : isTablet ? 32 : 26;
  const padding = isLargeTablet ? 28 : isTablet ? 24 : 20;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.heroCard,
        { 
          padding,
          minHeight: isLargeTablet ? 180 : isTablet ? 160 : 140,
        }
      ]}
    >
      <View style={styles.heroContent}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroLabel, { fontSize: isTablet ? 14 : 12 }]}>Total Revenue</Text>
          <Text style={[styles.heroValue, { fontSize: valueSize }]}>{data.amount}</Text>
        </View>
        
        <View style={[
          styles.iconCircle,
          { 
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
          }
        ]}>
          <Ionicons name="wallet-outline" size={iconInnerSize} color="white" />
        </View>
      </View>

      <View style={styles.heroFooter}>
        <View style={styles.growthBadge}>
          <Ionicons name="trending-up" size={isTablet ? 16 : 14} color="white" style={{ marginRight: 4 }} />
          <Text style={[styles.growthText, { fontSize: isTablet ? 13 : 11 }]}>{data.growth}</Text>
        </View>
        <Text style={[styles.growthLabel, { fontSize: isTablet ? 13 : 11 }]}>{data.label}</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    marginBottom: spacing.xl,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: fontWeight.normal,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    letterSpacing: 0,
    textTransform: 'none',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: fontWeight.semibold,
    color: 'white',
    letterSpacing: -0.5,
  },
  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  growthText: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: fontWeight.medium,
    fontSize: 11,
  },
  growthLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: fontWeight.normal,
  },
});

import { StyleSheet } from 'react-native';

// --- Color Palette (Modern Slate/Blue System) ---
export const colors = {
  // Light theme
  background: '#F1F5F9', // Slate 100 - Cool gray background
  foreground: '#0F172A', // Slate 900 - Deep, rich text
  muted: '#F8FAFC',
  mutedForeground: '#64748B', // Slate 500
  card: '#FFFFFF',
  cardForeground: '#0F172A',
  popover: '#FFFFFF',
  popoverForeground: '#0F172A',
  border: '#E2E8F0', // Slate 200
  input: '#F1F5F9',
  
  accent: '#2563EB', // Blue 600 - Vibrant Primary
  accentSecondary: '#0EA5E9', // Sky 500
  accentContrast: '#FFFFFF',
  
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  destructive: '#EF4444', // Red 500
  
  shadow: '#0F172A', // For colored shadows

  // Dark theme
  dark: {
    background: '#020617', // Slate 950
    foreground: '#F8FAFC', // Slate 50
    muted: '#1E293B', // Slate 800
    mutedForeground: '#94A3B8', // Slate 400
    card: '#0F172A', // Slate 900
    cardForeground: '#F8FAFC',
    popover: '#0F172A',
    popoverForeground: '#F8FAFC',
    border: '#1E293B',
    input: '#1E293B',

    accent: '#3B82F6', // Blue 500
    accentSecondary: '#38BDF8', // Sky 400
    accentContrast: '#FFFFFF',
    
    success: '#34D399',
    warning: '#FBBF24',
    destructive: '#F87171',
    
    shadow: '#000000',
  }
};

export const getThemeColors = (isDark: boolean) => {
  return isDark ? colors.dark : colors;
};

// --- Design Tokens ---
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  display: 42,
};

export const fontWeight = {
  normal: '400' as '400',
  medium: '500' as '500',
  semibold: '600' as '600',
  bold: '700' as '700',
  extrabold: '800' as '800',
  black: '900' as '900',
};

// Common Text Styles for easy use
export const textStyles = StyleSheet.create({
  display: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.black,
    letterSpacing: -1.5,
  },
  h1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.extrabold,
    letterSpacing: -1,
  },
  h2: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.5,
  }
});

/**
 * Responsive Utilities
 * Helper functions for responsive layouts and tablet optimization
 */

import { useWindowDimensions } from 'react-native';

export interface Breakpoints {
  isPhone: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  width: number;
  height: number;
}

/**
 * Hook to get responsive breakpoints
 */
export function useResponsive(): Breakpoints {
  const { width, height } = useWindowDimensions();

  return {
    isPhone: width < 768,
    isTablet: width >= 768 && width < 1024,
    isLargeTablet: width >= 1024,
    width,
    height,
  };
}

/**
 * Get number of columns for grid layouts based on screen width
 */
export function getGridColumns(width: number, itemMinWidth: number = 300): number {
  return Math.max(1, Math.floor(width / itemMinWidth));
}

/**
 * Get responsive padding
 */
export function getResponsivePadding(width: number): number {
  if (width >= 1024) return 32; // Large tablet
  if (width >= 768) return 24;  // Tablet
  return 16; // Phone
}

/**
 * Get responsive font scale
 */
export function getResponsiveFontScale(width: number): number {
  if (width >= 1024) return 1.15; // Large tablet
  if (width >= 768) return 1.1;   // Tablet
  return 1; // Phone
}

/**
 * Check if device should use master-detail layout
 */
export function shouldUseMasterDetail(width: number): boolean {
  return width >= 900;
}

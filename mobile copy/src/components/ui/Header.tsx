/**
 * Universal Header Component
 * Industry-standard header component following React Native best practices
 * Supports: title, subtitle, back button, action buttons, and custom content
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';

export interface HeaderAction {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export interface HeaderProps {
  /**
   * Main title text
   */
  title: string;
  
  /**
   * Optional subtitle text
   */
  subtitle?: string;
  
  /**
   * Show back button
   */
  showBackButton?: boolean;
  
  /**
   * Custom back button handler (defaults to navigation.goBack())
   */
  onBackPress?: () => void;
  
  /**
   * Array of action buttons to display on the right
   */
  actions?: HeaderAction[];
  
  /**
   * Custom content to render on the right side (overrides actions)
   */
  rightContent?: React.ReactNode;
  
  /**
   * Optional custom header content (replaces title/subtitle)
   */
  customContent?: React.ReactNode;
  
  /**
   * Border at bottom
   */
  showBorder?: boolean;
  
  /**
   * Wrap with SafeAreaView (defaults to true)
   */
  useSafeArea?: boolean;
  
  /**
   * Safe area edges (defaults to ['top'])
   */
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  
  /**
   * Custom container style
   */
  containerStyle?: ViewStyle;
  
  /**
   * Custom title style
   */
  titleStyle?: TextStyle;
  
  /**
   * Custom subtitle style
   */
  subtitleStyle?: TextStyle;
  
  /**
   * Test ID for testing
   */
  testID?: string;
}

export function Header({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  actions = [],
  rightContent,
  customContent,
  showBorder = true,
  useSafeArea = true,
  safeAreaEdges = ['top'],
  containerStyle,
  titleStyle,
  subtitleStyle,
  testID,
}: HeaderProps) {
  const { colors } = useTheme();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    }
  };

  const renderActionButton = (action: HeaderAction, index: number) => {
    const iconColor = action.color || colors.accent;
    const backgroundColor = action.backgroundColor || iconColor + '15';
    const opacity = action.disabled ? 0.5 : 1;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.actionButton,
          { backgroundColor },
          { opacity },
        ]}
        onPress={action.onPress}
        disabled={action.disabled || action.loading}
        accessibilityLabel={action.accessibilityLabel || action.icon}
        accessibilityRole="button"
        accessibilityState={{ disabled: action.disabled || action.loading }}
        testID={action.testID}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {action.loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={action.icon} size={20} color={iconColor} />
        )}
      </TouchableOpacity>
    );
  };

  const content = (
    <View
      style={[
        styles.container,
        showBorder && { borderBottomColor: colors.border, borderBottomWidth: 1 },
        !useSafeArea && { backgroundColor: colors.background },
        containerStyle,
      ]}
    >
      {/* Left: Back Button */}
      {showBackButton && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
      )}

      {/* Center: Title/Subtitle or Custom Content */}
      <View style={styles.centerContent}>
        {customContent ? (
          customContent
        ) : (
          <>
            <Text
              style={[
                styles.title,
                { color: colors.foreground },
                titleStyle,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
              testID={`${testID}-title`}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.subtitle,
                  { color: colors.mutedForeground },
                  subtitleStyle,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
                testID={`${testID}-subtitle`}
              >
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Right: Actions or Custom Content */}
      <View style={styles.rightContent}>
        {rightContent || (
          <>
            {actions.map((action, index) => renderActionButton(action, index))}
          </>
        )}
      </View>
    </View>
  );

  if (useSafeArea) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[
          styles.safeArea,
          { backgroundColor: colors.background },
        ]}
        testID={testID}
      >
        {content}
      </SafeAreaView>
    );
  }

  return <View testID={testID}>{content}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 1000,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
    borderRadius: 8,
  },
  centerContent: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0, // Allows text truncation
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

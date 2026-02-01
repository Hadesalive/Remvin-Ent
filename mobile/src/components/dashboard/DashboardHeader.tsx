import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../../lib/theme';

export const DashboardHeader = ({ user }: any) => {
  const { colors, toggleTheme, themeMode } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getThemeIcon = () => {
    if (themeMode === 'dark') return 'moon';
    if (themeMode === 'light') return 'sunny';
    return 'phone-portrait'; // System
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>
            {getInitials(user?.fullName || user?.username)}
          </Text>
        </View>

        {/* Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={[styles.greetingText, { color: colors.mutedForeground }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>
            {user?.fullName?.split(' ')[0] || user?.username || 'User'}
          </Text>
        </View>
      </View>
      
      <View style={styles.headerRight}>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: colors.card }]}
          onPress={toggleTheme}
        >
          <Ionicons 
            name={getThemeIcon() as any} 
            size={20} 
            color={colors.mutedForeground} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
    paddingTop: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: fontWeight.semibold,
  },
  greetingContainer: {
    gap: 2,
    flex: 1,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: fontWeight.normal,
    lineHeight: 20,
    letterSpacing: 0,
  },
  userName: {
    fontSize: 22,
    fontWeight: fontWeight.medium,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
});

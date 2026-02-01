/**
 * More Screen
 * Navigation hub for additional features
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { Header } from '../components/ui/Header';

export default function MoreScreen({ navigation }: any) {
  const { colors } = useTheme();

  const menuItems = [
    {
      id: 'product-models',
      title: 'Product Models',
      subtitle: 'Manage product models',
      icon: 'cube-outline',
      color: '#8B5CF6',
      onPress: () => navigation.navigate('ProductModelList'),
    },
    {
      id: 'inventory-items',
      title: 'IMEI Inventory',
      subtitle: 'Track IMEI items',
      icon: 'barcode-outline',
      color: '#06B6D4',
      onPress: () => navigation.navigate('InventoryItemList'),
    },
    {
      id: 'swaps',
      title: 'Device Swaps',
      subtitle: 'Manage trade-in transactions',
      icon: 'swap-horizontal-outline',
      color: '#F59E0B',
      onPress: () => navigation.navigate('SwapsList'),
    },
    {
      id: 'debts',
      title: 'Debts',
      subtitle: 'Manage customer debts',
      icon: 'receipt-outline',
      color: '#EF4444',
      onPress: () => navigation.navigate('DebtList'),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences',
      icon: 'settings-outline',
      color: colors.accent,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'View sales reports',
      icon: 'bar-chart-outline',
      color: '#10B981',
      onPress: () => {
        navigation.navigate('Reports');
      },
    },
    {
      id: 'invoices',
      title: 'Invoices',
      subtitle: 'Manage invoices',
      icon: 'document-text-outline',
      color: '#3B82F6',
      onPress: () => {
        // TODO: Navigate to invoices
      },
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Header
        title="More"
        subtitle="Additional features and options"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.menuSubtitle, { color: colors.mutedForeground }]}>
                  {item.subtitle}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  content: {
    padding: spacing.lg,
  },
  menuGrid: {
    gap: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: fontSize.xs,
  },
});


/**
 * User List Screen
 * Display all users with role management
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { UserService } from '../services/user.service';
import { User } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../lib/constants';

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'N/A';
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'admin':
      return '#EF4444';
    case 'manager':
      return '#F59E0B';
    case 'cashier':
      return '#3B82F6';
    default:
      return '#6B7280';
  }
}

interface UserListScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: { userId?: string }) => void;
    addListener: (type: string, callback: () => void) => () => void;
  };
}

export default function UserListScreen({ navigation }: UserListScreenProps) {
  const { colors, isDark } = useTheme();
  const { user: currentUser, hasPermission, hasRole, logout } = useAuth();
  // Admin and manager can manage users, or check permission
  const canManageUsers = hasRole(['admin', 'manager']) || hasPermission(PERMISSIONS.MANAGE_USERS);
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'cashier'>('all');

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await UserService.getUsers();
      setUsers(data || []);
    } catch {
      setUsers([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    const unsubscribe = navigation.addListener('focus', () => {
      void loadUsers();
    });
    return unsubscribe;
  }, [navigation, loadUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return [];
    }
    // Start with only active users by default so "deleted" (deactivated) users are hidden
    let filtered = users.filter(user => user.isActive !== false);

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const username = user.username?.toLowerCase() || '';
        const fullName = user.fullName?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        return username.includes(term) || fullName.includes(term) || email.includes(term);
      });
    }

    return filtered;
  }, [users, searchTerm, roleFilter]);

  const metricsData = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return { total: 0, active: 0, admins: 0, managers: 0, cashiers: 0 };
    }
    // Only count active users in KPIs so deactivated users are excluded
    const activeUsers = users.filter(u => u.isActive !== false);
    const total = activeUsers.length;
    const active = activeUsers.length;
    const admins = activeUsers.filter(u => u.role === 'admin').length;
    const managers = activeUsers.filter(u => u.role === 'manager').length;
    const cashiers = activeUsers.filter(u => u.role === 'cashier').length;
    return { total, active, admins, managers, cashiers };
  }, [users]);

  const handleDeleteUser = useCallback(
    (userToDelete: User) => {
      if (!canManageUsers) return;

      if (currentUser && userToDelete.id === currentUser.id) {
        Alert.alert('Not allowed', 'You cannot delete your own account.');
        return;
      }

      Alert.alert(
        'Delete User',
        `Are you sure you want to delete "${userToDelete.fullName || userToDelete.username}"? This will deactivate their account.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await UserService.deleteUser(userToDelete.id);
                await loadUsers();
              } catch (error: unknown) {
                const message =
                  error instanceof Error ? error.message : 'Failed to delete user';
                Alert.alert('Error', message);
              }
            },
          },
        ]
      );
    },
    [canManageUsers, currentUser, loadUsers]
  );

  const renderUserItem = ({ item: user }: { item: User }) => {
    const roleColor = getRoleColor(user.role);

    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('NewUser', { userId: user.id })}
        activeOpacity={0.7}
      >
        <View style={styles.userItemLeft}>
          <View style={[styles.avatar, { backgroundColor: roleColor + '15' }]}>
            <Text style={[styles.avatarText, { color: roleColor }]}>
              {user.fullName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={[styles.userName, { color: colors.foreground }]}>
                {user.fullName || user.username}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.userUsername, { color: colors.mutedForeground }]}>
              @{user.username}
            </Text>
            {user.email && (
              <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                {user.email}
              </Text>
            )}
            <View style={styles.userFooter}>
              <Text style={[styles.userDate, { color: colors.mutedForeground }]}>
                Created: {formatDate(user.createdAt)}
              </Text>
              {!user.isActive && (
                <View style={[styles.inactiveBadge, { backgroundColor: colors.destructive + '15' }]}>
                  <Text style={[styles.inactiveText, { color: colors.destructive }]}>
                    INACTIVE
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {canManageUsers && (!currentUser || currentUser.id !== user.id) && (
            <TouchableOpacity
              onPress={() => handleDeleteUser(user)}
              style={{ padding: 4 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.destructive} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View>
      {/* Metrics Card */}
      <LinearGradient
        colors={isDark ? ['#8B5CF6', '#7C3AED'] : ['#8B5CF6', '#6D28D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Users</Text>
            <Text style={styles.metricValue}>{metricsData.total}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Active</Text>
            <Text style={styles.metricValue}>{metricsData.active}</Text>
          </View>
        </View>
        <View style={[styles.metricsRow, { marginTop: spacing.md }]}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Admins</Text>
            <Text style={styles.metricValue}>{metricsData.admins}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Managers</Text>
            <Text style={styles.metricValue}>{metricsData.managers}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Cashiers</Text>
            <Text style={styles.metricValue}>{metricsData.cashiers}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search users..."
          placeholderTextColor={colors.mutedForeground}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {(['all', 'admin', 'manager', 'cashier'] as const).map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.filterChip,
                {
                  backgroundColor: roleFilter === role ? colors.accent : colors.muted,
                  borderColor: roleFilter === role ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setRoleFilter(role)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: roleFilter === role ? colors.accentContrast : colors.mutedForeground,
                  },
                ]}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          All Users ({filteredUsers.length})
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading users...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canManageUsers) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Header
          title="Users"
          subtitle="User Management"
          showBackButton
          onBackPress={() => navigation.goBack()}
          actions={[
            {
              icon: 'log-out-outline',
              onPress: async () => {
                await logout();
              },
              color: colors.destructive,
              backgroundColor: colors.destructive + '15',
              accessibilityLabel: 'Logout',
            },
          ]}
          useSafeArea={false}
          showBorder={false}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>
            Access Denied
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.mutedForeground }]}>
            You don&apos;t have permission to manage users
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Users"
        subtitle={`${metricsData.total} ${metricsData.total === 1 ? 'user' : 'users'}`}
        actions={[
          {
            icon: 'log-out-outline',
            onPress: async () => {
              await logout();
            },
            color: colors.destructive,
            backgroundColor: colors.destructive + '15',
            accessibilityLabel: 'Logout',
          },
          {
            icon: 'add',
            onPress: () => navigation.navigate('NewUser'),
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            accessibilityLabel: 'Create new user',
          },
        ]}
        showBorder={false}
        useSafeArea={false}
      />
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No users found</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              {searchTerm || roleFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new user to get started'}
            </Text>
            {!searchTerm && roleFilter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewUser')}
              >
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Create User
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  metricsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  userItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  userName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  userUsername: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  userFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  userDate: {
    fontSize: fontSize.xs,
  },
  inactiveBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inactiveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

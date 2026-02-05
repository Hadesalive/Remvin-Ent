/**
 * New User Screen
 * Create and edit users with role management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { UserService } from '../services/user.service';
import { User } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { SelectionModal } from '../components/ui/SelectionModal';

interface NewUserScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: { userId?: string }) => void;
  };
  route: {
    params?: {
      userId?: string;
    };
  };
}

const ROLES: ('admin' | 'manager' | 'cashier')[] = ['admin', 'manager', 'cashier'];

export default function NewUserScreen({ navigation, route }: NewUserScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId;
  const isEditMode = !!userId;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [employeeId, setEmployeeId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const loadUser = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingUser(true);
      const user = await UserService.getUserById(userId);
      if (!user) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }

      setUsername(user.username || '');
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setRole(user.role || 'cashier');
      setEmployeeId(user.employeeId || '');
      setIsActive(user.isActive !== false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user data';

      Alert.alert('Error', errorMessage);
      navigation.goBack();
    } finally {
      setLoadingUser(false);
    }
  }, [userId, navigation]);

  useEffect(() => {
    if (isEditMode && userId) {
      loadUser();
    }
  }, [isEditMode, userId, loadUser]);

  const validateEmail = (email: string) => {
    if (!email.trim()) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username is required');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }

    if (!isEditMode && !password.trim()) {
      Alert.alert('Validation Error', 'Password is required for new users');
      return;
    }

    if (password.trim() && password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return;
    }

    if (email.trim() && !validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode && userId) {
        await UserService.updateUser(userId, {
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          role,
          employeeId: employeeId.trim() || null,
          isActive,
        });
        Alert.alert('Success', 'User updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await UserService.createUser({
          username: username.trim(),
          password: password.trim(),
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          role,
          employeeId: employeeId.trim() || null,
        });
        Alert.alert('Success', 'User created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} user`;

      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading user...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isEditMode ? 'Edit User' : 'New User'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isEditMode ? 'Update user details' : 'Create a new user account'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* User Information */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>User Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Username *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                editable={!isEditMode}
              />
            </View>

            {!isEditMode && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Password *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password (min 6 characters)"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email (optional)"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Phone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone (optional)"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Employee ID</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={employeeId}
                onChangeText={setEmployeeId}
                placeholder="Enter employee ID (optional)"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {/* Role & Status */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="shield-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Role & Status</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Role *</Text>
              <TouchableOpacity
                style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}
                onPress={() => setShowRoleModal(true)}
              >
                <Text style={[styles.selectButtonText, { color: colors.foreground }]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {isEditMode && (
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={[styles.label, { color: colors.foreground }]}>Active</Text>
                    <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                      Inactive users cannot log in
                    </Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: colors.muted, true: colors.accent + '80' }}
                    thumbColor={isActive ? colors.accent : colors.mutedForeground}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentContrast} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.accentContrast} />
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  {isEditMode ? 'Update User' : 'Create User'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={showRoleModal}
        title="Select Role"
        options={ROLES.map(r => ({ label: r.charAt(0).toUpperCase() + r.slice(1), value: r }))}
        selectedValue={role}
        onSelect={(value) => {
          setRole(value as 'admin' | 'manager' | 'cashier');
          setShowRoleModal(false);
        }}
        onClose={() => setShowRoleModal(false)}
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    fontSize: fontSize.base,
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: fontSize.base,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  helperText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

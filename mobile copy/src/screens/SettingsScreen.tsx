/**
 * Settings Screen
 * Manage app preferences and company settings with local storage persistence
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { SettingsService, Preferences, CompanySettings } from '../services/settings.service';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { Header } from '../components/ui/Header';

interface SettingsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'company'>('general');

  // Preferences
  const [preferences, setPreferences] = useState<Preferences>({
    defaultPaymentMethod: 'cash',
    invoiceNumberFormat: 'INV-{YYYY}-{MM}-{####}',
    receiptFooter: 'Thank you for your business!',
    autoCalculateTax: true,
    showTaxBreakdown: true,
    printReceipts: true,
    autoBackup: true,
    backupFrequency: 'daily',
    defaultDiscountPercent: 0,
    requireCustomerInfo: false,
    darkMode: false,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currencyPosition: 'before',
    decimalPlaces: 2,
    soundEffects: true,
  });

  // Company Settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    taxRate: 0.15,
    currency: 'NLe',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [prefs, company] = await Promise.all([
        SettingsService.getPreferences(),
        SettingsService.getCompanySettings(),
      ]);
      setPreferences(prefs);
      setCompanySettings(company);
    } catch (error: unknown) {
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    try {
      setSaving(true);
      
      // Validation
      if (!companySettings.companyName.trim()) {
        Alert.alert('Error', 'Company name is required');
        return;
      }
      
      if (companySettings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companySettings.email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
      
      if (companySettings.taxRate < 0 || companySettings.taxRate > 1) {
        Alert.alert('Error', 'Tax rate must be between 0% and 100%');
        return;
      }
      
      await SettingsService.updateCompanySettings(companySettings);
      Alert.alert('Success', 'Company settings saved successfully');
    } catch (error: unknown) {
      Alert.alert('Error', 'Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Header
        title="Settings"
        subtitle="Manage app preferences"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'general' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('general')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'general' ? colors.accent : colors.mutedForeground },
            ]}
          >
            General
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'company' && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('company')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'company' ? colors.accent : colors.mutedForeground },
            ]}
          >
            Company
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'general' ? (
          <>
            {/* App Appearance */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Appearance</Text>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Theme</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Choose light, dark, or follow system
                  </Text>
                </View>
                <View style={styles.themeModeRow}>
                  {(['system', 'light', 'dark'] as const).map(mode => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.themeModeChip,
                        {
                          borderColor: themeMode === mode ? colors.accent : colors.border,
                          backgroundColor:
                            themeMode === mode ? colors.accent + '15' : colors.input,
                        },
                      ]}
                      onPress={() => {
                        setThemeMode(mode);
                      }}
                    >
                      <Text
                        style={[
                          styles.themeModeChipText,
                          {
                            color: themeMode === mode ? colors.accent : colors.mutedForeground,
                          },
                        ]}
                      >
                        {mode === 'system'
                          ? 'System'
                          : mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Account / Session */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-circle-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
              </View>

              {user && (
                <View style={styles.accountRow}>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: colors.foreground }]}>
                      {user.fullName || user.username}
                    </Text>
                    <Text style={[styles.accountDetail, { color: colors.mutedForeground }]}>
                      @{user.username} • {user.role.toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.logoutButton, { borderColor: colors.destructive }]}
                    onPress={async () => {
                      await logout();
                    }}
                  >
                    <Ionicons
                      name="log-out-outline"
                      size={18}
                      color={colors.destructive}
                    />
                    <Text
                      style={[styles.logoutText, { color: colors.destructive }]}
                    >
                      Logout
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Company Information */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Company Information</Text>
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Company Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={companySettings.companyName}
                  onChangeText={(text) => setCompanySettings({ ...companySettings, companyName: text })}
                  placeholder="Enter company name"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={companySettings.address}
                  onChangeText={(text) => setCompanySettings({ ...companySettings, address: text })}
                  placeholder="Enter company address"
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={companySettings.phone}
                  onChangeText={(text) => setCompanySettings({ ...companySettings, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={companySettings.email}
                  onChangeText={(text) => setCompanySettings({ ...companySettings, email: text })}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Tax Rate (%)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={String((companySettings.taxRate * 100).toFixed(2))}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setCompanySettings({ ...companySettings, taxRate: Math.max(0, Math.min(100, num)) / 100 });
                  }}
                  placeholder="15"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.foreground }]}>Currency</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={companySettings.currency}
                  onChangeText={(text) => setCompanySettings({ ...companySettings, currency: text })}
                  placeholder="NLe"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
              onPress={handleSaveCompanySettings}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.accentContrast} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.accentContrast }]}>Save Company Settings</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  themeModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  themeModeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
  },
  themeModeChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accountInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  accountName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  accountDetail: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  settingLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: fontSize.sm,
  },
  settingRight: {
    alignItems: 'flex-end',
  },
  selectButton: {
    minWidth: 120,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: fontSize.sm,
    marginRight: spacing.xs,
  },
  numberInput: {
    width: 80,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    textAlign: 'center',
    borderWidth: 1,
  },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    borderWidth: 1,
  },
  textArea: {
    height: 80,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  formRow: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

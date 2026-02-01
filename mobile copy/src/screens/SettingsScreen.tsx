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
import { SettingsService, Preferences, CompanySettings } from '../services/settings.service';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { Header } from '../components/ui/Header';

export default function SettingsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
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
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await SettingsService.updatePreferences(preferences);
      Alert.alert('Success', 'Preferences saved successfully');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
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
    } catch (error: any) {
      console.error('Failed to save company settings:', error);
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
            {/* Sales Preferences */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="receipt-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Sales Preferences</Text>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Default Payment Method</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Default payment method for new sales
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <TouchableOpacity
                    style={[styles.selectButton, { backgroundColor: colors.input, borderColor: colors.border }]}
                    onPress={() => {
                      Alert.alert(
                        'Payment Method',
                        'Select default payment method',
                        [
                          { text: 'Cash', onPress: () => setPreferences({ ...preferences, defaultPaymentMethod: 'cash' }) },
                          { text: 'Card', onPress: () => setPreferences({ ...preferences, defaultPaymentMethod: 'card' }) },
                          { text: 'Bank Transfer', onPress: () => setPreferences({ ...preferences, defaultPaymentMethod: 'bank_transfer' }) },
                          { text: 'Store Credit', onPress: () => setPreferences({ ...preferences, defaultPaymentMethod: 'credit' }) },
                          { text: 'Other', onPress: () => setPreferences({ ...preferences, defaultPaymentMethod: 'other' }) },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.selectButtonText, { color: colors.foreground }]}>
                      {preferences.defaultPaymentMethod.charAt(0).toUpperCase() + preferences.defaultPaymentMethod.slice(1).replace('_', ' ')}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Default Discount %</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Default discount percentage for new sales
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <TextInput
                    style={[styles.numberInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={String(preferences.defaultDiscountPercent)}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      setPreferences({ ...preferences, defaultDiscountPercent: Math.max(0, Math.min(100, num)) });
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Auto Calculate Tax</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Automatically calculate tax on sales
                  </Text>
                </View>
                <Switch
                  value={preferences.autoCalculateTax}
                  onValueChange={(value) => setPreferences({ ...preferences, autoCalculateTax: value })}
                  trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                  thumbColor={preferences.autoCalculateTax ? colors.accent : colors.mutedForeground}
                />
              </View>

              <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Show Tax Breakdown</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Show tax breakdown on receipts
                  </Text>
                </View>
                <Switch
                  value={preferences.showTaxBreakdown}
                  onValueChange={(value) => setPreferences({ ...preferences, showTaxBreakdown: value })}
                  trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                  thumbColor={preferences.showTaxBreakdown ? colors.accent : colors.mutedForeground}
                />
              </View>

              <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Require Customer Info</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Require customer information for sales
                  </Text>
                </View>
                <Switch
                  value={preferences.requireCustomerInfo}
                  onValueChange={(value) => setPreferences({ ...preferences, requireCustomerInfo: value })}
                  trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                  thumbColor={preferences.requireCustomerInfo ? colors.accent : colors.mutedForeground}
                />
              </View>
            </View>

            {/* Receipt Preferences */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Receipt Preferences</Text>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Invoice Number Format</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Format for invoice numbers
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={preferences.invoiceNumberFormat}
                  onChangeText={(text) => setPreferences({ ...preferences, invoiceNumberFormat: text })}
                  placeholder="INV-{YYYY}-{MM}-{####}"
                />
              </View>

              <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Receipt Footer</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Footer text on receipts
                  </Text>
                </View>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={preferences.receiptFooter}
                  onChangeText={(text) => setPreferences({ ...preferences, receiptFooter: text })}
                  placeholder="Thank you for your business!"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={[styles.settingRow, { borderTopColor: colors.border }]}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Print Receipts</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Automatically print receipts after sale
                  </Text>
                </View>
                <Switch
                  value={preferences.printReceipts}
                  onValueChange={(value) => setPreferences({ ...preferences, printReceipts: value })}
                  trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                  thumbColor={preferences.printReceipts ? colors.accent : colors.mutedForeground}
                />
              </View>
            </View>

            {/* App Preferences */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings-outline" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>App Preferences</Text>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Text style={[styles.settingLabel, { color: colors.foreground }]}>Sound Effects</Text>
                  <Text style={[styles.settingDescription, { color: colors.mutedForeground }]}>
                    Play sound effects for actions
                  </Text>
                </View>
                <Switch
                  value={preferences.soundEffects}
                  onValueChange={(value) => setPreferences({ ...preferences, soundEffects: value })}
                  trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                  thumbColor={preferences.soundEffects ? colors.accent : colors.mutedForeground}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
              onPress={handleSavePreferences}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.accentContrast} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.accentContrast }]}>Save Preferences</Text>
              )}
            </TouchableOpacity>
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

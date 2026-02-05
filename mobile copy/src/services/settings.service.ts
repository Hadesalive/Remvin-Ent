/**
 * Settings Service
 * Handles local storage persistence for app settings using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@remvin:settings';

export interface Preferences {
  defaultPaymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit' | 'other';
  invoiceNumberFormat: string;
  receiptFooter: string;
  autoCalculateTax: boolean;
  showTaxBreakdown: boolean;
  printReceipts: boolean;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  defaultDiscountPercent: number;
  requireCustomerInfo: boolean;
  darkMode: boolean;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currencyPosition: 'before' | 'after';
  decimalPlaces: number;
  soundEffects: boolean;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
}

export interface AppSettings {
  preferences: Preferences;
  companySettings: CompanySettings;
}

const defaultPreferences: Preferences = {
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
};

const defaultCompanySettings: CompanySettings = {
  companyName: '',
  address: '',
  phone: '',
  email: '',
  taxRate: 0.15,
  currency: 'NLe',
};

export const SettingsService = {
  /**
   * Get all settings from AsyncStorage
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        const settings = JSON.parse(data) as AppSettings;
        return {
          preferences: { ...defaultPreferences, ...settings.preferences },
          companySettings: { ...defaultCompanySettings, ...settings.companySettings },
        };
      }
      return {
        preferences: defaultPreferences,
        companySettings: defaultCompanySettings,
      };
    } catch (error) {
      return {
        preferences: defaultPreferences,
        companySettings: defaultCompanySettings,
      };
    }
  },

  /**
   * Save all settings to AsyncStorage
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get preferences only
   */
  async getPreferences(): Promise<Preferences> {
    const settings = await this.getSettings();
    return settings.preferences;
  },

  /**
   * Update preferences
   */
  async updatePreferences(preferences: Partial<Preferences>): Promise<Preferences> {
    const settings = await this.getSettings();
    const updatedPreferences = { ...settings.preferences, ...preferences };
    const updatedSettings = { ...settings, preferences: updatedPreferences };
    await this.saveSettings(updatedSettings);
    return updatedPreferences;
  },

  /**
   * Get company settings only
   */
  async getCompanySettings(): Promise<CompanySettings> {
    const settings = await this.getSettings();
    return settings.companySettings;
  },

  /**
   * Update company settings
   */
  async updateCompanySettings(companySettings: Partial<CompanySettings>): Promise<CompanySettings> {
    const settings = await this.getSettings();
    const updatedCompanySettings = { ...settings.companySettings, ...companySettings };
    const updatedSettings = { ...settings, companySettings: updatedCompanySettings };
    await this.saveSettings(updatedSettings);
    return updatedCompanySettings;
  },
};

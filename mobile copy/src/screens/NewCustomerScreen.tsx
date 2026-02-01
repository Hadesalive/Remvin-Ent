/**
 * New Customer Screen
 * Create and edit customers with full form validation
 */

import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { Customer } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

export default function NewCustomerScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const customerId = route?.params?.customerId;
  const isEditMode = !!customerId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  useEffect(() => {
    if (isEditMode && customerId) {
      loadCustomer();
    }
  }, [customerId]);

  const loadCustomer = async () => {
    if (!customerId) return;

    try {
      setLoadingCustomer(true);
      const { data, error } = await DatabaseService.getCustomerById(customerId);
      if (error || !data) {
        Alert.alert('Error', 'Customer not found');
        navigation.goBack();
        return;
      }

      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
      setCity(data.city || '');
      setState(data.state || '');
      setZip(data.zip || '');
      setCountry(data.country || '');
      setCompany(data.company || '');
      setNotes(data.notes || '');
      setIsActive(data.isActive !== false);
    } catch (error: any) {
      console.error('Failed to load customer:', error);
      Alert.alert('Error', 'Failed to load customer data');
      navigation.goBack();
    } finally {
      setLoadingCustomer(false);
    }
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Customer name is required');
      return;
    }

    if (email.trim() && !validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      const customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        country: country.trim() || undefined,
        company: company.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive: isActive,
      };

      if (isEditMode && customerId) {
        const result = await DatabaseService.updateCustomer(customerId, customerData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to update customer');
          return;
        }
        Alert.alert('Success', 'Customer updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const result = await DatabaseService.createCustomer(customerData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to create customer');
          return;
        }
        Alert.alert('Success', 'Customer created!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} customer`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCustomer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading customer...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isEditMode ? 'Edit Customer' : 'New Customer'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Basic Information</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Full Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g., John Doe"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={email}
                onChangeText={setEmail}
                placeholder="e.g., john@example.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Phone</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g., +232 76 123456"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Company</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={company}
                onChangeText={setCompany}
                placeholder="Optional company name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {/* Address Information */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Address</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Street Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Street address"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>City</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>State</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>ZIP Code</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={zip}
                  onChangeText={setZip}
                  placeholder="ZIP"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Country</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Country"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </View>

          {/* Additional Information */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Additional Information</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Notes</Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes about this customer"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={[styles.formGroup, styles.switchRow]}>
              <Text style={[styles.label, { color: colors.foreground }]}>Active</Text>
              <Switch
                trackColor={{ false: colors.muted, true: colors.accent }}
                thumbColor={colors.card}
                ios_backgroundColor={colors.muted}
                onValueChange={setIsActive}
                value={isActive}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentContrast} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                {isEditMode ? 'Update Customer' : 'Create Customer'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  card: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    minHeight: 80,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing['4xl'],
  },
  submitButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});


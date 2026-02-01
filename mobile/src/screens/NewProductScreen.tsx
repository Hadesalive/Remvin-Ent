/**
 * New Product Screen
 * Create and edit products with full form validation
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

export default function NewProductScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const productId = route?.params?.productId;
  const isEditMode = !!productId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);

  useEffect(() => {
    if (isEditMode && productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;

    try {
      setLoadingProduct(true);
      const products = await DatabaseService.getProducts();
      const product = products.data?.find(p => p.id === productId);

      if (!product) {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
        return;
      }

      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price?.toString() || '');
      setCost(product.cost?.toString() || '');
      setSku(product.sku || '');
      setStock(product.stock?.toString() || '0');
      setMinStock(product.minStock?.toString() || '');
      setCategory(product.category || '');
    } catch (error: any) {
      console.error('Failed to load product:', error);
      Alert.alert('Error', 'Failed to load product data');
      navigation.goBack();
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }

    const priceValue = parseFloat(price);
    if (!priceValue || priceValue <= 0) {
      Alert.alert('Error', 'Product price must be greater than 0');
      return;
    }

    const stockValue = parseInt(stock) || 0;
    if (stockValue < 0) {
      Alert.alert('Error', 'Stock cannot be negative');
      return;
    }

    const costValue = cost.trim() ? parseFloat(cost) : undefined;
    if (costValue !== undefined && costValue < 0) {
      Alert.alert('Error', 'Cost cannot be negative');
      return;
    }

    const minStockValue = minStock.trim() ? parseInt(minStock) : undefined;
    if (minStockValue !== undefined && minStockValue < 0) {
      Alert.alert('Error', 'Minimum stock cannot be negative');
      return;
    }

    setSubmitting(true);
    try {
      const productData = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceValue,
        cost: costValue,
        sku: sku.trim() || undefined,
        stock: stockValue,
        minStock: minStockValue,
        category: category.trim() || undefined,
        isActive: true,
      };

      if (isEditMode && productId) {
        const result = await DatabaseService.updateProduct(productId, productData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to update product');
          return;
        }
        Alert.alert('Success', 'Product updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const result = await DatabaseService.createProduct(productData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to create product');
          return;
        }
        Alert.alert('Success', 'Product created!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading product...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isEditMode ? 'Edit Product' : 'New Product'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isEditMode ? 'Update product details' : 'Add a new product to inventory'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Basic Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Product Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter product name"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>IMEI/Serial Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={sku}
                onChangeText={setSku}
                placeholder="Optional IMEI/Serial Number"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={category}
                onChangeText={setCategory}
                placeholder="Optional category"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
          </View>

          {/* Pricing */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pricing</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Price (NLe) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Cost (NLe)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={cost}
                onChangeText={setCost}
                placeholder="Optional cost"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Inventory */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Inventory</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Stock *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={stock}
                onChangeText={setStock}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Minimum Stock</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={minStock}
                onChangeText={setMinStock}
                placeholder="Optional minimum stock"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="numeric"
              />
            </View>
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
                <Ionicons name={isEditMode ? "checkmark-circle" : "add-circle"} size={24} color={colors.accentContrast} />
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  {isEditMode ? 'Update Product' : 'Create Product'}
                </Text>
              </>
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
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  section: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
  textArea: {
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    fontSize: fontSize.base,
    minHeight: 80,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.sm,
    marginTop: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
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
});


/**
 * New Product Screen
 * Create and edit products with full form validation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ProductModelService } from '../services/product-model.service';
import { Product, ProductModel } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { SelectionModal } from '../components/ui/SelectionModal';

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
  const [productModelId, setProductModelId] = useState<string>('');
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<ProductModel | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [supportsPhysicalSim, setSupportsPhysicalSim] = useState(false);
  const [supportsEsim, setSupportsEsim] = useState(false);
  const [physicalSimPrice, setPhysicalSimPrice] = useState('');
  const [eSimPrice, setEsimPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const hasLoadedInitialData = useRef(false);

  // Load initial data only once on mount
  const loadInitialData = useCallback(async () => {
    if (hasLoadedInitialData.current) return;
    
    try {
      hasLoadedInitialData.current = true;
      // Load product models
      const modelsResult = await ProductModelService.getProductModels();
      if (modelsResult.data) {
        setProductModels(modelsResult.data.filter(m => m.isActive !== false));
      }

      // Load existing categories
      const productsResult = await DatabaseService.getProducts();
      if (productsResult.data) {
        const uniqueCategories = Array.from(
          new Set(
            productsResult.data
              .map(p => p.category)
              .filter((cat): cat is string => Boolean(cat?.trim()))
          )
        ).sort();
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      hasLoadedInitialData.current = false; // Reset on error so it can retry
    }
  }, []);

  // Load initial data once on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load product data when editing
  useEffect(() => {
    if (isEditMode && productId) {
      loadProduct();
    }
  }, [productId, isEditMode]);

  // Update selected model when productModelId changes
  useEffect(() => {
    const model = productModels.find(m => m.id === productModelId) || null;
    setSelectedModel(model);
    // Clear storage/color if model doesn't have those options
    if (model) {
      if (model.storageOptions && model.storageOptions.length > 0 && !model.storageOptions.includes(storage)) {
        setStorage('');
      }
      if (model.colors && model.colors.length > 0 && !model.colors.includes(color)) {
        setColor('');
      }
    }
  }, [productModelId, productModels]);

  // Auto-generate product name from model + storage + color
  useEffect(() => {
    if (selectedModel && storage && color) {
      setName(`${selectedModel.name} ${storage} ${color}`);
    } else if (selectedModel && storage) {
      setName(`${selectedModel.name} ${storage}`);
    } else if (selectedModel) {
      setName(selectedModel.name);
    }
  }, [selectedModel, storage, color]);

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
      setProductModelId(product.productModelId || '');
      setStorage(product.storage || '');
      setColor(product.color || '');
      setSupportsPhysicalSim(product.supportsPhysicalSim ?? false);
      setSupportsEsim(product.supportsEsim ?? false);
      setPhysicalSimPrice(
        product.physicalSimPrice !== undefined && product.physicalSimPrice !== null
          ? String(product.physicalSimPrice)
          : ''
      );
      setEsimPrice(
        product.eSimPrice !== undefined && product.eSimPrice !== null
          ? String(product.eSimPrice)
          : ''
      );
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

    // For IMEI-tracked products (with productModelId), stock should be 0 (calculated from inventory_items)
    const stockValue = productModelId ? 0 : (parseInt(stock) || 0);
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
      productModelId: productModelId || undefined,
      storage: storage.trim() || undefined,
      color: color.trim() || undefined,
      supportsPhysicalSim,
      supportsEsim,
      physicalSimPrice: physicalSimPrice.trim()
        ? parseFloat(physicalSimPrice)
        : undefined,
      eSimPrice: eSimPrice.trim() ? parseFloat(eSimPrice) : undefined,
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
          {/* Product Details */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="cube-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Product Details</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Product Model (optional)</Text>
              <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowModelModal(true)}
                >
                  <Text style={[styles.selectButtonText, { color: productModelId ? colors.foreground : colors.mutedForeground }]}>
                    {productModelId 
                      ? productModels.find(m => m.id === productModelId)?.name || 'Selected Model'
                      : 'Select a model (optional)'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {productModelId && (
                <Text style={[styles.helperText, { color: colors.accent, marginTop: spacing.xs }]}>
                  ✓ IMEI Tracking enabled
                </Text>
              )}
            </View>

            {productModelId && selectedModel && selectedModel.storageOptions && selectedModel.storageOptions.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Storage Capacity *</Text>
                <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowStorageModal(true)}
                  >
                    <Text style={[styles.selectButtonText, { color: storage ? colors.foreground : colors.mutedForeground }]}>
                      {storage || 'Select storage'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {productModelId && selectedModel && selectedModel.colors && selectedModel.colors.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Color *</Text>
                <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowColorModal(true)}
                  >
                    <Text style={[styles.selectButtonText, { color: color ? colors.foreground : colors.mutedForeground }]}>
                      {color || 'Select color'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Product Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder={productModelId ? "Auto-generated from model" : "Enter product name"}
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Description (optional)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what this product is..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g., Smartphones"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>SKU</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={sku}
                  onChangeText={setSku}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
            </View>
          </View>

          {/* Pricing */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="cash-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pricing</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Selling Price *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Cost (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={cost}
                  onChangeText={setCost}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            {price && cost && parseFloat(price) > 0 && parseFloat(cost) >= 0 && (
              <View style={[styles.profitBanner, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '30' }]}>
                <Text style={[styles.profitLabel, { color: colors.foreground }]}>Profit per item:</Text>
                <Text style={[styles.profitValue, { color: '#10B981' }]}>
                  NLe {(parseFloat(price) - parseFloat(cost || '0')).toFixed(2)}
                </Text>
              </View>
            )}
            {/* SIM-specific pricing (optional, overrides when SIM type is chosen) */}
            <View style={styles.inputGroup}>
              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>
                      Physical SIM Price (optional)
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={physicalSimPrice}
                    onChangeText={setPhysicalSimPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: colors.mutedForeground }]}>
                      eSIM Price (optional)
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                    value={eSimPrice}
                    onChangeText={setEsimPrice}
                    placeholder="0.00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                If set, inventory items with a SIM type can inherit these prices. Leaving blank uses the main selling price.
              </Text>
            </View>
          </View>

          {/* Stock & Inventory */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="layers-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Stock & Inventory</Text>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: spacing.sm }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Stock {productModelId ? '(Auto)' : '*'}
                </Text>
                <TextInput
                  style={[
                    styles.input, 
                    { 
                      backgroundColor: productModelId ? colors.muted : colors.input, 
                      color: productModelId ? colors.mutedForeground : colors.foreground, 
                      borderColor: colors.border 
                    }
                  ]}
                  value={productModelId ? '0' : stock}
                  onChangeText={productModelId ? undefined : setStock}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  editable={!productModelId}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Min Stock</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={minStock}
                  onChangeText={setMinStock}
                  placeholder="Optional"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {productModelId && (
              <Text style={[styles.helperText, { color: colors.mutedForeground, marginTop: spacing.xs }]}>
                Stock auto-calculated from inventory items
              </Text>
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
                <Ionicons name={isEditMode ? "checkmark-circle" : "add-circle"} size={24} color={colors.accentContrast} />
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  {isEditMode ? 'Update Product' : 'Create Product'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Selection Modals */}
      <SelectionModal
        visible={showModelModal}
        title="Select Product Model"
        options={[
          { label: 'None (Manual Product)', value: '' },
          ...productModels.map(m => ({ 
            label: `${m.name}${m.brand ? ` (${m.brand})` : ''}`, 
            value: m.id 
          }))
        ]}
        selectedValue={productModelId}
        onSelect={(value) => {
          setProductModelId(value);
          if (!value) {
            setStorage('');
            setColor('');
          }
        }}
        onClose={() => setShowModelModal(false)}
      />

      {selectedModel && selectedModel.storageOptions && selectedModel.storageOptions.length > 0 && (
        <SelectionModal
          visible={showStorageModal}
          title="Select Storage Capacity"
          options={selectedModel.storageOptions.map(s => ({ label: s, value: s }))}
          selectedValue={storage}
          onSelect={setStorage}
          onClose={() => setShowStorageModal(false)}
        />
      )}

      {selectedModel && selectedModel.colors && selectedModel.colors.length > 0 && (
        <SelectionModal
          visible={showColorModal}
          title="Select Color"
          options={selectedModel.colors.map(c => ({ label: c, value: c }))}
          selectedValue={color}
          onSelect={setColor}
          onClose={() => setShowColorModal(false)}
        />
      )}
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
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
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
  selectContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  selectButtonText: {
    fontSize: fontSize.base,
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  infoBannerText: {
    fontSize: fontSize.xs,
    flex: 1,
  },
  helperText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  profitLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  profitValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});


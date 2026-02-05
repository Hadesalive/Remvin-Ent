/**
 * New Product Model Screen
 * Create and edit product models with colors and storage options
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
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ProductModelService } from '../services/product-model.service';
import { DatabaseService } from '../services/database.service';
import { ProductModel } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { SelectionModal } from '../components/ui/SelectionModal';

const BRANDS = ['Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Oppo', 'Vivo', 'OnePlus', 'Google', 'Other'];
const CATEGORIES = ['Smartphones', 'Tablets', 'Accessories', 'Other'];

export default function NewProductModelScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const modelId = route?.params?.modelId;
  const isEditMode = !!modelId;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [productColors, setProductColors] = useState<string[]>([]);
  const [storageOptions, setStorageOptions] = useState<string[]>([]);
  const [supportsPhysicalSim, setSupportsPhysicalSim] = useState(true);
  const [supportsEsim, setSupportsEsim] = useState(false);
  const [physicalSimPrice, setPhysicalSimPrice] = useState('');
  const [eSimPrice, setEsimPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [newColor, setNewColor] = useState('');
  const [newStorage, setNewStorage] = useState('');
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const hasLoadedCategories = useRef(false);

  useEffect(() => {
    loadCategories();
    if (isEditMode && modelId) {
      loadModel();
    }
  }, [modelId, isEditMode]);

  const loadCategories = useCallback(async () => {
    if (hasLoadedCategories.current) return;
    try {
      hasLoadedCategories.current = true;
      const result = await DatabaseService.getProducts();
      if (result.data) {
        const cats = Array.from(
          new Set(result.data.map(p => p.category).filter((c): c is string => Boolean(c?.trim())))
        ).sort();
        setExistingCategories([...new Set([...CATEGORIES, ...cats])]);
      }
    } catch (error) {
    }
  }, []);

  const loadModel = async () => {
    if (!modelId) return;
    try {
      setLoadingModel(true);
      const result = await ProductModelService.getProductModelById(modelId);
      if (result.error || !result.data) {
        Alert.alert('Error', 'Model not found');
        navigation.goBack();
        return;
      }
      const model = result.data;
      setName(model.name || '');
      setBrand(model.brand || '');
      setCategory(model.category || '');
      setDescription(model.description || '');
      setProductColors(model.colors || []);
      setStorageOptions(model.storageOptions || []);
      setSupportsPhysicalSim(model.supportsPhysicalSim ?? true);
      setSupportsEsim(model.supportsEsim ?? false);
      setPhysicalSimPrice(
        model.physicalSimPrice !== undefined && model.physicalSimPrice !== null
          ? String(model.physicalSimPrice)
          : ''
      );
      setEsimPrice(
        model.eSimPrice !== undefined && model.eSimPrice !== null
          ? String(model.eSimPrice)
          : ''
      );
      setIsActive(model.isActive !== false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load model data');
      navigation.goBack();
    } finally {
      setLoadingModel(false);
    }
  };

  const handleAddColor = () => {
    if (newColor.trim() && !productColors.includes(newColor.trim())) {
      setProductColors([...productColors, newColor.trim()]);
      setNewColor('');
    }
  };

  const handleRemoveColor = (index: number) => {
    setProductColors(productColors.filter((_, i) => i !== index));
  };

  const handleAddStorage = () => {
    if (newStorage.trim() && !storageOptions.includes(newStorage.trim())) {
      setStorageOptions([...storageOptions, newStorage.trim()]);
      setNewStorage('');
    }
  };

  const handleRemoveStorage = (index: number) => {
    setStorageOptions(storageOptions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Model name is required');
      return;
    }

    setSubmitting(true);
    try {
      const modelData = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        colors: productColors,
        storageOptions,
        supportsPhysicalSim,
        supportsEsim,
        physicalSimPrice: physicalSimPrice.trim()
          ? parseFloat(physicalSimPrice)
          : undefined,
        eSimPrice: eSimPrice.trim() ? parseFloat(eSimPrice) : undefined,
        isActive,
      };

      if (isEditMode && modelId) {
        const result = await ProductModelService.updateProductModel(modelId, modelData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to update model');
          return;
        }
        Alert.alert('Success', 'Model updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        const result = await ProductModelService.createProductModel(modelData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to create model');
          return;
        }
        Alert.alert('Success', 'Model created!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} model`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingModel) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading model...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {isEditMode ? 'Edit Model' : 'New Model'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isEditMode ? 'Update model details' : 'Add a new product model'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Model Information */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="cube-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Model Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Model Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g., iPhone 17, Galaxy S24"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Brand</Text>
              <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowBrandModal(true)}>
                  <Text style={[styles.selectButtonText, { color: brand ? colors.foreground : colors.mutedForeground }]}>
                    {brand || 'Select brand'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
              <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.selectButton} onPress={() => setShowCategoryModal(true)}>
                  <Text style={[styles.selectButtonText, { color: category ? colors.foreground : colors.mutedForeground }]}>
                    {category || 'Select or type category'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border, marginTop: spacing.xs }]}
                value={category}
                onChangeText={setCategory}
                placeholder="Or type new category"
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
          </View>

          {/* Colors */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Colors</Text>
            </View>

            <View style={styles.arrayInputRow}>
              <TextInput
                style={[styles.arrayInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={newColor}
                onChangeText={setNewColor}
                placeholder="Add color (e.g., Red, Blue)"
                placeholderTextColor={colors.mutedForeground}
                onSubmitEditing={handleAddColor}
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                onPress={handleAddColor}
                disabled={!newColor.trim() || productColors.includes(newColor.trim())}
              >
                <Ionicons name="add" size={20} color={colors.accentContrast} />
              </TouchableOpacity>
            </View>

            {productColors.length > 0 && (
              <View style={styles.arrayList}>
                {productColors.map((color, index) => (
                  <View key={index} style={[styles.arrayItem, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Text style={[styles.arrayItemText, { color: colors.foreground }]}>{color}</Text>
                    <TouchableOpacity onPress={() => handleRemoveColor(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Storage Options */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="server-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Storage Options</Text>
            </View>

            <View style={styles.arrayInputRow}>
              <TextInput
                style={[styles.arrayInput, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={newStorage}
                onChangeText={setNewStorage}
                placeholder="Add storage (e.g., 64GB, 256GB)"
                placeholderTextColor={colors.mutedForeground}
                onSubmitEditing={handleAddStorage}
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.accent }]}
                onPress={handleAddStorage}
                disabled={!newStorage.trim() || storageOptions.includes(newStorage.trim())}
              >
                <Ionicons name="add" size={20} color={colors.accentContrast} />
              </TouchableOpacity>
            </View>

            {storageOptions.length > 0 && (
              <View style={styles.arrayList}>
                {storageOptions.map((storage, index) => (
                  <View key={index} style={[styles.arrayItem, { backgroundColor: colors.input, borderColor: colors.border }]}>
                    <Text style={[styles.arrayItemText, { color: colors.foreground }]}>{storage}</Text>
                    <TouchableOpacity onPress={() => handleRemoveStorage(index)}>
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* SIM Options & Pricing */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="cellular-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>SIM Options & Pricing</Text>
            </View>

            <View style={[styles.switchRow, { marginBottom: spacing.md }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                  Physical SIM Available
                </Text>
                <Text style={[styles.switchDescription, { color: colors.mutedForeground }]}>
                  Toggle if this model is sold with a physical SIM configuration.
                </Text>
              </View>
              <Switch
                value={supportsPhysicalSim}
                onValueChange={setSupportsPhysicalSim}
                trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                thumbColor={supportsPhysicalSim ? colors.accent : colors.mutedForeground}
              />
            </View>

            {supportsPhysicalSim && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Physical SIM Price (NLe)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={physicalSimPrice}
                  onChangeText={setPhysicalSimPrice}
                  placeholder="Optional, e.g. 25000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            <View style={[styles.switchRow, { marginTop: spacing.md }]}>
              <View style={styles.switchInfo}>
                <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                  eSIM Available
                </Text>
                <Text style={[styles.switchDescription, { color: colors.mutedForeground }]}>
                  Toggle if this model is sold with an eSIM configuration.
                </Text>
              </View>
              <Switch
                value={supportsEsim}
                onValueChange={setSupportsEsim}
                trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                thumbColor={supportsEsim ? colors.accent : colors.mutedForeground}
              />
            </View>

            {supportsEsim && (
              <View style={[styles.inputGroup, { marginTop: spacing.md }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  eSIM Price (NLe)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={eSimPrice}
                  onChangeText={setEsimPrice}
                  placeholder="Optional, e.g. 26000"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </View>
            )}
          </View>

          {/* Status */}
          {isEditMode && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={[styles.switchLabel, { color: colors.foreground }]}>
                    Active Status
                  </Text>
                  <Text style={[styles.switchDescription, { color: colors.mutedForeground }]}>
                    {isActive ? 'Model is active and visible' : 'Model is hidden'}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: colors.muted, true: colors.accent + '50' }}
                  thumbColor={isActive ? colors.accent : colors.mutedForeground}
                />
              </View>
            </View>
          )}

          {/* Submit */}
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
                <Ionicons name={isEditMode ? 'checkmark-circle' : 'add-circle'} size={24} color={colors.accentContrast} />
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  {isEditMode ? 'Update Model' : 'Create Model'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <SelectionModal
        visible={showBrandModal}
        title="Select Brand"
        options={BRANDS.map(b => ({ label: b, value: b }))}
        selectedValue={brand}
        onSelect={setBrand}
        onClose={() => setShowBrandModal(false)}
      />

      <SelectionModal
        visible={showCategoryModal}
        title="Select Category"
        options={existingCategories.map(c => ({ label: c, value: c }))}
        selectedValue={category}
        onSelect={setCategory}
        onClose={() => setShowCategoryModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: { fontSize: fontSize.base },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: { marginRight: spacing.md },
  headerContent: { flex: 1 },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  headerSubtitle: { fontSize: fontSize.sm },
  keyboardView: { flex: 1 },
  content: { flex: 1 },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
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
  inputGroup: { marginBottom: spacing.md },
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
  arrayInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  arrayInput: {
    flex: 1,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    fontSize: fontSize.base,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrayList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  arrayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  arrayItemText: {
    fontSize: fontSize.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  switchDescription: {
    fontSize: fontSize.sm,
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
});
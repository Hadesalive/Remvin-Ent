/**
 * New Inventory Item Screen
 * Add and edit IMEI-tracked inventory items
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
import { InventoryItemService } from '../services/inventory-item.service';
import { DatabaseService } from '../services/database.service';
import { InventoryItem, Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { SelectionModal } from '../components/ui/SelectionModal';

export default function NewInventoryItemScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const itemId = route?.params?.itemId;
  const productId = route?.params?.productId; // Pre-selected product
  const isEditMode = !!itemId;

  const [productIdState, setProductIdState] = useState<string>(productId || '');
  const [originalProductId, setOriginalProductId] = useState<string>(''); // Store original product ID for edit mode
  const [imei, setImei] = useState('');
  const [originalImei, setOriginalImei] = useState<string>(''); // Store original IMEI for edit mode
  const [condition, setCondition] = useState<'new' | 'refurbished' | 'used'>('new');
  const [simType, setSimType] = useState<'physical' | 'esim' | null>(null);
  const [purchaseCost, setPurchaseCost] = useState('');
  const [isPriceInherited, setIsPriceInherited] = useState(false);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);
  const hasLoadedProducts = useRef(false);

  useEffect(() => {
    const initialize = async () => {
      await loadProducts();
      if (isEditMode && itemId) {
        await loadItem();
      }
    };
    initialize();
  }, [itemId, isEditMode]);

  const selectedProduct = products.find(p => p.id === productIdState);

  // Auto-populate price when SIM type changes (if product has SIM prices)
  useEffect(() => {
    if (simType && selectedProduct) {
      const price =
        simType === 'physical'
          ? selectedProduct.physicalSimPrice
          : selectedProduct.eSimPrice;

      if (price !== null && price !== undefined) {
        setPurchaseCost(price.toString());
        setIsPriceInherited(true);
      } else {
        setIsPriceInherited(false);
      }
    } else {
      setIsPriceInherited(false);
    }
  }, [simType, selectedProduct]);

  const loadProducts = useCallback(async () => {
    if (hasLoadedProducts.current) return;
    try {
      hasLoadedProducts.current = true;
      const result = await DatabaseService.getProducts();
      if (result.data) {
        // Only show IMEI-tracked products
        setProducts(result.data.filter(p => p.productModelId && p.isActive !== false));
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      hasLoadedProducts.current = false; // Reset on error so it can retry
    }
  }, []);

  const loadItem = async () => {
    if (!itemId) return;
    try {
      setLoadingItem(true);
      const result = await InventoryItemService.getInventoryItemById(itemId);
      if (result.error || !result.data) {
        Alert.alert('Error', 'Item not found');
        navigation.goBack();
        return;
      }
      const item = result.data;
      setProductIdState(item.productId);
      setOriginalProductId(item.productId); // Store original product ID for comparison
      setImei(item.imei);
      setOriginalImei(item.imei); // Store original IMEI for comparison
      setCondition(item.condition || 'new');
      setSimType(item.simType || null);
      setPurchaseCost(item.purchaseCost?.toString() || '');
      setIsPriceInherited(false); // Don't mark as inherited when loading existing item
      setNotes(item.notes || '');
    } catch (error: any) {
      console.error('Failed to load item:', error);
      Alert.alert('Error', 'Failed to load item data');
      navigation.goBack();
    } finally {
      setLoadingItem(false);
    }
  };

  const normalizeIMEI = (imei: string): string => {
    return imei.replace(/[\s-]/g, '').toUpperCase();
  };

  const validateIMEI = (imei: string): boolean => {
    const normalized = normalizeIMEI(imei);
    return /^\d{15}$|^\d{17}$/.test(normalized);
  };

  const handleSubmit = async () => {
    if (!productIdState) {
      Alert.alert('Error', 'Please select a product');
      return;
    }

    if (!imei.trim()) {
      Alert.alert('Error', 'IMEI is required');
      return;
    }

    const normalizedIMEI = normalizeIMEI(imei);
    if (!validateIMEI(normalizedIMEI)) {
      Alert.alert('Error', 'IMEI must be exactly 15 or 17 digits');
      return;
    }

    // Check for duplicate IMEI
    if (!isEditMode) {
      // For new items, check if IMEI already exists
      const existingCheck = await InventoryItemService.getInventoryItemByImei(normalizedIMEI);
      if (existingCheck.data) {
        Alert.alert('Error', `IMEI ${normalizedIMEI} already exists in inventory`);
        return;
      }
    } else {
      // For edit mode, check if IMEI changed and if new IMEI already exists (excluding current item)
      if (originalImei !== normalizedIMEI) {
        const existingCheck = await InventoryItemService.getInventoryItemByImei(normalizedIMEI);
        if (existingCheck.data && existingCheck.data.id !== itemId) {
          Alert.alert('Error', `IMEI ${normalizedIMEI} already exists in inventory`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      if (isEditMode && itemId) {
        // For edit mode, only send changed fields
        const updateData: any = {
          condition,
          simType: simType || undefined,
          purchaseCost: purchaseCost.trim() ? parseFloat(purchaseCost) : undefined,
          notes: notes.trim() || undefined,
        };
        
        // Include product ID if it changed
        if (originalProductId !== productIdState) {
          updateData.productId = productIdState;
        }
        
        // Include IMEI if it changed
        if (originalImei !== normalizedIMEI) {
          updateData.imei = normalizedIMEI;
        }
        
        const result = await InventoryItemService.updateInventoryItem(itemId, updateData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to update item');
          return;
        }
        Alert.alert('Success', 'Item updated!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // For new items, include all fields
        const itemData = {
          productId: productIdState,
          imei: normalizedIMEI,
          condition,
          status: 'in_stock' as const,
          simType: simType || undefined,
          purchaseCost: purchaseCost.trim() ? parseFloat(purchaseCost) : undefined,
          notes: notes.trim() || undefined,
        };
        
        const result = await InventoryItemService.createInventoryItem(itemData);
        if (result.error) {
          Alert.alert('Error', result.error.message || 'Failed to create item');
          return;
        }
        Alert.alert('Success', 'Item created!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error saving item:', error);
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} item`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingItem) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading item...
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
            {isEditMode ? 'Edit Item' : 'New Item'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {isEditMode ? 'Update inventory item' : 'Add IMEI-tracked inventory item'}
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
          {/* Item Information */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="barcode-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Item Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Product *</Text>
                {isEditMode && selectedProduct && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('NewProduct', { productId: selectedProduct.id })}
                    style={styles.editProductButton}
                  >
                    <Ionicons name="pencil" size={14} color={colors.accent} />
                    <Text style={[styles.editProductText, { color: colors.accent }]}>
                      Edit Product
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowProductModal(true)}
                >
                  <Text style={[
                    styles.selectButtonText,
                    { color: productIdState ? colors.foreground : colors.mutedForeground }
                  ]}>
                    {selectedProduct 
                      ? `${selectedProduct.name}${selectedProduct.storage ? ` (${selectedProduct.storage})` : ''}${selectedProduct.color ? ` - ${selectedProduct.color}` : ''}`
                      : 'Select product'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>IMEI *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  { fontFamily: 'monospace' }
                ]}
                value={imei}
                onChangeText={(text) => {
                  // Only allow digits, limit to 17 chars
                  const digitsOnly = text.replace(/\D/g, '').slice(0, 17);
                  setImei(digitsOnly);
                }}
                placeholder="Enter 15 or 17-digit IMEI"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
              />
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                IMEI must be exactly 15 or 17 digits
              </Text>
              {imei.length > 0 && !validateIMEI(imei) && (
                <Text style={[styles.errorText, { color: '#EF4444' }]}>
                  Invalid IMEI format (must be 15 or 17 digits)
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Condition *</Text>
              <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowConditionModal(true)}
                >
                  <Text style={[styles.selectButtonText, { color: colors.foreground }]}>
                    {condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>SIM Type (Optional)</Text>
              <View style={[styles.selectContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowSimModal(true)}
                >
                  <Text style={[styles.selectButtonText, { color: simType ? colors.foreground : colors.mutedForeground }]}>
                    {simType === 'physical' ? 'Physical SIM' : simType === 'esim' ? 'eSIM' : 'Not Set (Optional)'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              {simType && selectedProduct && (
                <View style={styles.simInfoContainer}>
                  {simType === 'physical' && selectedProduct.supportsPhysicalSim && (
                    <Text style={[styles.simInfoText, { color: colors.success }]}>
                      ✓ Physical SIM supported
                      {selectedProduct.physicalSimPrice !== null && selectedProduct.physicalSimPrice !== undefined && (
                        <Text style={{ fontWeight: fontWeight.semibold }}>
                          {' '}• Price: NLe {selectedProduct.physicalSimPrice.toLocaleString()}
                        </Text>
                      )}
                    </Text>
                  )}
                  {simType === 'esim' && selectedProduct.supportsEsim && (
                    <Text style={[styles.simInfoText, { color: colors.success }]}>
                      ✓ eSIM supported
                      {selectedProduct.eSimPrice !== null && selectedProduct.eSimPrice !== undefined && (
                        <Text style={{ fontWeight: fontWeight.semibold }}>
                          {' '}• Price: NLe {selectedProduct.eSimPrice.toLocaleString()}
                        </Text>
                      )}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Additional Information */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Additional Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Purchase Cost (NLe)</Text>
                {isPriceInherited && (
                  <View style={[styles.inheritedBadge, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="link" size={12} color={colors.success} />
                    <Text style={[styles.inheritedText, { color: colors.success }]}>Auto-filled</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
                  isPriceInherited && { borderColor: colors.success + '60', borderWidth: 2 }
                ]}
                value={purchaseCost}
                onChangeText={(text) => {
                  setPurchaseCost(text);
                  setIsPriceInherited(false); // Clear inherited flag when manually edited
                }}
                placeholder="0.00"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="decimal-pad"
              />
              {isPriceInherited && (
                <Text style={[styles.helperText, { color: colors.success }]}>
                  Price inherited from product model SIM pricing
                </Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Notes</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }]}
            onPress={handleSubmit}
            disabled={submitting || !validateIMEI(imei)}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.accentContrast} />
            ) : (
              <>
                <Ionicons name={isEditMode ? 'checkmark-circle' : 'add-circle'} size={24} color={colors.accentContrast} />
                <Text style={[styles.submitButtonText, { color: colors.accentContrast }]}>
                  {isEditMode ? 'Update Item' : 'Create Item'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      <SelectionModal
        visible={showProductModal}
        title="Select Product"
        options={products.map(p => ({
          label: `${p.name}${p.storage ? ` (${p.storage})` : ''}${p.color ? ` - ${p.color}` : ''}`,
          value: p.id
        }))}
        selectedValue={productIdState}
        onSelect={setProductIdState}
        onClose={() => setShowProductModal(false)}
      />

      <SelectionModal
        visible={showConditionModal}
        title="Select Condition"
        options={[
          { label: 'New', value: 'new' },
          { label: 'Refurbished', value: 'refurbished' },
          { label: 'Used', value: 'used' },
        ]}
        selectedValue={condition}
        onSelect={(value) => setCondition(value as 'new' | 'refurbished' | 'used')}
        onClose={() => setShowConditionModal(false)}
      />

      <SelectionModal
        visible={showSimModal}
        title="Select SIM Type"
        options={[
          { label: 'Not Set (Optional)', value: 'none' },
          { label: 'Physical SIM', value: 'physical' },
          { label: 'eSIM', value: 'esim' },
        ]}
        selectedValue={simType || 'none'}
        onSelect={(value) => {
          if (value === 'none') {
            setSimType(null);
            setIsPriceInherited(false);
          } else {
            setSimType(value as 'physical' | 'esim');
          }
          setShowSimModal(false);
        }}
        onClose={() => setShowSimModal(false)}
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  editProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  editProductText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  helperText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  simInfoContainer: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  simInfoText: {
    fontSize: fontSize.xs,
  },
  inheritedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inheritedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
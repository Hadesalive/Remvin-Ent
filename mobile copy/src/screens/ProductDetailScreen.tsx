/**
 * Product Detail Screen
 * View and edit individual product details with CRUD operations
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { InventoryItemService } from '../services/inventory-item.service';
import { ProductModelService } from '../services/product-model.service';
import { Product, InventoryItem, ProductModel } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

/**
 * Safely format a number for display
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

export default function ProductDetailScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { productId } = route.params;
  const [product, setProduct] = useState<Product | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [productModel, setProductModel] = useState<ProductModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const [productsResult, itemsResult] = await Promise.all([
        DatabaseService.getProducts(),
        InventoryItemService.getInventoryItems({ productId })
      ]);
      
      if (productsResult.error) {

        navigation.goBack();
        return;
      }
      
      const foundProduct = productsResult.data?.find(p => p.id === productId);
      if (!foundProduct) {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
        return;
      }
      
      setProduct(foundProduct);
      
      // Load inventory items if IMEI-tracked
      if (itemsResult.data) {
        setInventoryItems(itemsResult.data);
      }
      
      // Load product model if exists
      if (foundProduct.productModelId) {
        const modelResult = await ProductModelService.getProductModelById(foundProduct.productModelId);
        if (modelResult.data) {
          setProductModel(modelResult.data);
        }
      }
    } catch (error: any) {

      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!product) return;
    navigation.navigate('NewProduct', { productId: product.id });
  };

  const handleDelete = () => {
    if (!product) return;

    const hasInventoryItems = inventoryItems.length > 0;
    const soldOrReturnedItems = inventoryItems.filter(item => 
      item.status === 'sold' || item.status === 'returned'
    ).length;
    const inStockItems = inventoryItems.length - soldOrReturnedItems;

    let message = `Are you sure you want to delete "${product.name}"?`;
    
    if (hasInventoryItems) {
      if (soldOrReturnedItems > 0) {
        message += `\n\n⚠️ This product has ${inventoryItems.length} inventory item(s):`;
        message += `\n  • ${soldOrReturnedItems} sold or returned (will be deleted)`;
        message += `\n  • ${inStockItems} in stock (will be deleted)`;
        message += `\n\nAll inventory items will be permanently deleted, including historical sales data.`;
      } else {
        message += `\n\nThis product has ${inventoryItems.length} inventory item(s) that will be automatically deleted along with the product.`;
      }
    }
    
    message += '\n\n⚠️ This action cannot be undone.';

    Alert.alert(
      'Delete Product',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: hasInventoryItems ? 'Delete Product & All Items' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const options = hasInventoryItems ? { forceDelete: true } : undefined;
              const result = await DatabaseService.deleteProduct(productId, options);
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete product');
                return;
              }
              Alert.alert('Success', hasInventoryItems 
                ? `Product and ${inventoryItems.length} inventory item(s) deleted successfully`
                : 'Product deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {

              Alert.alert('Error', 'Failed to delete product. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'N/A';
    }
  };

  const getStockStatus = () => {
    if (!product) return { color: '#6B7280', text: 'Unknown', icon: 'help-circle' };
    const stock = product.stock || 0;
    if (stock === 0) return { color: '#EF4444', text: 'Out of Stock', icon: 'close-circle' };
    if (product.minStock && stock <= product.minStock) return { color: '#F59E0B', text: 'Low Stock', icon: 'warning' };
    return { color: '#10B981', text: 'In Stock', icon: 'checkmark-circle' };
  };

  if (loading) {
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

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Product not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.accentContrast }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus();
  const profitMargin = product.cost ? product.price - product.cost : null;
  const profitMarginPercent = profitMargin && product.price > 0 ? ((profitMargin / product.price) * 100).toFixed(1) : null;
  const totalValue = product.price * (product.stock || 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Header
        title="Product Details"
        subtitle={product.sku || product.id.substring(0, 8).toUpperCase()}
        showBackButton
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil',
            onPress: handleEdit,
            color: colors.accent,
            disabled: deleting,
            accessibilityLabel: 'Edit product',
          },
          {
            icon: 'trash-outline',
            onPress: handleDelete,
            color: '#EF4444',
            disabled: deleting,
            loading: deleting,
            accessibilityLabel: 'Delete product',
          },
        ]}
        useSafeArea={false}
        showBorder={false}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Value Card */}
        <LinearGradient
          colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientContent}>
            <View style={styles.gradientLeft}>
              <View style={styles.gradientIcon}>
                <Ionicons name="cube" size={28} color="white" />
              </View>
              <View style={styles.gradientText}>
                <Text style={styles.gradientLabel}>Inventory Value</Text>
                <Text style={styles.gradientValue}>NLe {formatNumber(totalValue)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadgeGradient,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Ionicons name={stockStatus.icon as any} size={16} color="white" />
              <Text style={styles.statusTextGradient}>
                {stockStatus.text}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Product Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Information</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="cube-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Name</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {product.name}
            </Text>
          </View>


          {product.category && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="pricetag-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Category</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {product.category}
              </Text>
            </View>
          )}

          {product.productModelId && productModel && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="cube-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Model</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {productModel.name}
              </Text>
            </View>
          )}

          {product.storage && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="hardware-chip-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Storage</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {product.storage}
              </Text>
            </View>
          )}

          {product.color && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="color-palette-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Color</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {product.color}
              </Text>
            </View>
          )}

          {product.productModelId && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.accent} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Tracking</Text>
              </View>
              <View style={[styles.imeiBadge, { backgroundColor: colors.accent + '15' }]}>
                <Text style={[styles.imeiBadgeText, { color: colors.accent }]}>IMEI Tracked</Text>
              </View>
            </View>
          )}

          {product.description && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Description</Text>
              </View>
            </View>
          )}

          {product.description && (
            <Text style={[styles.descriptionText, { color: colors.foreground }]}>
              {product.description}
            </Text>
          )}
        </View>

        {/* Pricing Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cash" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Pricing</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Price</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              NLe {formatNumber(product.price)}
            </Text>
          </View>

          {product.cost !== undefined && product.cost !== null && (
            <>
              <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Cost</Text>
                <Text style={[styles.infoValue, { color: colors.foreground }]}>
                  NLe {formatNumber(product.cost)}
                </Text>
              </View>

              {profitMargin !== null && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Profit Margin</Text>
                  <View style={styles.profitContainer}>
                    <Text style={[styles.profitValue, { color: profitMargin >= 0 ? '#10B981' : '#EF4444' }]}>
                      NLe {formatNumber(profitMargin)}
                    </Text>
                    {profitMarginPercent && (
                      <Text style={[styles.profitPercent, { color: colors.mutedForeground }]}>
                        ({profitMarginPercent}%)
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {/* Inventory Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Inventory</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Current Stock</Text>
            <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + '15' }]}>
              <View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
              <Text style={[styles.stockValue, { color: stockStatus.color }]}>
                {product.stock || 0} units
              </Text>
            </View>
          </View>

          {product.minStock !== undefined && product.minStock !== null && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Minimum Stock</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {product.minStock} units
              </Text>
            </View>
          )}
        </View>

        {/* Metadata Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Metadata</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: (product.isActive !== false ? '#10B981' : '#6B7280') + '15' }]}>
              <Text style={[styles.statusText, { color: product.isActive !== false ? '#10B981' : '#6B7280' }]}>
                {product.isActive !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {product.createdAt && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Created</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(product.createdAt)}
              </Text>
            </View>
          )}

          {product.updatedAt && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last Updated</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {formatDate(product.updatedAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Inventory Items Section - Only for IMEI-tracked products */}
        {product.productModelId && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="phone-portrait" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Inventory Items</Text>
                <View style={[styles.badge, { backgroundColor: colors.accent + '15' }]}>
                  <Text style={[styles.badgeText, { color: colors.accent }]}>
                    {inventoryItems.filter(i => i.status === 'in_stock').length} in stock
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('NewInventoryItem', { productId: product.id })}
                style={[styles.addButton, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="add" size={20} color={colors.accentContrast} />
              </TouchableOpacity>
            </View>

            {inventoryItems.length === 0 ? (
              <View style={styles.emptyInventory}>
                <Ionicons name="phone-portrait-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyInventoryText, { color: colors.mutedForeground }]}>
                  No inventory items yet
                </Text>
                <Text style={[styles.emptyInventorySubtext, { color: colors.mutedForeground }]}>
                  Add items with IMEI numbers to track individual units
                </Text>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate('NewInventoryItem', { productId: product.id })}
                >
                  <Ionicons name="add-circle" size={20} color={colors.accentContrast} />
                  <Text style={[styles.emptyStateButtonText, { color: colors.accentContrast }]}>
                    Add First Item
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inventoryItemsList}>
                {inventoryItems.map((item, index) => {
                  const statusColor = item.status === 'in_stock' ? '#10B981' :
                                     item.status === 'sold' ? '#3B82F6' :
                                     item.status === 'defective' ? '#EF4444' : '#6B7280';
                  const conditionColor = item.condition === 'new' ? '#10B981' :
                                        item.condition === 'refurbished' ? '#F59E0B' : '#6B7280';
                  
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.inventoryItemRow,
                        index !== inventoryItems.length - 1 && { borderBottomColor: colors.border }
                      ]}
                      onPress={() => navigation.navigate('NewInventoryItem', { itemId: item.id })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.inventoryItemLeft}>
                        <View style={[styles.imeiContainer, { backgroundColor: colors.accent + '10' }]}>
                          <Ionicons name="barcode-outline" size={16} color={colors.accent} />
                          <Text style={[styles.imeiText, { color: colors.foreground }]}>{item.imei}</Text>
                        </View>
                        <View style={styles.inventoryItemMeta}>
                          <View style={[styles.statusBadgeSmall, { backgroundColor: statusColor + '15' }]}>
                            <Text style={[styles.statusTextSmall, { color: statusColor }]}>
                              {item.status === 'in_stock' ? 'In Stock' :
                               item.status === 'sold' ? 'Sold' :
                               item.status === 'defective' ? 'Defective' : item.status}
                            </Text>
                          </View>
                          <View style={[styles.statusBadgeSmall, { backgroundColor: conditionColor + '15' }]}>
                            <Text style={[styles.statusTextSmall, { color: conditionColor }]}>
                              {item.condition === 'new' ? 'New' :
                               item.condition === 'refurbished' ? 'Refurbished' : 'Used'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.inventoryItemRight}>
                        {item.purchaseCost && (
                          <Text style={[styles.costText, { color: colors.mutedForeground }]}>
                            NLe {formatNumber(item.purchaseCost)}
                          </Text>
                        )}
                        <View style={styles.inventoryItemRightBottom}>
                          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                            {formatDate(item.createdAt)}
                          </Text>
                          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  gradientCard: {
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  gradientContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradientLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gradientIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientText: {
    flex: 1,
  },
  gradientLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  gradientValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -0.5,
  },
  statusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  statusTextGradient: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'white',
  },
  card: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.base,
  },
  infoValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  descriptionText: {
    fontSize: fontSize.base,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profitValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  profitPercent: {
    fontSize: fontSize.sm,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: spacing.xs,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  imeiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imeiBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInventory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyInventoryText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyInventorySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyStateButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  inventoryItemsList: {
    marginTop: spacing.sm,
  },
  inventoryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  inventoryItemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  imeiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: spacing.xs,
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
  },
  imeiText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'monospace',
  },
  inventoryItemMeta: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: fontWeight.medium,
  },
  inventoryItemRight: {
    alignItems: 'flex-end',
  },
  inventoryItemRightBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  costText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  dateText: {
    fontSize: fontSize.xs,
  },
});


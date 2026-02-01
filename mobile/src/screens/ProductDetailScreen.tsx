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
import { Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getProducts();
      if (error) {
        console.error('Error loading products:', error);
        navigation.goBack();
        return;
      }
      const foundProduct = data?.find(p => p.id === productId);
      if (!foundProduct) {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
        return;
      }
      setProduct(foundProduct);
    } catch (error: any) {
      console.error('Failed to load product:', error);
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

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const result = await DatabaseService.deleteProduct(productId);
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete product');
                return;
              }
              Alert.alert('Success', 'Product deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              console.error('Failed to delete product:', error);
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
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Product Details</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {product.sku || product.id.substring(0, 8).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleEdit}
            style={[styles.actionButton, { backgroundColor: colors.accent + '15' }]}
            disabled={deleting}
          >
            <Ionicons name="pencil" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: '#EF4444' + '15' }]}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

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

          {product.sku && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="barcode-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>IMEI/Serial Number</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {product.sku}
              </Text>
            </View>
          )}

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
});


/**
 * Product List Screen
 * Modern product inventory management with search and filters
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';

export default function ProductListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getProducts();
      if (error) {
        console.error('Error loading products:', error);
      } else if (data) {
        setProducts(data);
      }
    } catch (error: any) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [products, selectedCategory, searchTerm]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
    const lowStock = products.filter(p => p.minStock && (p.stock || 0) <= p.minStock).length;
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length;

    return { totalProducts, totalValue, lowStock, outOfStock };
  }, [products]);

  const getStockColor = (product: Product) => {
    if ((product.stock || 0) === 0) return '#EF4444';
    if (product.minStock && (product.stock || 0) <= product.minStock) return '#F59E0B';
    return '#10B981';
  };

  const renderProduct = (product: Product, index: number) => {
    const isLastItem = index === filteredProducts.length - 1;
    const stockColor = getStockColor(product);

    return (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.productRow,
          isLastItem && styles.lastRow,
          { borderBottomColor: colors.border }
        ]}
        onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
        activeOpacity={0.7}
      >
        <View style={styles.productLeft}>
          <View style={[styles.productAvatar, { backgroundColor: colors.accent + '15' }]}>
            <Text style={[styles.productAvatarText, { color: colors.accent }]}>
              {product.name[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.productMeta}>
              {product.sku && (
                <Text style={[styles.productSku, { color: colors.mutedForeground }]}>
                  IMEI/Serial: {product.sku}
                </Text>
              )}
              {product.category && (
                <Text style={[styles.productCategory, { color: colors.mutedForeground }]}>
                  • {product.category}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.productRight}>
          <Text style={[styles.productPrice, { color: colors.foreground }]}>
            NLe {product.price.toLocaleString()}
          </Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '15' }]}>
            <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
            <Text style={[styles.stockText, { color: stockColor }]}>
              {product.stock || 0} in stock
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading products...
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
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Products</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            {products.length} total products
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('NewProduct', { productId: null })}
        >
          <Ionicons name="add" size={24} color={colors.accentContrast} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Metrics Cards - Modern Card Design */}
        <View style={styles.metricsContainer}>
          {/* Primary Metric - Large Card */}
          <View style={[styles.metricsPrimaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.metricsPrimaryGradient}
            >
              <View style={styles.metricsPrimaryContent}>
                <View style={styles.metricsPrimaryLeft}>
                  <View style={styles.metricsPrimaryIconWrapper}>
                    <Ionicons name="cube" size={28} color="white" />
                  </View>
                  <View style={styles.metricsPrimaryText}>
                    <Text style={styles.metricsPrimaryValue}>{metrics.totalProducts}</Text>
                    <Text style={styles.metricsPrimaryLabel}>Total Products</Text>
                  </View>
                </View>
                <View style={styles.metricsPrimaryRight}>
                  <Text style={styles.metricsPrimarySubValue}>NLe</Text>
                  <Text style={styles.metricsPrimarySubAmount}>{Math.floor(metrics.totalValue / 1000)}K</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Secondary Metrics - Compact Cards */}
          <View style={styles.metricsSecondaryContainer}>
            <TouchableOpacity
              style={[styles.metricsSecondaryCard, { backgroundColor: colors.card, borderColor: '#F59E0B' + '40' }]}
              activeOpacity={0.7}
            >
              <View style={[styles.metricsSecondaryIconContainer, { backgroundColor: '#F59E0B' + '15' }]}>
                <Ionicons name="warning" size={22} color="#F59E0B" />
              </View>
              <View style={styles.metricsSecondaryContent}>
                <Text style={[styles.metricsSecondaryValue, { color: '#F59E0B' }]}>{metrics.lowStock}</Text>
                <Text style={[styles.metricsSecondaryLabel, { color: colors.mutedForeground }]}>Low Stock</Text>
              </View>
              {metrics.lowStock > 0 && (
                <View style={[styles.metricsBadge, { backgroundColor: '#F59E0B', borderColor: colors.background }]}>
                  <Text style={styles.metricsBadgeText}>!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metricsSecondaryCard, { backgroundColor: colors.card, borderColor: '#EF4444' + '40' }]}
              activeOpacity={0.7}
            >
              <View style={[styles.metricsSecondaryIconContainer, { backgroundColor: '#EF4444' + '15' }]}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </View>
              <View style={styles.metricsSecondaryContent}>
                <Text style={[styles.metricsSecondaryValue, { color: '#EF4444' }]}>{metrics.outOfStock}</Text>
                <Text style={[styles.metricsSecondaryLabel, { color: colors.mutedForeground }]}>Out of Stock</Text>
              </View>
              {metrics.outOfStock > 0 && (
                <View style={[styles.metricsBadge, { backgroundColor: '#EF4444', borderColor: colors.background }]}>
                  <Text style={styles.metricsBadgeText}>{metrics.outOfStock}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search products..."
            placeholderTextColor={colors.mutedForeground}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Filter */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
            contentContainerStyle={styles.categoryContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === 'all' && { backgroundColor: colors.accent },
                { borderColor: colors.border }
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === 'all' && { color: colors.accentContrast },
                  { color: selectedCategory === 'all' ? colors.accentContrast : colors.foreground }
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category && { backgroundColor: colors.accent },
                  { borderColor: colors.border }
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: selectedCategory === category ? colors.accentContrast : colors.foreground }
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products List */}
        <View style={[styles.productsCard, { backgroundColor: colors.card }]}>
          <View style={styles.productsHeader}>
            <Text style={[styles.productsTitle, { color: colors.foreground }]}>
              Products ({filteredProducts.length})
            </Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {searchTerm || selectedCategory !== 'all' ? 'No products found' : 'No products yet'}
              </Text>
              {!searchTerm && selectedCategory === 'all' && (
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                  onPress={() => navigation.navigate('NewProduct', { productId: null })}
                >
                  <Ionicons name="add-circle" size={20} color={colors.accentContrast} />
                  <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                    Add Product
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredProducts.map((product, index) => renderProduct(product, index))
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  metricsContainer: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metricsPrimaryCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  metricsPrimaryGradient: {
    padding: spacing.lg,
  },
  metricsPrimaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricsPrimaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  metricsPrimaryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  metricsPrimaryText: {
    flex: 1,
  },
  metricsPrimaryValue: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -1.5,
    marginBottom: 2,
  },
  metricsPrimaryLabel: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: fontWeight.medium,
  },
  metricsPrimaryRight: {
    alignItems: 'flex-end',
    paddingLeft: spacing.md,
  },
  metricsPrimarySubValue: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  metricsPrimarySubAmount: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: 'white',
    letterSpacing: -0.5,
  },
  metricsSecondaryContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricsSecondaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  metricsSecondaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsSecondaryContent: {
    flex: 1,
  },
  metricsSecondaryValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  metricsSecondaryLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  metricsBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  metricsBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    padding: 0,
  },
  categoryContainer: {
    marginBottom: spacing.md,
  },
  categoryContent: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  productsCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  productsHeader: {
    marginBottom: spacing.md,
  },
  productsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  productAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  productAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  productSku: {
    fontSize: fontSize.xs,
  },
  productCategory: {
    fontSize: fontSize.xs,
  },
  productRight: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
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
  stockText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.base,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
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

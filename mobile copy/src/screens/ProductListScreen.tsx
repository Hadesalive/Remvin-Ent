/**
 * Product List Screen
 * Modern product inventory management with advanced filtering, sorting, and grouping
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { DatabaseService } from '../services/database.service';
import { Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { Header } from '../components/ui/Header';

type SortOption = 'name' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'date';
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type ViewMode = 'list' | 'grouped';

interface ProductListScreenProps {
  navigation: {
    navigate: (screen: string, params?: any) => void;
    addListener: (event: string, callback: () => void) => () => void;
  };
}

export default function ProductListScreen({ navigation }: ProductListScreenProps) {
  const { colors, isDark } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [imeiFilter, setImeiFilter] = useState<'all' | 'imei' | 'regular'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      if (products.length === 0) {
        setLoading(true);
      }
      const { data, error } = await DatabaseService.getProducts();
      if (error) {
      } else if (data) {
        setProducts(data);
      }
    } catch (error: unknown) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [products.length]);

  useEffect(() => {
    loadProducts();
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
    });
    return unsubscribe;
  }, [navigation, loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reload from cache (no API call unless cache expired)
    loadProducts();
  }, [loadProducts]);

  // Extract unique values for filters
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const brands = useMemo(() => {
    // Extract brand from product name (e.g., "iPhone" from "iPhone 16 Plus")
    const brandSet = new Set<string>();
    products.forEach(p => {
      if (p.name) {
        const brand = p.name.split(' ')[0];
        if (brand && brand !== 'Galaxy') {
          brandSet.add(brand);
        } else if (p.name.startsWith('Galaxy')) {
          brandSet.add('Samsung');
        }
      }
    });
    return Array.from(brandSet).sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];
    
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by brand
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(p => {
        if (selectedBrand === 'Samsung') {
          return p.name.startsWith('Galaxy');
        }
        return p.name.startsWith(selectedBrand);
      });
    }

    // Filter by stock status
    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        const stock = p.stock || 0;
        if (stockFilter === 'out_of_stock') return stock === 0;
        if (stockFilter === 'low_stock') return p.minStock ? stock <= p.minStock && stock > 0 : false;
        if (stockFilter === 'in_stock') return stock > 0;
        return true;
      });
    }

    // Filter by IMEI tracking
    if (imeiFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (imeiFilter === 'imei') return !!p.productModelId;
        if (imeiFilter === 'regular') return !p.productModelId;
        return true;
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        if (p.name.toLowerCase().includes(term)) return true;
        if (p.sku?.toLowerCase().includes(term)) return true;
        if (p.category?.toLowerCase().includes(term)) return true;
        if (p.storage?.toLowerCase().includes(term)) return true;
        if (p.color?.toLowerCase().includes(term)) return true;
        return false;
      });
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'stock_asc':
          return (a.stock || 0) - (b.stock || 0);
        case 'stock_desc':
          return (b.stock || 0) - (a.stock || 0);
        case 'date':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, selectedCategory, selectedBrand, stockFilter, imeiFilter, searchTerm, sortBy]);

  // Group products by brand/model for grouped view
  const groupedProducts = useMemo(() => {
    if (viewMode !== 'grouped') return {};
    
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(product => {
      const brand = product.name.startsWith('Galaxy') ? 'Samsung' : product.name.split(' ')[0];
      const key = brand || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    return groups;
  }, [filteredProducts, viewMode]);

  const metrics = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);
    const lowStock = products.filter(p => p.minStock && (p.stock || 0) <= p.minStock && (p.stock || 0) > 0).length;
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
    const inStock = products.filter(p => (p.stock || 0) > 0).length;

    return { totalProducts, totalValue, lowStock, outOfStock, inStock };
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
            <Ionicons name={product.productModelId ? "phone-portrait" : "cube"} size={20} color={colors.accent} />
          </View>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.productMeta}>
              {product.productModelId && (
                <View style={[styles.imeiBadge, { backgroundColor: colors.accent + '15' }]}>
                  <Ionicons name="phone-portrait" size={10} color={colors.accent} />
                  <Text style={[styles.imeiBadgeText, { color: colors.accent }]}>
                    IMEI
                  </Text>
                </View>
              )}
              {product.storage && (
                <Text style={[styles.productMetaText, { color: colors.mutedForeground }]}>
                  {product.storage}
                </Text>
              )}
              {product.color && (
                <Text style={[styles.productMetaText, { color: colors.mutedForeground }]}>
                  • {product.color}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.productRight}>
          <Text style={[styles.productPrice, { color: colors.foreground }]}>
            Le {product.price.toLocaleString()}
          </Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor + '15' }]}>
            <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
            <Text style={[styles.stockText, { color: stockColor }]}>
              {product.stock || 0}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupedView = () => {
    const groupKeys = Object.keys(groupedProducts).sort();
    
    return (
      <View>
        {groupKeys.map(brand => (
          <View key={brand} style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.groupHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.groupTitle, { color: colors.foreground }]}>{brand}</Text>
              <Text style={[styles.groupCount, { color: colors.mutedForeground }]}>
                {groupedProducts[brand].length} {groupedProducts[brand].length === 1 ? 'product' : 'products'}
              </Text>
            </View>
            {groupedProducts[brand].map((product, index) => (
              <View key={product.id}>
                {renderProduct(product, index)}
                {index < groupedProducts[brand].length - 1 && (
                  <View style={[styles.groupDivider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
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

  const activeFiltersCount = [
    selectedCategory !== 'all',
    selectedBrand !== 'all',
    stockFilter !== 'all',
    imeiFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Header
        title="Products"
        subtitle={`${filteredProducts.length} of ${products.length} products`}
        actions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('NewProduct', { productId: null }),
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            accessibilityLabel: 'Add new product',
          },
        ]}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Metrics Cards */}
        <View style={styles.metricsContainer}>
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
                  <Text style={styles.metricsPrimarySubValue}>Le</Text>
                  <Text style={styles.metricsPrimarySubAmount}>{metrics.totalValue.toLocaleString()}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.metricsSecondaryContainer}>
            <TouchableOpacity
              style={[styles.metricsSecondaryCard, { backgroundColor: colors.card, borderColor: '#10B981' + '40' }]}
              activeOpacity={0.7}
              onPress={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
            >
              <View style={[styles.metricsSecondaryIconContainer, { backgroundColor: '#10B981' + '15' }]}>
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              </View>
              <View style={styles.metricsSecondaryContent}>
                <Text style={[styles.metricsSecondaryValue, { color: '#10B981' }]}>{metrics.inStock}</Text>
                <Text style={[styles.metricsSecondaryLabel, { color: colors.mutedForeground }]}>In Stock</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metricsSecondaryCard, { backgroundColor: colors.card, borderColor: '#F59E0B' + '40' }]}
              activeOpacity={0.7}
              onPress={() => setStockFilter(stockFilter === 'low_stock' ? 'all' : 'low_stock')}
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
              onPress={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
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

        {/* Search and Action Bar */}
        <View style={styles.actionBar}>
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

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setShowFilters(true)}
            >
              <Ionicons name="filter" size={20} color={colors.foreground} />
              {activeFiltersCount > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setShowSort(true)}
            >
              <Ionicons name="swap-vertical" size={20} color={colors.foreground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.input, borderColor: colors.border }]}
              onPress={() => setViewMode(viewMode === 'list' ? 'grouped' : 'list')}
            >
              <Ionicons name={viewMode === 'list' ? 'grid' : 'list'} size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Filters */}
        <View style={styles.quickFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickFiltersContent}>
            <TouchableOpacity
              style={[
                styles.quickFilterChip,
                imeiFilter === 'imei' && { backgroundColor: colors.accent },
                { borderColor: colors.border }
              ]}
              onPress={() => setImeiFilter(imeiFilter === 'imei' ? 'all' : 'imei')}
            >
              <Ionicons 
                name="phone-portrait" 
                size={14} 
                color={imeiFilter === 'imei' ? colors.accentContrast : colors.foreground} 
              />
              <Text
                style={[
                  styles.quickFilterText,
                  { color: imeiFilter === 'imei' ? colors.accentContrast : colors.foreground }
                ]}
              >
                IMEI Tracked
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickFilterChip,
                imeiFilter === 'regular' && { backgroundColor: colors.accent },
                { borderColor: colors.border }
              ]}
              onPress={() => setImeiFilter(imeiFilter === 'regular' ? 'all' : 'regular')}
            >
              <Ionicons 
                name="cube" 
                size={14} 
                color={imeiFilter === 'regular' ? colors.accentContrast : colors.foreground} 
              />
              <Text
                style={[
                  styles.quickFilterText,
                  { color: imeiFilter === 'regular' ? colors.accentContrast : colors.foreground }
                ]}
              >
                Regular
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Products List */}
        <View style={[styles.productsCard, { backgroundColor: colors.card }]}>
          <View style={styles.productsHeader}>
            <Text style={[styles.productsTitle, { color: colors.foreground }]}>
              {viewMode === 'grouped' ? 'Products by Brand' : `Products (${filteredProducts.length})`}
            </Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {searchTerm || selectedCategory !== 'all' || selectedBrand !== 'all' || stockFilter !== 'all' || imeiFilter !== 'all'
                  ? 'No products match your filters'
                  : 'No products yet'}
              </Text>
              {!searchTerm && selectedCategory === 'all' && selectedBrand === 'all' && stockFilter === 'all' && imeiFilter === 'all' && (
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
          ) : viewMode === 'grouped' ? (
            renderGroupedView()
          ) : (
            <View>
              {filteredProducts.map((product, index) => renderProduct(product, index))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      selectedCategory === 'all' && { backgroundColor: colors.accent },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
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
                        styles.filterChip,
                        selectedCategory === category && { backgroundColor: colors.accent },
                        { borderColor: colors.border }
                      ]}
                      onPress={() => setSelectedCategory(category)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selectedCategory === category ? colors.accentContrast : colors.foreground }
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Brand Filter */}
              {brands.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>Brand</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        selectedBrand === 'all' && { backgroundColor: colors.accent },
                        { borderColor: colors.border }
                      ]}
                      onPress={() => setSelectedBrand('all')}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          { color: selectedBrand === 'all' ? colors.accentContrast : colors.foreground }
                        ]}
                      >
                        All
                      </Text>
                    </TouchableOpacity>
                    {brands.map(brand => (
                      <TouchableOpacity
                        key={brand}
                        style={[
                          styles.filterChip,
                          selectedBrand === brand && { backgroundColor: colors.accent },
                          { borderColor: colors.border }
                        ]}
                        onPress={() => setSelectedBrand(brand)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: selectedBrand === brand ? colors.accentContrast : colors.foreground }
                          ]}
                        >
                          {brand}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Stock Status Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: colors.foreground }]}>Stock Status</Text>
                <View style={styles.filterOptions}>
                  {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as StockFilter[]).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.filterOption,
                        stockFilter === option && { backgroundColor: colors.accent + '15', borderColor: colors.accent },
                        { borderColor: colors.border }
                      ]}
                      onPress={() => setStockFilter(option)}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          { color: stockFilter === option ? colors.accent : colors.foreground }
                        ]}
                      >
                        {option === 'all' ? 'All' : option === 'in_stock' ? 'In Stock' : option === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                      </Text>
                      {stockFilter === option && (
                        <Ionicons name="checkmark" size={18} color={colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.input }]}
                onPress={() => {
                  setSelectedCategory('all');
                  setSelectedBrand('all');
                  setStockFilter('all');
                  setImeiFilter('all');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.foreground }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.accentContrast }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSort}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSort(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Sort By</Text>
              <TouchableOpacity onPress={() => setShowSort(false)}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {(['name', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'date'] as SortOption[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortOption,
                    sortBy === option && { backgroundColor: colors.accent + '15', borderColor: colors.accent },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => {
                    setSortBy(option);
                    setShowSort(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: sortBy === option ? colors.accent : colors.foreground }
                    ]}
                  >
                    {option === 'name' ? 'Name (A-Z)' :
                     option === 'price_asc' ? 'Price (Low to High)' :
                     option === 'price_desc' ? 'Price (High to Low)' :
                     option === 'stock_asc' ? 'Stock (Low to High)' :
                     option === 'stock_desc' ? 'Stock (High to Low)' :
                     'Date (Newest)'}
                  </Text>
                  {sortBy === option && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
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
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    padding: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: 'white',
  },
  quickFiltersContainer: {
    marginBottom: spacing.md,
  },
  quickFiltersContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
  },
  quickFilterText: {
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
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  groupTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  groupCount: {
    fontSize: fontSize.sm,
  },
  groupDivider: {
    height: 1,
    marginLeft: spacing.md,
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
    flexWrap: 'wrap',
  },
  productMetaText: {
    fontSize: fontSize.xs,
  },
  imeiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
    marginRight: spacing.xs,
  },
  imeiBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
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
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  modalBody: {
    padding: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterSectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  filterChips: {
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterOptions: {
    gap: spacing.sm,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  sortOptionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

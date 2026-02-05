/**
 * Inventory Item List Screen
 * Manage IMEI-tracked inventory items (list, search, filter)
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { InventoryItemService } from '../services/inventory-item.service';
import { DatabaseService } from '../services/database.service';
import { InventoryItem, Product } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

interface InventoryItemListScreenProps {
  navigation: {
    navigate: (screen: string, params?: { itemId?: string }) => void;
    addListener: (type: string, callback: () => void) => () => void;
  };
}

/**
 * Safely format a number
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value) || typeof value !== 'number') {
    return '0';
  }
  try {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return String(value || '0');
  }
}

export default function InventoryItemListScreen({ navigation }: InventoryItemListScreenProps) {
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'sold' | 'returned' | 'defective'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'new' | 'refurbished' | 'used'>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsResult, productsResult] = await Promise.all([
        InventoryItemService.getInventoryItems(),
        DatabaseService.getProducts(),
      ]);
      
      if (itemsResult.data) {
        setItems(itemsResult.data);
      }
      if (productsResult.data) {
        setProducts(productsResult.data);
      }
    } catch (error: unknown) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Create product lookup map for O(1) access
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const filteredItems = useMemo(() => {
    if (items.length === 0) return [];
    
    const searchLower = searchTerm.toLowerCase();
    
    return items.filter(item => {
      // Fast status/condition/product filters first
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false;
      if (productFilter !== 'all' && item.productId !== productFilter) return false;
      
      // Search filter (most expensive, so do last)
      if (searchTerm) {
        if (item.imei.toLowerCase().includes(searchLower)) return true;
        const product = productMap.get(item.productId);
        if (product?.name.toLowerCase().includes(searchLower)) return true;
        return false;
      }
      
      return true;
    });
  }, [items, productMap, searchTerm, statusFilter, conditionFilter, productFilter]);

  // Calculate metrics efficiently
  const metrics = useMemo(() => {
    if (items.length === 0) {
      return { total: 0, inStock: 0, sold: 0, defective: 0, returned: 0, totalValue: 0 };
    }
    
    let inStock = 0;
    let sold = 0;
    let defective = 0;
    let returned = 0;
    let totalValue = 0;
    
    // Single pass through items
    items.forEach(item => {
      switch (item.status) {
        case 'in_stock':
          inStock++;
          const product = productMap.get(item.productId);
          totalValue += product?.price || 0;
          break;
        case 'sold':
          sold++;
          break;
        case 'defective':
          defective++;
          break;
        case 'returned':
          returned++;
          break;
      }
    });
    
    return {
      total: items.length,
      inStock,
      sold,
      defective,
      returned,
      totalValue,
    };
  }, [items, productMap]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return '#10B981';
      case 'sold': return '#3B82F6';
      case 'defective': return '#EF4444';
      case 'returned': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return '#10B981';
      case 'refurbished': return '#F59E0B';
      case 'used': return '#6B7280';
      default: return '#6B7280';
    }
  };

  // Memoize IMEI products list
  const imeiProducts = useMemo(() => products.filter(p => p.productModelId), [products]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading inventory items...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderContent = () => (
    <View>
      {/* Key Metrics - Colorful gradient card */}
      <View style={{ marginTop: spacing.md, marginHorizontal: spacing.lg }}>
        <LinearGradient
          colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.metricsCard}
        >
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Items</Text>
              <Text style={styles.metricValue}>{metrics.total}</Text>
            </View>
            <View style={styles.metricDividerWhite} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>In Stock</Text>
              <Text style={styles.metricValue}>{metrics.inStock}</Text>
            </View>
          </View>
          <View style={styles.metricsDividerHorizontal} />
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Sold</Text>
              <Text style={styles.metricValue}>{metrics.sold}</Text>
            </View>
            <View style={styles.metricDividerWhite} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Total Value</Text>
              <Text style={styles.metricValue}>
                NLe {formatNumber(metrics.totalValue)}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by IMEI or product..."
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

        <View style={styles.filterRow}>
          <View style={styles.filterColumn}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'in_stock', 'sold', 'returned', 'defective'] as const).map(status => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: statusFilter === status ? colors.accent : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: statusFilter === status ? colors.accentContrast : colors.foreground }
                  ]}>
                    {status === 'all' ? 'All' : status.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterColumn}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {(['all', 'new', 'refurbished', 'used'] as const).map(condition => (
                <TouchableOpacity
                  key={condition}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: conditionFilter === condition ? colors.accent : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setConditionFilter(condition)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: conditionFilter === condition ? colors.accentContrast : colors.foreground }
                  ]}>
                    {condition === 'all' ? 'All' : condition.charAt(0).toUpperCase() + condition.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {imeiProducts.length > 0 && (
          <View style={styles.productFilterContainer}>
            <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Product</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productFilterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: productFilter === 'all' ? colors.accent : colors.muted,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setProductFilter('all')}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: productFilter === 'all' ? colors.accentContrast : colors.foreground }
                ]}>
                  All Products
                </Text>
              </TouchableOpacity>
              {imeiProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.filterChip,
                    { 
                      backgroundColor: productFilter === product.id ? colors.accent : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setProductFilter(product.id)}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: productFilter === product.id ? colors.accentContrast : colors.foreground }
                  ]} numberOfLines={1}>
                    {product.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Inventory Items</Text>
        </View>

        {/* List */}
        {filteredItems.length > 0 ? (
          <View style={[styles.itemsListCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
            {filteredItems.map((item, index) => {
              const product = productMap.get(item.productId);
              const statusColor = getStatusColor(item.status);
              const conditionColor = getConditionColor(item.condition);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.itemRow,
                    { borderBottomColor: colors.border },
                    index === filteredItems.length - 1 && styles.lastRow,
                  ]}
                  onPress={() => navigation.navigate('NewInventoryItem', { itemId: item.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.itemAvatar, { backgroundColor: colors.accent + '15' }]}>
                      <Ionicons name="barcode" size={20} color={colors.accent} />
                    </View>
                    <View style={styles.itemInfo}>
                      <View style={[styles.imeiBadge, { backgroundColor: colors.accent + '15' }]}>
                        <Text style={[styles.imeiText, { color: colors.accent }]}>{item.imei}</Text>
                      </View>
                      <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={1}>
                        {product?.name || 'Unknown Product'}
                      </Text>
                      <View style={styles.badgesRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {item.status === 'in_stock' ? 'In Stock' :
                             item.status === 'sold' ? 'Sold' :
                             item.status === 'defective' ? 'Defective' :
                             item.status === 'returned' ? 'Returned' : item.status}
                          </Text>
                        </View>
                        <View style={[styles.conditionBadge, { backgroundColor: conditionColor + '15' }]}>
                          <Text style={[styles.conditionText, { color: conditionColor }]}>
                            {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                        Added: {item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'Unknown'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.itemRight}>
                    {item.purchaseCost && (
                      <Text style={[styles.costText, { color: colors.foreground }]}>
                        NLe {formatNumber(item.purchaseCost)}
                      </Text>
                    )}
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted }]}>
              <Ionicons name="barcode-outline" size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {searchTerm || productFilter !== 'all' ? 'No items found' : 'No inventory items yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              {searchTerm || productFilter !== 'all'
                ? 'Try adjusting your filters or search terms'
                : 'Start by adding your first IMEI-tracked item'}
            </Text>
            {!searchTerm && productFilter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewInventoryItem')}
              >
                <Ionicons name="add" size={20} color={colors.accentContrast} />
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Add First Item
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="IMEI Inventory"
        subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
        useSafeArea={false}
        showBorder={false}
        rightContent={
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.navigate('NewInventoryItem')}
          >
            <Ionicons name="add" size={20} color={colors.accentContrast} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingTop: 0 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.xs,
  },
  filterRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  filterColumn: {
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  filterScroll: {
    marginTop: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  productFilterContainer: {
    marginTop: spacing.sm,
  },
  productFilterScroll: {
    marginTop: spacing.sm,
  },
  listContent: {
    paddingBottom: 40,
  },
  metricsCard: {
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.md,
  },
  metricsDividerHorizontal: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginVertical: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  itemsListCard: {
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.lg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  imeiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imeiText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    fontFamily: 'monospace',
  },
  productName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  conditionBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  dateText: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  costText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
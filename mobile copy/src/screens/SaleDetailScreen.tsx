/**
 * Sale Detail Screen
 * View and edit individual sale details
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
import { SalesService } from '../services/sales.service';
import { DatabaseService } from '../services/database.service';
import { InventoryItemService } from '../services/inventory-item.service';
import { Sale, SaleItem, Customer, Product, InventoryItem } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

/**
 * Safely parse sale items
 */
function parseSaleItems(items: string): SaleItem[] {
  try {
    if (!items) {
      console.log('[parseSaleItems] No items provided');
      return [];
    }
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    console.log('[parseSaleItems] Raw parsed items:', JSON.stringify(parsed, null, 2));
    if (!Array.isArray(parsed)) {
      console.log('[parseSaleItems] Items is not an array:', typeof parsed);
      return [];
    }
    // Ensure all numeric fields are properly set
    // Handle both mobile format (camelCase) and desktop format (snake_case)
    const mappedItems = parsed.map((item: any, index: number) => {
      console.log(`[parseSaleItems] Item ${index}:`, JSON.stringify(item, null, 2));
      const result = {
        id: item.id || '',
        // Handle both camelCase (productId) and snake_case (product_id)
        productId: item.productId || item.product_id || '',
        // Handle both camelCase (productName) and snake_case (product_name), plus other variants
        productName: item.productName || item.product_name || item.description || item.name || '',
        quantity: typeof item.quantity === 'number' ? item.quantity : 0,
        // Handle both camelCase (price) and snake_case (unit_price)
        price: typeof item.price === 'number' ? item.price : 
               (typeof item.unitPrice === 'number' ? item.unitPrice : 
               (typeof item.unit_price === 'number' ? item.unit_price : 0)),
        total: typeof item.total === 'number' ? item.total : (typeof item.amount === 'number' ? item.amount : 0),
        sku: item.sku || undefined,
        imeis: item.imeis || undefined,
        inventoryItemIds: item.inventoryItemIds || item.inventory_item_ids || undefined,
      };
      console.log(`[parseSaleItems] Mapped item ${index}:`, JSON.stringify(result, null, 2));
      return result;
    });
    console.log('[parseSaleItems] Final mapped items:', JSON.stringify(mappedItems, null, 2));
    return mappedItems;
  } catch (error: any) {
    console.error('[parseSaleItems] Error parsing items:', error);
    console.log('[parseSaleItems] Items value that caused error:', items);
    return [];
  }
}

/**
 * Safely format a number for display
 */
function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toLocaleString();
}

export default function SaleDetailScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { saleId } = route.params;
  const [sale, setSale] = useState<Sale | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [inventoryItems, setInventoryItems] = useState<Map<string, InventoryItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSale();
  }, [saleId]);

  const loadSale = async () => {
    try {
      setLoading(true);
      const saleData = await SalesService.getSaleById(saleId);
      if (!saleData) {
        navigation.goBack();
        return;
      }
      setSale(saleData);

      // Fetch customer details if customerId exists
      if (saleData.customerId) {
        try {
          const customerResult = await DatabaseService.getCustomerById(saleData.customerId);
          if (customerResult.data) {
            setCustomer(customerResult.data);
          }
        } catch (error: any) {
          console.error('Failed to load customer:', error);
        }
      }

      // Parse items and fetch product details
      console.log('[loadSale] Raw saleData.items:', saleData.items);
      console.log('[loadSale] saleData.items type:', typeof saleData.items);
      let items = parseSaleItems(saleData.items);
      console.log('[loadSale] Parsed items after parseSaleItems:', JSON.stringify(items, null, 2));
      
      const productMap = new Map<string, Product>();
      const inventoryItemIds: string[] = [];

      // Collect all inventory item IDs and product IDs, and fetch product names
      const updatedItems = await Promise.all(
        items.map(async (item, index) => {
          console.log(`[loadSale] Processing item ${index}:`, JSON.stringify(item, null, 2));
          
          if (item.inventoryItemIds && Array.isArray(item.inventoryItemIds)) {
            inventoryItemIds.push(...item.inventoryItemIds);
          }
          
          // If productName is missing, try to fetch it from the product
          if ((!item.productName || item.productName.trim() === '') && item.productId) {
            console.log(`[loadSale] Item ${index} missing productName, fetching product ${item.productId}`);
            try {
              const productResult = await DatabaseService.getProductById(item.productId);
              if (productResult.data) {
                console.log(`[loadSale] Product ${item.productId} found:`, productResult.data.name);
                productMap.set(item.productId, productResult.data);
                // Update the item with the product name
                item.productName = productResult.data.name;
              } else {
                console.log(`[loadSale] Product ${item.productId} not found in database`);
                // Product not found, use fallback
                item.productName = `Product ${item.productId.substring(0, 8)}`;
              }
            } catch (error: any) {
              console.error(`[loadSale] Failed to load product ${item.productId}:`, error);
              // If we can't load the product and productName is still empty, use a fallback
              item.productName = `Product ${item.productId.substring(0, 8)}`;
            }
          } else if (item.productId) {
            console.log(`[loadSale] Item ${index} has productName: "${item.productName}", still fetching product for metadata`);
            // ProductName exists, but still fetch product for metadata
            try {
              const productResult = await DatabaseService.getProductById(item.productId);
              if (productResult.data) {
                productMap.set(item.productId, productResult.data);
              }
            } catch (error: any) {
              console.error(`[loadSale] Failed to load product ${item.productId}:`, error);
            }
          } else {
            console.log(`[loadSale] Item ${index} has no productId`);
          }
          
          if (!item.productName || item.productName.trim() === '') {
            console.log(`[loadSale] Item ${index} still has no productName after processing, using fallback`);
            // Still no productName - use a generic fallback
            item.productName = item.productId 
              ? `Product ${item.productId.substring(0, 8)}` 
              : 'Unknown Product';
          }
          
          console.log(`[loadSale] Final item ${index}:`, JSON.stringify(item, null, 2));
          return item;
        })
      );
      
      items = updatedItems;
      console.log('[loadSale] Final items array:', JSON.stringify(items, null, 2));

      setProducts(productMap);

      // Fetch inventory items by IDs
      if (inventoryItemIds.length > 0) {
        const inventoryMap = new Map<string, InventoryItem>();
        await Promise.all(
          inventoryItemIds.map(async (id) => {
            try {
              const result = await InventoryItemService.getInventoryItemById(id);
              if (result.data) {
                inventoryMap.set(id, result.data);
              }
            } catch (error: any) {
              console.error(`Failed to load inventory item ${id}:`, error);
            }
          })
        );
        setInventoryItems(inventoryMap);
      }
    } catch (error: any) {
      console.error('Failed to load sale:', error);
      Alert.alert('Error', 'Failed to load sale details. Please try again.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!sale) return;
    // Navigate to NewSaleScreen with edit mode
    navigation.navigate('NewSale', { saleId: sale.id, saleData: sale });
  };

  const handleDelete = () => {
    if (!sale) return;

    Alert.alert(
      'Delete Sale',
      'Are you sure you want to delete this sale? This action cannot be undone.',
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
              await SalesService.deleteSale(saleId);
              Alert.alert('Success', 'Sale deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              console.error('Failed to delete sale:', error);
              Alert.alert('Error', 'Failed to delete sale. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'refunded':
        return '#6B7280';
      default:
        return colors.mutedForeground;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading sale...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!sale) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Sale not found
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

  const items = parseSaleItems(sale.items);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Header
        title="Sale Details"
        subtitle={sale.id.substring(0, 8).toUpperCase()}
        showBackButton
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil',
            onPress: handleEdit,
            color: colors.accent,
            disabled: deleting,
            accessibilityLabel: 'Edit sale',
          },
          {
            icon: 'trash-outline',
            onPress: handleDelete,
            color: '#EF4444',
            disabled: deleting,
            loading: deleting,
            accessibilityLabel: 'Delete sale',
          },
        ]}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status & Total Card */}
        <LinearGradient
          colors={isDark ? ['#1E3A8A', '#2563EB'] : ['#2563EB', '#0EA5E9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          <View style={styles.gradientContent}>
            <View style={styles.gradientLeft}>
              <View style={styles.gradientIcon}>
                <Ionicons name="receipt" size={28} color="white" />
              </View>
              <View style={styles.gradientText}>
                <Text style={styles.gradientLabel}>Total Amount</Text>
                <Text style={styles.gradientValue}>NLe {formatNumber(sale.total)}</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadgeGradient,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
            >
              <Text style={styles.statusTextGradient}>
                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sale Info Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="information-circle" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Information</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Customer</Text>
            </View>
            <View style={styles.infoValueContainer}>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {sale.customerName || 'Walk-in Customer'}
              </Text>
              {customer?.phone && (
                <Text style={[styles.infoSubValue, { color: colors.mutedForeground }]}>
                  {customer.phone}
                </Text>
              )}
            </View>
          </View>
          
          {customer?.email && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Email</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.email}
              </Text>
            </View>
          )}
          
          {customer?.address && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Address</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {customer.address}
                {customer.city && `, ${customer.city}`}
                {customer.state && `, ${customer.state}`}
              </Text>
            </View>
          )}

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Date</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {formatDate(sale.createdAt)}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="card-outline" size={18} color={colors.mutedForeground} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Payment</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>
              {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1).replace('_', ' ')}
            </Text>
          </View>

          {sale.invoiceNumber && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Invoice</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {sale.invoiceNumber}
              </Text>
            </View>
          )}

          {sale.cashierName && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowLeft}>
                <Ionicons name="person-circle-outline" size={18} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Cashier</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>
                {sale.cashierName}
              </Text>
            </View>
          )}
        </View>

        {/* Items Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="cube-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Items ({items.length})
              </Text>
            </View>
          </View>

          {items.map((item, index) => {
            const product = products.get(item.productId);
            const isImeiTracked = product?.productModelId;
            const itemInventoryItems = item.inventoryItemIds
              ? item.inventoryItemIds
                  .map((id) => inventoryItems.get(id))
                  .filter((item) => item !== undefined)
              : [];

            return (
              <View 
                key={item.id || index} 
                style={[
                  styles.itemRow,
                  index < items.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.foreground }]}>
                    {item.productName}
                  </Text>
                  {product && (
                    <View style={styles.itemMeta}>
                      {product.storage && product.color && (
                        <Text style={[styles.itemMetaText, { color: colors.mutedForeground }]}>
                          {product.storage} • {product.color}
                        </Text>
                      )}
                      {isImeiTracked && (
                        <View style={[styles.imeiBadge, { backgroundColor: colors.accent + '15' }]}>
                          <Ionicons name="barcode-outline" size={12} color={colors.accent} />
                          <Text style={[styles.imeiBadgeText, { color: colors.accent }]}>
                            IMEI Tracked
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {item.imeis && item.imeis.length > 0 && (
                    <View style={styles.imeiListContainer}>
                      <Text style={[styles.imeiLabel, { color: colors.mutedForeground }]}>
                        IMEI Numbers:
                      </Text>
                      <View style={styles.imeiTags}>
                        {item.imeis.slice(0, 3).map((imei, imeiIndex) => {
                          const invItem = itemInventoryItems.find((inv) => inv?.imei === imei);
                          const conditionColor = invItem?.condition === 'new' ? '#10B981' :
                                                 invItem?.condition === 'refurbished' ? '#F59E0B' :
                                                 invItem?.condition === 'used' ? '#6B7280' : colors.mutedForeground;
                          return (
                            <View key={imeiIndex} style={[styles.imeiTag, { backgroundColor: colors.input }]}>
                              <Ionicons name="barcode" size={12} color={colors.accent} />
                              <Text style={[styles.imeiTagText, { color: colors.foreground }]}>
                                {imei}
                              </Text>
                              {invItem && (
                                <View style={[styles.imeiConditionBadge, { backgroundColor: conditionColor + '15' }]}>
                                  <Text style={[styles.imeiConditionText, { color: conditionColor }]}>
                                    {invItem.condition.charAt(0).toUpperCase() + invItem.condition.slice(1)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                        {item.imeis.length > 3 && (
                          <Text style={[styles.imeiMoreText, { color: colors.mutedForeground }]}>
                            +{item.imeis.length - 3} more
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                  {item.sku && !isImeiTracked && (
                    <Text style={[styles.itemSku, { color: colors.mutedForeground }]}>
                      SKU: {item.sku}
                    </Text>
                  )}
                </View>
                <View style={styles.itemRight}>
                  <View style={styles.itemQuantity}>
                    <Text style={[styles.itemQuantityText, { color: colors.mutedForeground }]}>
                      {item.quantity}x
                    </Text>
                  </View>
                  <View style={styles.itemPrice}>
                    <Text style={[styles.itemPriceText, { color: colors.foreground }]}>
                      NLe {formatNumber(item.total)}
                    </Text>
                    <Text style={[styles.itemUnitPrice, { color: colors.mutedForeground }]}>
                      @ NLe {formatNumber(item.price)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Totals Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calculator-outline" size={20} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Summary</Text>
            </View>
          </View>

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              NLe {formatNumber(sale.subtotal)}
            </Text>
          </View>

          {(sale.discount || 0) > 0 && (
            <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: '#EF4444' }]}>
                -NLe {formatNumber(sale.discount)}
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Tax</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>
              NLe {formatNumber(sale.tax)}
            </Text>
          </View>

          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.accent }]}>
              NLe {formatNumber(sale.total)}
            </Text>
          </View>
        </View>

        {sale.notes && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="document-text-outline" size={20} color={colors.accent} />
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Notes</Text>
              </View>
            </View>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{sale.notes}</Text>
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
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusTextGradient: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: 'white',
    textTransform: 'capitalize',
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
    textAlign: 'right',
    flex: 1,
  },
  infoValueContainer: {
    alignItems: 'flex-end',
    flex: 1,
  },
  infoSubValue: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  itemMetaText: {
    fontSize: fontSize.xs,
  },
  imeiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imeiBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  imeiListContainer: {
    marginTop: 8,
  },
  imeiLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  imeiTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  imeiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imeiTagText: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
  imeiConditionBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  imeiConditionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  imeiMoreText: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  itemSku: {
    fontSize: fontSize.xs,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemQuantity: {
    justifyContent: 'center',
  },
  itemQuantityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  itemPrice: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  itemPriceText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  itemUnitPrice: {
    fontSize: fontSize.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  totalLabel: {
    fontSize: fontSize.base,
  },
  totalValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    marginTop: spacing.xs,
    paddingTop: spacing.md,
  },
  grandTotalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  grandTotalValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  notesText: {
    fontSize: fontSize.base,
    lineHeight: 22,
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


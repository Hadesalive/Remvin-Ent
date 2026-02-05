/**
 * Invoice List Screen
 * Display all invoices with search and filtering
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { InvoiceService } from '../services/invoice.service';
import { Invoice } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

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

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'N/A';
  }
}

function getStatusColor(status: string, colors: ThemeColors): string {
  switch (status) {
    case 'paid':
      return '#10B981';
    case 'sent':
      return '#3B82F6';
    case 'overdue':
      return '#EF4444';
    case 'draft':
      return colors.mutedForeground;
    case 'cancelled':
      return '#6B7280';
    default:
      return colors.mutedForeground;
  }
}

interface InvoiceListScreenProps {
  navigation: {
    navigate: (screen: string, params?: { invoiceId?: string }) => void;
    addListener: (type: string, callback: () => void) => () => void;
  };
}

export default function InvoiceListScreen({ navigation }: InvoiceListScreenProps) {
  const { colors, isDark } = useTheme();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>('all');

  useEffect(() => {
    loadInvoices();
    const unsubscribe = navigation.addListener('focus', () => {
      loadInvoices();
    });
    return unsubscribe;
  }, [navigation]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await InvoiceService.getInvoices();
      setInvoices(data);
    } catch (error: unknown) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice => {
        const number = invoice.number?.toLowerCase() || '';
        const customerName = invoice.customerName?.toLowerCase() || '';
        return number.includes(term) || customerName.includes(term);
      });
    }

    return filtered;
  }, [invoices, searchTerm, statusFilter]);

  const metricsData = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const totalAmount = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const paidAmount = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0);
    return { total, paid, totalAmount, paidAmount };
  }, [invoices]);

  const renderInvoiceItem = ({ item: invoice }: { item: Invoice }) => {
    const statusColor = getStatusColor(invoice.status, colors);
    const balance = invoice.total - (invoice.paidAmount || 0);

    return (
      <TouchableOpacity
        style={[styles.invoiceItem, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceItemLeft}>
          <View style={styles.invoiceItemHeader}>
            <Text style={[styles.invoiceNumber, { color: colors.foreground }]}>
              {invoice.number}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
          {invoice.customerName && (
            <Text style={[styles.customerName, { color: colors.mutedForeground }]} numberOfLines={1}>
              {invoice.customerName}
            </Text>
          )}
          <View style={styles.invoiceFooter}>
            <Text style={[styles.invoiceDate, { color: colors.mutedForeground }]}>
              {formatDate(invoice.createdAt)}
            </Text>
            {invoice.dueDate && (
              <>
                <Text style={[styles.separator, { color: colors.mutedForeground }]}>•</Text>
                <Text style={[styles.dueDate, { color: invoice.status === 'overdue' ? '#EF4444' : colors.mutedForeground }]}>
                  Due: {formatDate(invoice.dueDate)}
                </Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.invoiceItemRight}>
          <Text style={[styles.invoiceAmount, { color: colors.foreground }]}>
            {invoice.currency || 'NLe'} {formatNumber(invoice.total)}
          </Text>
          {balance > 0 && invoice.status !== 'paid' && (
            <Text style={[styles.balanceText, { color: '#EF4444' }]}>
              Balance: {invoice.currency || 'NLe'} {formatNumber(balance)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View>
      {/* Metrics Card */}
      <LinearGradient
        colors={isDark ? ['#3B82F6', '#2563EB'] : ['#3B82F6', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Invoices</Text>
            <Text style={styles.metricValue}>{metricsData.total}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Paid</Text>
            <Text style={styles.metricValue}>{metricsData.paid}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Amount</Text>
            <Text style={styles.metricValue}>NLe {formatNumber(metricsData.totalAmount)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search invoices..."
          placeholderTextColor={colors.mutedForeground}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === status ? colors.accent : colors.muted,
                  borderColor: statusFilter === status ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: statusFilter === status ? colors.accentContrast : colors.mutedForeground,
                  },
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          All Invoices ({filteredInvoices.length})
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading invoices...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Invoices"
        subtitle={`${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'}`}
        actions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('NewInvoice'),
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            accessibilityLabel: 'Create new invoice',
          },
        ]}
        showBorder={false}
        useSafeArea={false}
      />
      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoiceItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No invoices found</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new invoice to get started'}
            </Text>
            {!searchTerm && statusFilter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewInvoice')}
              >
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Create Invoice
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  metricsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  invoiceItemLeft: {
    flex: 1,
  },
  invoiceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  invoiceNumber: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  customerName: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  invoiceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  invoiceDate: {
    fontSize: fontSize.xs,
  },
  separator: {
    fontSize: fontSize.xs,
  },
  dueDate: {
    fontSize: fontSize.xs,
  },
  invoiceItemRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  balanceText: {
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});

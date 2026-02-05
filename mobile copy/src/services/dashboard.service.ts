/**
 * Dashboard Service
 * Fetches real-time analytics from Supabase
 */

import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, getDay } from 'date-fns';

export interface DashboardData {
  revenue: {
    amount: string;
    growth: string;
    label: string;
  };
  stats: {
    label: string;
    value: string;
    icon: string;
    color: string;
    trend: string;
    featured?: boolean;
    description?: string;
  }[];
  recentSales: {
    id: string;
    customer: string;
    date: string;
    amount: string;
    status: string;
    statusColor: string;
  }[];
  weeklySales: {
    data: number[];
    growth: number;
  };
}

/**
 * Safely parse a number, returning 0 if invalid
 */
function safeParseNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Safely format a number with locale string
 */
function safeFormatNumber(value: any): string {
  const num = safeParseNumber(value);
  return num.toLocaleString('en-US');
}

/**
 * Safely format currency
 */
function safeFormatCurrency(value: any): string {
  const num = safeParseNumber(value);
  return `NLe ${num.toLocaleString('en-US')}`;
}

export const DashboardService = {
  /**
   * Fetch all dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const [revenue, stats, recentSales, weeklySales] = await Promise.all([
        this.getRevenue(),
        this.getStats(),
        this.getRecentSales(),
        this.getWeeklySales(),
      ]);

      return {
        revenue,
        stats,
        recentSales,
        weeklySales,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get total revenue and growth
   */
  async getRevenue() {
    const today = new Date();
    const lastWeekStart = subDays(today, 14);
    const thisWeekStart = subDays(today, 7);

    // Get this week's revenue
    const { data: thisWeek } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', thisWeekStart.toISOString())
      .lte('created_at', today.toISOString())
      .is('deleted_at', null);

    // Get last week's revenue
    const { data: lastWeek } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', lastWeekStart.toISOString())
      .lt('created_at', thisWeekStart.toISOString())
      .is('deleted_at', null);

    const thisWeekTotal = (thisWeek || []).reduce((sum, sale) => {
      return sum + safeParseNumber(sale.total);
    }, 0);
    
    const lastWeekTotal = (lastWeek || []).reduce((sum, sale) => {
      return sum + safeParseNumber(sale.total);
    }, 0);

    const growthPercent = lastWeekTotal > 0 
      ? (((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100)
      : 0;

    return {
      amount: safeFormatCurrency(thisWeekTotal),
      growth: `${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}%`,
      label: 'From the previous week',
    };
  },

  /**
   * Get dashboard statistics
   */
  async getStats() {
    const today = new Date();
    const last30Days = subDays(today, 30);
    const previous30Days = subDays(today, 60);

    // Get total products (current)
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Get total products from 30 days ago (for trend)
    const { data: oldProducts } = await supabase
      .from('products')
      .select('created_at')
      .is('deleted_at', null);
    
    const oldProductCount = (oldProducts || []).filter(
      (p) => p.created_at && new Date(p.created_at) < last30Days
    ).length;
    const productsTrend = oldProductCount > 0
      ? `+${totalProducts - oldProductCount}`
      : `${totalProducts || 0}`;

    // Get low stock products (stock < min_stock)
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('stock, min_stock')
      .is('deleted_at', null);

    const lowStock = (lowStockProducts || []).filter(
      (p) => {
        const stock = safeParseNumber(p.stock);
        const minStock = safeParseNumber(p.min_stock);
        return minStock > 0 && stock < minStock;
      }
    ).length;

    // Get low stock from previous period for trend
    const { data: allProducts } = await supabase
      .from('products')
      .select('stock, min_stock, updated_at')
      .is('deleted_at', null);
    
    const oldLowStock = (allProducts || []).filter((p) => {
      const stock = safeParseNumber(p.stock);
      const minStock = safeParseNumber(p.min_stock);
      const wasLowStock = minStock > 0 && stock < minStock;
      // Check if this product was updated more than 30 days ago (approximation)
      const isOld = !p.updated_at || new Date(p.updated_at) < last30Days;
      return wasLowStock && isOld;
    }).length;

    const lowStockTrend = lowStock > oldLowStock ? 'Increasing' : lowStock < oldLowStock ? 'Decreasing' : lowStock > 0 ? 'Urgent' : 'Good';

    // Get total sales count for last 30 days (current period)
    const { count: totalSold } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last30Days.toISOString())
      .is('deleted_at', null);

    // Get total sales count for previous 30 days (for trend)
    const { count: previousSold } = await supabase
      .from('sales')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', previous30Days.toISOString())
      .lt('created_at', last30Days.toISOString())
      .is('deleted_at', null);

    const soldTrend = previousSold && previousSold > 0
      ? `${(((totalSold || 0) - previousSold) / previousSold * 100) >= 0 ? '+' : ''}${(((totalSold || 0) - previousSold) / previousSold * 100).toFixed(0)}%`
      : totalSold ? `${totalSold}` : '0';

    // Get active debts
    const { data: debts } = await supabase
      .from('debts')
      .select('amount, paid')
      .eq('status', 'active')
      .is('deleted_at', null);

    const totalDebt = (debts || []).reduce((sum, debt) => {
      const amount = safeParseNumber(debt.amount);
      const paid = safeParseNumber(debt.paid);
      return sum + (amount - paid);
    }, 0);
    
    const clientsWithDebt = debts?.length || 0;

    // Get active customers (customers with sales in last 30 days)
    const { data: recentCustomers } = await supabase
      .from('sales')
      .select('customer_id')
      .gte('created_at', last30Days.toISOString())
      .is('deleted_at', null);
    
    const uniqueCustomerIds = new Set((recentCustomers || [])
      .map(s => s.customer_id)
      .filter(id => id));
    
    const activeCustomersCount = uniqueCustomerIds.size;
    
    // Get active customers from previous period for trend
    const { data: prevCustomers } = await supabase
      .from('sales')
      .select('customer_id')
      .gte('created_at', previous30Days.toISOString())
      .lt('created_at', last30Days.toISOString())
      .is('deleted_at', null);
    
    const prevUniqueCustomerIds = new Set((prevCustomers || [])
      .map(s => s.customer_id)
      .filter(id => id));
    const prevActiveCustomersCount = prevUniqueCustomerIds.size;
    
    const activeCustomersTrend = prevActiveCustomersCount > 0
      ? `${((activeCustomersCount - prevActiveCustomersCount) >= 0 ? '+' : '')}${activeCustomersCount - prevActiveCustomersCount} this week`
      : activeCustomersCount > 0 ? `${activeCustomersCount} active` : '0';

    return [
      {
        label: 'Total Products',
        value: String(totalProducts || 0),
        icon: 'cube',
        color: '#8B9DC3',
        trend: productsTrend,
        featured: false,
      },
      {
        label: 'Total Sold',
        value: totalSold ? (totalSold >= 1000 ? `${(totalSold / 1000).toFixed(1)}k` : String(totalSold)) : '0',
        icon: 'receipt',
        color: '#86BC7A',
        trend: soldTrend,
        featured: false,
      },
      {
        label: 'Low Stock',
        value: String(lowStock),
        icon: 'alert-circle',
        color: '#E8B86D',
        trend: lowStockTrend,
        featured: false,
      },
      {
        label: 'Total Debt',
        value: safeFormatCurrency(totalDebt),
        icon: 'cash',
        color: '#D4888F',
        trend: `${clientsWithDebt} Clients`,
        featured: false,
      },
      {
        label: 'Active Customers',
        value: String(activeCustomersCount || 0),
        icon: 'people',
        color: '#7FB5B5',
        trend: activeCustomersTrend,
        description: 'Clients with recent activity',
        featured: true, // Featured KPI for tablets
      },
    ];
  },

  /**
   * Get recent sales
   */
  async getRecentSales() {
    const { data: sales } = await supabase
      .from('sales')
      .select('id, customer_name, total, status, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(4);

    return (sales || []).map((sale) => ({
      id: sale.id || '',
      customer: sale.customer_name || 'Unknown',
      date: sale.created_at ? this.formatDate(sale.created_at) : 'Unknown date',
      amount: safeFormatCurrency(sale.total),
      status: sale.status === 'completed' ? 'Paid' : 'Pending',
      statusColor: sale.status === 'completed' ? '#4CD964' : '#FF9500',
    }));
  },

  /**
   * Get weekly sales data (current week, Monday to Sunday)
   */
  async getWeeklySales(): Promise<{ data: number[]; growth: number }> {
    const today = new Date();
    
    // Get current week (Monday to Sunday)
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    
    // Get previous week for comparison
    const prevWeekStart = startOfWeek(subWeeks(weekStart, 1), { weekStartsOn: 1 });
    const prevWeekEnd = endOfWeek(subWeeks(weekStart, 1), { weekStartsOn: 1 });

    // Get days of current week (Monday to Sunday)
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });

    // Fetch sales for each day of current week
    const salesPromises = days.map(async (day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const { data } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString())
        .is('deleted_at', null);

      return (data || []).reduce((sum, sale) => {
        return sum + safeParseNumber(sale.total);
      }, 0);
    });

    const weeklyData = await Promise.all(salesPromises);
    
    // Calculate total for current week
    const currentWeekTotal = weeklyData.reduce((sum, val) => sum + val, 0);
    
    // Calculate total for previous week
    const { data: prevWeekSales } = await supabase
      .from('sales')
      .select('total')
      .gte('created_at', prevWeekStart.toISOString())
      .lte('created_at', prevWeekEnd.toISOString())
      .is('deleted_at', null);
    
    const prevWeekTotal = (prevWeekSales || []).reduce((sum, sale) => {
      return sum + safeParseNumber(sale.total);
    }, 0);
    
    // Calculate growth percentage
    const growth = prevWeekTotal > 0
      ? (((currentWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
      : currentWeekTotal > 0 ? 100 : 0;

    return {
      data: weeklyData,
      growth,
    };
  },

  /**
   * Format date helper
   */
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return `Today, ${format(date, 'hh:mm a')}`;
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else {
        return format(date, 'MMM dd');
      }
    } catch (error) {
      return 'Invalid date';
    }
  },
};



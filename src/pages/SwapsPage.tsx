import React, { useState, useEffect, useMemo } from 'react';
import { Button, Toast } from '@/components/ui/core';
import { Input } from '@/components/ui/forms';
import { PaginatedTableCard, KPICard } from '@/components/ui/dashboard';
import { swapService } from '@/lib/services';
import { Swap } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  DevicePhoneMobileIcon,
  CurrencyDollarIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

export default function SwapsPage() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSwaps();
  }, []);

  const loadSwaps = async () => {
    setLoading(true);
    try {
      const response = await swapService.getAllSwaps();
      if (response.success && response.data) {
        setSwaps(response.data);
      } else {
        setToast({ message: response.error || 'Failed to load swaps', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading swaps:', error);
      setToast({ message: 'Failed to load swaps', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSwaps = useMemo(() => {
    if (!searchTerm.trim()) return swaps;
    const term = searchTerm.toLowerCase();
    return swaps.filter(swap =>
      swap.swapNumber.toLowerCase().includes(term) ||
      swap.customerName?.toLowerCase().includes(term) ||
      swap.tradeInImei?.toLowerCase().includes(term) ||
      swap.purchasedProductName?.toLowerCase().includes(term) ||
      swap.tradeInProductName?.toLowerCase().includes(term)
    );
  }, [swaps, searchTerm]);

  const columns = [
    { key: 'swapNumber', label: 'Swap #', sortable: true },
    { key: 'customer', label: 'Customer', sortable: true },
    { key: 'purchased', label: 'Purchased', sortable: true },
    { key: 'tradeIn', label: 'Trade-in', sortable: true },
    { key: 'amount', label: 'Amount Paid', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'actions', label: 'Actions' }
  ];

  const tableData = filteredSwaps.map((swap) => ({
    id: swap.id,
    swapNumber: (
      <span className="font-mono font-medium" style={{ color: 'var(--foreground)' }}>
        {swap.swapNumber}
      </span>
    ),
    customer: (
      <div>
        <div className="font-medium" style={{ color: 'var(--foreground)' }}>
          {swap.customerName}
        </div>
        {swap.customerPhone && (
          <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {swap.customerPhone}
          </div>
        )}
      </div>
    ),
    purchased: (
      <div>
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {swap.purchasedProductName}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {formatCurrency(swap.purchasedProductPrice)}
        </div>
      </div>
    ),
    tradeIn: (
      <div>
        <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
          {swap.tradeInProductName || 'Device'}
        </div>
        <div className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
          IMEI: {swap.tradeInImei}
        </div>
        <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
          {swap.tradeInCondition} • {formatCurrency(swap.tradeInValue)}
        </div>
      </div>
    ),
    amount: (
      <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
        {formatCurrency(swap.differencePaid)}
      </span>
    ),
    date: (
      <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        {formatDate(swap.createdAt)}
      </span>
    ),
    actions: (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/swaps/${swap.id}`)}
      >
        View
      </Button>
    )
  }));

  const stats = useMemo(() => {
    const totalValue = filteredSwaps.reduce((sum, swap) => sum + swap.differencePaid, 0);
    const totalTradeInValue = filteredSwaps.reduce((sum, swap) => sum + swap.tradeInValue, 0);
    return {
      totalSwaps: filteredSwaps.length,
      totalRevenue: totalValue,
      totalTradeInValue: totalTradeInValue,
      tradeInDevices: filteredSwaps.length
    };
  }, [filteredSwaps]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Device Swaps
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Manage device trade-in and swap transactions
          </p>
        </div>
        <Button
          onClick={() => navigate('/swaps/new')}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Swap
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Swaps" 
          value={stats.totalSwaps.toString()}
          icon={<DevicePhoneMobileIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#3b82f6"
        />
        <KPICard 
          title="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)}
          icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#10b981"
        />
        <KPICard 
          title="Trade-in Value" 
          value={formatCurrency(stats.totalTradeInValue)}
          icon={<CubeIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#6366f1"
        />
        <KPICard 
          title="Trade-in Devices" 
          value={stats.tradeInDevices.toString()}
          icon={<DevicePhoneMobileIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#f59e0b"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
        <Input
          placeholder="Search swaps by number, customer, IMEI, or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <PaginatedTableCard
        title="Swaps"
        data={tableData}
        columns={columns}
        loading={loading}
        itemsPerPage={20}
        empty={!loading && tableData.length === 0}
        emptyTitle="No swaps found"
        emptyDescription="Create your first device swap transaction"
        emptyAction={
          <Button onClick={() => navigate('/swaps/new')} className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Swap
          </Button>
        }
      />

      {/* Toast */}
      {toast && (
        <Toast
          variant={toast.type === 'success' ? 'success' : 'error'}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}
    </div>
  );
}

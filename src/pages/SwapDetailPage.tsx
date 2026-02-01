import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Toast } from '@/components/ui/core';
import { KPICard } from '@/components/ui/dashboard/kpi-card';
import { swapService } from '@/lib/services';
import { Swap } from '@/lib/types/core';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  ArrowLeftIcon,
  TrashIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  DevicePhoneMobileIcon,
  CubeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function SwapDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useSettings();
  const swapId = params.id as string;
  
  const [swapData, setSwapData] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadSwap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapId]);

  const loadSwap = async () => {
    setLoading(true);
    try {
      const response = await swapService.getSwapById(swapId);
      if (response.success && response.data) {
        setSwapData(response.data);
      } else {
        setToast({ message: 'Swap not found', type: 'error' });
      }
    } catch (error) {
      console.error('Error loading swap:', error);
      setToast({ message: 'Failed to load swap', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this swap? This action cannot be undone.')) return;

    try {
      const response = await swapService.deleteSwap(swapId);
      if (response.success) {
        setToast({ message: 'Swap deleted successfully', type: 'success' });
        setTimeout(() => {
          navigate('/swaps');
        }, 1000);
      } else {
        setToast({ message: response.error || 'Failed to delete swap', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting swap:', error);
      setToast({ message: 'Failed to delete swap', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading swap details...</p>
        </div>
      </div>
    );
  }

  if (!swapData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Swap not found</p>
          <Button onClick={() => navigate('/swaps')} className="mt-4">
            Back to Swaps
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/swaps')}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Swaps
          </Button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Swap #{swapData.swapNumber}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {formatDate(swapData.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span 
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              swapData.status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : swapData.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {swapData.status.charAt(0).toUpperCase() + swapData.status.slice(1)}
          </span>
          <Button
            variant="outline"
            onClick={handleDelete}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard 
          title="Product Price" 
          value={formatCurrency(swapData.purchasedProductPrice)}
          icon={<CurrencyDollarIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#10b981"
        />
        <KPICard 
          title="Trade-in Value" 
          value={formatCurrency(swapData.tradeInValue)}
          icon={<DevicePhoneMobileIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#3b82f6"
        />
        <KPICard 
          title="Amount Paid" 
          value={formatCurrency(swapData.differencePaid)}
          icon={<CheckCircleIcon className="h-6 w-6" style={{ color: 'var(--accent)' }} />}
          accentColor="#6366f1"
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div 
          className="p-5 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <UserIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Customer Information
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Name</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {swapData.customerName}
              </p>
            </div>
            {swapData.customerPhone && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Phone</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {swapData.customerPhone}
                </p>
              </div>
            )}
            {swapData.customerEmail && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Email</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {swapData.customerEmail}
                </p>
              </div>
            )}
            {swapData.customerAddress && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Address</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {swapData.customerAddress}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Purchased Product */}
        <div 
          className="p-5 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CubeIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Purchased Product
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Product Name</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {swapData.purchasedProductName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Price</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(swapData.purchasedProductPrice)}
              </p>
            </div>
            {swapData.saleId && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Sale ID</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/sales/${swapData.saleId}`)}
                  className="text-xs"
                >
                  View Sale
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Trade-in Device */}
        <div 
          className="p-5 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <DevicePhoneMobileIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Trade-in Device
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Device Model</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {swapData.tradeInProductName || 'Not specified'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>IMEI</p>
              <p className="text-sm font-mono" style={{ color: 'var(--foreground)' }}>
                {swapData.tradeInImei}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Condition</p>
              <span 
                className="inline-block px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: swapData.tradeInCondition === 'new' ? 'rgba(34, 197, 94, 0.1)' : 
                                   swapData.tradeInCondition === 'refurbished' ? 'rgba(251, 191, 36, 0.1)' : 
                                   'rgba(107, 114, 128, 0.1)',
                  color: swapData.tradeInCondition === 'new' ? 'rgb(34, 197, 94)' : 
                         swapData.tradeInCondition === 'refurbished' ? 'rgb(251, 191, 36)' : 
                         'rgb(107, 114, 128)'
                }}
              >
                {swapData.tradeInCondition.charAt(0).toUpperCase() + swapData.tradeInCondition.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Trade-in Value</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(swapData.tradeInValue)}
              </p>
            </div>
            {swapData.tradeInNotes && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Notes</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {swapData.tradeInNotes}
                </p>
              </div>
            )}
            {swapData.inventoryItemId && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Inventory Item</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/inventory-items/${swapData.inventoryItemId}`)}
                  className="text-xs"
                >
                  View Inventory Item
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Information */}
        <div 
          className="p-5 rounded-xl border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <CurrencyDollarIcon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
              Payment Information
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Payment Method</p>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                {swapData.paymentMethod.charAt(0).toUpperCase() + swapData.paymentMethod.slice(1).replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Amount Paid</p>
              <p className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {formatCurrency(swapData.differencePaid)}
              </p>
            </div>
            {swapData.notes && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted-foreground)' }}>Notes</p>
                <p className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {swapData.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

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

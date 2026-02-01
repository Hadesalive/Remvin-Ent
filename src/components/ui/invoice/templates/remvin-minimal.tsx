import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const remvinMinimalTemplate: InvoiceTemplate = {
  id: 'remvin-minimal',
  name: 'Remvin Minimal',
  description: 'Clean and minimal invoice template for Remvin Enterprise LTD',
  preview: 'remvin-minimal-preview',
  colors: {
    primary: '#1e40af',        // Remvin blue
    secondary: '#64748b',       // Slate gray
    accent: '#3b82f6',         // Light blue
    background: '#ffffff',
    text: '#0f172a',
  },
  layout: {
    headerStyle: 'minimal',
    showLogo: true,
    showBorder: false,
    itemTableStyle: 'simple',
    footerStyle: 'minimal',
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
    size: 'medium',
  },
};

export const RemvinMinimalPreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
    <div className="absolute inset-0 opacity-[0.04]" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }} />
    <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded" style={{ background: '#1e40af' }} />
        <div className="text-xs font-medium" style={{ color: '#0f172a' }}>REMVIN MINIMAL</div>
      </div>
      <div className="text-right text-[8px]" style={{ color: '#64748b' }}>
        <div className="font-semibold">INVOICE</div>
        <div>#INV-001</div>
      </div>
    </div>
    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
      <div className="text-[7px]" style={{ color: '#64748b' }}>
        <div>Remvin Enterprise LTD</div>
        <div className="mt-1">Client Name</div>
      </div>
      <div className="text-right">
        <div className="text-[6px] uppercase mb-1" style={{ color: '#64748b' }}>Total</div>
        <div className="text-lg font-bold" style={{ color: '#1e40af' }}>NLe 3,750.00</div>
      </div>
    </div>
  </div>
);

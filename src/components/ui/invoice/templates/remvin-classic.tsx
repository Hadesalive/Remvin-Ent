import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';

export const remvinClassicTemplate: InvoiceTemplate = {
  id: 'remvin-classic',
  name: 'Remvin Classic',
  description: 'Simple and professional invoice template for Remvin Enterprise LTD',
  preview: 'remvin-classic-preview',
  colors: {
    primary: '#1e40af',        // Remvin blue
    secondary: '#0f172a',      // Dark text
    accent: '#3b82f6',         // Light blue accent
    background: '#ffffff',
    text: '#0f172a',
  },
  layout: {
    headerStyle: 'classic',
    showLogo: true,
    showBorder: true,
    itemTableStyle: 'detailed',
    footerStyle: 'detailed',
  },
  fonts: {
    primary: 'Inter',
    secondary: 'Inter',
    size: 'medium',
  },
};

export const RemvinClassicPreview = () => (
  <div className="w-full h-32 bg-white rounded-lg relative overflow-hidden border border-gray-200">
    <div className="absolute inset-0 opacity-[0.06]" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }} />
    <div className="absolute top-2 left-3 right-3 flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg" style={{ background: '#1e40af' }} />
        <div className="text-xs font-semibold" style={{ color: '#0f172a' }}>REMVIN CLASSIC</div>
      </div>
      <div className="text-right text-[7px]" style={{ color: '#0f172a' }}>
        <div>INVOICE</div>
        <div>#INV-001</div>
      </div>
    </div>
    <div className="absolute bottom-2 left-3 right-3 grid grid-cols-3 gap-2">
      <div className="col-span-2 text-[7px]" style={{ color: '#0f172a' }}>
        <div className="uppercase text-[6px]" style={{ color: '#1e40af' }}>Bill To</div>
        <div>Client Name</div>
        <div className="uppercase text-[6px] mt-1" style={{ color: '#1e40af' }}>From</div>
        <div>Remvin Enterprise LTD</div>
      </div>
      <div className="text-right rounded p-1" style={{ background: '#1e40af0d', border: '1px solid #1e40af33' }}>
        <div className="text-[6px] uppercase" style={{ color: '#0f172a' }}>Total</div>
        <div className="text-base font-semibold" style={{ color: '#1e40af' }}>NLe 3,750.00</div>
      </div>
    </div>
  </div>
);

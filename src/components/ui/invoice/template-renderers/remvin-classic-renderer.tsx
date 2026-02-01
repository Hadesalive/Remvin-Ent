/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { InvoiceTemplate } from '../invoice-templates';
// Removed paginateInvoiceItems - using BOQ-style pagination instead

interface InvoiceItem {
  id: string;
  description: string;
  itemDescription?: string;
  quantity: number;
  rate: number;
  amount: number;
  taxable?: boolean;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  invoiceType?: string;
  salesRep?: string;
  salesRepId?: string;
  status?: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  company: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
    logo?: string;
  };
  customer: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    email: string;
  };
  items: InvoiceItem[];
  notes?: string;
  terms?: string;
  taxRate: number;
  taxes?: Array<{
    id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
  discount: number;
  currency?: string;
}

interface TemplateRendererProps {
  data: InvoiceData;
  template: InvoiceTemplate;
  brandLogos?: string[];
}

const formatDateValue = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString();
};

const normalizeCurrency = (currency?: string): string => {
  const raw = currency || 'NLe';
  return raw === 'SLL' || raw === 'SLE' || raw === 'NLE' || raw === 'NLe' ? 'NLe' : raw;
};

const currencySymbols: Record<string, string> = {
  USD: '$',
  SLE: 'NLe ',
  SLL: 'NLe ',
  NLE: 'NLe ',
  NLe: 'NLe ',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
};

const formatCurrency = (amount: number, currency?: string) => {
  const normalized = normalizeCurrency(currency);
  const symbol = currencySymbols[normalized] || normalized;
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const printStyles = `
  @media print {
    @page { 
      size: A4; 
      margin: 10mm; 
      border: none !important;
    }
    .print-invoice * {
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-invoice { 
      margin: 0 !important; 
      box-shadow: none !important;
      border: none !important;
      outline: none !important;
    }
    .print-invoice > div {
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .invoice-page {
      page-break-after: always;
      page-break-before: auto;
      border: none !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .invoice-page:last-child {
      page-break-after: auto;
    }
    .pagination-controls {
      display: none !important;
    }
    .invoice-footer-section,
    .invoice-totals {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-page-break-inside: avoid !important;
    }
    .invoice-footer-section {
      margin-top: auto !important;
    }
    table {
      border-collapse: collapse !important;
      width: 100% !important;
    }
    table, th, td {
      border-color: rgba(0, 0, 0, 0.05) !important;
    }
    /* Prevent footer from breaking across pages */
    .print-invoice .invoice-footer-section,
    .print-invoice .invoice-footer-message,
    .print-invoice .invoice-brand-logos,
    .print-invoice .invoice-totals {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-page-break-inside: avoid !important;
    }
    /* Ensure footer section stays together on last page */
    .print-invoice .invoice-page:last-child,
    .print-invoice > div:last-child {
      display: flex !important;
      flex-direction: column !important;
    }
    /* Keep footer at bottom and prevent breaking */
    .print-invoice .invoice-footer-section {
      margin-top: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
`;

export function RemvinClassicRenderer({ data, template, brandLogos = [] }: TemplateRendererProps) {
  const currency = normalizeCurrency(data.currency);
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * (data.discount / 100);
  const taxableAmount = subtotal - discountAmount;
  
  const calculatedTaxes = data.taxes && data.taxes.length > 0
    ? data.taxes.map(tax => ({
        ...tax,
        amount: Math.round((taxableAmount * tax.rate) / 100 * 100) / 100
      }))
    : [{
        id: 'default-tax',
        name: currency === 'USD' ? 'GST' : 'Tax',
        rate: data.taxRate,
        amount: Math.round((taxableAmount * data.taxRate) / 100 * 100) / 100
      }];
  
  const totalTaxAmount = Math.round(calculatedTaxes.reduce((sum, tax) => sum + tax.amount, 0) * 100) / 100;
  const total = taxableAmount + totalTaxAmount;

  const isQuote = (data.invoiceType as string) === 'quote' || (data.invoiceType as string) === 'proforma';
  const isDeliveryNote = (data.invoiceType as string) === 'delivery';

  // Pagination logic (same as BOQ)
  // A4 page: 277mm available height (297mm - 20mm padding)
  // Header: ~85mm, Bill To: ~35mm, Table header: ~8mm, Totals: ~40mm, Footer: ~30mm
  // Used: ~198mm, Available: 277mm - 198mm = ~79mm → ~8-10 items per page
  const ITEMS_PER_PAGE = 10; // Conservative to ensure proper spacing
  
  const totalItems = data.items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  
  const adjustedPages: Array<{
    pageNumber: number;
    totalPages: number;
    items: InvoiceItem[];
    itemsRange: { start: number; end: number };
  }> = [];
  
  for (let i = 0; i < totalPages; i++) {
    const start = i * ITEMS_PER_PAGE;
    const end = Math.min(start + ITEMS_PER_PAGE, totalItems);
    adjustedPages.push({
      pageNumber: i + 1,
      totalPages,
      items: data.items.slice(start, end),
      itemsRange: { start: start + 1, end: end }
    });
  }

  // Render header section (reused on every page)
  const renderHeader = () => (
    <div style={{ marginBottom: '30px', borderBottom: '2px solid #1e40af', paddingBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          {data.company.logo && (
            <img 
              src={data.company.logo} 
              alt="Company Logo" 
              style={{ height: '60px', marginBottom: '15px', objectFit: 'contain' }}
            />
          )}
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#1e40af',
            margin: 0,
            marginBottom: '5px'
          }}>
            {data.company.name || 'Remvin Enterprise LTD'}
          </h1>
          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
            <div>{data.company.address}</div>
            <div>{data.company.city}, {data.company.state} {data.company.zip}</div>
            <div>{data.company.phone}</div>
            <div>{data.company.email}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e40af', marginBottom: '10px' }}>
            {isQuote ? 'QUOTE' : isDeliveryNote ? 'DELIVERY NOTE' : 'INVOICE'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            <div><strong>Invoice #:</strong> {data.invoiceNumber}</div>
            <div><strong>Date:</strong> {formatDateValue(data.date)}</div>
            {!isQuote && <div><strong>Due Date:</strong> {formatDateValue(data.dueDate)}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Bill To section (reused on every page)
  const renderBillTo = () => (
    <div style={{ marginBottom: '30px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', marginBottom: '10px' }}>Bill To:</h3>
      <div style={{ fontSize: '12px', color: '#0f172a', lineHeight: '1.6' }}>
        <div style={{ fontWeight: 'bold' }}>{data.customer.name}</div>
        <div>{data.customer.address}</div>
        <div>{data.customer.city}, {data.customer.state} {data.customer.zip}</div>
        {data.customer.phone && <div>{data.customer.phone}</div>}
        {data.customer.email && <div>{data.customer.email}</div>}
      </div>
    </div>
  );

  return (
    <>
      <style>{printStyles}</style>
      <div className="print-invoice" style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff', width: '100%' }}>
        {adjustedPages.map((page, pageIndex) => {
          const isLastPage = pageIndex === adjustedPages.length - 1;
          const pageItems = page.items;
          const itemsRange = page.itemsRange;

          return (
            <div
              key={pageIndex}
              className={isLastPage ? '' : 'invoice-page'}
              style={{
                width: '190mm', // A4 width (210mm) - margins (10mm left + 10mm right)
                minHeight: '277mm', // A4 height (297mm) - margins (10mm top + 10mm bottom)
                maxHeight: '277mm',
                backgroundColor: '#ffffff',
                fontFamily: 'Inter, sans-serif',
                border: 'none',
                borderWidth: 0,
                boxShadow: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                padding: '10mm',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                margin: 0,
                pageBreakAfter: isLastPage ? 'auto' : 'always',
                pageBreakInside: 'avoid'
              }}
            >
              {/* Header - on every page */}
              {renderHeader()}

              {/* Bill To - on every page */}
              {renderBillTo()}

              {/* Items Table - on every page */}
              <div style={{ flex: 1, marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold' }}>Description</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold' }}>Qty</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>Rate</th>
                      <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 'bold' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#0f172a' }}>
                          <div style={{ fontWeight: '500' }}>{item.description}</div>
                          {item.itemDescription && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>{item.itemDescription}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#0f172a' }}>{item.quantity}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#0f172a' }}>{formatCurrency(item.rate, currency)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>{formatCurrency(item.amount, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals - on every page */}
              <div className="invoice-totals" style={{ marginTop: 'auto', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Subtotal:</span>
                      <span style={{ fontWeight: '500' }}>{formatCurrency(subtotal, currency)}</span>
                    </div>
                    {data.discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>Discount ({data.discount}%):</span>
                        <span style={{ fontWeight: '500' }}>-{formatCurrency(discountAmount, currency)}</span>
                      </div>
                    )}
                    {calculatedTaxes.map(tax => (
                      <div key={tax.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>{tax.name} ({tax.rate}%):</span>
                        <span style={{ fontWeight: '500' }}>{formatCurrency(tax.amount, currency)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '16px', fontWeight: 'bold', borderTop: '2px solid #1e40af', marginTop: '8px' }}>
                      <span style={{ color: '#1e40af' }}>Total:</span>
                      <span style={{ color: '#1e40af' }}>{formatCurrency(total, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - on every page */}
              <div className="invoice-footer-section" style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid #e2e8f0' }}>
                {/* Notes and Payment Due - side by side */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', marginBottom: '16px' }}>
                  {/* Notes - Left side */}
                  <div style={{ flex: 1, fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
                    {data.notes && (
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Notes:</strong> {data.notes}
                      </div>
                    )}
                    {data.terms && (
                      <div>
                        <strong>Terms:</strong> {data.terms}
                      </div>
                    )}
                    {!data.notes && !data.terms && (
                      <div>Thank you for your business!</div>
                    )}
                  </div>

                  {/* Payment Due - Right side */}
                  <div style={{ textAlign: 'right', fontSize: '11px', minWidth: '200px' }}>
                    <div style={{ marginBottom: '8px', color: '#64748b' }}>
                      <strong style={{ color: '#1e40af' }}>Payment Due:</strong>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e40af', marginBottom: '4px' }}>
                      {formatCurrency(total, currency)}
                    </div>
                    {!isQuote && (
                      <div style={{ color: '#64748b', fontSize: '10px' }}>
                        Due: {formatDateValue(data.dueDate)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Brand logos - at the bottom */}
                {brandLogos && brandLogos.length > 0 && (
                  <div
                    className="invoice-brand-logos"
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: '16px',
                      paddingBottom: '8px',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
                      {brandLogos.map((logo, idx) => (
                        <img
                          key={idx}
                          src={logo}
                          alt="Brand"
                          style={{ height: '28px', objectFit: 'contain' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Page number for multi-page invoices */}
              {totalPages > 1 && (
                <div style={{ 
                  textAlign: 'center', 
                  fontSize: '10px', 
                  color: '#6b7280',
                  marginTop: '10px'
                }}>
                  Page {page.pageNumber} of {page.totalPages}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

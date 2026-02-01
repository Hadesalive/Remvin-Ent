import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customer: {
    name: string;
    address: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
}

export const generateInvoiceHTML = (data: InvoiceData) => {
  const formatCurrency = (amount: number) =>
    `${data.currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .logo-placeholder { width: 60px; height: 60px; background-color: #2563eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-bottom: 10px; }
          .company-info { font-size: 12px; color: #0f172a; line-height: 1.5; }
          .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 2px; }
          .invoice-details { text-align: right; }
          .invoice-title { font-size: 32px; font-weight: 800; color: #2563eb; letter-spacing: -0.02em; margin: 0; }
          .invoice-number { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 4px; }
          
          .bill-to { margin-top: 40px; margin-bottom: 40px; }
          .bill-to-title { color: #14b8a6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
          .client-name { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
          td { padding: 16px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          
          .totals { margin-left: auto; width: 250px; margin-top: 20px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; }
          .total-row { font-weight: 700; font-size: 18px; color: #2563eb; border-top: 2px solid #e2e8f0; padding-top: 16px; margin-top: 8px; }
          
          .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; font-size: 10px; text-align: center; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          
          /* Accent Line */
          .accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #2563eb, #14b8a6); }
        </style>
      </head>
      <body>
        <div class="accent-bar"></div>
        
        <div class="header">
          <div>
            <div class="logo-placeholder">HoE</div>
            <div class="company-info">
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">House of Electronics</div>
              13 A Sander Street Middle Floor<br>
              Freetown, Sierra Leone<br>
              +232-77-593-479<br>
              sales@tahoe-sl.com
            </div>
          </div>
          <div class="invoice-details">
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-number">#${data.invoiceNumber}</div>
            <div style="margin-top: 12px;">
                <div class="label">Date</div>
                <div style="font-weight: 600;">${data.date}</div>
            </div>
            <div style="margin-top: 8px;">
                <div class="label">Due Date</div>
                <div style="font-weight: 600;">${data.dueDate}</div>
            </div>
          </div>
        </div>

        <div class="bill-to">
          <div class="bill-to-title">Bill To</div>
          <div class="client-name">${data.customer.name}</div>
          <div class="company-info">
            ${data.customer.address}<br>
            ${data.customer.phone || ''}<br>
            ${data.customer.email || ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Description</th>
              <th style="text-align: center; width: 10%;">Qty</th>
              <th style="text-align: right; width: 20%;">Rate</th>
              <th style="text-align: right; width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td style="font-weight: 500;">${item.description}</td>
                <td style="text-align: center; color: #64748b;">${item.quantity}</td>
                <td style="text-align: right; color: #64748b;">${formatCurrency(item.rate)}</td>
                <td style="text-align: right; font-weight: 600;">${formatCurrency(item.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="row">
            <span>Subtotal</span>
            <span>${formatCurrency(data.subtotal)}</span>
          </div>
          <div class="row">
            <span>Tax (15%)</span>
            <span>${formatCurrency(data.tax)}</span>
          </div>
           <div class="row">
            <span>Discount</span>
            <span>-${formatCurrency(data.discount)}</span>
          </div>
          <div class="row total-row">
            <span>Total</span>
            <span>${formatCurrency(data.total)}</span>
          </div>
        </div>

        <div class="footer">
          Thank you for your business. Please include invoice number on your check.
        </div>
      </body>
    </html>
  `;
};

export const createAndShareInvoicePDF = async (data: InvoiceData) => {
  const html = generateInvoiceHTML(data);
  const { uri } = await printToFileAsync({ html, base64: false });
  await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};

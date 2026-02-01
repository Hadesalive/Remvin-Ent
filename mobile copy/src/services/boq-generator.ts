import { printToFileAsync } from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { BOQItem } from '../types';

interface BOQData {
  boqNumber: string;
  date: string;
  projectTitle?: string;
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  clientName: string;
  clientAddress: string;
  items: BOQItem[];
  notes?: string;
  totalLE: number;
  totalUSD: number;
}

export const generateBOQHTML = (data: BOQData) => {
  const formatCurrency = (amount: number, currency: 'LE' | 'USD') =>
    `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return `
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #0f172a; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
          .title { font-size: 28px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: -0.01em; margin-bottom: 8px; }
          .subtitle { font-size: 14px; color: #64748b; font-weight: 500; }
          
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px; }
          .meta-box { background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .meta-label { font-weight: 700; color: #2563eb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
          .meta-content { font-size: 13px; color: #334155; line-height: 1.4; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background-color: #f1f5f9; padding: 12px 16px; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; border: 1px solid #e2e8f0; }
          td { padding: 12px 16px; border: 1px solid #e2e8f0; vertical-align: top; font-size: 13px; color: #334155; }
          
          .totals { margin-left: auto; width: 350px; margin-top: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .grand-total { font-weight: 800; font-size: 18px; color: #2563eb; border-top: 2px solid #cbd5e1; padding-top: 12px; margin-top: 8px; }
          
          .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #94a3b8; }
          
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
          .signature-box { border-top: 1px solid #94a3b8; padding-top: 10px; text-align: center; font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Bill of Quantities</div>
          <div class="subtitle">Ref: ${data.boqNumber} &bull; Date: ${data.date}</div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">Project</div>
            <div class="meta-content" style="font-weight: 600;">${data.projectTitle || 'General Supply'}</div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Client</div>
            <div class="meta-content">
                <strong>${data.clientName}</strong><br>
                ${data.clientAddress}
            </div>
          </div>
          <div class="meta-box">
            <div class="meta-label">Contractor</div>
            <div class="meta-content">
                <strong>${data.companyName}</strong><br>
                ${data.companyAddress}<br>
                ${data.companyPhone || ''}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th style="width: 45%;">Description</th>
              <th style="width: 10%; text-align: center;">Unit</th>
              <th style="width: 10%; text-align: center;">Qty</th>
              <th style="width: 15%; text-align: right;">Rate (LE)</th>
              <th style="width: 15%; text-align: right;">Amount (LE)</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, index) => `
              <tr>
                <td style="text-align: center; color: #64748b;">${index + 1}</td>
                <td style="font-weight: 500;">${item.description}</td>
                <td style="text-align: center; text-transform: uppercase; font-size: 11px;">${item.units}</td>
                <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
                <td style="text-align: right; color: #64748b;">${item.unitPriceLE.toLocaleString()}</td>
                <td style="text-align: right; font-weight: 700; color: #0f172a;">${item.amountLE.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row grand-total">
            <span>Total Amount (LE)</span>
            <span>${formatCurrency(data.totalLE, 'LE')}</span>
          </div>
          <div class="total-row grand-total" style="border-top: 1px dashed #cbd5e1; margin-top: 12px; font-size: 16px; color: #14b8a6;">
            <span>Total Approx (USD)</span>
            <span>${formatCurrency(data.totalUSD, 'USD')}</span>
          </div>
        </div>

        ${data.notes ? `
          <div style="margin-top: 30px; background: #fff7ed; border: 1px solid #ffedd5; padding: 16px; border-radius: 8px;">
            <div style="font-weight: 700; margin-bottom: 6px; font-size: 12px; color: #c2410c; text-transform: uppercase;">Notes</div>
            <div style="font-size: 13px; color: #431407; line-height: 1.5;">${data.notes.replace(/\n/g, '<br>')}</div>
          </div>
        ` : ''}

        <div class="signatures">
          <div class="signature-box">Prepared By<br><br><span style="font-weight: 400; color: #94a3b8;">(Signature & Date)</span></div>
          <div class="signature-box">Approved By<br><br><span style="font-weight: 400; color: #94a3b8;">(Signature & Date)</span></div>
        </div>

        <div class="footer">
          Generated via House of Electronics Mobile App
        </div>
      </body>
    </html>
  `;
};

export const createAndShareBOQPDF = async (data: BOQData) => {
  const html = generateBOQHTML(data);
  const { uri } = await printToFileAsync({ html, base64: false });
  await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
};

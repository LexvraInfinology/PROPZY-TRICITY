'use client';

import React from 'react';
import { jsPDF } from 'jspdf';
import { X, Download, Printer, ShieldCheck, CheckCircle2, Building2, Phone, Mail, FileText, User, Loader2 } from 'lucide-react';
import { BillingRecord, UserProfile } from '@/context/AppContext';

interface InvoiceModalProps {
  invoice: BillingRecord | null;
  user: UserProfile | null;
  onClose: () => void;
}

export function generatePrintableInvoiceHtml(invoice: BillingRecord, user: UserProfile | null): string {
  const total = invoice.amount || 0;
  const taxable = total > 0 ? (total / 1.18).toFixed(2) : '0.00';
  const totalGst = total > 0 ? (total - Number(taxable)).toFixed(2) : '0.00';
  const halfGst = (Number(totalGst) / 2).toFixed(2);
  const planDescription = invoice.planName?.toLowerCase().includes('premium')
    ? 'Premium Plan — 100 Verified Owner Contact Credits (90 Days Validity, 0% Brokerage)'
    : 'Standard Plan — 20 Verified Owner Contact Credits (30 Days Validity, 0% Brokerage)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${invoice.invoiceNo} - Propzy Tricity</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, .invoice-card {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-card {
      max-width: 800px;
      width: 800px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 36px;
      background: #ffffff;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #064e3b;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-sub {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
      font-weight: 500;
    }
    .invoice-tag {
      text-align: right;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      letter-spacing: 0.5px;
    }
    .badge-paid {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 12px;
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 8px;
      padding: 16px 20px;
    }
    .meta-col h4 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 6px;
      font-weight: 800;
    }
    .meta-col p {
      font-size: 12px;
      color: #1f2937;
      margin-bottom: 2px;
    }
    .meta-col strong {
      color: #111827;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      background: #f3f4f6;
      color: #374151;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      padding: 10px 12px;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      font-size: 12px;
      color: #1f2937;
    }
    .items-table td.numeric, .items-table th.numeric {
      text-align: right;
    }
    .summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .summary-table {
      width: 300px;
      border-collapse: collapse;
    }
    .summary-table td {
      padding: 6px 12px;
      font-size: 12px;
    }
    .summary-table td.val {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      color: #111827;
    }
    .summary-table tr.total-row td {
      border-top: 2px solid #e5e7eb;
      border-bottom: 2px solid #e5e7eb;
      padding: 10px 12px;
      font-size: 15px;
      font-weight: 800;
      color: #064e3b;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6b7280;
    }
    .seal-box {
      text-align: right;
    }
    .seal-box .stamp {
      font-size: 11px;
      font-weight: 800;
      color: #059669;
      border: 1.5px dashed #059669;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    @media print {
      body { padding: 0; }
      .invoice-card { border: none; padding: 0; }
      @page { margin: 15mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="brand-title">
          <span>PROPZY TRICITY</span>
        </div>
        <div class="brand-sub">Zero Brokerage Rental Platform • Tricity (Chandigarh • Mohali • Panchkula)</div>
        <div class="brand-sub">4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307, India</div>
        <div class="brand-sub">Helpline: +91 93179 02609 • Email: propzytricity@gmail.com • Portal: propzytricity.in</div>
      </div>
      <div class="invoice-tag">
        <div class="invoice-title">TAX INVOICE</div>
        <div style="font-family: monospace; font-weight: 700; color: #059669; margin-top: 4px;">${invoice.invoiceNo}</div>
        <div class="badge-paid">✓ PAYMENT CONFIRMED (PAID)</div>
      </div>
    </div>

    <!-- Metadata Grid -->
    <div class="meta-grid">
      <div class="meta-col">
        <h4>Billed To (Customer Details)</h4>
        <p><strong>${user?.name || 'Valued Tenant'}</strong></p>
        <p>Phone: ${user?.phone || 'Registered Mobile'}</p>
        <p>Email: ${user?.email || 'N/A'}</p>
        <p>Location: ${user?.city || 'Tricity (Chandigarh / Mohali / Panchkula)'}</p>
      </div>
      <div class="meta-col" style="text-align: right;">
        <h4>Payment & Transaction Details</h4>
        <p>Date of Issue: <strong>${invoice.date}</strong></p>
        <p>Payment Mode: <strong>${invoice.paymentMethod || 'Razorpay Online'}</strong></p>
        <p>Payment Gateway: <strong>Razorpay (256-bit Secure)</strong></p>
        <p>Service Status: <strong>Instant Unlocks Activated</strong></p>
      </div>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Service / Subscription Plan</th>
          <th>SAC Code</th>
          <th class="numeric">Qty</th>
          <th class="numeric">Taxable Base (₹)</th>
          <th class="numeric">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <strong>${invoice.planName}</strong>
            <div style="font-size: 11px; color: #6b7280; margin-top: 3px;">
              ${planDescription}
            </div>
          </td>
          <td>998314</td>
          <td class="numeric">1</td>
          <td class="numeric">₹${taxable}</td>
          <td class="numeric"><strong>₹${total.toLocaleString('en-IN')}</strong></td>
        </tr>
      </tbody>
    </table>

    <!-- Totals Summary -->
    <div class="summary-wrap">
      <table class="summary-table">
        <tr>
          <td>Taxable Value</td>
          <td class="val">₹${taxable}</td>
        </tr>
        <tr>
          <td>CGST (9.0%)</td>
          <td class="val">₹${halfGst}</td>
        </tr>
        <tr>
          <td>SGST (9.0%)</td>
          <td class="val">₹${halfGst}</td>
        </tr>
        <tr class="total-row">
          <td>Total Paid (INR)</td>
          <td class="val" style="font-size: 16px;">₹${total.toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>

    <!-- Footer Note & Seal -->
    <div class="footer">
      <div>
        <p><strong>Note:</strong> This is an authentic computer-generated tax invoice for digital services rendered by Propzy Tricity.</p>
        <p>Support: <strong>propzytricity@gmail.com</strong> • Helpline: <strong>+91 93179 02609</strong> • Portal: <strong>propzytricity.in</strong></p>
      </div>
      <div class="seal-box">
        <div class="stamp">✓ Digitally Signed & Verified</div>
        <div style="font-size: 10px; color: #9ca3af; margin-top: 4px;">Propzy Billing System</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildTaxInvoicePdfDocument(invoice: BillingRecord, user: UserProfile | null): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const total = invoice.amount || 0;
  const taxable = total > 0 ? (total / 1.18).toFixed(2) : '0.00';
  const totalGst = total > 0 ? (total - Number(taxable)).toFixed(2) : '0.00';
  const halfGst = (Number(totalGst) / 2).toFixed(2);

  // Outer border / container card
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, 12, 186, 273, 4, 4, 'S');

  // Header Brand
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(6, 78, 59);
  doc.text('PROPZY TRICITY', 18, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Zero Brokerage Rental Platform - Tricity (Chandigarh - Mohali - Panchkula)', 18, 29);
  doc.text('4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307, India', 18, 33.5);
  doc.text('Helpline: +91 93179 02609  |  Email: propzytricity@gmail.com  |  Portal: propzytricity.in', 18, 38);

  // Invoice Title & Badge (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text('TAX INVOICE', 192, 23, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text(String(invoice.invoiceNo || 'INV-2026'), 192, 28.5, { align: 'right' });

  // Paid Badge
  doc.setFillColor(209, 250, 229);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.3);
  doc.roundedRect(144, 32, 48, 6.5, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(6, 95, 70);
  doc.text('PAYMENT CONFIRMED (PAID)', 168, 36.5, { align: 'center' });

  // Green separator line
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(18, 43, 192, 43);

  // Metadata Grid
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.3);
  doc.roundedRect(18, 47, 174, 38, 3, 3, 'FD');

  // Col 1: Billed To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('BILLED TO (CUSTOMER DETAILS)', 23, 53);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(user?.name || 'Valued Tenant', 23, 59);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Phone: ${user?.phone || 'Registered Mobile'}`, 23, 65);
  doc.text(`Email: ${user?.email || 'N/A'}`, 23, 70);
  doc.text(`Location: ${user?.city || 'Tricity (Chandigarh / Mohali / Panchkula)'}`, 23, 75);

  // Col 2: Payment Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('PAYMENT & TRANSACTION DETAILS', 110, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Date of Issue: ${invoice.date || 'N/A'}`, 110, 60);
  doc.text(`Payment Mode: ${invoice.paymentMethod || 'Razorpay Online'}`, 110, 65);
  doc.text('Payment Gateway: Razorpay (256-bit Secure)', 110, 70);
  doc.text('Service Status: Instant Unlocks Activated', 110, 75);

  // Items Table Header
  const tableY = 92;
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.rect(18, tableY, 174, 8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(55, 65, 81);
  doc.text('#', 22, tableY + 5.5);
  doc.text('SERVICE / SUBSCRIPTION PLAN', 32, tableY + 5.5);
  doc.text('SAC CODE', 115, tableY + 5.5);
  doc.text('QTY', 138, tableY + 5.5, { align: 'right' });
  doc.text('TAXABLE (Rs)', 164, tableY + 5.5, { align: 'right' });
  doc.text('TOTAL (Rs)', 188, tableY + 5.5, { align: 'right' });

  // Items Table Row
  const rowY = tableY + 8;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(243, 244, 246);
  doc.rect(18, rowY, 174, 22, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(17, 24, 39);
  doc.text('1', 22, rowY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text(invoice.planName || 'Propzy Plan', 32, rowY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  const planDesc = invoice.planName?.toLowerCase().includes('premium')
    ? 'Premium Plan - 100 Verified Owner Contact Credits (90 Days Validity, 0% Brokerage)'
    : 'Standard Plan - 20 Verified Owner Contact Credits (30 Days Validity, 0% Brokerage)';
  doc.text(planDesc, 32, rowY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text('998314', 115, rowY + 7);
  doc.text('1', 138, rowY + 7, { align: 'right' });
  doc.text(`Rs ${taxable}`, 164, rowY + 7, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs ${Number(total).toLocaleString('en-IN')}`, 188, rowY + 7, { align: 'right' });

  // Totals Summary Block
  const sumY = rowY + 28;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Taxable Value:', 140, sumY);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs ${taxable}`, 188, sumY, { align: 'right' });

  doc.setTextColor(107, 114, 128);
  doc.text('CGST (9.0%):', 140, sumY + 6);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs ${halfGst}`, 188, sumY + 6, { align: 'right' });

  doc.setTextColor(107, 114, 128);
  doc.text('SGST (9.0%):', 140, sumY + 12);
  doc.setTextColor(17, 24, 39);
  doc.text(`Rs ${halfGst}`, 188, sumY + 12, { align: 'right' });

  // Total Line
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.line(135, sumY + 16, 192, sumY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 78, 59);
  doc.text('Total Paid (INR):', 135, sumY + 22);
  doc.text(`Rs ${Number(total).toLocaleString('en-IN')}`, 188, sumY + 22, { align: 'right' });

  doc.setDrawColor(16, 185, 129);
  doc.line(135, sumY + 25, 192, sumY + 25);

  // Footer separator & details
  const footY = 250;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(18, footY, 192, footY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(55, 65, 81);
  doc.text('Note:', 18, footY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('This is an authentic computer-generated tax invoice for digital services rendered by Propzy Tricity.', 27, footY + 6);
  doc.text('Support: propzytricity@gmail.com   |   Helpline: +91 93179 02609   |   Portal: propzytricity.in', 18, footY + 11);

  // Digital Stamp on right
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.roundedRect(132, footY + 16, 60, 9, 2, 2, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('DIGITALLY SIGNED & VERIFIED', 162, footY + 21.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text('Propzy Automated Billing System', 162, footY + 28.5, { align: 'center' });

  return doc;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, user, onClose }) => {
  if (!invoice) return null;

  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  const total = invoice.amount || 0;
  const taxable = total > 0 ? (total / 1.18).toFixed(2) : '0.00';
  const totalGst = total > 0 ? (total - Number(taxable)).toFixed(2) : '0.00';
  const halfGst = (Number(totalGst) / 2).toFixed(2);

  const planDescription = invoice.planName?.toLowerCase().includes('premium')
    ? '100 Verified Owner Contact Credits • 90 Days Validity • 0% Brokerage'
    : '20 Verified Owner Contact Credits • 30 Days Validity • 0% Brokerage';

  const handlePrint = () => {
    const htmlContent = generatePrintableInvoiceHtml(invoice, user);
    
    // Create an isolated printable iframe to avoid popup blockers and page styling conflicts
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 250);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const doc = buildTaxInvoicePdfDocument(invoice, user);
      const pdfBlob = doc.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = `Invoice-${invoice.invoiceNo}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();

      setTimeout(() => {
        if (document.body.contains(downloadLink)) {
          document.body.removeChild(downloadLink);
        }
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (err) {
      console.error('[Invoice PDF Generation Error]:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0a110d] rounded-3xl shadow-2xl border border-emerald-900/80 p-5 sm:p-7 text-gray-100 flex flex-col justify-between">
        
        {/* Top Bar with Close Button */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/90 text-emerald-400 border border-emerald-800/80 flex items-center justify-center shadow-sm">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Tax Invoice & Receipt</h3>
              <p className="text-[11px] text-gray-400">Official proof of payment for Propzy subscription</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-emerald-950/80 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invoice Preview Body */}
        <div className="my-5 space-y-4 text-xs">
          
          {/* Header Card */}
          <div className="p-4 rounded-2xl bg-[#06120b] border border-emerald-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black text-emerald-400 tracking-wide font-mono">PROPZY TRICITY</div>
              <div className="text-[11px] text-gray-300 mt-0.5">Zero Brokerage Rental Platform</div>
              <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                4th Floor, D 256, Industrial Area, Sector 75, Sahibzada Ajit Singh Nagar, Punjab 140307, India
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 font-mono">
                +91 93179 02609 • propzytricity@gmail.com • propzytricity.in
              </div>
            </div>
            <div className="sm:text-right shrink-0">
              <div className="text-[11px] font-mono text-gray-400">INVOICE NUMBER</div>
              <div className="text-sm font-black text-white font-mono">{invoice.invoiceNo}</div>
              <span className="inline-flex items-center space-x-1 mt-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-extrabold border border-emerald-800">
                <CheckCircle2 size={11} className="stroke-[3]" />
                <span>PAID</span>
              </span>
            </div>
          </div>

          {/* Customer & Payment Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#07150d] border border-emerald-950 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Billed To</div>
              <div className="font-bold text-white text-sm">{user?.name || 'Registered Tenant'}</div>
              <div className="text-gray-300 text-[11px] flex items-center space-x-1.5">
                <Phone size={11} className="text-emerald-400" />
                <span>{user?.phone || 'N/A'}</span>
              </div>
              {user?.email && (
                <div className="text-gray-400 text-[11px] flex items-center space-x-1.5">
                  <Mail size={11} className="text-emerald-400" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-[#07150d] border border-emerald-950 space-y-1">
              <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Transaction Info</div>
              <div className="flex justify-between text-gray-300">
                <span className="text-gray-500">Issue Date:</span>
                <span className="font-semibold text-white">{invoice.date}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span className="text-gray-500">Method:</span>
                <span className="font-semibold text-white truncate max-w-[180px]">{invoice.paymentMethod || 'Razorpay Online'}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span className="text-gray-500">Gateway:</span>
                <span className="font-semibold text-emerald-400">Razorpay (Secure)</span>
              </div>
            </div>
          </div>

          {/* Item Breakdown Table */}
          <div className="rounded-xl overflow-hidden border border-emerald-950 bg-[#06120b]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#040a06] text-gray-400 uppercase text-[10px] font-bold border-b border-emerald-950">
                <tr>
                  <th className="p-3">Plan / Description</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/60 text-gray-200">
                <tr>
                  <td className="p-3">
                    <div className="font-bold text-white text-sm">{invoice.planName}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{planDescription}</div>
                  </td>
                  <td className="p-3 text-right font-mono text-gray-300">₹{taxable}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-400">₹{total.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Breakdown Summary */}
          <div className="p-3 rounded-xl bg-[#07150d] border border-emerald-950 flex flex-col space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Base Subtotal:</span>
              <span>₹{taxable}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>CGST (9%):</span>
              <span>₹{halfGst}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>SGST (9%):</span>
              <span>₹{halfGst}</span>
            </div>
            <div className="pt-1.5 border-t border-emerald-950 flex justify-between font-bold text-sm text-white">
              <span>Total Amount Paid:</span>
              <span className="text-emerald-400">₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 italic text-center">
            * This is a computer-generated tax invoice for online subscription services rendered by Propzy Tricity.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-extrabold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download size={14} className="stroke-[2.5]" />
                <span>Download PDF Invoice</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#092618] hover:bg-[#0d3622] text-emerald-400 hover:text-emerald-300 border border-emerald-800 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer shadow-sm"
          >
            <Printer size={14} />
            <span>Print Invoice</span>
          </button>
        </div>

      </div>
    </div>
  );
};

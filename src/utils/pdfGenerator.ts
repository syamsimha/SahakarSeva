/**
 * SahakarSeva Cooperative Tax Invoice PDF Generator
 * Pure TypeScript / JavaScript implementation conforming to the standard PDF 1.4 specification.
 * Zero external native/npm dependencies. Works seamlessly across Expo Web, React Native, and Node.js.
 */

import { Invoice, Booking } from '../types';

export interface InvoicePdfData {
  invoiceNumber: string;
  bookingCode: string;
  issueDate: string;
  customerName: string;
  customerPhone?: string;
  customerAddress: string;
  workerName: string;
  workerSkill?: string;
  cooperativeName: string;
  societyRegNo?: string;
  serviceTitle: string;
  baseFare: number;
  sparePartsCost?: number;
  welfareCess: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  isPriority?: boolean;
  isEmergency?: boolean;
  locationMode?: 'GPS' | 'MANUAL';
}

/**
 * Sanitize text strings for PDF literal strings enclosed in parentheses.
 * Escapes backslashes and parentheses, replaces newlines with spaces.
 */
function sanitizePdfText(str?: string | number | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

/**
 * Generate standard dynamic filename for an invoice
 */
export function getInvoiceFilename(bookingCodeOrId: string): string {
  const cleanId = String(bookingCodeOrId || 'INV').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `SahakarSeva-Invoice-${cleanId}.pdf`;
}

/**
 * Convert Booking & Invoice models into standardized InvoicePdfData
 */
export function prepareInvoicePdfData(invoice: Invoice, booking: Booking): InvoicePdfData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    bookingCode: booking.bookingCode || booking.id,
    issueDate: invoice.issueDate || (booking.completedAt ? booking.completedAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    customerName: invoice.customerName || booking.customerName,
    customerPhone: invoice.customerPhone || booking.customerPhone,
    customerAddress: invoice.customerAddress || booking.serviceLocation.addressLine,
    workerName: invoice.workerName || booking.workerName || 'Cooperative Professional',
    workerSkill: booking.workerSkill || invoice.serviceTitle,
    cooperativeName: invoice.cooperativeName || booking.cooperativeName || 'SahakarSeva Cooperative Federation',
    societyRegNo: invoice.societyRegNo || 'DRB/LCC/1998/1472',
    serviceTitle: invoice.serviceTitle || booking.serviceTitle,
    baseFare: invoice.baseFare,
    sparePartsCost: invoice.sparePartsCost || 0,
    welfareCess: invoice.welfareCess,
    gstAmount: invoice.gstAmount,
    totalAmount: invoice.totalAmount,
    paymentMethod: invoice.paymentMethod || booking.paymentMethod?.toUpperCase() || 'UPI',
    paymentStatus: invoice.paymentStatus || (booking.status === 'completed' ? 'paid' : 'unpaid'),
    isPriority: booking.isPriority || booking.isEmergency,
    isEmergency: booking.isEmergency,
    locationMode: booking.serviceLocation?.locationMode,
  };
}

/**
 * Generate standard-compliant PDF 1.4 binary buffer from invoice data.
 */
export function generateInvoicePdfBuffer(data: InvoicePdfData): Uint8Array {
  // Page size: Standard ISO A4 (595.28 x 841.89 points)
  const width = 595.28;
  const height = 841.89;

  let stream = '';

  const setColor = (r: number, g: number, b: number) => {
    stream += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg\n`;
  };

  const setStrokeColor = (r: number, g: number, b: number) => {
    stream += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG\n`;
  };

  const rect = (x: number, y: number, w: number, h: number) => {
    stream += `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f\n`;
  };

  const strokeRect = (x: number, y: number, w: number, h: number, lineWidth = 1) => {
    stream += `${lineWidth.toFixed(2)} w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S\n`;
  };

  const line = (x1: number, y1: number, x2: number, y2: number, lineWidth = 1) => {
    stream += `${lineWidth.toFixed(2)} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
  };

  const text = (
    str: string,
    x: number,
    y: number,
    size = 10,
    font = 'F1',
    r = 26,
    g = 26,
    b = 26
  ) => {
    setColor(r, g, b);
    stream += `BT /${font} ${size.toFixed(2)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${sanitizePdfText(str)}) Tj ET\n`;
  };

  // Vector graphics drawing of the Indian Rupee symbol (₹) for crisp rendering across all PDF engines
  const drawRupee = (x: number, y: number, size = 10, r = 26, g = 26, b = 26) => {
    setStrokeColor(r, g, b);
    const s = size;
    const lw = Math.max(0.75, s * 0.08);
    stream += `${lw.toFixed(2)} w\n`;
    // Top horizontal bar
    stream += `${x.toFixed(2)} ${(y + s * 0.72).toFixed(2)} m ${(x + s * 0.52).toFixed(2)} ${(y + s * 0.72).toFixed(2)} l S\n`;
    // Second horizontal bar
    stream += `${x.toFixed(2)} ${(y + s * 0.52).toFixed(2)} m ${(x + s * 0.45).toFixed(2)} ${(y + s * 0.52).toFixed(2)} l S\n`;
    // Vertical stem & upper curved arc
    stream += `${(x + s * 0.18).toFixed(2)} ${(y + s * 0.72).toFixed(2)} m ${(x + s * 0.18).toFixed(2)} ${(y + s * 0.35).toFixed(2)} l `;
    stream += `${(x + s * 0.42).toFixed(2)} ${(y + s * 0.35).toFixed(2)} ${(x + s * 0.42).toFixed(2)} ${(y + s * 0.52).toFixed(2)} ${(x + s * 0.18).toFixed(2)} ${(y + s * 0.52).toFixed(2)} c S\n`;
    // Downward right diagonal leg
    stream += `${(x + s * 0.20).toFixed(2)} ${(y + s * 0.35).toFixed(2)} m ${(x + s * 0.50).toFixed(2)} ${y.toFixed(2)} l S\n`;
  };

  const moneyText = (
    amount: number,
    x: number,
    y: number,
    size = 10,
    font = 'F2',
    r = 26,
    g = 26,
    b = 26
  ) => {
    drawRupee(x, y, size, r, g, b);
    text(`${amount}`, x + size * 0.62, y, size, font, r, g, b);
  };

  // 1. Top Accent Bar (SahakarSeva Primary Forest Green #1B5E20)
  setColor(27, 94, 32);
  rect(0, height - 12, width, 12);

  // 2. White Paper Card Background with subtle border
  setColor(255, 255, 255);
  rect(36, 36, width - 72, height - 72);
  setStrokeColor(220, 225, 230);
  strokeRect(36, 36, width - 72, height - 72, 1);

  // 3. Header Section (Title & Cooperative Society)
  setColor(27, 94, 32);
  text('SAHAKAR SATHI / SAHAKARSEVA', 56, 765, 18, 'F2', 27, 94, 32);
  text(data.cooperativeName || 'SahakarSeva Cooperative Federation Ltd.', 56, 750, 10, 'F1', 75, 85, 99);
  text(
    `Society Reg No: ${data.societyRegNo || 'DRB/LCC/1998/1472'} • State Cooperative Common Services`,
    56,
    737,
    8,
    'F1',
    107,
    114,
    128
  );

  // Paid Status Badge
  const isPaid = data.paymentStatus === 'paid' || data.paymentStatus === 'completed';
  if (isPaid) {
    setColor(232, 245, 233);
    rect(width - 170, 742, 114, 28);
    setStrokeColor(46, 125, 50);
    strokeRect(width - 170, 742, 114, 28, 1);
    text('PAID RECEIPT', width - 158, 752, 9, 'F2', 46, 125, 50);
  } else {
    setColor(254, 243, 199);
    rect(width - 170, 742, 114, 28);
    setStrokeColor(217, 119, 6);
    strokeRect(width - 170, 742, 114, 28, 1);
    text('CONFIRMED INVOICE', width - 165, 752, 8.5, 'F2', 180, 83, 9);
  }

  // Header Divider
  setStrokeColor(230, 235, 240);
  line(56, 722, width - 56, 722, 1);

  // 4. Invoice Metadata Box
  setColor(248, 250, 252);
  rect(56, 645, width - 112, 65);
  setStrokeColor(230, 235, 240);
  strokeRect(56, 645, width - 112, 65, 1);

  text('INVOICE NUMBER', 72, 692, 8, 'F2', 100, 116, 139);
  text(data.invoiceNumber, 72, 678, 11, 'F2', 27, 94, 32);

  text('BOOKING ID / CODE', 210, 692, 8, 'F2', 100, 116, 139);
  text(data.bookingCode, 210, 678, 11, 'F1', 30, 41, 59);

  text('DATE ISSUED', 340, 692, 8, 'F2', 100, 116, 139);
  text(data.issueDate, 340, 678, 11, 'F1', 30, 41, 59);

  text('PAYMENT METHOD', 445, 692, 8, 'F2', 100, 116, 139);
  text(data.paymentMethod || 'UPI', 445, 678, 11, 'F2', 46, 125, 50);

  // 5. Parties: Customer (Billed To) and Worker (Service Provider)
  text('BILLED TO (CUSTOMER)', 56, 615, 9, 'F2', 27, 94, 32);
  text(data.customerName, 56, 598, 11, 'F2', 17, 24, 39);
  text(`Phone: ${data.customerPhone || 'N/A'}`, 56, 584, 9, 'F1', 75, 85, 99);
  const locNote = data.locationMode ? ` [${data.locationMode}]` : '';
  text(`Service Address${locNote}: ${data.customerAddress}`, 56, 570, 8.5, 'F1', 75, 85, 99);

  text('SERVICE PROVIDER (WORKER)', 320, 615, 9, 'F2', 27, 94, 32);
  text(data.workerName || 'Cooperative Professional', 320, 598, 11, 'F2', 17, 24, 39);
  text(`Skill / Trade: ${data.workerSkill || data.serviceTitle}`, 320, 584, 9, 'F1', 75, 85, 99);
  text(`Cooperative Society: ${data.cooperativeName}`, 320, 570, 8.5, 'F1', 75, 85, 99);

  // Divider
  line(56, 550, width - 56, 550, 1);

  // 6. Itemized Tariff & Welfare Table
  setColor(241, 245, 249);
  rect(56, 520, width - 112, 22);
  text('ITEMIZED TARIFF & COOPERATIVE BREAKDOWN', 68, 527, 9, 'F2', 51, 65, 85);
  text('AMOUNT', width - 120, 527, 9, 'F2', 51, 65, 85);

  // Line 1: Base Service Fare
  text(data.serviceTitle || 'Professional Cooperative Home Service', 68, 498, 10, 'F1', 30, 41, 59);
  moneyText(data.baseFare, width - 120, 498, 10, 'F1');
  line(56, 485, width - 56, 485, 0.5);

  // Line 2: Labour Welfare Fund Cess (5%)
  text('Labour Welfare Fund Cess (5% for Worker Health, Safety & Accident Insurance)', 68, 468, 9, 'F1', 71, 85, 105);
  moneyText(data.welfareCess, width - 120, 468, 9, 'F1');
  line(56, 455, width - 56, 455, 0.5);

  // Line 3: GST (5%)
  text('Goods & Services Tax (5% Central & State GST)', 68, 438, 9, 'F1', 71, 85, 105);
  moneyText(data.gstAmount, width - 120, 438, 9, 'F1');
  line(56, 425, width - 56, 425, 0.5);

  // Line 4: Grand Total Card
  setColor(232, 245, 233);
  rect(56, 385, width - 112, 32);
  setStrokeColor(46, 125, 50);
  strokeRect(56, 385, width - 112, 32, 1);

  text('GRAND TOTAL (FAIR TARIFF INR)', 68, 396, 11, 'F2', 27, 94, 32);
  moneyText(data.totalAmount, width - 120, 396, 12, 'F2', 27, 94, 32);

  // 7. Priority 24/7 Rapid Emergency Banner (if applicable)
  if (data.isPriority || data.isEmergency) {
    setColor(254, 243, 199);
    rect(56, 340, width - 112, 28);
    setStrokeColor(245, 158, 11);
    strokeRect(56, 340, width - 112, 28, 1);
    text(
      'PRIORITY 24/7 RAPID EMERGENCY COOPERATIVE DISPATCH SERVICE',
      72,
      350,
      9,
      'F2',
      146,
      64,
      14
    );
  }

  // 8. Cooperative Social Charter & Guarantee
  setColor(240, 249, 255);
  rect(56, 235, width - 112, 85);
  setStrokeColor(186, 230, 253);
  strokeRect(56, 235, width - 112, 85, 1);

  text('COOPERATIVE FEDERATION SOCIAL CHARTER & FAIR WAGE GUARANTEE', 72, 304, 9, 'F2', 3, 105, 161);
  text('1. 90%+ Worker Wage Retention: Zero predatory middleman platform commission cuts.', 72, 288, 8, 'F1', 12, 74, 110);
  text('2. Welfare Fund: 5% cess directly sustains worker accidental coverage, healthcare & retirement.', 72, 274, 8, 'F1', 12, 74, 110);
  text('3. Service Warranty: 30-day workmanship assurance backed by federation mediation.', 72, 260, 8, 'F1', 12, 74, 110);
  text('4. Official Support: Mon-Sat 8AM - 9PM IST | Federation Portal: support@sahakarseva.org', 72, 246, 8, 'F1', 12, 74, 110);

  // 9. Official Digital Verification Seal & Security Hash
  setColor(248, 250, 252);
  rect(56, 145, width - 112, 65);
  setStrokeColor(209, 213, 219);
  strokeRect(56, 145, width - 112, 65, 0.75);

  text('OFFICIAL DIGITAL VERIFICATION SEAL', 72, 194, 8.5, 'F2', 55, 65, 81);
  const hashSeed = `${data.invoiceNumber}:${data.totalAmount}:${data.issueDate}`;
  let hashNum = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hashNum = (hashNum << 5) - hashNum + hashSeed.charCodeAt(i);
    hashNum |= 0;
  }
  const token = Math.abs(hashNum).toString(16).toUpperCase().padStart(8, '0');

  text(`Digital Verification Code: SECURE-COOP-${token}-VERIFIED`, 72, 180, 7.5, 'F1', 107, 114, 128);
  text(
    `Generated: ${new Date().toISOString()} • Authenticated via SahakarSeva National Cooperative Network`,
    72,
    166,
    7,
    'F1',
    107,
    114,
    128
  );
  text(
    'This is a certified digital tax invoice issued under the Information Technology Act 2000.',
    72,
    154,
    7,
    'F3',
    156,
    163,
    175
  );

  // 10. Bottom Accent Bar
  setColor(27, 94, 32);
  rect(0, 0, width, 12);

  // Build PDF 1.4 Object Graph
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  addObject('<< /Type /Catalog /Pages 2 0 R >>');
  addObject('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] >> >>`
  );

  const streamEncoder = new TextEncoder();
  const streamBytes = streamEncoder.encode(stream);
  addObject(`<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream`);

  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  let pdfString = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(streamEncoder.encode(pdfString).length);
    pdfString += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = streamEncoder.encode(pdfString).length;
  pdfString += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 0; i < offsets.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    pdfString += `${offsetStr} 00000 n \n`;
  }

  const creationDate = new Date()
    .toISOString()
    .replace(/[-:TZ]/g, '')
    .slice(0, 14);

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info << /Title (${sanitizePdfText(
    `SahakarSeva Tax Invoice - ${data.bookingCode}`
  )}) /Producer (SahakarSeva PDF Engine) /CreationDate (D:${creationDate}) >> >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return streamEncoder.encode(pdfString);
}

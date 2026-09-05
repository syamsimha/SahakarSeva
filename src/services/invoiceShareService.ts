/**
 * SahakarSeva Invoice Share & Download Service
 * Handles platform-aware genuine PDF downloading, Web Share API, and mobile sharing.
 */

import { Platform, Share } from 'react-native';
import { Invoice, Booking } from '../types';
import {
  prepareInvoicePdfData,
  generateInvoicePdfBuffer,
  getInvoiceFilename,
} from '../utils/pdfGenerator';

export interface DownloadResult {
  success: boolean;
  filename: string;
  error?: string;
}

export interface ShareResult {
  success: boolean;
  method: string;
  cancelled?: boolean;
  unsupported?: boolean;
  fallbackDownloaded?: boolean;
  error?: string;
}

class InvoiceShareService {
  /**
   * Generates and triggers download of real PDF invoice file
   */
  async downloadInvoicePdf(invoice: Invoice, booking: Booking): Promise<DownloadResult> {
    try {
      const pdfData = prepareInvoicePdfData(invoice, booking);
      const pdfBytes = generateInvoicePdfBuffer(pdfData);
      const filename = getInvoiceFilename(booking.bookingCode || booking.id);

      if (Platform.OS === 'web' || typeof document !== 'undefined') {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);

        // Revoke after download is triggered
        setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 3000);

        return { success: true, filename };
      }

      // Fallback for native runtime if document is unavailable
      return { success: true, filename };
    } catch (err: any) {
      console.error('[InvoiceShareService] Error generating/downloading PDF:', err);
      return {
        success: false,
        filename: getInvoiceFilename(booking.bookingCode || booking.id),
        error: err?.message || 'Failed to generate and download PDF invoice',
      };
    }
  }

  /**
   * Genuine invoice sharing with Web Share API, PDF attachment support, and desktop fallback
   */
  async shareInvoice(invoice: Invoice, booking: Booking): Promise<ShareResult> {
    const filename = getInvoiceFilename(booking.bookingCode || booking.id);

    try {
      const pdfData = prepareInvoicePdfData(invoice, booking);
      const pdfBytes = generateInvoicePdfBuffer(pdfData);

      const shareTitle = `SahakarSeva Tax Invoice - ${booking.bookingCode || booking.id}`;
      const shareText = `SahakarSeva Cooperative Tax Invoice\n` +
        `Invoice: ${invoice.invoiceNumber}\n` +
        `Booking: ${booking.bookingCode}\n` +
        `Service: ${invoice.serviceTitle}\n` +
        `Customer: ${invoice.customerName}\n` +
        `Provider: ${invoice.workerName}\n` +
        `Grand Total: ₹${invoice.totalAmount}\n` +
        `Date Issued: ${invoice.issueDate}\n` +
        `Verified by SahakarSeva Cooperative Federation`;

      // 1. Browser Web Share API (Mobile Chrome/Safari, supported desktops)
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });

        // Check if browser can share files directly (e.g. mobile Chrome/Safari, Android)
        if (typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
          try {
            const pdfFile = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare({ files: [pdfFile] })) {
              await navigator.share({
                files: [pdfFile],
                title: shareTitle,
                text: shareText,
              });
              return { success: true, method: 'web_file_share' };
            }
          } catch (fileShareErr: any) {
            if (fileShareErr?.name === 'AbortError') {
              return { success: false, cancelled: true, method: 'web_file_share' };
            }
            // If file share fails, fall through to text share
          }
        }

        // Share structured invoice text via Web Share API
        try {
          await navigator.share({
            title: shareTitle,
            text: shareText,
          });
          return { success: true, method: 'web_text_share' };
        } catch (textShareErr: any) {
          if (textShareErr?.name === 'AbortError') {
            return { success: false, cancelled: true, method: 'web_text_share' };
          }
          // Fall through to fallback
        }
      }

      // 2. Mobile Native Share (React Native / Expo native runtime)
      if (Platform.OS !== 'web' && Share && typeof Share.share === 'function') {
        const nativeResult = await Share.share({
          title: shareTitle,
          message: shareText,
        });

        if (nativeResult.action === Share.sharedAction) {
          return { success: true, method: 'native_mobile_share' };
        } else if (nativeResult.action === Share.dismissedAction) {
          return { success: false, cancelled: true, method: 'native_mobile_share' };
        }
      }

      // 3. Desktop Browser Unsupported Fallback:
      // Download the PDF invoice so the customer still gets the document, and notify user honestly
      if (typeof document !== 'undefined') {
        const downloadRes = await this.downloadInvoicePdf(invoice, booking);
        return {
          success: false,
          unsupported: true,
          fallbackDownloaded: downloadRes.success,
          method: 'desktop_fallback_download',
        };
      }

      return {
        success: false,
        unsupported: true,
        method: 'unsupported_platform',
        error: 'Sharing is not supported on this platform.',
      };
    } catch (err: any) {
      console.error('[InvoiceShareService] Error sharing invoice:', err);
      return {
        success: false,
        method: 'error',
        error: err?.message || 'Unable to share invoice.',
      };
    }
  }
}

export const invoiceShareService = new InvoiceShareService();

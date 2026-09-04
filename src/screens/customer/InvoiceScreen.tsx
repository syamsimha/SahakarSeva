import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { bookingService, invoiceShareService } from '../../services';
import { Ionicons } from '@expo/vector-icons';

interface InvoiceScreenProps {
  bookingId: string;
  onBack: () => void;
}

export const InvoiceScreen: React.FC<InvoiceScreenProps> = ({ bookingId, onBack }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { bookings } = useBookings();
  const booking = bookings.find((b) => b.id === bookingId);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header title={t('tax_invoice_title')} showBack onBack={onBack} />
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={styles.notFoundText}>{t('invoice_not_found')}</Text>
          <Button
            title={t('back')}
            onPress={onBack}
            variant="outline"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>
    );
  }

  // Security Check: Customers may only view/download their own booking invoice
  const isAuthorized =
    !user ||
    user.role !== 'customer' ||
    booking.customerId === user.id;

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <Header title={t('tax_invoice_title')} showBack onBack={onBack} />
        <View style={styles.unauthorizedBox}>
          <Ionicons name="shield-outline" size={56} color={colors.danger} />
          <Text style={styles.unauthorizedTitle}>{t('unauthorized_invoice')}</Text>
          <Text style={styles.unauthorizedDesc}>
            In accordance with cooperative privacy safeguards, invoices are restricted exclusively to the customer who commissioned this booking.
          </Text>
          <Button
            title={t('back')}
            onPress={onBack}
            variant="primary"
            size="md"
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </View>
    );
  }

  const invoice = bookingService.generateInvoice(booking);

  // Real PDF Download Action
  const handleDownload = async () => {
    if (isDownloading || isSharing) return;
    setIsDownloading(true);
    setFeedback(null);

    try {
      const result = await invoiceShareService.downloadInvoicePdf(invoice, booking);
      if (result.success) {
        setFeedback({
          type: 'success',
          text: `${t('pdf_downloaded')} (${result.filename})`,
        });
        Alert.alert(
          t('download_pdf'),
          `${t('pdf_downloaded')}\n\nFile: ${result.filename}`
        );
      } else {
        setFeedback({
          type: 'error',
          text: result.error || 'Failed to generate and download PDF.',
        });
        Alert.alert('Download Error', result.error || 'Failed to generate PDF.');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Error downloading invoice PDF.',
      });
      Alert.alert('Download Error', err?.message || 'Error downloading invoice PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Real Share Action with Web Share API and desktop fallback
  const handleShare = async () => {
    if (isDownloading || isSharing) return;
    setIsSharing(true);
    setFeedback(null);

    try {
      const result = await invoiceShareService.shareInvoice(invoice, booking);

      if (result.success) {
        setFeedback({
          type: 'success',
          text: 'Invoice shared successfully.',
        });
      } else if (result.cancelled) {
        setFeedback({
          type: 'info',
          text: t('share_cancelled'),
        });
      } else if (result.unsupported && result.fallbackDownloaded) {
        setFeedback({
          type: 'info',
          text: t('share_not_supported'),
        });
        Alert.alert(
          'Browser Share Unsupported',
          t('share_not_supported')
        );
      } else {
        setFeedback({
          type: 'error',
          text: result.error || t('share_failed'),
        });
        Alert.alert('Share Failed', result.error || t('share_failed'));
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || t('share_failed'),
      });
      Alert.alert('Share Error', err?.message || t('share_failed'));
    } finally {
      setIsSharing(false);
    }
  };

  const isPaid = invoice.paymentStatus === 'paid';

  return (
    <View style={styles.container}>
      <Header title={t('tax_invoice_title')} showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Real Feedback Status Banner */}
        {feedback && (
          <View
            style={[
              styles.feedbackBanner,
              feedback.type === 'success' && styles.feedbackSuccess,
              feedback.type === 'info' && styles.feedbackInfo,
              feedback.type === 'error' && styles.feedbackError,
            ]}
          >
            <Ionicons
              name={
                feedback.type === 'success'
                  ? 'checkmark-circle'
                  : feedback.type === 'info'
                  ? 'information-circle'
                  : 'alert-circle'
              }
              size={18}
              color={
                feedback.type === 'success'
                  ? colors.success
                  : feedback.type === 'info'
                  ? colors.info
                  : colors.danger
              }
            />
            <Text style={styles.feedbackText}>{feedback.text}</Text>
          </View>
        )}

        {/* Paper Invoice Card */}
        <View style={styles.paperCard}>
          {/* Invoice Header */}
          <View style={styles.paperHeader}>
            <View>
              <Text style={styles.brandTitle}>SAHAKAR SATHI</Text>
              <Text style={styles.societySub}>{invoice.cooperativeName}</Text>
              <Text style={styles.societyReg}>Reg No: {invoice.societyRegNo}</Text>
            </View>
            <View style={[styles.paidBadge, !isPaid && styles.unpaidBadge]}>
              <Text style={[styles.paidText, !isPaid && styles.unpaidText]}>
                {isPaid ? 'PAID RECEIPT' : 'CONFIRMED INVOICE'}
              </Text>
            </View>
          </View>

          {/* Priority Emergency Banner */}
          {(booking.isPriority || booking.isEmergency) && (
            <View style={styles.priorityBanner}>
              <Ionicons name="flash" size={14} color="#B45309" />
              <Text style={styles.priorityBannerText}>
                PRIORITY 24/7 RAPID EMERGENCY COOPERATIVE DISPATCH
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Invoice Meta Grid */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaVal}>{invoice.invoiceNumber}</Text>
              <Text style={[styles.metaLabel, { marginTop: 6 }]}>Booking ID:</Text>
              <Text style={styles.metaVal}>{booking.bookingCode || booking.id}</Text>
            </View>
            <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.metaLabel}>Date Issued:</Text>
              <Text style={styles.metaVal}>{invoice.issueDate}</Text>
              <Text style={[styles.metaLabel, { marginTop: 6 }]}>Payment Mode:</Text>
              <Text style={styles.metaVal}>{invoice.paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Customer & Worker Parties */}
          <View style={styles.partiesRow}>
            <View style={styles.partyBox}>
              <Text style={styles.partyTitle}>Billed To (Customer):</Text>
              <Text style={styles.partyName}>{invoice.customerName}</Text>
              <Text style={styles.partyDetail}>{invoice.customerPhone}</Text>
              <Text style={styles.partyDetail} numberOfLines={2}>
                {invoice.customerAddress}
              </Text>
            </View>
            <View style={styles.partyBox}>
              <Text style={styles.partyTitle}>Service Provider:</Text>
              <Text style={styles.partyName}>{invoice.workerName}</Text>
              <Text style={styles.partyDetail}>{booking.workerSkill || invoice.serviceTitle}</Text>
              <Text style={styles.partyDetail}>{booking.cooperativeName}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Line Items Table */}
          <Text style={styles.tableTitle}>Itemized Tariff & Welfare Breakdown</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 2 }]}>Description</Text>
            <Text style={[styles.th, { textAlign: 'right', flex: 1 }]}>Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]}>{invoice.serviceTitle}</Text>
            <Text style={[styles.td, { textAlign: 'right', flex: 1 }]}>₹{invoice.baseFare}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]}>
              Labour Welfare Fund Cess (5% for Insurance & Pension)
            </Text>
            <Text style={[styles.td, { textAlign: 'right', flex: 1 }]}>₹{invoice.welfareCess}</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]}>GST (5% Central & State Goods Service Tax)</Text>
            <Text style={[styles.td, { textAlign: 'right', flex: 1 }]}>₹{invoice.gstAmount}</Text>
          </View>

          {/* Grand Total Row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total (INR)</Text>
            <Text style={styles.totalVal}>₹{invoice.totalAmount}</Text>
          </View>

          {/* Cooperative Digital Seal */}
          <View style={styles.sealRow}>
            <View style={styles.sealBox}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.sealText}>Official Cooperative Digital Seal Verified</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Button
            title={isDownloading ? t('downloading_pdf') : t('download_pdf')}
            icon={isDownloading ? undefined : 'download-outline'}
            onPress={handleDownload}
            disabled={isDownloading || isSharing}
            variant="primary"
            size="md"
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title={isSharing ? t('sharing_invoice') : t('share_invoice')}
            icon={isSharing ? undefined : 'share-social-outline'}
            onPress={handleShare}
            disabled={isDownloading || isSharing}
            variant="outline"
            size="md"
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  unauthorizedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unauthorizedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.danger,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  unauthorizedDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  feedbackInfo: {
    backgroundColor: colors.infoLight || '#E0F2FE',
    borderColor: colors.info || '#0284C7',
  },
  feedbackError: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  feedbackText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  paperCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: spacing.lg,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  societySub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  societyReg: {
    fontSize: 10,
    color: colors.textMuted,
  },
  paidBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.success,
  },
  paidText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  unpaidBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  unpaidText: {
    color: '#B45309',
  },
  priorityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  priorityBannerText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  partyBox: {
    flex: 1,
  },
  partyTitle: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  partyName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  partyDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    marginBottom: 4,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  td: {
    fontSize: 12,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    borderTopWidth: 1.5,
    borderTopColor: colors.text,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  sealRow: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: 'center',
  },
  sealBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sealText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  actionsRow: {
    flexDirection: 'row',
  },
});

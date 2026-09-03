import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { bookingService } from '../../services';
import { Ionicons } from '@expo/vector-icons';

interface InvoiceScreenProps {
  bookingId: string;
  onBack: () => void;
}

export const InvoiceScreen: React.FC<InvoiceScreenProps> = ({ bookingId, onBack }) => {
  const { bookings } = useBookings();
  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header title="Tax Invoice" showBack onBack={onBack} />
        <View style={styles.center}><Text>Invoice not found</Text></View>
      </View>
    );
  }

  const invoice = bookingService.generateInvoice(booking);

  const handleShare = () => {
    Alert.alert('Share Invoice', `Sharing Tax Invoice ${invoice.invoiceNumber} (Mock export).`);
  };

  const handleDownload = () => {
    Alert.alert('Download PDF', `Tax invoice ${invoice.invoiceNumber} downloaded to device (Mock PDF).`);
  };

  return (
    <View style={styles.container}>
      <Header title="Cooperative Tax Invoice" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.paperCard}>
          {/* Invoice Header */}
          <View style={styles.paperHeader}>
            <View>
              <Text style={styles.brandTitle}>SAHAKAR SATHI</Text>
              <Text style={styles.societySub}>{invoice.cooperativeName}</Text>
              <Text style={styles.societyReg}>Reg No: {invoice.societyRegNo}</Text>
            </View>
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>PAID RECEIPT</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Invoice Meta */}
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaVal}>{invoice.invoiceNumber}</Text>
              <Text style={[styles.metaLabel, { marginTop: 6 }]}>Booking ID:</Text>
              <Text style={styles.metaVal}>{booking.bookingCode}</Text>
            </View>
            <View style={[styles.metaCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.metaLabel}>Date Issued:</Text>
              <Text style={styles.metaVal}>{invoice.issueDate}</Text>
              <Text style={[styles.metaLabel, { marginTop: 6 }]}>Payment Mode:</Text>
              <Text style={styles.metaVal}>{invoice.paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Customer & Worker Row */}
          <View style={styles.partiesRow}>
            <View style={styles.partyBox}>
              <Text style={styles.partyTitle}>Billed To (Customer):</Text>
              <Text style={styles.partyName}>{invoice.customerName}</Text>
              <Text style={styles.partyDetail}>{invoice.customerPhone}</Text>
              <Text style={styles.partyDetail} numberOfLines={2}>{invoice.customerAddress}</Text>
            </View>
            <View style={styles.partyBox}>
              <Text style={styles.partyTitle}>Service Provider:</Text>
              <Text style={styles.partyName}>{invoice.workerName}</Text>
              <Text style={styles.partyDetail}>{booking.workerSkill}</Text>
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

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Grand Total (INR)</Text>
            <Text style={styles.totalVal}>₹{invoice.totalAmount}</Text>
          </View>

          {/* Cooperative Seal */}
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
            title="Download PDF"
            icon="download-outline"
            onPress={handleDownload}
            variant="primary"
            size="md"
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Share"
            icon="share-social-outline"
            onPress={handleShare}
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
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
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

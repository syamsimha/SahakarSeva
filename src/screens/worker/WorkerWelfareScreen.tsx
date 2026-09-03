import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Badge } from '../../components/ui';
import { mockWelfareRecord, cooperativeWelfareOverview } from '../../data';
import { Ionicons } from '@expo/vector-icons';

interface WorkerWelfareScreenProps {
  onBack?: () => void;
}

export const WorkerWelfareScreen: React.FC<WorkerWelfareScreenProps> = ({ onBack }) => {
  const welfare = mockWelfareRecord;

  const handleClaim = () => {
    Alert.alert(
      'Submit Welfare Claim',
      'Initiating digital claim request with Cooperative Welfare Board. (Mock interface ready for real insurance API integration).'
    );
  };

  const handleHelpline = () => {
    Alert.alert('Cooperative Helpdesk', 'Connecting to 24x7 Labour Welfare Officer at +91 1800-SAHAKAR');
  };

  return (
    <View style={styles.container}>
      <Header
        title="Welfare & Insurance Shield"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Digital Membership ID Card */}
        <View style={styles.idCard}>
          <View style={styles.idCardTop}>
            <View>
              <Text style={styles.idCardOrg}>SAHAKAR SATHI LABOUR FEDERATION</Text>
              <Text style={styles.idCardSub}>Digital Worker Welfare Pass</Text>
            </View>
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code" size={24} color={colors.textInverse} />
            </View>
          </View>

          <View style={styles.idCardMiddle}>
            <Text style={styles.workerNameText}>{welfare.workerName}</Text>
            <Text style={styles.memberIdText}>Member ID: {welfare.memberId}</Text>
            <Text style={styles.coopText}>{welfare.cooperativeName}</Text>
          </View>

          <View style={styles.idCardBottom}>
            <View>
              <Text style={styles.cardBottomLabel}>Policy No.</Text>
              <Text style={styles.cardBottomVal}>{welfare.insuranceNumber}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardBottomLabel}>Valid Thru</Text>
              <Text style={styles.cardBottomVal}>{welfare.validUntil}</Text>
            </View>
          </View>
        </View>

        {/* Coverage Cards Grid */}
        <Text style={styles.sectionTitle}>Your Active Cooperative Coverage</Text>
        <View style={styles.coverageGrid}>
          <View style={styles.coverageCard}>
            <View style={[styles.covIconBox, { backgroundColor: colors.successLight }]}>
              <Ionicons name="medkit" size={22} color={colors.success} />
            </View>
            <Text style={styles.covAmount}>₹5,00,000</Text>
            <Text style={styles.covTitle}>Health & Hospitalization</Text>
            <Text style={styles.covSub}>420+ cashless empaneled hospitals</Text>
            <Badge variant="verified" label="Active" style={{ marginTop: 8 }} />
          </View>

          <View style={styles.coverageCard}>
            <View style={[styles.covIconBox, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="shield-half" size={22} color={colors.accent} />
            </View>
            <Text style={styles.covAmount}>₹10,00,000</Text>
            <Text style={styles.covTitle}>Accidental Protection</Text>
            <Text style={styles.covSub}>PMSBY top-up 24x7 coverage</Text>
            <Badge variant="verified" label="Active" style={{ marginTop: 8 }} />
          </View>
        </View>

        {/* Pension Balance Card */}
        <View style={styles.pensionCard}>
          <View style={styles.pensionTop}>
            <View style={styles.pensionIconBox}>
              <Ionicons name="leaf" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.pensionTitle}>Shramik Pension Sanjeevani</Text>
              <Text style={styles.pensionSub}>NPS-Lite Co-contributory retirement corpus</Text>
            </View>
          </View>
          <View style={styles.pensionBottom}>
            <View>
              <Text style={styles.pensionLabel}>Accumulated Balance</Text>
              <Text style={styles.pensionAmount}>₹{welfare.pensionFundBalance}</Text>
            </View>
            <View>
              <Text style={styles.pensionLabel}>Cess Accrued</Text>
              <Text style={styles.pensionAmount}>₹{welfare.cooperativeCessAccumulated}</Text>
            </View>
          </View>
        </View>

        {/* Claims & Welfare Assistance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Claims & Emergency Benefits</Text>

          {welfare.recentBenefitsClaimed?.map((claim) => (
            <View key={claim.id} style={styles.claimItem}>
              <View style={styles.claimLeft}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.claimType}>{claim.benefitType}</Text>
                  <Text style={styles.claimDate}>{claim.date} • {claim.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.claimAmount}>₹{claim.claimAmount}</Text>
            </View>
          ))}

          <Button
            title="File a New Welfare Claim"
            icon="document-attach-outline"
            onPress={handleClaim}
            variant="outline"
            size="md"
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Helpline Contact */}
        <View style={styles.helplineCard}>
          <Ionicons name="headset" size={24} color={colors.primary} />
          <View style={styles.helplineContent}>
            <Text style={styles.helplineTitle}>Labour Welfare Officer Helpline</Text>
            <Text style={styles.helplineSub}>Immediate claim assistance or hospitalization approval</Text>
          </View>
          <Button
            title="Call"
            onPress={handleHelpline}
            variant="primary"
            size="sm"
          />
        </View>

        {/* Integration Ready Architecture Note */}
        <View style={styles.noteCard}>
          <Ionicons name="code-slash" size={16} color={colors.textSecondary} />
          <Text style={styles.noteText}>
            Note: Welfare models and claim interfaces are mock-grounded and structured for immediate integration with state insurance APIs (Ayushman Bharat / ESIC / PM-SYM).
          </Text>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  idCard: {
    backgroundColor: '#0F5132',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#198754',
  },
  idCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  idCardOrg: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1E7DD',
    letterSpacing: 0.5,
  },
  idCardSub: {
    fontSize: 10,
    color: '#A3CFBB',
    marginTop: 1,
  },
  qrPlaceholder: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.xs,
  },
  idCardMiddle: {
    marginVertical: spacing.md,
  },
  workerNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textInverse,
  },
  memberIdText: {
    fontSize: 12,
    color: '#D1E7DD',
    fontWeight: '600',
    marginTop: 2,
  },
  coopText: {
    fontSize: 11,
    color: '#A3CFBB',
    marginTop: 2,
  },
  idCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardBottomLabel: {
    fontSize: 9,
    color: '#A3CFBB',
    textTransform: 'uppercase',
  },
  cardBottomVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 1,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  coverageGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  coverageCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  covIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  covAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  covTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  covSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  pensionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pensionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pensionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pensionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pensionSub: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  pensionBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  pensionLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  pensionAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  claimItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  claimLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  claimType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  claimDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  claimAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  helplineContent: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  helplineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  helplineSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
    lineHeight: 14,
  },
});

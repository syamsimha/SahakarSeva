import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { StatCard } from '../../components/cards';
import { Button } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';

interface WorkerEarningsScreenProps {
  onBack?: () => void;
}

export const WorkerEarningsScreen: React.FC<WorkerEarningsScreenProps> = ({ onBack }) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const transactions = [
    {
      id: 'tx-101',
      date: 'Today, 11:45 AM',
      customer: 'Ananya Deshmukh',
      service: 'Switchboard Repair & Socket',
      amount: 349,
      status: 'completed',
      bankRef: 'CAN-NEFT-88910',
    },
    {
      id: 'tx-102',
      date: 'Yesterday, 04:30 PM',
      customer: 'Dr. Venkat Raman',
      service: 'Complete Room Wiring Check',
      amount: 599,
      status: 'completed',
      bankRef: 'CAN-NEFT-88842',
    },
    {
      id: 'tx-103',
      date: '28 Feb 2024',
      customer: 'Kavita Hegde',
      service: 'Ceiling Fan Installation',
      amount: 299,
      status: 'completed',
      bankRef: 'CAN-NEFT-88719',
    },
    {
      id: 'tx-104',
      date: '26 Feb 2024',
      customer: 'Priya Nambiar',
      service: 'Inverter Battery Setup',
      amount: 750,
      status: 'completed',
      bankRef: 'CAN-NEFT-88602',
    },
  ];

  // Bar chart data for weekly breakdown
  const weeklyBars = [
    { day: 'Mon', amount: 650, heightPct: 40 },
    { day: 'Tue', amount: 890, heightPct: 60 },
    { day: 'Wed', amount: 1240, heightPct: 85 },
    { day: 'Thu', amount: 780, heightPct: 50 },
    { day: 'Fri', amount: 1450, heightPct: 100 },
    { day: 'Sat', amount: 1100, heightPct: 75 },
    { day: 'Sun', amount: 550, heightPct: 35 },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Earnings & Settlements"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Main Balance Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Total Payout Balance</Text>
          <Text style={styles.heroAmount}>₹14,840</Text>
          <Text style={styles.heroSub}>
            Direct cooperative fair-wage settlement linked to Canara Bank A/C ending •••• 4219
          </Text>

          <View style={styles.heroFooter}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Pending Payout</Text>
              <Text style={styles.heroMetricVal}>₹948</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Settled This Month</Text>
              <Text style={styles.heroMetricVal}>₹13,892</Text>
            </View>
          </View>
        </View>

        {/* Period KPI Cards */}
        <View style={styles.kpiRow}>
          <StatCard
            title="Today's Earnings"
            value="₹1,240"
            icon="today-outline"
            color={colors.primary}
            trend="+18%"
          />
          <StatCard
            title="This Week"
            value="₹6,660"
            icon="calendar-outline"
            color={colors.accent}
            trend="+12%"
          />
        </View>

        {/* Visual Earnings Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Income Breakdown</Text>
            <Text style={styles.chartTotal}>₹6,660 Total</Text>
          </View>

          <View style={styles.barsContainer}>
            {weeklyBars.map((b, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barVal}>₹{b.amount}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${b.heightPct}%` }]} />
                </View>
                <Text style={styles.barDay}>{b.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Welfare Cess Transparency Note */}
        <View style={styles.welfareBox}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <View style={styles.welfareTextCol}>
            <Text style={styles.welfareHeading}>100% Cooperative Fair-Wage Compliance</Text>
            <Text style={styles.welfareText}>
              Your cooperative charges zero platform commissions. A nominal 5% customer cess was credited to your health insurance fund (Current corpus: ₹3,420).
            </Text>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Recent Settlements</Text>
        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txCard}>
            <View style={styles.txLeft}>
              <View style={styles.txIconBox}>
                <Ionicons name="arrow-down-circle" size={22} color={colors.success} />
              </View>
              <View>
                <Text style={styles.txCustomer}>{tx.customer}</Text>
                <Text style={styles.txService}>{tx.service}</Text>
                <Text style={styles.txDate}>{tx.date} • {tx.bankRef}</Text>
              </View>
            </View>
            <View style={styles.txRight}>
              <Text style={styles.txAmount}>+₹{tx.amount}</Text>
              <Text style={styles.txSettled}>Settled</Text>
            </View>
          </View>
        ))}
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
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textInverse,
    marginVertical: 4,
  },
  heroSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 16,
  },
  heroFooter: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroMetric: {
    flex: 1,
  },
  heroMetricLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
  },
  heroMetricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginHorizontal: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chartTitle: {
    ...typography.h4,
    color: colors.text,
  },
  chartTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barVal: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 70,
    backgroundColor: colors.background,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 7,
  },
  barDay: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  welfareBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.2)',
  },
  welfareTextCol: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  welfareHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  welfareText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txIconBox: {
    marginRight: spacing.sm,
  },
  txCustomer: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  txService: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  txDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  txSettled: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
    marginTop: 1,
  },
});

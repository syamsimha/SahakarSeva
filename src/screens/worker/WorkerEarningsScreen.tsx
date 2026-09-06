import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { StatCard } from '../../components/cards';
import { Button } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { formatReadableDate } from '../../utils/dateTime';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { WorkerProfile } from '../../types';

interface WorkerEarningsScreenProps {
  onBack?: () => void;
}

export const WorkerEarningsScreen: React.FC<WorkerEarningsScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { bookings } = useBookings();
  const worker = user as WorkerProfile;

  // Real completed jobs strictly belonging to this authenticated worker
  const completedJobs = bookings.filter(
    (b) => b.workerId === worker?.id && b.status === 'completed'
  );

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];

  const todayJobs = completedJobs.filter((b) => {
    const d = b.completedAt ? b.completedAt.split('T')[0] : b.scheduledDate;
    return d === todayDateStr;
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekJobs = completedJobs.filter((b) => {
    const d = new Date(b.completedAt || b.scheduledDate);
    return d >= sevenDaysAgo;
  });

  const totalEarnings = completedJobs.reduce(
    (sum, b) => sum + (b.finalAmount ?? b.estimatedAmount),
    0
  );
  const todayEarnings = todayJobs.reduce(
    (sum, b) => sum + (b.finalAmount ?? b.estimatedAmount),
    0
  );
  const weekEarnings = weekJobs.reduce(
    (sum, b) => sum + (b.finalAmount ?? b.estimatedAmount),
    0
  );

  // Total welfare cess credited towards cooperative fund
  const totalWelfareCess = completedJobs.reduce(
    (sum, b) => sum + (b.welfareCessAmount || Math.round((b.finalAmount ?? b.estimatedAmount) * 0.05)),
    0
  );

  // Dynamic weekly bar chart based on actual completed jobs (past 7 days ending today)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayJobs = completedJobs.filter((b) => {
      const bDate = b.completedAt ? b.completedAt.split('T')[0] : b.scheduledDate;
      return bDate === dateStr;
    });
    const amount = dayJobs.reduce((sum, b) => sum + (b.finalAmount ?? b.estimatedAmount), 0);
    return {
      day: dayNames[d.getDay()],
      amount,
    };
  });

  const maxDayAmount = Math.max(...last7Days.map((d) => d.amount), 1);
  const weeklyBars = last7Days.map((d) => ({
    day: d.day,
    amount: d.amount,
    heightPct: d.amount > 0 ? Math.max(15, Math.round((d.amount / maxDayAmount) * 100)) : 0,
  }));

  // Real transactions from completed jobs
  const transactions = completedJobs
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.completedAt || a.createdAt).getTime();
      const timeB = new Date(b.completedAt || b.createdAt).getTime();
      return timeB - timeA;
    })
    .map((b) => {
      let dateDisplay = b.scheduledDate;
      if (b.completedAt) {
        const cDate = new Date(b.completedAt);
        const isToday = b.completedAt.split('T')[0] === todayDateStr;
        dateDisplay = isToday
          ? `Today, ${cDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : formatReadableDate(cDate);
      }
      return {
        id: `tx-${b.id}`,
        date: dateDisplay,
        customer: b.customerName,
        service: b.serviceTitle,
        amount: b.finalAmount ?? b.estimatedAmount,
        status: 'completed',
        bankRef: b.bookingCode || 'COOP-SETTLE',
      };
    });

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
          <Text style={styles.heroAmount}>₹{totalEarnings.toLocaleString('en-IN')}</Text>
          <Text style={styles.heroSub}>
            {worker?.bankAccountLinked
              ? 'Direct cooperative fair-wage settlement linked to verified cooperative bank account'
              : 'Direct cooperative fair-wage settlement (Bank account details pending setup)'}
          </Text>

          <View style={styles.heroFooter}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Pending Payout</Text>
              <Text style={styles.heroMetricVal}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricLabel}>Settled Previously</Text>
              <Text style={styles.heroMetricVal}>
                ₹{Math.max(0, totalEarnings - todayEarnings).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Period KPI Cards */}
        <View style={styles.kpiRow}>
          <StatCard
            title="Today's Earnings"
            value={`₹${todayEarnings.toLocaleString('en-IN')}`}
            icon="today-outline"
            color={colors.primary}
            subtitle={todayJobs.length > 0 ? `${todayJobs.length} completed today` : 'No jobs today'}
          />
          <StatCard
            title="This Week"
            value={`₹${weekEarnings.toLocaleString('en-IN')}`}
            icon="calendar-outline"
            color={colors.accent}
            subtitle={weekJobs.length > 0 ? `${weekJobs.length} jobs this week` : 'No jobs this week'}
          />
        </View>

        {/* Visual Earnings Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Income Breakdown</Text>
            <Text style={styles.chartTotal}>₹{weekEarnings.toLocaleString('en-IN')} Total</Text>
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
              Your cooperative charges zero platform commissions. A nominal 5% customer cess was credited to your welfare corpus (Current corpus: ₹{totalWelfareCess.toLocaleString('en-IN')}).
            </Text>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Recent Settlements</Text>
        {transactions.length > 0 ? (
          transactions.map((tx) => (
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
          ))
        ) : (
          <View style={styles.emptyTxBox}>
            <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTxTitle}>No earnings yet</Text>
            <Text style={styles.emptyTxSub}>
              Completed service jobs and cooperative payouts will appear here in real-time.
            </Text>
          </View>
        )}
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
    fontWeight: '600',
  },
  heroMetricVal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    height: 140,
    paddingTop: spacing.sm,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barVal: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 4,
  },
  barTrack: {
    width: 18,
    height: 90,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  barDay: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  welfareBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  welfareTextCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  welfareHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
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
  emptyTxBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  emptyTxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyTxSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});

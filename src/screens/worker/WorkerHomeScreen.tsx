import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { StatCard } from '../../components/cards';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerHomeScreenProps {
  onNavigateToJobRequests: () => void;
  onNavigateToJobManagement: () => void;
  onNavigateToEarnings: () => void;
  onNavigateToWelfare: () => void;
  onNavigateToVerification: () => void;
  onNavigateToNotifications: () => void;
}

export const WorkerHomeScreen: React.FC<WorkerHomeScreenProps> = ({
  onNavigateToJobRequests,
  onNavigateToJobManagement,
  onNavigateToEarnings,
  onNavigateToWelfare,
  onNavigateToVerification,
  onNavigateToNotifications,
}) => {
  const { user } = useAuth();
  const { bookings } = useBookings();
  const { t } = useLanguage();

  const worker = user as WorkerProfile;
  const [isAvailable, setIsAvailable] = useState(worker?.isAvailable ?? true);

  // Filter jobs
  const pendingRequests = bookings.filter((b) => b.status === 'requested');
  const activeJobs = bookings.filter(
    (b) => b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'in_progress'
  );
  const completedToday = bookings.filter((b) => b.status === 'completed');

  return (
    <View style={styles.container}>
      <Header
        title="Worker Console"
        subtitle={worker?.cooperativeName || 'Nagarika Seva Cooperative'}
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={3}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Availability Toggle Banner */}
        <View style={[styles.statusBanner, isAvailable ? styles.statusOnline : styles.statusOffline]}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success : colors.textMuted }]} />
            <View>
              <Text style={styles.statusTitle}>
                {isAvailable ? 'You are Online • Ready for Jobs' : 'You are Offline'}
              </Text>
              <Text style={styles.statusDesc}>
                {isAvailable ? 'Receiving priority dispatch nearby' : 'Turn on to receive booking requests'}
              </Text>
            </View>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: colors.border, true: colors.successLight }}
            thumbColor={isAvailable ? colors.success : '#CBD5E1'}
          />
        </View>

        {/* Quick KPI Strip */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Today's Fair Earnings"
            value="₹1,240"
            icon="cash-outline"
            color={colors.primary}
            subtitle="Direct transfer today"
          />
          <StatCard
            title="Pending Requests"
            value={pendingRequests.length}
            icon="time-outline"
            color={colors.accent}
            subtitle="Action required"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Active Jobs In-Flight"
            value={activeJobs.length}
            icon="construct-outline"
            color={colors.info}
            subtitle="In progress"
          />
          <StatCard
            title="Cooperative Rating"
            value="4.9 ★"
            icon="star-outline"
            color="#EAB308"
            subtitle="142 ratings"
          />
        </View>

        {/* Welfare Quick Access Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onNavigateToWelfare}
          style={styles.welfareCard}
        >
          <View style={styles.welfareIconBox}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          </View>
          <View style={styles.welfareTexts}>
            <Text style={styles.welfareTitle}>Cooperative Welfare & Insurance Shield</Text>
            <Text style={styles.welfareSub}>
              Active ₹5,00,000 Health Cover • ₹10,00,000 Accidental Protection
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Dispatch & Operations Hub (Replaced inline listings) */}
        <View style={styles.operationsCard}>
          <Text style={styles.operationsTitle}>Dispatch & Job Operations</Text>

          <TouchableOpacity
            style={styles.operationRow}
            onPress={onNavigateToJobRequests}
            activeOpacity={0.7}
          >
            <View style={[styles.opIconBox, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="git-pull-request" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opTitle}>Incoming Job Requests</Text>
              <Text style={styles.opSub}>
                {pendingRequests.length > 0
                  ? `${pendingRequests.length} citizen requests waiting for acceptance`
                  : 'No new incoming requests right now'}
              </Text>
            </View>
            {pendingRequests.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{pendingRequests.length}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.operationRow, { borderBottomWidth: 0 }]}
            onPress={onNavigateToJobManagement}
            activeOpacity={0.7}
          >
            <View style={[styles.opIconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="construct" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opTitle}>Active Jobs Management</Text>
              <Text style={styles.opSub}>
                {activeJobs.length > 0
                  ? `${activeJobs.length} active jobs in-flight. Tap to manage & update status`
                  : 'All assigned jobs completed or on standby'}
              </Text>
            </View>
            {activeJobs.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: colors.info }]}>
                <Text style={styles.countText}>{activeJobs.length}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quick Links / Tools */}
        <View style={styles.quickLinksGrid}>
          <TouchableOpacity
            onPress={onNavigateToEarnings}
            style={styles.quickLinkCard}
          >
            <Ionicons name="wallet-outline" size={22} color={colors.primary} />
            <Text style={styles.quickLinkTitle}>Earnings & Payouts</Text>
            <Text style={styles.quickLinkSub}>Bank transfers & records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNavigateToVerification}
            style={styles.quickLinkCard}
          >
            <Ionicons name="id-card-outline" size={22} color={colors.accent} />
            <Text style={styles.quickLinkTitle}>ID & Verification</Text>
            <Text style={styles.quickLinkSub}>Documents & guild badges</Text>
          </TouchableOpacity>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  statusOnline: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  statusOffline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  statusDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  welfareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  welfareIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  welfareTexts: {
    flex: 1,
  },
  welfareTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  welfareSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  countBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    marginLeft: 6,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 260,
  },
  activeJobItem: {
    marginBottom: spacing.sm,
  },
  jobActionsBar: {
    marginTop: -8,
    marginBottom: spacing.md,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLinkTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  quickLinkSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  operationsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  operationsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  operationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  opIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  opTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  opSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
});

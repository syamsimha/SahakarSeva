import React, { useState, useEffect } from 'react';
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
import { JobRequestCard, BookingCard, StatCard } from '../../components/cards';
import { Button, StarRating } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { bookingService } from '../../services';
import { WorkerProfile, Review } from '../../types';
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
  const { bookings, acceptJob, rejectJob, updateStatus } = useBookings();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  const worker = user as WorkerProfile;
  const [isAvailable, setIsAvailable] = useState(worker?.isAvailable ?? true);
  const [workerReviews, setWorkerReviews] = useState<Review[]>([]);

  useEffect(() => {
    const workerId = worker?.id || 'worker-101';
    bookingService.getReviewsForWorker(workerId).then(setWorkerReviews);
  }, [worker?.id, bookings]);

  // Calculate rating dynamically from actual submitted reviews
  const avgRating = workerReviews.length > 0
    ? workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length
    : (worker?.rating || 5.0);
  const totalReviewsCount = workerReviews.length;

  // Filter jobs
  const pendingRequests = bookings.filter((b) => b.status === 'requested');
  const activeJobs = bookings.filter(
    (b) => b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'in_progress'
  );
  const completedToday = bookings.filter((b) => b.status === 'completed');

  return (
    <View style={styles.container}>
      <Header
        title={t('worker_console')}
        subtitle={worker?.cooperativeName || 'Nagarika Seva Cooperative'}
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={unreadCount}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Availability Toggle Banner */}
        <View style={[styles.statusBanner, isAvailable ? styles.statusOnline : styles.statusOffline]}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success : colors.textMuted }]} />
            <View>
              <Text style={styles.statusTitle}>
                {isAvailable ? t('you_are_online') : t('you_are_offline')}
              </Text>
              <Text style={styles.statusDesc}>
                {isAvailable ? t('dispatch_nearby') : t('turn_on_dispatch')}
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
            title={t('today_fair_earnings')}
            value="₹1,240"
            icon="cash-outline"
            color={colors.primary}
            subtitle={t('direct_transfer_today')}
          />
          <StatCard
            title={t('pending_requests')}
            value={pendingRequests.length}
            icon="time-outline"
            color={colors.accent}
            subtitle="Action required"
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title={t('active_jobs')}
            value={activeJobs.length}
            icon="construct-outline"
            color={colors.info}
            subtitle="In progress"
          />
          <StatCard
            title="Cooperative Rating"
            value={`${avgRating.toFixed(1)} ★`}
            icon="star-outline"
            color="#EAB308"
            subtitle={`${totalReviewsCount} ${totalReviewsCount === 1 ? 'review' : 'reviews'}`}
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
            <Text style={styles.welfareTitle}>{t('cooperative_tools')}</Text>
            <Text style={styles.welfareSub}>
              Active ₹5,00,000 Health Cover • ₹10,00,000 Accidental Protection
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Immediate Pending Job Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.badgeTitleRow}>
                <Text style={styles.sectionTitle}>{t('incoming_job_requests')}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{pendingRequests.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onNavigateToJobRequests}>
                <Text style={styles.seeAllText}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>

            {pendingRequests.slice(0, 2).map((job) => (
              <JobRequestCard
                key={job.id}
                booking={job}
                onAccept={() => acceptJob(job.id)}
                onReject={() => rejectJob(job.id)}
              />
            ))}
          </View>
        )}

        {/* Active Jobs in Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('active_in_progress_jobs')} ({activeJobs.length})</Text>
            <TouchableOpacity onPress={onNavigateToJobManagement}>
              <Text style={styles.seeAllText}>{t('view_details')}</Text>
            </TouchableOpacity>
          </View>

          {activeJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={36} color={colors.primary} />
              <Text style={styles.emptyTitle}>{t('no_active_jobs')}</Text>
              <Text style={styles.emptySub}>
                Accept incoming requests above to dispatch and commence service.
              </Text>
            </View>
          ) : (
            activeJobs.map((job) => (
              <View key={job.id} style={styles.activeJobItem}>
                <BookingCard booking={job} onPress={onNavigateToJobManagement} />

                {/* Direct Action Stepper for Worker */}
                <View style={styles.jobActionsBar}>
                  {job.status === 'accepted' && (
                    <Button
                      title="Start Driving (On The Way)"
                      icon="bicycle"
                      onPress={() => updateStatus(job.id, 'on_the_way')}
                      variant="primary"
                      size="sm"
                      fullWidth
                    />
                  )}
                  {job.status === 'on_the_way' && (
                    <Button
                      title="Arrived at Site • Start Work"
                      icon="construct"
                      onPress={() => updateStatus(job.id, 'in_progress')}
                      variant="secondary"
                      size="sm"
                      fullWidth
                    />
                  )}
                  {job.status === 'in_progress' && (
                    <Button
                      title="Mark Job Completed"
                      icon="checkmark-done"
                      onPress={() => updateStatus(job.id, 'completed')}
                      variant="primary"
                      size="sm"
                      fullWidth
                      style={{ backgroundColor: colors.success }}
                    />
                  )}
                </View>
              </View>
            ))
          )}
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

        {/* Customer Reviews & Feedback Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.badgeTitleRow}>
              <Text style={styles.sectionTitle}>Customer Feedback & Ratings</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{totalReviewsCount}</Text>
              </View>
            </View>
            <StarRating rating={avgRating} count={totalReviewsCount} size={13} />
          </View>

          {workerReviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="star-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Reviews Yet</Text>
              <Text style={styles.emptySub}>
                Verified customer ratings and reviews will appear here after job completions.
              </Text>
            </View>
          ) : (
            workerReviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewerName}>{rev.customerName}</Text>
                  <Text style={styles.reviewDate}>{rev.createdAt}</Text>
                </View>
                <StarRating rating={rev.rating} showCount={false} size={12} style={{ marginVertical: 4 }} />
                <Text style={styles.reviewComment}>"{rev.comment}"</Text>
              </View>
            ))
          )}
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
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  reviewComment: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
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
import { getWorkerProfessionLabel, isTradeMatching } from '../../utils/workerMatching';

interface WorkerHomeScreenProps {
  onNavigateToJobRequests: () => void;
  onNavigateToJobManagement: () => void;
  onNavigateToEarnings: () => void;
  onNavigateToWelfare: () => void;
  onNavigateToVerification: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToProfile?: () => void;
}

export const WorkerHomeScreen: React.FC<WorkerHomeScreenProps> = ({
  onNavigateToJobRequests,
  onNavigateToJobManagement,
  onNavigateToEarnings,
  onNavigateToWelfare,
  onNavigateToVerification,
  onNavigateToNotifications,
  onNavigateToProfile,
}) => {
  const { user } = useAuth();
  const { bookings, acceptJob, rejectJob, updateStatus } = useBookings();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();

  const worker = user as WorkerProfile;
  const [isAvailable, setIsAvailable] = useState(worker?.isAvailable ?? true);
  const [workerReviews, setWorkerReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (worker?.id) {
      bookingService.getReviewsForWorker(worker.id).then(setWorkerReviews);
    } else {
      setWorkerReviews([]);
    }
  }, [worker?.id, bookings]);

  // Dynamic profession label for worker (e.g., "Plumber", "Electrician", "Carpenter", etc.)
  const workerProfession = getWorkerProfessionLabel(worker);

  // Dynamic worker rating
  const totalReviewsCount = workerReviews.length;
  const avgRating = totalReviewsCount > 0
    ? workerReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount
    : (worker?.reviewCount && worker.reviewCount > 0 && worker?.rating ? worker.rating : null);

  // Active jobs strictly belonging to this worker
  const activeJobs = bookings.filter(
    (b) =>
      b.workerId === worker?.id &&
      (b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'in_progress')
  );
  const hasActiveJob = activeJobs.length > 0;
  const isVerified = worker?.verificationStatus === 'verified';

  // Completed jobs strictly belonging to this worker
  const completedJobs = bookings.filter(
    (b) => b.workerId === worker?.id && b.status === 'completed'
  );

  // Real today's earnings computed from actual completed jobs today
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayCompletedJobs = completedJobs.filter((b) => {
    const jobDate = b.completedAt ? b.completedAt.split('T')[0] : b.scheduledDate;
    return jobDate === todayDateStr;
  });
  const todayFairEarnings = todayCompletedJobs.reduce(
    (sum, b) => sum + (b.finalAmount ?? b.estimatedAmount),
    0
  );

  // Pending requests strictly matching worker's profession / category
  const pendingRequests = bookings.filter(
    (b) =>
      b.status === 'requested' &&
      (!b.workerId || b.workerId === 'unassigned' || b.workerId === worker?.id) &&
      isTradeMatching(b.categoryId, b.serviceTitle, worker)
  );

  const handleAccept = async (jobId: string) => {
    try {
      await acceptJob(jobId);
      Alert.alert('Job Accepted', 'Booking moved to your Active Jobs queue. Please navigate to customer site on schedule.');
    } catch (err: any) {
      Alert.alert('Cannot Accept Job', err?.message || 'Job acceptance failed.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={worker?.name || t('worker_console')}
        subtitle={workerProfession}
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={unreadCount}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Required Alert Banner */}
        {!isVerified && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onNavigateToVerification}
            style={styles.unverifiedBanner}
          >
            <View style={styles.unverifiedBannerLeft}>
              <Ionicons name="shield-outline" size={24} color="#D97706" />
              <View style={styles.unverifiedBannerTexts}>
                <Text style={styles.unverifiedBannerTitle}>Admin Verification Required</Text>
                <Text style={styles.unverifiedBannerSub}>
                  Your profile must be verified by Admin before accepting jobs. Tap to inspect status.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </TouchableOpacity>
        )}

        {/* Active Job Notice Banner */}
        {hasActiveJob && (
          <View style={styles.activeJobBanner}>
            <Ionicons name="construct-outline" size={20} color={colors.info} />
            <Text style={styles.activeJobBannerText}>
              Active job in progress. You can only work on one job at a time. Complete current job to accept new requests.
            </Text>
          </View>
        )}

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

        {/* Quick KPI Strip with Working Navigation */}
        <View style={styles.statsGrid}>
          <StatCard
            title={t('today_fair_earnings') || "Today's Earnings"}
            value={`₹${todayFairEarnings.toLocaleString('en-IN')}`}
            icon="cash-outline"
            color={colors.primary}
            subtitle={
              todayCompletedJobs.length > 0
                ? `${todayCompletedJobs.length} job${todayCompletedJobs.length > 1 ? 's' : ''} completed`
                : (t('direct_transfer_today') || 'Direct cooperative transfer')
            }
            onPress={onNavigateToEarnings}
          />
          <StatCard
            title={t('pending_requests')}
            value={pendingRequests.length}
            icon="time-outline"
            color={colors.accent}
            subtitle={pendingRequests.length > 0 ? `${pendingRequests.length} eligible` : 'None pending'}
            onPress={onNavigateToJobRequests}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title={t('active_jobs')}
            value={activeJobs.length}
            icon="construct-outline"
            color={colors.info}
            subtitle={activeJobs.length > 0 ? 'In progress' : 'Available'}
            onPress={onNavigateToJobManagement}
          />
          <StatCard
            title="Cooperative Rating"
            value={avgRating != null ? `${avgRating.toFixed(1)} ★` : 'New'}
            icon="star-outline"
            color="#EAB308"
            subtitle={
              totalReviewsCount > 0
                ? `${totalReviewsCount} ${totalReviewsCount === 1 ? 'review' : 'reviews'}`
                : 'No ratings yet'
            }
            onPress={onNavigateToProfile || onNavigateToEarnings}
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

            {pendingRequests.slice(0, 2).map((job) => {
              const acceptDisabled = !isVerified || hasActiveJob;
              const disabledReason = !isVerified
                ? 'Your profile must be verified by Admin before accepting jobs.'
                : hasActiveJob
                ? 'Complete your current active job before accepting another.'
                : undefined;

              return (
                <JobRequestCard
                  key={job.id}
                  booking={job}
                  onAccept={() => handleAccept(job.id)}
                  onReject={() => rejectJob(job.id)}
                  isAcceptDisabled={acceptDisabled}
                  disabledReason={disabledReason}
                />
              );
            })}
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
            <StarRating rating={avgRating ?? 0} count={totalReviewsCount} size={13} />
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
  unverifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  unverifiedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  unverifiedBannerTexts: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  unverifiedBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  unverifiedBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  activeJobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  activeJobBannerText: {
    fontSize: 12,
    color: colors.info,
    fontWeight: '600',
    marginLeft: spacing.xs,
    flex: 1,
  },
});

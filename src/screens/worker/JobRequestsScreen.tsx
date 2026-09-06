import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { JobRequestCard } from '../../components/cards';
import { EmptyState, Button } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { WorkerProfile } from '../../types';
import { isTradeMatching, getWorkerProfessionLabel } from '../../utils/workerMatching';
import { Ionicons } from '@expo/vector-icons';

interface JobRequestsScreenProps {
  onBack?: () => void;
  onNavigateToVerification?: () => void;
  onNavigateToJobManagement?: () => void;
}

export const JobRequestsScreen: React.FC<JobRequestsScreenProps> = ({
  onBack,
  onNavigateToVerification,
  onNavigateToJobManagement,
}) => {
  const {
    bookings,
    acceptJob,
    rejectJobWithReason,
  } = useBookings();
  const { user } = useAuth();
  const worker = user as WorkerProfile;

  const isVerified = worker?.verificationStatus === 'verified';
  const workerProfession = getWorkerProfessionLabel(worker);

  // Active jobs for this worker
  const activeJobs = bookings.filter(
    (b) =>
      b.workerId === worker?.id &&
      ['accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );
  const hasActiveJob = activeJobs.length > 0;
  const currentActiveJob = activeJobs[0];

  // Eligible pending requests: must match worker's profession & be unassigned/requested
  const eligibleRequests = bookings
    .filter(
      (b) =>
        b.status === 'requested' &&
        (!b.workerId || b.workerId === 'unassigned' || b.workerId === worker?.id) &&
        isTradeMatching(b.categoryId, b.serviceTitle, worker)
    )
    .sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));

  const priorityCount = eligibleRequests.filter((b) => b.isPriority).length;

  const handleAccept = async (id: string) => {
    try {
      await acceptJob(id);
      Alert.alert(
        'Job Accepted',
        'Booking moved to your Active Jobs queue. Please navigate to customer site on schedule.'
      );
    } catch (err: any) {
      Alert.alert('Cannot Accept Job', err?.message || 'Failed to accept job.');
    }
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Decline Job',
      'Why are you declining this request?',
      [
        {
          text: 'Schedule Full',
          onPress: () => processReject(id, 'Schedule full'),
        },
        {
          text: 'Out of Service Area',
          onPress: () => processReject(id, 'Out of service area'),
        },
        {
          text: 'Tool Unavailable',
          onPress: () => processReject(id, 'Specialized tool unavailable'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const processReject = async (id: string, reason: string) => {
    try {
      await rejectJobWithReason(id, reason);
      Alert.alert('Job Declined', `Request declined.\nReason: ${reason}`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to decline job.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Pending Job Requests"
        subtitle={`${workerProfession} • ${eligibleRequests.length} eligible requests`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {/* Unverified Worker Warning Card */}
      {!isVerified && (
        <View style={styles.unverifiedHeroCard}>
          <View style={styles.unverifiedHeroTop}>
            <Ionicons name="shield-outline" size={24} color="#D97706" />
            <Text style={styles.unverifiedHeroTitle}>Admin Verification Required</Text>
          </View>
          <Text style={styles.unverifiedHeroBody}>
            Your profile must be verified by Admin before accepting jobs. You can browse incoming requests, but acceptance is locked until cooperative verification is granted.
          </Text>
          {onNavigateToVerification && (
            <TouchableOpacity
              style={styles.verifyLinkBtn}
              onPress={onNavigateToVerification}
            >
              <Text style={styles.verifyLinkText}>Check Verification Status →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Active Job in Progress Banner */}
      {hasActiveJob && (
        <View style={styles.activeJobBanner}>
          <Ionicons name="construct-outline" size={20} color={colors.info} />
          <View style={{ marginLeft: 8, flex: 1 }}>
            <Text style={styles.activeJobTitle}>Active Job in Progress</Text>
            <Text style={styles.activeJobText}>
              You are currently working on #{currentActiveJob.bookingCode} ({currentActiveJob.serviceTitle}). Finish your current job before accepting another.
            </Text>
          </View>
          {onNavigateToJobManagement && (
            <TouchableOpacity
              style={styles.viewActiveJobBtn}
              onPress={onNavigateToJobManagement}
            >
              <Text style={styles.viewActiveJobText}>View</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {priorityCount > 0 && (
        <View style={styles.urgentBanner}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
          <Text style={styles.urgentBannerText}>
            {priorityCount} Priority 24/7 {priorityCount === 1 ? 'Job requires' : 'Jobs require'} urgent response
          </Text>
        </View>
      )}

      <FlatList
        data={eligibleRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const acceptDisabled = !isVerified || hasActiveJob;
          const disabledReason = !isVerified
            ? 'Your profile must be verified by Admin before accepting jobs.'
            : hasActiveJob
            ? 'Complete your current active job before accepting another.'
            : undefined;

          return (
            <JobRequestCard
              booking={item}
              onAccept={() => handleAccept(item.id)}
              onReject={() => handleReject(item.id)}
              isAcceptDisabled={acceptDisabled}
              disabledReason={disabledReason}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={!isVerified ? 'shield-outline' : 'checkmark-done-circle-outline'}
            title={!isVerified ? 'Verification Under Review' : 'All Clear!'}
            message={
              !isVerified
                ? 'Your profile is awaiting Admin verification. Once verified, eligible service requests for your profession will be accept-able here.'
                : `No pending ${workerProfession} service requests at the moment. New requests from customers will appear here automatically.`
            }
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  unverifiedHeroCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  unverifiedHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unverifiedHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginLeft: 8,
  },
  unverifiedHeroBody: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  verifyLinkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  verifyLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  activeJobBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoLight,
    borderColor: colors.info,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  activeJobTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.info,
  },
  activeJobText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  viewActiveJobBtn: {
    backgroundColor: colors.info,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: 8,
  },
  viewActiveJobText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: 8,
  },
  urgentBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
    textTransform: 'uppercase',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});

import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Header } from '../../components/common';
import { JobRequestCard } from '../../components/cards';
import { EmptyState } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';

import { Ionicons } from '@expo/vector-icons';

interface JobRequestsScreenProps {
  onBack?: () => void;
}

export const JobRequestsScreen: React.FC<JobRequestsScreenProps> = ({ onBack }) => {
  const {
    bookings,
    acceptJob,
    rejectJob,
    rejectJobWithReason,
  } = useBookings();
  const pendingRequests = bookings
    .filter((b) => b.status === 'requested')
    .sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));
  const priorityCount = pendingRequests.filter((b) => b.isPriority).length;

  const handleAccept = async (id: string) => {
    await acceptJob(id);
    Alert.alert('Job Accepted', 'Booking moved to your Active Jobs queue. Please navigate to customer site on schedule.');
  };

  const handleReject = (id: string) => {
    Alert.alert(
      'Decline Job',
      'Why are you declining this request?',
      [
        {
          text: 'Schedule Full',
          onPress: () =>
            processReject(id, 'Schedule full'),
        },
        {
          text: 'Out of Service Area',
          onPress: () =>
            processReject(id, 'Out of service area'),
        },
        {
          text: 'Tool Unavailable',
          onPress: () =>
            processReject(
              id,
              'Specialized tool unavailable'
            ),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const processReject = async (
    id: string,
    reason: string
  ) => {
    await rejectJobWithReason(id, reason);

    Alert.alert(
      'Job Declined',
      `Request declined.\nReason: ${reason}`
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Pending Job Requests"
        subtitle={`${pendingRequests.length} requests waiting${priorityCount > 0 ? ` (${priorityCount} urgent)` : ''}`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {priorityCount > 0 && (
        <View style={styles.urgentBanner}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
          <Text style={styles.urgentBannerText}>
            {priorityCount} Priority 24/7 {priorityCount === 1 ? 'Job requires' : 'Jobs require'} urgent response
          </Text>
        </View>
      )}

      <FlatList
        data={pendingRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <JobRequestCard
            booking={item}
            onAccept={() => handleAccept(item.id)}
            onReject={() => handleReject(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="All Clear!"
            message="You have responded to all pending service requests. New requests will alert you here."
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

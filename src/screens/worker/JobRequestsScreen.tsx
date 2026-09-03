import React from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { Header } from '../../components/common';
import { JobRequestCard } from '../../components/cards';
import { EmptyState } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';

interface JobRequestsScreenProps {
  onBack?: () => void;
}

export const JobRequestsScreen: React.FC<JobRequestsScreenProps> = ({ onBack }) => {
  const { bookings, acceptJob, rejectJob } = useBookings();
  const pendingRequests = bookings.filter((b) => b.status === 'requested');

  const handleAccept = async (id: string) => {
    await acceptJob(id);
    Alert.alert('Job Accepted', 'Booking moved to your Active Jobs queue. Please navigate to customer site on schedule.');
  };

  const handleReject = async (id: string) => {
    await rejectJob(id);
    Alert.alert('Job Declined', 'Request returned to cooperative dispatch pool.');
  };

  return (
    <View style={styles.container}>
      <Header
        title="Pending Job Requests"
        subtitle={`${pendingRequests.length} requests waiting`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

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
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});

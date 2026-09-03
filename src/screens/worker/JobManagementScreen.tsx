import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { BookingCard } from '../../components/cards';
import { Button, EmptyState } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { Booking, BookingStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface JobManagementScreenProps {
  onBack?: () => void;
}

type TabType = 'active' | 'accepted' | 'completed';

export const JobManagementScreen: React.FC<JobManagementScreenProps> = ({ onBack }) => {
  const { bookings, updateStatus } = useBookings();
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const filterJobs = (tab: TabType): Booking[] => {
    switch (tab) {
      case 'active':
        return bookings.filter(
          (b) => b.status === 'on_the_way' || b.status === 'in_progress'
        );
      case 'accepted':
        return bookings.filter((b) => b.status === 'accepted');
      case 'completed':
        return bookings.filter((b) => b.status === 'completed');
    }
  };

  const currentJobs = filterJobs(activeTab);

  const handleProgress = (booking: Booking) => {
    if (booking.status === 'accepted') {
      updateStatus(booking.id, 'on_the_way', 'Worker dispatched to customer location');
    } else if (booking.status === 'on_the_way') {
      updateStatus(booking.id, 'in_progress', 'Work commenced at customer site');
    } else if (booking.status === 'in_progress') {
      updateStatus(booking.id, 'completed', 'Job successfully completed by worker');
      Alert.alert('Job Completed', 'Payment of ₹' + booking.estimatedAmount + ' marked for direct bank settlement.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Job Management"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['active', 'accepted', 'completed'] as const).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                {tab === 'active' ? 'Active In-Flight' : tab === 'accepted' ? 'Accepted' : 'Completed'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={currentJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.jobWrapper}>
            <BookingCard booking={item} onPress={() => {}} />

            {/* Stepper controls */}
            {item.status !== 'completed' && item.status !== 'cancelled' && (
              <View style={styles.stepperBox}>
                <Text style={styles.stepperTitle}>Update Job Status:</Text>
                {item.status === 'accepted' && (
                  <Button
                    title="Mark On The Way 🛵"
                    onPress={() => handleProgress(item)}
                    variant="primary"
                    size="sm"
                    fullWidth
                  />
                )}
                {item.status === 'on_the_way' && (
                  <Button
                    title="Mark Work Started 🔧"
                    onPress={() => handleProgress(item)}
                    variant="secondary"
                    size="sm"
                    fullWidth
                  />
                )}
                {item.status === 'in_progress' && (
                  <Button
                    title="Mark Work Completed ✅"
                    onPress={() => handleProgress(item)}
                    variant="primary"
                    size="sm"
                    fullWidth
                    style={{ backgroundColor: colors.success }}
                  />
                )}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="briefcase-outline"
            title={`No ${activeTab} jobs`}
            message="Accepted service requests will show here with real-time status buttons."
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  jobWrapper: {
    marginBottom: spacing.md,
  },
  stepperBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: -8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
});

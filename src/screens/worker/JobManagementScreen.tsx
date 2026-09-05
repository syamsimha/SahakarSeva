import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
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
  const {
    bookings,
    updateStatus,
    generateCompletionOtp,
    verifyCompletionOtp,
  } = useBookings();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');

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
      const otp = generateCompletionOtp(booking.id);

      if (!otp) {
        Alert.alert(
          'Error',
          'Unable to generate completion code.'
        );
        return;
      }

      setSelectedBooking({
        ...booking,
        completionOtp: otp,
        completionOtpVerified: false,
      });

      setEnteredOtp('');
      setOtpModalVisible(true);
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
            <BookingCard booking={item} onPress={() => { }} />

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
      <Modal
        visible={otpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOtpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Verify Job Completion
            </Text>

            <Text style={styles.modalMessage}>
              Ask the customer for their 4-digit completion code.
            </Text>

            <TextInput
              value={enteredOtp}
              onChangeText={(text) =>
                setEnteredOtp(text.replace(/[^0-9]/g, '').slice(0, 4))
              }
              placeholder="Enter 4-digit code"
              keyboardType="number-pad"
              maxLength={4}
              style={styles.otpInput}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setOtpModalVisible(false);
                  setSelectedBooking(null);
                  setEnteredOtp('');
                }}
                variant="secondary"
                size="sm"
              />

              <Button
                title="Verify & Complete"
                onPress={async () => {
                  if (!selectedBooking) {
                    return;
                  }

                  if (enteredOtp.length !== 4) {
                    Alert.alert(
                      'Invalid Code',
                      'Please enter the 4-digit customer completion code.'
                    );
                    return;
                  }

                  const verified = verifyCompletionOtp(
                    selectedBooking.id,
                    enteredOtp
                  );

                  if (!verified) {
                    Alert.alert(
                      'Incorrect Code',
                      'The code is incorrect. The job has not been completed.'
                    );
                    return;
                  }

                  const completed = await updateStatus(
                    selectedBooking.id,
                    'completed',
                    'Job successfully completed after customer OTP verification'
                  );

                  if (completed) {
                    setOtpModalVisible(false);
                    setSelectedBooking(null);
                    setEnteredOtp('');

                    Alert.alert(
                      'Job Completed',
                      `Payment of ₹${selectedBooking.estimatedAmount} marked for direct bank settlement.`
                    );
                  }
                }}
                variant="primary"
                size="sm"
              />
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },

  modalContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },

  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },

  modalMessage: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  otpInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.text,
    marginBottom: spacing.md,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});

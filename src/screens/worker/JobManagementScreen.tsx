import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import { locationService } from '../../services/locationService';
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
    updateWorkerLocation,
  } = useBookings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [gpsStatus, setGpsStatus] = useState<string>('Standby');
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Stream genuine worker GPS coordinates to active jobs (on_the_way / in_progress)
  useEffect(() => {
    const activeJobs = bookings.filter(
      (b) => b.workerId === user?.id && (b.status === 'on_the_way' || b.status === 'in_progress')
    );

    if (activeJobs.length === 0) {
      setGpsStatus('Standby');
      return;
    }

    setGpsStatus('Broadcasting live GPS...');
    let watchId: number | null = null;
    let intervalId: any = null;

    const reportCoords = (lat: number, lng: number) => {
      activeJobs.forEach((job) => {
        updateWorkerLocation(job.id, lat, lng, user?.id || job.workerId);
      });
      setGpsStatus(`Live GPS Streaming (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      // 1. Immediate initial location report
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          reportCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Worker geolocation warning:', err?.message);
          setGpsStatus('GPS signal acquiring...');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // 2. Continuous real device GPS streaming
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          reportCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Worker watchPosition warning:', err?.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fetchLoc = async () => {
        try {
          const loc = await locationService.getCurrentLocation();
          if (loc && loc.latitude && loc.longitude) {
            reportCoords(loc.latitude, loc.longitude);
          }
        } catch (e) {
          // ignore
        }
      };
      fetchLoc();
      intervalId = setInterval(fetchLoc, 8000);
    }

    // Cleanup: stop location streaming immediately when jobs end or screen unmounts
    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [bookings, user?.id]);

  const filterJobs = (tab: TabType): Booking[] => {
    const workerBookings = bookings.filter((b) => b.workerId === user?.id);

    switch (tab) {
      case 'active':
        return workerBookings.filter(
          (b) => b.status === 'on_the_way' || b.status === 'in_progress'
        );
      case 'accepted':
        return workerBookings.filter((b) => b.status === 'accepted');
      case 'completed':
        return workerBookings.filter((b) => b.status === 'completed');
    }
  };

  const currentJobs = filterJobs(activeTab);

  const handleProgress = (booking: Booking) => {
    if (booking.status === 'accepted') {
      updateStatus(booking.id, 'on_the_way', 'Worker dispatched to customer location');
    } else if (booking.status === 'on_the_way') {
      updateStatus(booking.id, 'in_progress', 'Work commenced at customer site');
    } else if (booking.status === 'in_progress') {
      const currentBooking = bookings.find((b) => b.id === booking.id) || booking;
      const otp = currentBooking.completionOtp || generateCompletionOtp(booking.id);

      setSelectedBooking({
        ...currentBooking,
        completionOtp: otp || currentBooking.completionOtp,
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

      {activeTab === 'active' && currentJobs.length > 0 && (
        <View style={styles.gpsStatusBar}>
          <Ionicons name="radio" size={15} color={colors.success} />
          <Text style={styles.gpsStatusText}>Worker Device GPS: {gpsStatus}</Text>
        </View>
      )}

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
                title={isCompleting ? 'Verifying...' : 'Verify & Complete'}
                disabled={isCompleting}
                onPress={async () => {
                  if (!selectedBooking || isCompleting) {
                    return;
                  }

                  if (selectedBooking.status === 'completed') {
                    Alert.alert('Already Completed', 'This job has already been verified and marked completed.');
                    setOtpModalVisible(false);
                    return;
                  }

                  const cleanOtp = enteredOtp.trim();
                  if (cleanOtp.length !== 4) {
                    Alert.alert(
                      'Invalid Code',
                      'Please enter the 4-digit customer completion code.'
                    );
                    return;
                  }

                  const currentBooking = bookings.find((b) => b.id === selectedBooking.id) || selectedBooking;
                  const expectedOtp = currentBooking.completionOtp?.trim();

                  if (!expectedOtp || expectedOtp !== cleanOtp) {
                    Alert.alert(
                      'Incorrect Code',
                      'The 4-digit verification code is incorrect. Please ask the customer to check the code displayed on their screen.'
                    );
                    return;
                  }

                  setIsCompleting(true);
                  try {
                    verifyCompletionOtp(currentBooking.id, cleanOtp);

                    const completed = await updateStatus(
                      currentBooking.id,
                      'completed',
                      'Job successfully completed after customer 4-digit code verification'
                    );

                    if (completed) {
                      setOtpModalVisible(false);
                      setSelectedBooking(null);
                      setEnteredOtp('');

                      Alert.alert(
                        'Job Completed',
                        `Work verified and marked completed! Payment of ₹${completed.finalAmount || completed.estimatedAmount} queued for direct bank settlement.`
                      );
                    } else {
                      Alert.alert('Error', 'Unable to mark job completed. Please try again.');
                    }
                  } catch (err: any) {
                    Alert.alert('Completion Error', err?.message || 'Unable to complete job.');
                  } finally {
                    setIsCompleting(false);
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
  gpsStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
  },
  gpsStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 6,
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

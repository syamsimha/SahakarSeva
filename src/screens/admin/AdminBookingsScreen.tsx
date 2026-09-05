import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { BookingCard } from '../../components/cards';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { workerService } from '../../services';
import { Booking, WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface AdminBookingsScreenProps {
  onBack?: () => void;
  onTrackWorker?: (bookingId: string) => void;
}

export const AdminBookingsScreen: React.FC<AdminBookingsScreenProps> = ({ onBack, onTrackWorker }) => {
  const { t } = useLanguage();
  const { bookings, assignWorker, updateStatus } = useBookings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [allWorkers, setAllWorkers] = useState<WorkerProfile[]>([]);
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);

  useEffect(() => {
    workerService.getWorkers().then((data) => setAllWorkers(data));
  }, []);

  // Compute set of worker IDs currently engaged in an active, non-completed job
  const busyWorkerIds = useMemo(() => {
    const ids = new Set<string>();
    bookings.forEach((b) => {
      if (
        b.workerId &&
        (b.status === 'accepted' || b.status === 'on_the_way' || b.status === 'in_progress')
      ) {
        ids.add(b.workerId);
      }
    });
    return ids;
  }, [bookings]);

  // Cooperative rule: workers currently on a job are NOT displayed for new job assignments.
  // Statutory rule: unverified workers can NEVER be assigned work.
  const availableWorkers = useMemo(() => {
    return allWorkers.filter(
      (w) => w.verificationStatus === 'verified' && !busyWorkerIds.has(w.id)
    );
  }, [allWorkers, busyWorkerIds]);

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusTabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: t('all_members') },
    { id: 'requested', label: t('status_requested') },
    { id: 'accepted', label: t('status_accepted') },
    { id: 'on_the_way', label: t('status_on_the_way') },
    { id: 'in_progress', label: t('status_in_progress') },
    { id: 'completed', label: t('status_completed') },
  ];

  const handleAssignWorkerToBooking = async (worker: WorkerProfile) => {
    if (!assigningBooking) return;
    if (worker.verificationStatus !== 'verified') {
      Alert.alert(
        'Verification Required',
        `Cannot assign work to ${worker.name}. Worker status is "${worker.verificationStatus}". Only verified cooperative members can be assigned jobs.`
      );
      return;
    }
    try {
      await assignWorker(
        assigningBooking.id,
        {
          id: worker.id,
          name: worker.name,
          primarySkill: worker.primarySkill,
          phone: worker.phone,
          cooperativeName: worker.cooperativeName,
        },
        `Assigned to ${worker.name} via District Admin Master Dispatch`
      );
      const code = assigningBooking.bookingCode;
      setAssigningBooking(null);
      Alert.alert(
        'Worker Assigned Successfully',
        `Successfully allocated ${worker.name} (${worker.primarySkill}) to Booking ${code}. Worker is now marked active on this job and cannot be assigned another job until completion.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to assign worker.');
    }
  };

  const handleCompleteBooking = async (booking: Booking) => {
    try {
      await updateStatus(booking.id, 'completed', 'Job marked completed by District Administrator');
      Alert.alert(
        'Job Completed & Worker Released',
        `Booking ${booking.bookingCode} completed. ${booking.workerName} is now free and will be displayed for new job assignments.`
      );
    } catch (err) {
      Alert.alert('Error', 'Unable to complete booking.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('district_master_bookings')}
        subtitle={`${filtered.length} operations tracked`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <View style={styles.topSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('search_placeholder')}
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusTabs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.statusPillsRow}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setStatusFilter(item.id)}
                style={[styles.pill, isSelected && styles.pillActive]}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.bookingCardWrapper}>
            <BookingCard
              booking={item}
              onPress={() => onTrackWorker?.(item.id)}
              onTrack={() => onTrackWorker?.(item.id)}
            />
            {item.status !== 'completed' && item.status !== 'cancelled' && (
              <View style={styles.adminActionStrip}>
                <View style={styles.assignedWorkerRow}>
                  <Text style={styles.assignedWorkerLabel}>{t('current_worker')}:</Text>
                  <Text style={styles.assignedWorkerValue}>
                    {item.workerName || 'Unassigned'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(item.status === 'accepted' || item.status === 'on_the_way' || item.status === 'in_progress') && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleCompleteBooking(item)}
                    >
                      <Ionicons name="checkmark-done" size={14} color="#FFFFFF" />
                      <Text style={styles.completeBtnText}>Complete Work</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.reassignBtn}
                    onPress={() => setAssigningBooking(item)}
                  >
                    <Ionicons name="person-add-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.reassignBtnText}>
                      {item.status === 'requested' ? t('assign_work') : t('reassign_worker')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Bookings Match Query"
            message="Adjust your search filters or status criteria."
            actionTitle="Reset"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        }
      />

      {/* ASSIGN WORKER MODAL */}
      <Modal visible={Boolean(assigningBooking)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dispatch / Assign Worker</Text>
                {assigningBooking && (
                  <Text style={styles.modalSubtitle}>
                    Booking: {assigningBooking.bookingCode} • {assigningBooking.serviceTitle}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setAssigningBooking(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Rule Banner */}
            <View style={styles.ruleBanner}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={styles.ruleBannerText}>
                Verified & Idle Rule: Only verified idle workers are shown ({availableWorkers.length} available). Unverified workers and workers currently on a job ({busyWorkerIds.size} busy) cannot be assigned work.
              </Text>
            </View>

            <Text style={styles.selectWorkerHeader}>
              Available Verified Workers ({availableWorkers.length})
            </Text>

            <FlatList
              data={availableWorkers}
              keyExtractor={(w) => w.id}
              style={{ maxHeight: 350 }}
              renderItem={({ item: worker }) => {
                const isMatchingSkill =
                  assigningBooking &&
                  assigningBooking.serviceTitle.toLowerCase().includes(worker.primarySkill.toLowerCase());

                return (
                  <View style={[styles.workerOptionCard, isMatchingSkill && styles.workerOptionCardMatch]}>
                    <Avatar name={worker.name} size={40} showVerifiedBadge={worker.verificationStatus === 'verified'} />
                    <View style={styles.workerOptionInfo}>
                      <View style={styles.workerOptionNameRow}>
                        <Text style={styles.workerOptionName}>{worker.name}</Text>
                        {isMatchingSkill && (
                          <View style={styles.skillMatchTag}>
                            <Text style={styles.skillMatchTagText}>SKILL MATCH</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.workerOptionSkill}>
                        {worker.primarySkill} • {worker.experienceYears} yrs exp
                      </Text>
                      <Text style={styles.workerOptionCoop} numberOfLines={1}>
                        {worker.cooperativeName}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.selectWorkerBtn}
                      onPress={() => handleAssignWorkerToBooking(worker)}
                    >
                      <Text style={styles.selectWorkerBtnText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWorkerBox}>
                  <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyWorkerTitle}>No Idle Workers Available</Text>
                  <Text style={styles.emptyWorkerSub}>
                    All verified guild workers currently have an active job assignment. Complete ongoing bookings to release workers back to the available pool.
                  </Text>
                </View>
              }
            />

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAssigningBooking(null)}
                style={{ flex: 1 }}
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
  topSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusPillsRow: {
    gap: 8,
    marginTop: spacing.sm,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  bookingCardWrapper: {
    marginBottom: spacing.md,
  },
  adminActionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: -8,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
  },
  assignedWorkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  assignedWorkerLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  assignedWorkerValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  reassignBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectWorkerHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  workerOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  workerOptionCardMatch: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  workerOptionInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  workerOptionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workerOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  skillMatchTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  skillMatchTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  workerOptionSkill: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  workerOptionCoop: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  selectWorkerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  selectWorkerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ruleBannerText: {
    flex: 1,
    fontSize: 11,
    color: colors.primary,
    lineHeight: 16,
    fontWeight: '500',
  },
  emptyWorkerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  emptyWorkerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyWorkerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  modalFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

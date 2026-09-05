import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Linking,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../../theme';
import { Avatar, Badge, Button } from '../../../components/ui';
import { useBookings } from '../../../context/BookingContext';
import { workerService } from '../../../services';
import { Booking, WorkerProfile } from '../../../types';
import { isTradeMatching, getWorkerActiveJob, getRequiredTradeLabel } from '../../../utils/workerMatching';
import { Ionicons } from '@expo/vector-icons';

interface JobDispatchSectionProps {
  isAdmin: boolean;
  onNavigateToBookings: () => void;
  preselectedWorkerForAssign?: WorkerProfile | null;
  onClearPreselectedWorker?: () => void;
}

const AVAILABLE_SKILLS = [
  'Electrician',
  'Plumbing',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Appliance Repair',
  'Gardening',
];

export const JobDispatchSection: React.FC<JobDispatchSectionProps> = ({
  isAdmin,
  onNavigateToBookings,
  preselectedWorkerForAssign,
  onClearPreselectedWorker,
}) => {
  const { bookings, assignJobToWorker, cancelBooking } = useBookings();
  const [subtab, setSubtab] = useState<'available' | 'assigned' | 'all'>('available');
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Booking | null>(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);

  const [verifiedWorkers, setVerifiedWorkers] = useState<WorkerProfile[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignSkillFilter, setAssignSkillFilter] = useState('all');
  const [workerToConfirm, setWorkerToConfirm] = useState<WorkerProfile | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleCall = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {
      showToast(`Triggered dialer for ${phone}`);
    });
  };

  const loadVerifiedWorkers = async () => {
    const list = await workerService.getWorkers({ status: 'verified' });
    setVerifiedWorkers(list);
  };

  useEffect(() => {
    loadVerifiedWorkers();
    const unsub = workerService.subscribe(() => {
      loadVerifiedWorkers();
    });
    return () => unsub();
  }, []);

  // If a worker was pre-selected from WorkerManagement card
  useEffect(() => {
    if (preselectedWorkerForAssign) {
      const worker = preselectedWorkerForAssign;
      const activeJob = getWorkerActiveJob(worker.id, bookings);
      if (activeJob) {
        showToast(
          `Cannot Assign: ${worker.name} is currently working on active job #${activeJob.bookingCode} (${activeJob.serviceTitle}). Workers can only be assigned one active job at a time.`
        );
        onClearPreselectedWorker?.();
        return;
      }

      // Try finding an unassigned job matching this worker's trade
      const matchingJob = bookings.find(
        (b) => (!b.workerId || b.status === 'requested') && isTradeMatching(b.categoryId, b.serviceTitle, worker)
      );

      if (matchingJob) {
        setSelectedJob(matchingJob);
        setWorkerToConfirm(worker);
        setAssignSkillFilter('matched');
        setAssignModalVisible(true);
        showToast(`Matched unassigned ${matchingJob.serviceTitle} job for ${worker.name} (${worker.primarySkill})`);
      } else {
        const anyUnassigned = bookings.find((b) => !b.workerId || b.status === 'requested');
        if (anyUnassigned) {
          setSelectedJob(anyUnassigned);
          setWorkerToConfirm(worker);
          setAssignSkillFilter('all');
          setAssignModalVisible(true);
        } else {
          showToast(`No unassigned jobs currently pending for trade: ${worker.primarySkill}`);
        }
      }
      onClearPreselectedWorker?.();
    }
  }, [preselectedWorkerForAssign, bookings]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Available / Unassigned Jobs
  const availableJobs = bookings.filter((b) => !b.workerId || b.status === 'requested');
  // Assigned / Active Jobs
  const assignedJobs = bookings.filter((b) => Boolean(b.workerId) && b.status !== 'requested');

  const handleOpenAssignModal = (job: Booking) => {
    if (!isAdmin) {
      showToast('Only federation administrators have dispatch authorization.');
      return;
    }
    setSelectedJob(job);
    setWorkerToConfirm(null);
    setAssignSearch('');
    setAssignSkillFilter('matched'); // Default to Trade-Matched filter for accuracy
    setAssignModalVisible(true);
  };

  const handleConfirmAssignment = async () => {
    if (!isAdmin) {
      showToast('Dispatch failed: Admin authorization required.');
      return;
    }
    if (!selectedJob || !workerToConfirm) return;

    // Check concurrency before attempting
    const activeJob = getWorkerActiveJob(workerToConfirm.id, bookings, selectedJob.id);
    if (activeJob) {
      showToast(
        `Assignment Blocked: ${workerToConfirm.name} already has active job #${activeJob.bookingCode}. A worker can only be assigned to one work at a time.`
      );
      return;
    }

    // Check trade matching before attempting
    if (!isTradeMatching(selectedJob.categoryId, selectedJob.serviceTitle, workerToConfirm)) {
      showToast(
        `Skill Mismatch: ${selectedJob.serviceTitle} requires ${selectedJob.categoryId || 'trade'} specialist. ${workerToConfirm.name} is certified in ${workerToConfirm.primarySkill}.`
      );
      return;
    }

    setIsAssigning(true);
    try {
      await assignJobToWorker(selectedJob.id, workerToConfirm);
      const workerName = workerToConfirm.name;
      const jobTitle = selectedJob.serviceTitle;
      setAssignModalVisible(false);
      setSelectedJob(null);
      setWorkerToConfirm(null);
      showToast(`Job "${jobTitle}" successfully dispatched to ${workerName} (${workerToConfirm.primarySkill})!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch job');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Job Management & Dispatch</Text>
          </View>
          <Text style={styles.sectionSub}>Match verified cooperative professionals with incoming consumer requests</Text>
        </View>

        <TouchableOpacity onPress={onNavigateToBookings}>
          <Text style={styles.manageAllText}>Manage All</Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {toastMsg && (
        <View style={styles.toastCard}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Subtabs */}
      <View style={styles.subtabsRow}>
        <TouchableOpacity
          style={[styles.subtab, subtab === 'available' && styles.subtabActive]}
          onPress={() => setSubtab('available')}
        >
          <Ionicons
            name="flash"
            size={14}
            color={subtab === 'available' ? '#FFF' : colors.textSecondary}
          />
          <Text style={[styles.subtabText, subtab === 'available' && styles.subtabTextActive]}>
            Available Jobs ({availableJobs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subtab, subtab === 'assigned' && styles.subtabActive]}
          onPress={() => setSubtab('assigned')}
        >
          <Ionicons
            name="checkmark-done"
            size={14}
            color={subtab === 'assigned' ? '#FFF' : colors.textSecondary}
          />
          <Text style={[styles.subtabText, subtab === 'assigned' && styles.subtabTextActive]}>
            Assigned Jobs ({assignedJobs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subtab, subtab === 'all' && styles.subtabActive]}
          onPress={() => setSubtab('all')}
        >
          <Ionicons
            name="list"
            size={14}
            color={subtab === 'all' ? '#FFF' : colors.textSecondary}
          />
          <Text style={[styles.subtabText, subtab === 'all' && styles.subtabTextActive]}>
            All ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Available Jobs List */}
      {subtab === 'available' && (
        <>
          {availableJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
              <Text style={styles.emptyText}>All current job requests are fully allocated!</Text>
            </View>
          ) : (
            availableJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.jobTitle}>{job.serviceTitle}</Text>
                      {job.isEmergency && (
                        <View style={styles.emergencyTag}>
                          <Text style={styles.emergencyTagText}>EMERGENCY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.jobCode}>
                      {job.bookingCode} • Category: {job.categoryId}
                    </Text>
                  </View>
                  <View style={styles.unassignedPill}>
                    <Text style={styles.unassignedPillText}>Needs Worker</Text>
                  </View>
                </View>

                {/* Job Location & Customer Details */}
                <View style={styles.jobDetailsBox}>
                  <Text style={styles.detailItem}>👤 Customer: {job.customerName} ({job.customerPhone})</Text>
                  <Text style={styles.detailItem}>📍 Location: {job.serviceLocation?.addressLine}, {job.serviceLocation?.city}</Text>
                  <Text style={styles.detailItem}>🕒 Schedule: {job.scheduledDate} at {job.scheduledTimeSlot}</Text>
                  {job.instructions ? (
                    <Text style={styles.detailItem}>📝 Note: {job.instructions}</Text>
                  ) : null}
                </View>

                {/* Footer with Price and Assign Button */}
                <View style={styles.jobFooter}>
                  <View>
                    <Text style={styles.fareLabel}>Estimated Fare</Text>
                    <Text style={styles.fareVal}>₹{job.estimatedAmount}</Text>
                  </View>

                  {isAdmin && (
                    <Button
                      title="Assign Worker"
                      icon="person-add"
                      variant="primary"
                      size="sm"
                      onPress={() => handleOpenAssignModal(job)}
                    />
                  )}
                </View>
              </View>
            ))
          )}
        </>
      )}

      {/* Assigned Jobs List */}
      {subtab === 'assigned' && (
        <>
          {assignedJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="information-circle-outline" size={24} color={colors.textMuted} />
              <Text style={styles.emptyText}>No assigned jobs found in this batch.</Text>
            </View>
          ) : (
            assignedJobs.slice(0, 5).map((job) => (
              <View key={job.id} style={styles.assignedCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobTitle}>{job.serviceTitle}</Text>
                    <Text style={styles.jobCode}>{job.bookingCode} • ₹{job.estimatedAmount}</Text>
                  </View>
                  <Badge status={job.status} />
                </View>

                <View style={styles.assignedWorkerRow}>
                  <View>
                    <Text style={styles.workerLabel}>Assigned Guild Worker</Text>
                    <Text style={styles.workerNameText}>{job.workerName} ({job.workerSkill})</Text>
                    <Text style={styles.workerPhoneText}>{job.workerPhone} • {job.cooperativeName}</Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.reassignBtn}
                      onPress={() => handleOpenAssignModal(job)}
                    >
                      <Ionicons name="swap-horizontal" size={13} color={colors.primary} />
                      <Text style={styles.reassignBtnText}>Reassign</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Customer: {job.customerName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Scheduled: {job.scheduledDate}
                  </Text>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {/* All Bookings Quick Overview */}
      {subtab === 'all' && (
        <>
          {bookings.slice(0, 4).map((b) => (
            <View key={b.id} style={styles.allBookingItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobTitle}>{b.serviceTitle}</Text>
                <Text style={styles.jobCode}>{b.bookingCode} • ₹{b.estimatedAmount}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                  Worker: {b.workerName || 'Unassigned'} • Customer: {b.customerName}
                </Text>
              </View>
              <Badge status={b.status} />
            </View>
          ))}
        </>
      )}

      {/* ========================================================= */}
      {/* ASSIGN JOB TO VERIFIED WORKER MODAL (ADMIN ONLY)          */}
      {/* ========================================================= */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Assign Job to Verified Worker</Text>
                <Text style={styles.modalSub}>Verified guild members only are eligible for job assignment</Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Job Brief */}
                <View style={styles.jobBriefCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.briefTitle}>{selectedJob.serviceTitle}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.briefCode}>{selectedJob.bookingCode}</Text>
                        <View style={styles.tradeRequiredBadge}>
                          <Ionicons name="construct" size={10} color={colors.primary} />
                          <Text style={styles.tradeRequiredBadgeText}>
                            Trade: {getRequiredTradeLabel(selectedJob.categoryId, selectedJob.serviceTitle)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.briefFare}>₹{selectedJob.estimatedAmount}</Text>
                  </View>

                  <View style={{ marginTop: 8, gap: 3 }}>
                    <Text style={styles.briefDetail}>👤 <Text style={{ fontWeight: '600' }}>Customer:</Text> {selectedJob.customerName} ({selectedJob.customerPhone})</Text>
                    <Text style={styles.briefDetail}>📍 <Text style={{ fontWeight: '600' }}>Location:</Text> {selectedJob.serviceLocation?.addressLine}, {selectedJob.serviceLocation?.city}</Text>
                    <Text style={styles.briefDetail}>🕒 <Text style={{ fontWeight: '600' }}>Schedule:</Text> {selectedJob.scheduledDate} at {selectedJob.scheduledTimeSlot}</Text>
                    {selectedJob.instructions ? (
                      <Text style={styles.briefDetail}>📝 <Text style={{ fontWeight: '600' }}>Notes:</Text> {selectedJob.instructions}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Cooperative Policy Notice */}
                <View style={styles.rulesNoticeBox}>
                  <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.rulesNoticeTitle}>Cooperative Allocation Safeguards</Text>
                    <Text style={styles.rulesNoticeText}>
                      • <Text style={{ fontWeight: '700' }}>Profession Guarantee:</Text> Jobs are restricted to certified {getRequiredTradeLabel(selectedJob.categoryId, selectedJob.serviceTitle)} artisans.
                    </Text>
                    <Text style={styles.rulesNoticeText}>
                      • <Text style={{ fontWeight: '700' }}>Single Job Limit:</Text> Workers can only be assigned to 1 active job at a time.
                    </Text>
                  </View>
                </View>

                {/* Worker Filtering */}
                {(() => {
                  const requiredTrade = getRequiredTradeLabel(selectedJob.categoryId, selectedJob.serviceTitle);
                  const matchedWorkers = verifiedWorkers.filter((w) =>
                    isTradeMatching(selectedJob.categoryId, selectedJob.serviceTitle, w)
                  );
                  const availableMatchedWorkers = matchedWorkers.filter(
                    (w) => !getWorkerActiveJob(w.id, bookings, selectedJob.id)
                  );

                  return (
                    <>
                      <Text style={styles.filterSectionHeading}>
                        Select Verified Artisan ({availableMatchedWorkers.length} Available {requiredTrade}s)
                      </Text>

                      <TextInput
                        value={assignSearch}
                        onChangeText={setAssignSearch}
                        placeholder="Search by worker name, location, rating..."
                        placeholderTextColor={colors.textMuted}
                        style={styles.modalSearchInput}
                      />

                      <View style={styles.modalChipRow}>
                        <TouchableOpacity
                          style={[styles.miniChip, assignSkillFilter === 'matched' && styles.miniChipActive]}
                          onPress={() => setAssignSkillFilter('matched')}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={11}
                            color={assignSkillFilter === 'matched' ? '#FFF' : colors.primary}
                          />
                          <Text style={[styles.miniChipText, assignSkillFilter === 'matched' && styles.miniChipTextActive]}>
                            Trade Matched ({matchedWorkers.length})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniChip, assignSkillFilter === 'available' && styles.miniChipActive]}
                          onPress={() => setAssignSkillFilter('available')}
                        >
                          <Ionicons
                            name="radio-button-on"
                            size={11}
                            color={assignSkillFilter === 'available' ? '#FFF' : colors.success}
                          />
                          <Text style={[styles.miniChipText, assignSkillFilter === 'available' && styles.miniChipTextActive]}>
                            Available Only ({verifiedWorkers.filter((w) => !getWorkerActiveJob(w.id, bookings, selectedJob.id)).length})
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.miniChip, assignSkillFilter === 'all' && styles.miniChipActive]}
                          onPress={() => setAssignSkillFilter('all')}
                        >
                          <Text style={[styles.miniChipText, assignSkillFilter === 'all' && styles.miniChipTextActive]}>
                            All ({verifiedWorkers.length})
                          </Text>
                        </TouchableOpacity>

                        {AVAILABLE_SKILLS.map((sk) => (
                          <TouchableOpacity
                            key={sk}
                            style={[styles.miniChip, assignSkillFilter.toLowerCase() === sk.toLowerCase() && styles.miniChipActive]}
                            onPress={() => setAssignSkillFilter(sk.toLowerCase())}
                          >
                            <Text style={[styles.miniChipText, assignSkillFilter.toLowerCase() === sk.toLowerCase() && styles.miniChipTextActive]}>
                              {sk}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  );
                })()}

                {/* Confirmation Box (when worker is selected) */}
                {workerToConfirm && (
                  <View style={styles.confirmBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primaryDark} />
                      <Text style={styles.confirmTitle}>Confirm Official Work Assignment</Text>
                    </View>
                    <Text style={styles.confirmText}>
                      Assign <Text style={{ fontWeight: '700' }}>{workerToConfirm.name}</Text> (Trade: {workerToConfirm.primarySkill}) to {selectedJob.serviceTitle} for customer {selectedJob.customerName}?
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
                      <Button
                        title="Cancel"
                        variant="outline"
                        size="sm"
                        onPress={() => setWorkerToConfirm(null)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={isAssigning ? 'Dispatching...' : 'Confirm Assignment'}
                        variant="primary"
                        size="sm"
                        icon="checkmark-circle"
                        onPress={handleConfirmAssignment}
                        disabled={isAssigning}
                        style={{ flex: 1.5 }}
                      />
                    </View>
                  </View>
                )}

                {/* Verified Workers Roster */}
                {(() => {
                  const filtered = verifiedWorkers.filter((w) => {
                    const matchesTrade = isTradeMatching(selectedJob.categoryId, selectedJob.serviceTitle, w);
                    const isBusy = Boolean(getWorkerActiveJob(w.id, bookings, selectedJob.id));

                    if (assignSkillFilter === 'matched') {
                      if (!matchesTrade) return false;
                    } else if (assignSkillFilter === 'available') {
                      if (isBusy) return false;
                    } else if (assignSkillFilter !== 'all') {
                      const match =
                        w.primarySkill.toLowerCase().includes(assignSkillFilter) ||
                        w.allSkills.some((s) => s.toLowerCase().includes(assignSkillFilter));
                      if (!match) return false;
                    }

                    if (assignSearch.trim()) {
                      const q = assignSearch.toLowerCase();
                      const match =
                        w.name.toLowerCase().includes(q) ||
                        w.primarySkill.toLowerCase().includes(q) ||
                        w.serviceArea.toLowerCase().includes(q) ||
                        w.cooperativeName.toLowerCase().includes(q);
                      if (!match) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <View style={styles.emptyCard}>
                        <Ionicons name="shield-outline" size={24} color={colors.textMuted} />
                        <Text style={styles.emptyText}>No verified workers match this filter.</Text>
                        <Button
                          title="View All Trades"
                          variant="outline"
                          size="sm"
                          onPress={() => setAssignSkillFilter('all')}
                          style={{ marginTop: 8 }}
                        />
                      </View>
                    );
                  }

                  // Sort so eligible available workers appear at the very top
                  const sorted = [...filtered].sort((a, b) => {
                    const aMatches = isTradeMatching(selectedJob.categoryId, selectedJob.serviceTitle, a);
                    const bMatches = isTradeMatching(selectedJob.categoryId, selectedJob.serviceTitle, b);
                    const aBusy = Boolean(getWorkerActiveJob(a.id, bookings, selectedJob.id));
                    const bBusy = Boolean(getWorkerActiveJob(b.id, bookings, selectedJob.id));

                    const aScore = (aMatches ? 2 : 0) + (!aBusy ? 1 : 0);
                    const bScore = (bMatches ? 2 : 0) + (!bBusy ? 1 : 0);
                    return bScore - aScore;
                  });

                  return sorted.map((w) => {
                    const isSelected = workerToConfirm?.id === w.id;
                    const matchesTrade = isTradeMatching(selectedJob.categoryId, selectedJob.serviceTitle, w);
                    const activeJob = getWorkerActiveJob(w.id, bookings, selectedJob.id);
                    const isBusy = Boolean(activeJob);
                    const isEligible = matchesTrade && !isBusy;

                    const handleWorkerCardPress = () => {
                      if (isBusy) {
                        showToast(
                          `Unavailable: ${w.name} is working on active job #${activeJob?.bookingCode}. Workers can only be assigned to one work at a time.`
                        );
                        return;
                      }
                      if (!matchesTrade) {
                        showToast(
                          `Skill Mismatch: This job requires a ${selectedJob.serviceTitle} specialist. ${w.name} is certified as "${w.primarySkill}".`
                        );
                        return;
                      }
                      setWorkerToConfirm(w);
                    };

                    return (
                      <TouchableOpacity
                        key={w.id}
                        activeOpacity={0.8}
                        style={[
                          styles.workerAssignCard,
                          isSelected && styles.workerAssignCardSelected,
                          isEligible && styles.workerAssignCardEligible,
                          isBusy && styles.workerAssignCardBusy,
                          !matchesTrade && !isBusy && styles.workerAssignCardMismatched,
                        ]}
                        onPress={handleWorkerCardPress}
                      >
                        <Avatar name={w.name} url={w.avatarUrl} size={44} showVerifiedBadge />
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <Text style={styles.assignWorkerName}>{w.name}</Text>
                            {isEligible && (
                              <View style={styles.eligibleBadge}>
                                <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                                <Text style={styles.eligibleBadgeText}>Available & Qualified</Text>
                              </View>
                            )}
                            {isBusy && (
                              <View style={styles.busyBadge}>
                                <Ionicons name="time" size={11} color={colors.warning} />
                                <Text style={styles.busyBadgeText}>Busy (#{activeJob?.bookingCode})</Text>
                              </View>
                            )}
                            {!matchesTrade && !isBusy && (
                              <View style={styles.mismatchBadge}>
                                <Ionicons name="alert-circle" size={11} color={colors.danger} />
                                <Text style={styles.mismatchBadgeText}>Trade Mismatch</Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.assignWorkerSkill}>
                            {w.primarySkill} • {w.experienceYears} yrs exp
                          </Text>

                          {/* Contextual Status / Guidance Note */}
                          {isBusy && (
                            <Text style={styles.busyNoticeText}>
                              ⚠️ Currently on #{activeJob?.bookingCode} ({activeJob?.serviceTitle}). Max 1 active job allowed.
                            </Text>
                          )}
                          {!matchesTrade && !isBusy && (
                            <Text style={styles.mismatchNoticeText}>
                              ⚠️ Registered trade "{w.primarySkill}" does not match required {getRequiredTradeLabel(selectedJob.categoryId, selectedJob.serviceTitle)} service.
                            </Text>
                          )}

                          <Text style={styles.assignWorkerMeta}>
                            {w.serviceArea} • ₹{w.baseRate}/hr • ⭐ {w.rating > 0 ? w.rating.toFixed(1) : '5.0'} ({w.completedJobsCount} jobs)
                          </Text>
                        </View>

                        <View style={{ marginLeft: 8 }}>
                          {isEligible ? (
                            <Button
                              title={isSelected ? 'Selected' : 'Assign'}
                              icon="checkmark"
                              variant={isSelected ? 'primary' : 'outline'}
                              size="sm"
                              onPress={() => setWorkerToConfirm(w)}
                            />
                          ) : isBusy ? (
                            <TouchableOpacity
                              style={styles.disabledAssignBtn}
                              onPress={() =>
                                showToast(
                                  `Unavailable: ${w.name} is currently working on active job #${activeJob?.bookingCode}. Workers can only be assigned to one work at a time.`
                                )
                              }
                            >
                              <Text style={styles.disabledAssignBtnText}>Busy</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.disabledAssignBtn}
                              onPress={() =>
                                showToast(
                                  `Skill Mismatch: ${w.name} (${w.primarySkill}) is not certified for ${selectedJob.serviceTitle}.`
                                )
                              }
                            >
                              <Text style={styles.disabledAssignBtnText}>Mismatch</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Booking Details & Operations Control Modal */}
      <Modal
        visible={Boolean(selectedBookingDetail)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBookingDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            {selectedBookingDetail && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Booking Operations Control</Text>
                    <Text style={styles.modalSub}>Code: {selectedBookingDetail.bookingCode}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedBookingDetail(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                    <Text style={styles.jobTitle}>{selectedBookingDetail.serviceTitle}</Text>
                    <Badge status={selectedBookingDetail.status} />
                  </View>

                  {/* Customer Box */}
                  <View style={styles.partyBox}>
                    <Text style={styles.partyHeading}>Customer Information</Text>
                    <Text style={styles.partyName}>{selectedBookingDetail.customerName}</Text>
                    <Text style={styles.partySub}>📍 {selectedBookingDetail.serviceLocation?.addressLine}, {selectedBookingDetail.serviceLocation?.city}</Text>
                    <Text style={styles.partySub}>🕒 Schedule: {selectedBookingDetail.scheduledDate} at {selectedBookingDetail.scheduledTimeSlot}</Text>
                    {selectedBookingDetail.instructions ? (
                      <Text style={[styles.partySub, { marginTop: 2, fontStyle: 'italic' }]}>Note: "{selectedBookingDetail.instructions}"</Text>
                    ) : null}
                    <TouchableOpacity
                      style={styles.partyCallBtn}
                      onPress={() => handleCall(selectedBookingDetail.customerPhone)}
                    >
                      <Ionicons name="call" size={14} color={colors.primary} />
                      <Text style={styles.partyCallBtnText}>Call Customer ({selectedBookingDetail.customerPhone})</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Worker Box */}
                  <View style={styles.partyBox}>
                    <Text style={styles.partyHeading}>Assigned Cooperative Worker</Text>
                    {selectedBookingDetail.workerName ? (
                      <>
                        <Text style={styles.partyName}>{selectedBookingDetail.workerName} ({selectedBookingDetail.workerSkill || 'Technician'})</Text>
                        <Text style={styles.partySub}>Cooperative: {selectedBookingDetail.cooperativeName}</Text>
                        <TouchableOpacity
                          style={styles.partyCallBtn}
                          onPress={() => handleCall(selectedBookingDetail.workerPhone)}
                        >
                          <Ionicons name="call" size={14} color={colors.success} />
                          <Text style={[styles.partyCallBtnText, { color: colors.success }]}>Call Worker ({selectedBookingDetail.workerPhone})</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <View style={{ gap: 6, marginVertical: 4 }}>
                        <Text style={[styles.partySub, { color: colors.accentDark, fontWeight: '600' }]}>⚠️ No worker assigned yet.</Text>
                        {isAdmin && (
                          <Button
                            title="Dispatch Worker Now"
                            icon="person-add"
                            variant="primary"
                            size="sm"
                            onPress={() => {
                              const b = selectedBookingDetail;
                              setSelectedBookingDetail(null);
                              handleOpenAssignModal(b);
                            }}
                          />
                        )}
                      </View>
                    )}
                  </View>

                  {/* Escrow Fare */}
                  <View style={styles.partyBox}>
                    <Text style={styles.partyHeading}>RBI Statutory Escrow Ledger</Text>
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>Direct Worker Base Wage:</Text>
                      <Text style={styles.fareVal}>₹{selectedBookingDetail.estimatedAmount - selectedBookingDetail.welfareCessAmount}</Text>
                    </View>
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>5% Statutory Welfare Cess:</Text>
                      <Text style={styles.fareVal}>₹{selectedBookingDetail.welfareCessAmount}</Text>
                    </View>
                    <View style={[styles.fareRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 4 }]}>
                      <Text style={[styles.fareLabel, { fontWeight: '700' }]}>Total Customer Bill:</Text>
                      <Text style={[styles.fareVal, { fontWeight: '700', color: colors.primary }]}>₹{selectedBookingDetail.estimatedAmount}</Text>
                    </View>
                  </View>

                  {/* Admin Actions */}
                  {isAdmin && (
                    <View style={{ gap: 8, marginTop: spacing.md }}>
                      <Button
                        title="Reassign / Allocate Worker"
                        icon="swap-horizontal"
                        variant="primary"
                        size="sm"
                        onPress={() => {
                          const b = selectedBookingDetail;
                          setSelectedBookingDetail(null);
                          handleOpenAssignModal(b);
                        }}
                      />

                      {selectedBookingDetail.status !== 'cancelled' && (
                        <Button
                          title="Override & Cancel Booking"
                          icon="close-circle-outline"
                          variant="outline"
                          size="sm"
                          onPress={async () => {
                            await cancelBooking(selectedBookingDetail.id, 'Cancelled by Federation Admin.');
                            setSelectedBookingDetail(null);
                            showToast(`Booking ${selectedBookingDetail.bookingCode} cancelled.`);
                          }}
                          style={{ borderColor: colors.danger }}
                          textStyle={{ color: colors.danger }}
                        />
                      )}
                    </View>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manageAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    gap: 6,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
  },
  subtabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm,
  },
  subtab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  subtabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  subtabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subtabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  jobTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  jobTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  emergencyTag: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginLeft: 6,
  },
  emergencyTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.danger,
  },
  jobCode: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  unassignedPill: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  unassignedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentDark,
  },
  jobDetailsBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginVertical: spacing.xs,
    gap: 3,
  },
  detailItem: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  fareLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  fareVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  assignedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignedWorkerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
  },
  workerLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  workerNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  workerPhoneText: {
    fontSize: 10,
    color: colors.primary,
  },
  reassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  reassignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  allBookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  modalSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  jobBriefCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  briefTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  briefCode: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  briefFare: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  briefDetail: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  filterSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  modalSearchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.text,
  },
  modalChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: spacing.xs,
    flexWrap: 'wrap',
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  tradeRequiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  tradeRequiredBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  rulesNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  rulesNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  rulesNoticeText: {
    fontSize: 10,
    color: '#14532D',
    lineHeight: 14,
  },
  confirmBox: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  confirmTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  confirmText: {
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
    lineHeight: 15,
  },
  workerAssignCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerAssignCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  workerAssignCardEligible: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  workerAssignCardBusy: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBEB',
    opacity: 0.9,
  },
  workerAssignCardMismatched: {
    borderColor: colors.border,
    backgroundColor: colors.background,
    opacity: 0.75,
  },
  assignWorkerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  assignWorkerSkill: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  assignWorkerMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eligibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    gap: 3,
  },
  eligibleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  busyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    gap: 3,
  },
  busyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  mismatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    gap: 3,
  },
  mismatchBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.danger,
  },
  busyNoticeText: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 2,
    fontWeight: '500',
  },
  mismatchNoticeText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 2,
    fontWeight: '500',
  },
  disabledAssignBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledAssignBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  partyBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partyHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  partySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  partyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  partyCallBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
});

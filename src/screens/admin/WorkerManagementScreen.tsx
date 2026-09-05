import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar, AddWorkerModal } from '../../components/common';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { workerService } from '../../services';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { WorkerProfile, Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerManagementScreenProps {
  onBack?: () => void;
}

const COMMON_SKILLS = [
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Appliance Repair',
  'House Cleaner',
  'Mason',
  'Gardener',
  'Welder',
  'Vehicle Driver',
];

export const WorkerManagementScreen: React.FC<WorkerManagementScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const { bookings, assignWorker } = useBookings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Worker Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Assign Work Modal State
  const [assigningWorker, setAssigningWorker] = useState<WorkerProfile | null>(null);
  const [assignJobFilter, setAssignJobFilter] = useState<'matching' | 'all'>('matching');

  // Remove Worker Confirmation Modal State
  const [workerToRemove, setWorkerToRemove] = useState<WorkerProfile | null>(null);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const data = await workerService.getWorkers();
      setWorkers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();
  }, []);

  // Filtered workers
  const filteredWorkers = workers.filter((w) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      w.name.toLowerCase().includes(q) ||
      w.primarySkill.toLowerCase().includes(q) ||
      w.cooperativeName.toLowerCase().includes(q) ||
      w.phone.includes(q);

    const matchesStatus = statusFilter === 'all' || w.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle Remove Worker
  const handleConfirmRemove = async () => {
    if (!workerToRemove) return;
    try {
      await workerService.removeWorker(workerToRemove.id);
      setWorkerToRemove(null);
      await loadWorkers();
      Alert.alert('Worker Removed', `${workerToRemove.name} has been removed from the roster.`);
    } catch (err) {
      Alert.alert('Error', 'Unable to remove worker.');
    }
  };

  // Handle Assign Work
  const handleAssignBooking = async (booking: Booking) => {
    if (!assigningWorker) return;
    try {
      await assignWorker(
        booking.id,
        {
          id: assigningWorker.id,
          name: assigningWorker.name,
          primarySkill: assigningWorker.primarySkill,
          phone: assigningWorker.phone,
          cooperativeName: assigningWorker.cooperativeName,
        },
        `Assigned to ${assigningWorker.name} by Administrative Officer`
      );
      const workerName = assigningWorker.name;
      setAssigningWorker(null);
      Alert.alert(
        'Job Assigned Successfully',
        `Booking ${booking.bookingCode} (${booking.serviceTitle}) has been assigned to ${workerName}. Status updated to Accepted.`
      );
    } catch (err) {
      Alert.alert('Error', 'Unable to assign job to worker.');
    }
  };

  // Trade matching algorithm to show jobs related to worker's trade
  const isBookingMatchingWorker = (b: Booking, worker: WorkerProfile | null): boolean => {
    if (!worker) return false;
    const workerSkill = (worker.primarySkill || '').toLowerCase();
    const allSkills = (worker.allSkills || []).map((s) => s.toLowerCase());
    const categoryId = (b.categoryId || '').toLowerCase();
    const bookingSkill = (b.workerSkill || '').toLowerCase();
    const serviceTitle = (b.serviceTitle || '').toLowerCase();

    // Direct check
    if (categoryId.includes(workerSkill) || workerSkill.includes(categoryId)) return true;
    if (bookingSkill.includes(workerSkill) || workerSkill.includes(bookingSkill)) return true;
    if (serviceTitle.includes(workerSkill)) return true;

    for (const s of allSkills) {
      if (s && (categoryId.includes(s) || bookingSkill.includes(s) || serviceTitle.includes(s))) {
        return true;
      }
    }

    const tradeMap: Record<string, string[]> = {
      electrician: ['electrical', 'electric', 'wiring', 'inverter', 'switch', 'fuse', 'appliance', 'fan', 'ac'],
      plumber: ['plumbing', 'pipe', 'leak', 'tap', 'drainage', 'sanitary', 'water', 'faucet'],
      carpenter: ['carpentry', 'wood', 'furniture', 'door', 'lock', 'table', 'chair', 'cabinet'],
      painter: ['painting', 'paint', 'wall', 'primer', 'distemper', 'waterproofing'],
      cleaner: ['cleaning', 'clean', 'deep clean', 'sanitize', 'housekeeping', 'floor', 'sofa', 'bathroom'],
      housekeeper: ['cleaning', 'clean', 'domestic', 'housekeeping'],
      gardener: ['gardening', 'garden', 'lawn', 'plant', 'tree', 'pruning'],
      welder: ['welder', 'welding', 'iron', 'gate', 'grill', 'metal'],
      driver: ['driving', 'driver', 'car', 'vehicle', 'chauffeur'],
      mason: ['mason', 'civil', 'brick', 'tile', 'plaster', 'cement'],
      appliance: ['appliance', 'washing machine', 'refrigerator', 'microwave', 'oven', 'tv', 'ac'],
    };

    for (const [key, keywords] of Object.entries(tradeMap)) {
      if (workerSkill.includes(key)) {
        if (keywords.some((kw) => categoryId.includes(kw) || bookingSkill.includes(kw) || serviceTitle.includes(kw))) {
          return true;
        }
      }
    }

    return false;
  };

  const allActiveBookingsToAssign = bookings.filter(
    (b) => b.status === 'requested' || b.status === 'accepted' || b.status === 'on_the_way'
  );

  const matchingBookingsToAssign = assigningWorker
    ? allActiveBookingsToAssign.filter((b) => isBookingMatchingWorker(b, assigningWorker))
    : [];

  const displayedBookingsToAssign =
    assignJobFilter === 'matching' ? matchingBookingsToAssign : allActiveBookingsToAssign;

  return (
    <View style={styles.container}>
      <Header
        title={t('worker_management_roster')}
        subtitle={`${filteredWorkers.length} active cooperative members`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {/* Top Controls & Add Worker Button */}
      <View style={styles.topSection}>
        <View style={styles.headerActionRow}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('search_placeholder')}
            />
          </View>
          <TouchableOpacity
            style={styles.addWorkerTopBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="person-add" size={16} color="#FFFFFF" />
            <Text style={styles.addWorkerTopBtnText}>{t('add_worker')}</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Pills */}
        <View style={styles.filterPillsRow}>
          {(['all', 'verified', 'pending'] as const).map((f) => {
            const isSelected = statusFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setStatusFilter(f)}
                style={[styles.pill, isSelected && styles.pillActive]}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {f === 'all' ? t('all_members') : f === 'verified' ? t('verified_guild') : t('pending_review')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Workers Roster List */}
      <FlatList
        data={filteredWorkers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.workerRowCard}>
            <View style={styles.workerMainRow}>
              <Avatar
                name={item.name}
                url={item.avatarUrl}
                size={48}
                showVerifiedBadge={item.verificationStatus === 'verified'}
              />
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Badge status={item.verificationStatus} />
                </View>

                <Text style={styles.workerSkill}>
                  {item.primarySkill} • {item.experienceYears} yrs exp • ₹{item.hourlyRate}/hr
                </Text>
                <Text style={styles.coopName}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.textSecondary} />{' '}
                  {item.cooperativeName}
                </Text>

                <View style={styles.metricRow}>
                  <Text style={styles.metricText}>
                    ⭐ {item.rating > 0 ? item.rating.toFixed(1) : 'New'} ({item.reviewCount})
                  </Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text style={styles.metricText}>{item.completedJobsCount} jobs completed</Text>
                  <Text style={styles.metricDot}>•</Text>
                  <Text
                    style={[
                      styles.metricText,
                      { color: item.isAvailable ? colors.success : colors.textMuted },
                    ]}
                  >
                    {item.isAvailable ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Admin Action Buttons */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.assignWorkBtn}
                onPress={() => {
                  setAssigningWorker(item);
                  setAssignJobFilter('matching');
                }}
              >
                <Ionicons name="briefcase-outline" size={14} color="#FFFFFF" />
                <Text style={styles.assignWorkBtnText}>{t('assign_work')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeWorkerBtn}
                onPress={() => setWorkerToRemove(item)}
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                <Text style={styles.removeWorkerBtnText}>{t('remove_worker')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Workers Match Filter"
            message="Adjust your search term or click 'Add Worker' to register a new member."
            actionTitle="Reset Search"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        }
      />

      {/* MODAL 1: ADD NEW WORKER WITH OTP VERIFICATION */}
      <AddWorkerModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => loadWorkers()}
      />

      {/* MODAL 2: ASSIGN WORK TO WORKER */}
      <Modal visible={Boolean(assigningWorker)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="briefcase" size={20} color={colors.primary} />
                <Text style={styles.modalHeaderTitle}>Assign Work to Worker</Text>
              </View>
              <TouchableOpacity onPress={() => setAssigningWorker(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {assigningWorker && (
              <View style={styles.workerTargetBanner}>
                <Avatar name={assigningWorker.name} size={40} showVerifiedBadge />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.workerTargetName}>{assigningWorker.name}</Text>
                  <Text style={styles.workerTargetSkill}>
                    {assigningWorker.primarySkill} • {assigningWorker.cooperativeName}
                  </Text>
                </View>
                <View style={styles.availableBadge}>
                  <Text style={styles.availableBadgeText}>AVAILABLE</Text>
                </View>
              </View>
            )}

            {/* Job Trade Filter Tabs */}
            {assigningWorker && (
              <View style={styles.assignJobFilterRow}>
                <TouchableOpacity
                  style={[
                    styles.assignJobFilterTab,
                    assignJobFilter === 'matching' && styles.assignJobFilterTabActive,
                  ]}
                  onPress={() => setAssignJobFilter('matching')}
                >
                  <Ionicons
                    name="sparkles"
                    size={12}
                    color={assignJobFilter === 'matching' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.assignJobFilterText,
                      assignJobFilter === 'matching' && styles.assignJobFilterTextActive,
                    ]}
                  >
                    {assigningWorker.primarySkill} Jobs ({matchingBookingsToAssign.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.assignJobFilterTab,
                    assignJobFilter === 'all' && styles.assignJobFilterTabActive,
                  ]}
                  onPress={() => setAssignJobFilter('all')}
                >
                  <Text
                    style={[
                      styles.assignJobFilterText,
                      assignJobFilter === 'all' && styles.assignJobFilterTextActive,
                    ]}
                  >
                    All Active ({allActiveBookingsToAssign.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <FlatList
              data={displayedBookingsToAssign}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item }) => {
                const isSkillMatch = isBookingMatchingWorker(item, assigningWorker);
                return (
                  <View style={styles.assignBookingCard}>
                    {isSkillMatch && (
                      <View style={styles.skillMatchTagRow}>
                        <Ionicons name="sparkles" size={11} color={colors.primary} />
                        <Text style={styles.skillMatchTagText}>
                          TRADE MATCH: {assigningWorker?.primarySkill.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View style={styles.assignBookingTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.assignBookingTitle}>{item.serviceTitle}</Text>
                        <Text style={styles.assignBookingCustomer}>
                          Customer: {item.customerName} ({item.customerPhone})
                        </Text>
                      </View>
                      <Badge status={item.status} />
                    </View>

                    <View style={styles.assignBookingMeta}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.assignBookingMetaText}>
                        {item.scheduledDate} • {item.scheduledTimeSlot}
                      </Text>
                    </View>

                    <View style={styles.assignBookingMeta}>
                      <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                      <Text style={styles.assignBookingMetaText} numberOfLines={1}>
                        {item.serviceLocation.addressLine}
                      </Text>
                    </View>

                    <View style={styles.assignActionRow}>
                      <Text style={styles.assignFareText}>Fare: ₹{item.estimatedAmount}</Text>
                      <TouchableOpacity
                        style={styles.assignConfirmBtn}
                        onPress={() => handleAssignBooking(item)}
                      >
                        <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                        <Text style={styles.assignConfirmBtnText}>Assign This Job</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="briefcase-outline" size={40} color={colors.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 8, color: colors.text }}>
                    {assignJobFilter === 'matching'
                      ? `No Pending ${assigningWorker?.primarySkill} Jobs`
                      : 'All Bookings Already Assigned'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: 12 }}>
                    {assignJobFilter === 'matching'
                      ? `There are currently no unassigned requests matching ${assigningWorker?.primarySkill}. You can view other active district jobs.`
                      : 'There are no active customer requests currently awaiting dispatcher allocation.'}
                  </Text>
                  {assignJobFilter === 'matching' && allActiveBookingsToAssign.length > 0 && (
                    <TouchableOpacity
                      style={styles.viewAllDistrictJobsBtn}
                      onPress={() => setAssignJobFilter('all')}
                    >
                      <Text style={styles.viewAllDistrictJobsBtnText}>
                        Browse All Active District Jobs ({allActiveBookingsToAssign.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />

            <View style={styles.modalFooter}>
              <Button
                title="Close"
                variant="outline"
                onPress={() => setAssigningWorker(null)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: CONFIRM REMOVE WORKER */}
      <Modal visible={Boolean(workerToRemove)} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 380 }]}>
            <View style={styles.deleteWarningIconBox}>
              <Ionicons name="warning-outline" size={32} color={colors.danger} />
            </View>

            <Text style={styles.deleteTitle}>Remove Worker from Roster?</Text>
            <Text style={styles.deleteSubtitle}>
              Are you sure you want to remove{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {workerToRemove?.name}
              </Text>{' '}
              ({workerToRemove?.primarySkill}) from the cooperative guild? They will no longer be
              dispatched or available for citizen booking.
            </Text>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setWorkerToRemove(null)}
                style={{ flex: 1, marginRight: 10 }}
              />
              <Button
                title="Confirm Remove"
                variant="primary"
                onPress={handleConfirmRemove}
                style={{ flex: 1, backgroundColor: colors.danger }}
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
  headerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addWorkerTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
  },
  addWorkerTopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterPillsRow: {
    flexDirection: 'row',
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
  workerRowCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  workerSkill: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metricText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metricDot: {
    marginHorizontal: 4,
    color: colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignWorkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  assignWorkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  removeWorkerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  removeWorkerBtnText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 12,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: 13,
    color: colors.text,
  },
  skillsPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillSelectPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillSelectPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  skillSelectPillText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  skillSelectPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  statusToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statusToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusToggleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Assign Work Specific
  workerTargetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  workerTargetName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  workerTargetSkill: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  availableBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  availableBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  assignJobFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  assignJobFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignJobFilterTabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  assignJobFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  assignJobFilterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  skillMatchTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    marginBottom: 6,
  },
  skillMatchTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  viewAllDistrictJobsBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  viewAllDistrictJobsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  assignBookingCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assignBookingTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  assignBookingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  assignBookingCustomer: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  assignBookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  assignBookingMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  assignActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignFareText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  assignConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  assignConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // Delete modal
  deleteWarningIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

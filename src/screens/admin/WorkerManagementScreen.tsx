import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { mockWorkers } from '../../data';
import { WorkerProfile, WorkerVerificationStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { workerService } from '../../services';
import { useBookings } from '../../context/BookingContext';
import { getWorkerActiveJob } from '../../utils/workerMatching';

interface WorkerManagementScreenProps {
  onBack?: () => void;
}

export const WorkerManagementScreen: React.FC<WorkerManagementScreenProps> = ({ onBack }) => {
  const { bookings } = useBookings();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);

  // Selected Worker Dossier Modal
  const [selectedWorker, setSelectedWorker] = useState<WorkerProfile | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadWorkers = async () => {
    const list = await workerService.getWorkers({
      status: statusFilter,
      searchQuery,
    });
    setWorkers(list);
  };

  useEffect(() => {
    loadWorkers();
    const unsub = workerService.subscribe(() => {
      loadWorkers();
    });
    return () => unsub();
  }, [searchQuery, statusFilter]);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {
      showFeedback(`Triggered dialer for ${phone}`);
    });
  };

  const handleSMS = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Regarding SahakarSeva cooperative membership for ${name}:`);
    Linking.openURL(`sms:${phone.replace(/[^0-9+]/g, '')}?body=${msg}`).catch(() => {
      showFeedback(`Triggered SMS messenger for ${phone}`);
    });
  };

  const handleToggleAvailability = async (worker: WorkerProfile) => {
    const newStatus = !worker.isAvailable;
    await workerService.updateAvailability(worker.id, newStatus);
    setWorkers((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, isAvailable: newStatus } : w))
    );
    setSelectedWorker((prev) => (prev ? { ...prev, isAvailable: newStatus } : null));
    showFeedback(`${worker.name} is now marked ${newStatus ? 'ONLINE / AVAILABLE' : 'OFFLINE / STANDBY'}`);
  };

  const handleUpdateStatus = async (worker: WorkerProfile, status: WorkerVerificationStatus) => {
    await workerService.updateVerificationStatus(worker.id, status);
    setWorkers((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, verificationStatus: status } : w))
    );
    setSelectedWorker((prev) => (prev ? { ...prev, verificationStatus: status } : null));
    showFeedback(`Updated ${worker.name}'s status to ${status.toUpperCase()}`);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Worker Management Roster"
        subtitle={`${workers.length} members found`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <View style={styles.topSection}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by worker name, skill, society..."
        />

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
                  {f === 'all' ? 'All Members' : f === 'verified' ? 'Verified Guild' : 'Pending Review'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {feedbackMsg && (
        <View style={styles.feedbackBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={styles.feedbackText}>{feedbackMsg}</Text>
        </View>
      )}

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedWorker(item)}
            style={styles.workerRowCard}
          >
            <Avatar name={item.name} url={item.avatarUrl} size={48} showVerifiedBadge={item.verificationStatus === 'verified'} />
            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.workerName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Badge status={item.verificationStatus} />
                  {(() => {
                    const activeJob = getWorkerActiveJob(item.id, bookings);
                    if (item.verificationStatus === 'verified') {
                      return activeJob ? (
                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#B45309' }}>Busy (#{activeJob.bookingCode})</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: '#15803D' }}>Free</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                </View>
              </View>

              <Text style={styles.workerSkill}>{item.primarySkill} • {item.experienceYears} yrs exp</Text>
              <Text style={styles.coopName}>{item.cooperativeName}</Text>

              <View style={styles.metricRow}>
                <Text style={styles.metricText}>⭐ {item.rating > 0 ? item.rating.toFixed(1) : 'New'}</Text>
                <Text style={styles.metricDot}>•</Text>
                <Text style={styles.metricText}>{item.completedJobsCount} jobs</Text>
                <Text style={styles.metricDot}>•</Text>
                <Text style={[styles.metricText, { color: item.isAvailable ? colors.success : colors.textMuted }]}>
                  {item.isAvailable ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title="No Workers Match Filter"
            message="Adjust your search term or select 'All Members'."
            actionTitle="Reset Search"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        }
      />

      {/* Worker Dossier Modal */}
      <Modal
        visible={Boolean(selectedWorker)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedWorker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedWorker && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Member Guild Dossier</Text>
                    <Text style={styles.modalSub}>{selectedWorker.welfareMemberId} • {selectedWorker.cooperativeName}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedWorker(null)}
                    style={styles.closeIconBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Top Profile Card */}
                  <View style={styles.dossierTopCard}>
                    <Avatar
                      name={selectedWorker.name}
                      url={selectedWorker.avatarUrl}
                      size={58}
                      showVerifiedBadge={selectedWorker.verificationStatus === 'verified'}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.dossierName}>{selectedWorker.name}</Text>
                        <Badge status={selectedWorker.verificationStatus} />
                        {(() => {
                          const activeJob = getWorkerActiveJob(selectedWorker.id, bookings);
                          if (selectedWorker.verificationStatus === 'verified') {
                            return activeJob ? (
                              <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#B45309' }}>Busy (#{activeJob.bookingCode})</Text>
                              </View>
                            ) : (
                              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                <Text style={{ fontSize: 9, fontWeight: '700', color: '#15803D' }}>Available</Text>
                              </View>
                            );
                          }
                          return null;
                        })()}
                      </View>
                      <Text style={styles.dossierSkill}>{selectedWorker.primarySkill} ({selectedWorker.experienceYears} Years Exp)</Text>
                      <Text style={styles.dossierRate}>Standard Base Wage: ₹{selectedWorker.baseRate}/hr</Text>
                    </View>
                  </View>

                  {/* Contact Buttons */}
                  <View style={styles.contactBtnRow}>
                    <TouchableOpacity
                      style={styles.contactPill}
                      onPress={() => handleCall(selectedWorker.phone)}
                    >
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={styles.contactPillText}>Call ({selectedWorker.phone})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.contactPill}
                      onPress={() => handleSMS(selectedWorker.phone, selectedWorker.name)}
                    >
                      <Ionicons name="chatbubble" size={16} color={colors.primary} />
                      <Text style={styles.contactPillText}>SMS Desk</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Skills Badges */}
                  <View style={styles.dossierSection}>
                    <Text style={styles.sectionLabel}>Certified Guild Trade Skills</Text>
                    <View style={styles.skillsTagRow}>
                      {selectedWorker.allSkills.map((s, idx) => (
                        <View key={idx} style={styles.skillTag}>
                          <Ionicons name="construct-outline" size={12} color={colors.primary} />
                          <Text style={styles.skillTagText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Service Area & Welfare */}
                  <View style={styles.dossierSection}>
                    <Text style={styles.sectionLabel}>Jurisdiction & Welfare Compliance</Text>
                    <Text style={styles.detailLine}>• Operating Zone: {selectedWorker.serviceArea} ({selectedWorker.serviceRadiusKm} km radius)</Text>
                    <Text style={styles.detailLine}>• Cooperative Welfare ID: {selectedWorker.welfareMemberId}</Text>
                    <Text style={styles.detailLine}>• Cooperative Escrow Bank: {selectedWorker.bankAccountLinked ? 'Linked & KYC Verified ✅' : 'Pending Linkage ⚠️'}</Text>
                    <Text style={styles.detailLine}>• Completed Guild Jobs: {selectedWorker.completedJobsCount} operations</Text>
                  </View>

                  {/* Availability Toggle */}
                  <View style={styles.actionBox}>
                    <Button
                      title={selectedWorker.isAvailable ? 'Set Worker Standby (Offline)' : 'Set Worker Active (Online)'}
                      icon={selectedWorker.isAvailable ? 'pause-circle-outline' : 'play-circle-outline'}
                      variant={selectedWorker.isAvailable ? 'outline' : 'primary'}
                      onPress={() => handleToggleAvailability(selectedWorker)}
                      fullWidth
                      style={{ marginBottom: spacing.sm }}
                    />

                    {selectedWorker.verificationStatus !== 'verified' && (
                      <Button
                        title="Grant Verified Membership Badge"
                        icon="shield-checkmark"
                        variant="primary"
                        onPress={() => handleUpdateStatus(selectedWorker, 'verified')}
                        fullWidth
                        style={{ marginBottom: spacing.sm }}
                      />
                    )}

                    {selectedWorker.verificationStatus === 'verified' && (
                      <Button
                        title="Suspend / Place Under Review"
                        icon="alert-circle-outline"
                        variant="outline"
                        onPress={() => handleUpdateStatus(selectedWorker, 'under_review')}
                        fullWidth
                        style={{ borderColor: colors.warning }}
                        textStyle={{ color: colors.warning }}
                      />
                    )}

                    <Button
                      title="Delete / Deactivate Worker"
                      icon="trash-outline"
                      variant="outline"
                      onPress={async () => {
                        const name = selectedWorker.name;
                        await workerService.removeWorker(selectedWorker.id);
                        setSelectedWorker(null);
                        showFeedback(`Worker ${name} removed from roster.`);
                      }}
                      fullWidth
                      style={{ borderColor: colors.danger, marginTop: spacing.sm }}
                      textStyle={{ color: colors.danger }}
                    />
                  </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 14,
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
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
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
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeIconBtn: {
    padding: 4,
  },
  modalBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  dossierTopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  dossierName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  dossierSkill: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  dossierRate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  dossierSection: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  skillsTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  detailLine: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  actionBox: {
    marginTop: spacing.xs,
  },
});


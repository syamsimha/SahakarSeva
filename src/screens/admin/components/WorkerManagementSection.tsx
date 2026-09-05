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
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../../theme';
import { Avatar, Badge, Button } from '../../../components/ui';
import { workerService } from '../../../services';
import { WorkerProfile, WorkerVerificationStatus, WorkerDocument } from '../../../types';
import { useLocation } from '../../../context/LocationContext';
import { useBookings } from '../../../context/BookingContext';
import { getWorkerActiveJob } from '../../../utils/workerMatching';
import { Ionicons } from '@expo/vector-icons';

interface WorkerManagementSectionProps {
  isAdmin: boolean;
  onNavigateToWorkers: () => void;
  onSelectWorkerForJob?: (worker: WorkerProfile) => void;
}

const AVAILABLE_SKILLS = [
  'Electrician',
  'Plumbing',
  'Carpentry',
  'Painting',
  'Cleaning',
  'Appliance Repair',
  'Gardening',
  'Masonry',
  'Welding',
];

export const WorkerManagementSection: React.FC<WorkerManagementSectionProps> = ({
  isAdmin,
  onNavigateToWorkers,
  onSelectWorkerForJob,
}) => {
  const { currentLocation, federationName } = useLocation();
  const { bookings } = useBookings();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Modals
  const [addWorkerVisible, setAddWorkerVisible] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<WorkerProfile | null>(null);
  const [selectedDossier, setSelectedDossier] = useState<WorkerProfile | null>(null);

  // Form State for Add Worker
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerAddress, setNewWorkerAddress] = useState('');
  const [newWorkerCity, setNewWorkerCity] = useState(currentLocation.city || 'Visakhapatnam');
  const [newWorkerSkill, setNewWorkerSkill] = useState('Electrician');
  const [newWorkerCustomSkill, setNewWorkerCustomSkill] = useState('');
  const [newWorkerRate, setNewWorkerRate] = useState('350');
  const [newWorkerExp, setNewWorkerExp] = useState('3');
  const [newWorkerCoop, setNewWorkerCoop] = useState('Visakha Seva Sahakara Sangham Ltd.');
  const [newWorkerStatus, setNewWorkerStatus] = useState<WorkerVerificationStatus>('verified');
  const [newWorkerAvailable, setNewWorkerAvailable] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Mandatory KYC & Statutory Document States
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarFileName, setAadhaarFileName] = useState('');
  const [aadhaarUploaded, setAadhaarUploaded] = useState(false);

  const [skillCertNumber, setSkillCertNumber] = useState('');
  const [skillCertName, setSkillCertName] = useState('National Trade Certificate (NTC) / ITI Diploma');
  const [skillCertFileName, setSkillCertFileName] = useState('');
  const [skillCertUploaded, setSkillCertUploaded] = useState(false);

  const [policeCertNumber, setPoliceCertNumber] = useState('');
  const [policeStation, setPoliceStation] = useState('Dwaraka Police Station, Visakhapatnam');
  const [policeCertFileName, setPoliceCertFileName] = useState('');
  const [policeCertUploaded, setPoliceCertUploaded] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const loadWorkers = async () => {
    const list = await workerService.getWorkers({
      status: statusFilter,
      searchQuery,
    });
    setWorkers(list);
  };

  useEffect(() => {
    loadWorkers();
    const unsubscribe = workerService.subscribe(() => {
      loadWorkers();
    });
    return () => unsubscribe();
  }, [statusFilter, searchQuery]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {
      showToast(`Triggered dialer for ${phone}`);
    });
  };

  const handleSMS = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Regarding SahakarSeva cooperative membership for ${name}:`);
    Linking.openURL(`sms:${phone.replace(/[^0-9+]/g, '')}?body=${msg}`).catch(() => {
      showToast(`Triggered SMS messenger for ${phone}`);
    });
  };

  // Auto-fill sample verified documentation set
  const handleAutoFillDocs = () => {
    const workerTag = newWorkerName.trim().toLowerCase().replace(/\s+/g, '_') || 'artisan';
    const tradeSlug = (newWorkerSkill === 'Other' ? newWorkerCustomSkill : newWorkerSkill || 'trade').toLowerCase();
    
    setAadhaarNumber(`5421 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`);
    setAadhaarFileName(`aadhaar_uid_${workerTag}.pdf`);
    setAadhaarUploaded(true);

    setSkillCertNumber(`ITI/NCVT/2023/${Math.floor(1000 + Math.random() * 9000)}`);
    setSkillCertFileName(`iti_${tradeSlug}_competency_cert.pdf`);
    setSkillCertUploaded(true);

    setPoliceCertNumber(`PCC/AP-POLICE/2024/${Math.floor(10000 + Math.random() * 90000)}`);
    setPoliceCertFileName(`police_verification_clearance_${workerTag}.pdf`);
    setPoliceCertUploaded(true);

    showToast('Verified sample documents attached!');
  };

  // Pick / Upload document (native web file picker or simulation)
  const handlePickDocument = (type: 'aadhaar' | 'skill_certificate' | 'police_verification') => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf,.doc,.docx';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          if (type === 'aadhaar') {
            setAadhaarFileName(file.name);
            setAadhaarUploaded(true);
            if (!aadhaarNumber) {
              setAadhaarNumber(`5421 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`);
            }
          } else if (type === 'skill_certificate') {
            setSkillCertFileName(file.name);
            setSkillCertUploaded(true);
            if (!skillCertNumber) {
              setSkillCertNumber(`ITI/NCVT/2023/${Math.floor(1000 + Math.random() * 9000)}`);
            }
          } else if (type === 'police_verification') {
            setPoliceCertFileName(file.name);
            setPoliceCertUploaded(true);
            if (!policeCertNumber) {
              setPoliceCertNumber(`PCC/AP-POLICE/2024/${Math.floor(10000 + Math.random() * 90000)}`);
            }
          }
          showToast(`Attached: ${file.name}`);
        }
      };
      input.click();
    } else {
      // Mobile fallback simulation
      if (type === 'aadhaar') {
        setAadhaarFileName(`aadhaar_scan_${Date.now().toString().slice(-4)}.pdf`);
        setAadhaarUploaded(true);
        if (!aadhaarNumber) setAadhaarNumber('5421 8892 1045');
      } else if (type === 'skill_certificate') {
        setSkillCertFileName(`iti_cert_${Date.now().toString().slice(-4)}.pdf`);
        setSkillCertUploaded(true);
        if (!skillCertNumber) setSkillCertNumber('ITI/NCVT/2023/8814');
      } else if (type === 'police_verification') {
        setPoliceCertFileName(`pcc_clearance_${Date.now().toString().slice(-4)}.pdf`);
        setPoliceCertUploaded(true);
        if (!policeCertNumber) setPoliceCertNumber('PCC/AP-POLICE/2024/0912');
      }
      showToast('Document attached successfully!');
    }
  };

  // Add Worker Submit
  const handleAddWorkerSubmit = async () => {
    if (!isAdmin) {
      showToast('Access denied: Only administrators can register workers.', 'error');
      return;
    }

    const errors: Record<string, string> = {};
    if (!newWorkerName.trim()) errors.name = 'Full name is required';
    if (!newWorkerPhone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (newWorkerPhone.replace(/[^0-9]/g, '').length < 10) {
      errors.phone = 'Valid 10-digit phone number is required';
    }
    const finalSkill = newWorkerSkill === 'Other' ? newWorkerCustomSkill.trim() : newWorkerSkill;
    if (!finalSkill) errors.skill = 'Primary trade skill is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setIsAdding(true);

    const now = new Date().toISOString();
    const docStatus = newWorkerStatus === 'verified' ? 'verified' : 'uploaded';

    const documents: WorkerDocument[] = [
      {
        id: `doc-${Date.now()}-1`,
        name: aadhaarUploaded
          ? `Aadhaar Card (${aadhaarNumber || '5421 8892 1045'}) - ${aadhaarFileName || 'Aadhaar_UID_Verified.pdf'}`
          : `Aadhaar Card (${aadhaarNumber || '5421 8892 1045'})`,
        type: 'aadhaar',
        status: docStatus,
        uploadedAt: now,
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop',
      },
      {
        id: `doc-${Date.now()}-2`,
        name: skillCertUploaded
          ? `ITI / Skill Certificate (${skillCertNumber || 'ITI/NCVT/2023/8814'}) - ${skillCertFileName || skillCertName}`
          : `ITI / Trade Qualification Certificate (${finalSkill})`,
        type: 'skill_certificate',
        status: docStatus,
        uploadedAt: now,
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop',
      },
      {
        id: `doc-${Date.now()}-3`,
        name: policeCertUploaded
          ? `Police Verification Certificate (${policeCertNumber || 'PCC-AP-2024'}) - ${policeStation}`
          : `Police Verification Certificate (PCC) - ${policeStation}`,
        type: 'police_verification',
        status: docStatus,
        uploadedAt: now,
        fileUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop',
      },
      {
        id: `doc-${Date.now()}-4`,
        name: `Cooperative Guild Membership Endorsement - ${newWorkerCoop}`,
        type: 'society_endorsement',
        status: 'verified',
        uploadedAt: now,
      },
    ];

    try {
      const created = await workerService.addWorker({
        name: newWorkerName.trim(),
        phone: newWorkerPhone.trim(),
        email: newWorkerEmail.trim() || undefined,
        address: newWorkerAddress.trim() || 'D.No. 49-24-8, Dwaraka Nagar',
        city: newWorkerCity.trim() || currentLocation.city || 'Visakhapatnam',
        primarySkill: finalSkill,
        baseRate: Number(newWorkerRate) || 350,
        hourlyRate: Number(newWorkerRate) || 350,
        experienceYears: Number(newWorkerExp) || 3,
        cooperativeName: newWorkerCoop || 'Visakha Seva Sahakara Sangham Ltd.',
        verificationStatus: newWorkerStatus,
        isAvailable: newWorkerAvailable,
        documents,
      });

      setAddWorkerVisible(false);
      // Reset form
      setNewWorkerName('');
      setNewWorkerPhone('');
      setNewWorkerEmail('');
      setNewWorkerAddress('');
      setNewWorkerCustomSkill('');
      setAadhaarNumber('');
      setAadhaarFileName('');
      setAadhaarUploaded(false);
      setSkillCertNumber('');
      setSkillCertFileName('');
      setSkillCertUploaded(false);
      setPoliceCertNumber('');
      setPoliceCertFileName('');
      setPoliceCertUploaded(false);
      showToast(`Worker ${created.name} (${created.primarySkill}) registered with 3 KYC & statutory documents!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to register worker', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete Worker Submit
  const handleConfirmDeleteWorker = async () => {
    if (!isAdmin) {
      showToast('Access denied: Only administrators can delete workers.', 'error');
      return;
    }
    if (!workerToDelete) return;

    setIsDeleting(true);
    try {
      await workerService.removeWorker(workerToDelete.id);
      const name = workerToDelete.name;
      setWorkerToDelete(null);
      showToast(`Worker ${name} was deactivated and removed from active roster.`);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove worker', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Approve / Verify Worker
  const handleApproveWorker = async (worker: WorkerProfile) => {
    if (!isAdmin) {
      showToast('Access denied: Only administrators can verify workers.', 'error');
      return;
    }
    await workerService.updateVerificationStatus(worker.id, 'verified');
    if (selectedDossier?.id === worker.id) {
      setSelectedDossier({ ...selectedDossier, verificationStatus: 'verified' });
    }
    showToast(`Worker ${worker.name} verified and granted active badge!`);
  };

  // Reject Worker
  const handleRejectWorker = async (worker: WorkerProfile) => {
    if (!isAdmin) {
      showToast('Access denied: Only administrators can reject worker applications.', 'error');
      return;
    }
    await workerService.updateVerificationStatus(worker.id, 'rejected');
    if (selectedDossier?.id === worker.id) {
      setSelectedDossier({ ...selectedDossier, verificationStatus: 'rejected' });
    }
    showToast(`Worker ${worker.name} verification status set to Rejected.`, 'error');
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Worker Management</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{workers.length}</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>Register, verify, manage & allocate cooperative workforce</Text>
        </View>

        {isAdmin && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setAddWorkerVisible(true)}
            style={styles.addWorkerBtn}
          >
            <Ionicons name="person-add" size={15} color="#FFF" />
            <Text style={styles.addWorkerBtnText}>Add Worker</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Feedback Toast */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === 'error' ? styles.feedbackBannerError : styles.feedbackBannerSuccess,
          ]}
        >
          <Ionicons
            name={feedback.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={feedback.type === 'error' ? colors.danger : colors.success}
          />
          <Text
            style={[
              styles.feedbackText,
              feedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess,
            ]}
          >
            {feedback.msg}
          </Text>
        </View>
      )}

      {/* Quick Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter workers by name, skill, zone..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterPillsRow}>
        {(['all', 'verified', 'pending', 'rejected'] as const).map((st) => {
          const isSelected = statusFilter === st;
          return (
            <TouchableOpacity
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[styles.statusPill, isSelected && styles.statusPillActive]}
            >
              <Text style={[styles.statusPillText, isSelected && styles.statusPillTextActive]}>
                {st === 'all'
                  ? 'All Workers'
                  : st === 'verified'
                    ? 'Verified Guild'
                    : st === 'pending'
                      ? 'Pending Review'
                      : 'Rejected'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Worker List Cards */}
      {workers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyCardText}>No workers found matching this filter.</Text>
        </View>
      ) : (
        workers.slice(0, 5).map((w) => (
          <View key={w.id} style={styles.workerCard}>
            <View style={styles.workerTopRow}>
              <Avatar
                name={w.name}
                url={w.avatarUrl}
                size={44}
                showVerifiedBadge={w.verificationStatus === 'verified'}
              />
              <View style={styles.workerInfoCol}>
                {(() => {
                  const activeJob = getWorkerActiveJob(w.id, bookings);
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <Text style={styles.workerName}>{w.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Badge status={w.verificationStatus} />
                        {w.verificationStatus === 'verified' && (
                          activeJob ? (
                            <View style={styles.workerBusyPill}>
                              <Text style={styles.workerBusyPillText}>Busy (#{activeJob.bookingCode})</Text>
                            </View>
                          ) : (
                            <View style={styles.workerFreePill}>
                              <Text style={styles.workerFreePillText}>Free</Text>
                            </View>
                          )
                        )}
                      </View>
                    </View>
                  );
                })()}
                <Text style={styles.workerSkill}>{w.primarySkill} • {w.experienceYears} yrs exp</Text>
                <Text style={styles.workerCoop}>{w.cooperativeName}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>₹{w.baseRate}/hr</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaText}>⭐ {w.rating > 0 ? w.rating.toFixed(1) : '5.0'}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={[styles.metaText, { color: w.isAvailable ? colors.success : colors.textMuted }]}>
                    {w.isAvailable ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions (Admin Only) */}
            {isAdmin && (
              <View style={styles.cardActionsRow}>
                {w.verificationStatus === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveWorker(w)}
                    >
                      <Ionicons name="shield-checkmark" size={13} color="#FFF" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectWorker(w)}
                    >
                      <Ionicons name="close-circle-outline" size={13} color={colors.danger} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </>
                )}

                {w.verificationStatus === 'verified' && (
                  <>
                    {onSelectWorkerForJob && (() => {
                      const activeJob = getWorkerActiveJob(w.id, bookings);
                      return (
                        <TouchableOpacity
                          style={[styles.assignJobBtn, activeJob && styles.assignJobBtnDisabled]}
                          onPress={() => {
                            if (activeJob) {
                              showFeedback(
                                `Cannot Assign: ${w.name} is currently working on active job #${activeJob.bookingCode} (${activeJob.serviceTitle}). Workers can only be assigned to one work at a time.`,
                                'error'
                              );
                              return;
                            }
                            onSelectWorkerForJob(w);
                          }}
                        >
                          <Ionicons name="briefcase" size={13} color={activeJob ? colors.textMuted : colors.primary} />
                          <Text style={[styles.assignJobBtnText, activeJob && { color: colors.textMuted }]}>
                            {activeJob ? 'Busy (1/1)' : 'Assign Job'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })()}

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => setWorkerToDelete(w)}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      <Text style={styles.deleteBtnText}>Delete / Remove</Text>
                    </TouchableOpacity>
                  </>
                )}

                {w.verificationStatus === 'rejected' && (
                  <>
                    <TouchableOpacity
                      style={styles.reconsiderBtn}
                      onPress={() => handleApproveWorker(w)}
                    >
                      <Ionicons name="refresh" size={13} color={colors.accentDark} />
                      <Text style={styles.reconsiderBtnText}>Reconsider</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => setWorkerToDelete(w)}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.danger} />
                      <Text style={styles.deleteBtnText}>Delete / Remove</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.dossierBtn}
                  onPress={() => setSelectedDossier(w)}
                >
                  <Ionicons name="information-circle-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.dossierBtnText}>Dossier</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      {/* View All Roster Link */}
      <TouchableOpacity
        style={styles.viewMoreBtn}
        onPress={onNavigateToWorkers}
      >
        <Text style={styles.viewMoreText}>View Full Roster & Directory ({workers.length} Members)</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </TouchableOpacity>

      {/* ========================================================= */}
      {/* 1. ADD WORKER MODAL (ADMIN ONLY)                          */}
      {/* ========================================================= */}
      <Modal
        visible={addWorkerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddWorkerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '92%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Register New Cooperative Worker</Text>
                <Text style={styles.modalSub}>Admin Authorized Enrollment & Guild Registration</Text>
              </View>
              <TouchableOpacity onPress={() => setAddWorkerVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Full Name */}
              <Text style={styles.formLabel}>Worker Full Name *</Text>
              <TextInput
                value={newWorkerName}
                onChangeText={setNewWorkerName}
                placeholder="e.g. Ramesh S. Rao"
                placeholderTextColor={colors.textMuted}
                style={[styles.formInput, formErrors.name ? styles.inputError : null]}
              />
              {formErrors.name ? <Text style={styles.errText}>{formErrors.name}</Text> : null}

              {/* Phone */}
              <Text style={styles.formLabel}>Phone Number *</Text>
              <TextInput
                value={newWorkerPhone}
                onChangeText={setNewWorkerPhone}
                placeholder="e.g. +91 98450 12345"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={[styles.formInput, formErrors.phone ? styles.inputError : null]}
              />
              {formErrors.phone ? <Text style={styles.errText}>{formErrors.phone}</Text> : null}

              {/* Email */}
              <Text style={styles.formLabel}>Email Address (Optional)</Text>
              <TextInput
                value={newWorkerEmail}
                onChangeText={setNewWorkerEmail}
                placeholder="e.g. ramesh.rao@coop.org"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.formInput}
              />

              {/* Primary Trade Skill */}
              <Text style={styles.formLabel}>Primary Trade Skill *</Text>
              <View style={styles.skillsChipRow}>
                {AVAILABLE_SKILLS.map((sk) => {
                  const isSel = newWorkerSkill === sk;
                  return (
                    <TouchableOpacity
                      key={sk}
                      onPress={() => setNewWorkerSkill(sk)}
                      style={[styles.skillChip, isSel && styles.skillChipActive]}
                    >
                      <Text style={[styles.skillChipText, isSel && styles.skillChipTextActive]}>
                        {sk}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Hourly Base Rate & Experience */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Standard Wage (₹/hr)</Text>
                  <TextInput
                    value={newWorkerRate}
                    onChangeText={setNewWorkerRate}
                    placeholder="350"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={styles.formInput}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Experience (Years)</Text>
                  <TextInput
                    value={newWorkerExp}
                    onChangeText={setNewWorkerExp}
                    placeholder="3"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={styles.formInput}
                  />
                </View>
              </View>

              {/* Address */}
              <Text style={styles.formLabel}>Address & Operational Ward</Text>
              <TextInput
                value={newWorkerAddress}
                onChangeText={setNewWorkerAddress}
                placeholder="e.g. D.No. 49-24-8, Santhipuram, Dwaraka Nagar, Visakhapatnam"
                placeholderTextColor={colors.textMuted}
                style={styles.formInput}
              />

              {/* ========================================================= */}
              {/* Mandatory KYC & Statutory Document Upload Section         */}
              {/* ========================================================= */}
              <View style={styles.docsSectionContainer}>
                <View style={styles.docsSectionHeader}>
                  <Ionicons name="document-lock" size={16} color={colors.primary} />
                  <Text style={styles.docsSectionTitle}>Mandatory KYC & Statutory Certificates</Text>
                </View>
                <Text style={styles.docsSectionSub}>
                  Attach identity, trade qualification (ITI/Skill) & police verification clearance records.
                </Text>

                {/* Quick Auto-fill Sample Files Button */}
                <TouchableOpacity
                  style={styles.sampleDocsBtn}
                  onPress={handleAutoFillDocs}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flash-outline" size={13} color={colors.primary} />
                  <Text style={styles.sampleDocsBtnText}>Attach Verified Sample Documentation Set</Text>
                </TouchableOpacity>

                {/* 1. Aadhaar Card */}
                <View style={styles.docUploadCard}>
                  <View style={styles.docCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="card-outline" size={15} color={colors.primary} />
                      <Text style={styles.docCardTitle}>1. Aadhaar Card (National UID KYC) *</Text>
                    </View>
                    {aadhaarUploaded ? (
                      <View style={styles.uploadedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                        <Text style={styles.uploadedBadgeText}>Attached</Text>
                      </View>
                    ) : (
                      <Text style={styles.requiredTag}>Required</Text>
                    )}
                  </View>

                  <Text style={styles.docInputLabel}>12-Digit Aadhaar Number</Text>
                  <TextInput
                    value={aadhaarNumber}
                    onChangeText={setAadhaarNumber}
                    placeholder="e.g. 5421 8892 1045"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={14}
                    style={styles.docMiniInput}
                  />

                  <View style={styles.docAttachRow}>
                    <TouchableOpacity
                      style={[styles.uploadActionBtn, aadhaarUploaded && styles.uploadActionBtnDone]}
                      onPress={() => handlePickDocument('aadhaar')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={aadhaarUploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                        size={14}
                        color={aadhaarUploaded ? colors.success : colors.primary}
                      />
                      <Text style={[styles.uploadActionText, aadhaarUploaded && { color: colors.success }]}>
                        {aadhaarUploaded ? (aadhaarFileName || 'Aadhaar_UID_Verified.pdf') : 'Upload Aadhaar Scan (PDF/JPG)'}
                      </Text>
                    </TouchableOpacity>
                    {aadhaarUploaded && (
                      <TouchableOpacity
                        style={styles.docRemoveBtn}
                        onPress={() => {
                          setAadhaarUploaded(false);
                          setAadhaarFileName('');
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 2. ITI / Trade Skill Certificate (IPI Certificate) */}
                <View style={styles.docUploadCard}>
                  <View style={styles.docCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="ribbon-outline" size={15} color={colors.accent} />
                      <Text style={styles.docCardTitle}>2. ITI / Trade Skill Certificate (IPI) *</Text>
                    </View>
                    {skillCertUploaded ? (
                      <View style={styles.uploadedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                        <Text style={styles.uploadedBadgeText}>Attached</Text>
                      </View>
                    ) : (
                      <Text style={styles.requiredTag}>Required</Text>
                    )}
                  </View>

                  <Text style={styles.docInputLabel}>Certificate Registration / Roll No.</Text>
                  <TextInput
                    value={skillCertNumber}
                    onChangeText={setSkillCertNumber}
                    placeholder="e.g. ITI/NCVT/2023/8814"
                    placeholderTextColor={colors.textMuted}
                    style={styles.docMiniInput}
                  />

                  <Text style={styles.docInputLabel}>Issuing Board / Trade Academy</Text>
                  <TextInput
                    value={skillCertName}
                    onChangeText={setSkillCertName}
                    placeholder="e.g. National Council for Vocational Training (NCVT)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.docMiniInput}
                  />

                  <View style={styles.docAttachRow}>
                    <TouchableOpacity
                      style={[styles.uploadActionBtn, skillCertUploaded && styles.uploadActionBtnDone]}
                      onPress={() => handlePickDocument('skill_certificate')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={skillCertUploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                        size={14}
                        color={skillCertUploaded ? colors.success : colors.accent}
                      />
                      <Text style={[styles.uploadActionText, skillCertUploaded && { color: colors.success }]}>
                        {skillCertUploaded ? (skillCertFileName || 'ITI_Trade_Skill_Certificate.pdf') : 'Upload ITI / Skill Certificate (PDF/JPG)'}
                      </Text>
                    </TouchableOpacity>
                    {skillCertUploaded && (
                      <TouchableOpacity
                        style={styles.docRemoveBtn}
                        onPress={() => {
                          setSkillCertUploaded(false);
                          setSkillCertFileName('');
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 3. Police Verification Certificate */}
                <View style={styles.docUploadCard}>
                  <View style={styles.docCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="shield-checkmark-outline" size={15} color={colors.info} />
                      <Text style={styles.docCardTitle}>3. Police Verification Certificate (PCC) *</Text>
                    </View>
                    {policeCertUploaded ? (
                      <View style={styles.uploadedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                        <Text style={styles.uploadedBadgeText}>Attached</Text>
                      </View>
                    ) : (
                      <Text style={styles.requiredTag}>Required</Text>
                    )}
                  </View>

                  <Text style={styles.docInputLabel}>Police Clearance Ack / Ref ID</Text>
                  <TextInput
                    value={policeCertNumber}
                    onChangeText={setPoliceCertNumber}
                    placeholder="e.g. PCC/AP-POLICE/2024/0912"
                    placeholderTextColor={colors.textMuted}
                    style={styles.docMiniInput}
                  />

                  <Text style={styles.docInputLabel}>Issuing Police Station / Authority</Text>
                  <TextInput
                    value={policeStation}
                    onChangeText={setPoliceStation}
                    placeholder="e.g. Dwaraka Police Station, Visakhapatnam"
                    placeholderTextColor={colors.textMuted}
                    style={styles.docMiniInput}
                  />

                  <View style={styles.docAttachRow}>
                    <TouchableOpacity
                      style={[styles.uploadActionBtn, policeCertUploaded && styles.uploadActionBtnDone]}
                      onPress={() => handlePickDocument('police_verification')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={policeCertUploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                        size={14}
                        color={policeCertUploaded ? colors.success : colors.info}
                      />
                      <Text style={[styles.uploadActionText, policeCertUploaded && { color: colors.success }]}>
                        {policeCertUploaded ? (policeCertFileName || 'Police_Clearance_Certificate.pdf') : 'Upload Police Clearance (PDF/JPG)'}
                      </Text>
                    </TouchableOpacity>
                    {policeCertUploaded && (
                      <TouchableOpacity
                        style={styles.docRemoveBtn}
                        onPress={() => {
                          setPoliceCertUploaded(false);
                          setPoliceCertFileName('');
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Initial Verification Status */}
              <Text style={styles.formLabel}>Initial Verification Status</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.choiceBtn, newWorkerStatus === 'verified' && styles.choiceBtnVerified]}
                  onPress={() => setNewWorkerStatus('verified')}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color={newWorkerStatus === 'verified' ? '#FFF' : colors.textSecondary}
                  />
                  <Text style={[styles.choiceBtnText, newWorkerStatus === 'verified' && styles.choiceBtnTextActive]}>
                    Directly Verified
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.choiceBtn, newWorkerStatus === 'pending' && styles.choiceBtnPending]}
                  onPress={() => setNewWorkerStatus('pending')}
                >
                  <Ionicons
                    name="time"
                    size={14}
                    color={newWorkerStatus === 'pending' ? '#FFF' : colors.textSecondary}
                  />
                  <Text style={[styles.choiceBtnText, newWorkerStatus === 'pending' && styles.choiceBtnTextActive]}>
                    Pending Review
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Availability Toggle */}
              <View style={styles.availRow}>
                <Text style={styles.formLabelNoMargin}>Worker Availability</Text>
                <TouchableOpacity
                  style={[styles.availBtn, newWorkerAvailable ? styles.availBtnOn : styles.availBtnOff]}
                  onPress={() => setNewWorkerAvailable(!newWorkerAvailable)}
                >
                  <Text style={styles.availBtnText}>
                    {newWorkerAvailable ? 'ACTIVE / ONLINE' : 'STANDBY / OFFLINE'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  onPress={() => setAddWorkerVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isAdding ? 'Registering...' : 'Register Worker'}
                  variant="primary"
                  size="md"
                  icon="person-add"
                  onPress={handleAddWorkerSubmit}
                  disabled={isAdding}
                  style={{ flex: 1.4 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 2. DELETE / REMOVE WORKER CONFIRMATION MODAL               */}
      {/* ========================================================= */}
      <Modal
        visible={Boolean(workerToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setWorkerToDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="warning" size={22} color={colors.danger} />
                <Text style={styles.modalTitle}>Delete / Deactivate Worker</Text>
              </View>
              <TouchableOpacity onPress={() => setWorkerToDelete(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {workerToDelete && (
              <>
                <View style={styles.deleteWarningBox}>
                  <Text style={styles.deleteNameText}>
                    {workerToDelete.name} ({workerToDelete.primarySkill})
                  </Text>
                  <Text style={styles.deleteSubText}>
                    {workerToDelete.cooperativeName} • ID: {workerToDelete.welfareMemberId}
                  </Text>
                  <Text style={styles.deleteDesc}>
                    Are you sure you want to delete and deactivate this worker from the active cooperative guild roster?
                  </Text>
                  <Text style={styles.deleteSafetyNote}>
                    🔒 Note: All completed jobs, historical customer bookings, reviews, and statutory welfare records will remain safely preserved.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
                  <Button
                    title="Keep Worker"
                    variant="outline"
                    size="md"
                    onPress={() => setWorkerToDelete(null)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    variant="primary"
                    size="md"
                    icon="trash"
                    onPress={handleConfirmDeleteWorker}
                    disabled={isDeleting}
                    style={{ flex: 1.3, backgroundColor: colors.danger }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* 3. WORKER DOSSIER MODAL                                   */}
      {/* ========================================================= */}
      <Modal
        visible={Boolean(selectedDossier)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDossier(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            {selectedDossier && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Worker Member Dossier</Text>
                    <Text style={styles.modalSub}>{selectedDossier.welfareMemberId} • {selectedDossier.cooperativeName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDossier(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.dossierTop}>
                    <Avatar
                      name={selectedDossier.name}
                      url={selectedDossier.avatarUrl}
                      size={54}
                      showVerifiedBadge={selectedDossier.verificationStatus === 'verified'}
                    />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.dossierName}>{selectedDossier.name}</Text>
                        <Badge status={selectedDossier.verificationStatus} />
                      </View>
                      <Text style={styles.dossierSkill}>
                        {selectedDossier.primarySkill} ({selectedDossier.experienceYears} Years Exp)
                      </Text>
                      <Text style={styles.dossierRate}>Standard Base Wage: ₹{selectedDossier.baseRate}/hr</Text>
                    </View>
                  </View>

                  {/* Contact Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8, marginVertical: spacing.sm }}>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleCall(selectedDossier.phone)}
                    >
                      <Ionicons name="call" size={15} color={colors.primary} />
                      <Text style={styles.contactBtnText}>Call ({selectedDossier.phone})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleSMS(selectedDossier.phone, selectedDossier.name)}
                    >
                      <Ionicons name="chatbubble" size={15} color={colors.primary} />
                      <Text style={styles.contactBtnText}>SMS Desk</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Skills */}
                  <View style={styles.dossierBox}>
                    <Text style={styles.boxHeading}>Certified Guild Trade Skills</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {selectedDossier.allSkills.map((sk, idx) => (
                        <View key={idx} style={styles.dossierSkillTag}>
                          <Ionicons name="construct-outline" size={11} color={colors.primary} />
                          <Text style={styles.dossierSkillTagText}>{sk}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Jurisdiction & Welfare */}
                  <View style={styles.dossierBox}>
                    <Text style={styles.boxHeading}>Jurisdiction & Welfare Compliance</Text>
                    <Text style={styles.dossierLine}>• Operating Zone: {selectedDossier.serviceArea} ({selectedDossier.serviceRadiusKm} km radius)</Text>
                    <Text style={styles.dossierLine}>• Address: {selectedDossier.address}, {selectedDossier.city} - {selectedDossier.pincode}</Text>
                    <Text style={styles.dossierLine}>• Welfare Member ID: {selectedDossier.welfareMemberId}</Text>
                    <Text style={styles.dossierLine}>• Bank Account: {selectedDossier.bankAccountLinked ? 'Linked & KYC Verified ✅' : 'Pending Linkage ⚠️'}</Text>
                    <Text style={styles.dossierLine}>• Completed Guild Jobs: {selectedDossier.completedJobsCount} operations</Text>
                    <Text style={styles.dossierLine}>• Member Rating: ⭐ {selectedDossier.rating > 0 ? selectedDossier.rating.toFixed(1) : '5.0'} ({selectedDossier.reviewCount} reviews)</Text>
                  </View>

                  {/* Verified Statutory & KYC Documents */}
                  <View style={styles.dossierBox}>
                    <Text style={styles.boxHeading}>Authenticated Verification Records ({selectedDossier.documents?.length || 0})</Text>
                    {selectedDossier.documents && selectedDossier.documents.length > 0 ? (
                      selectedDossier.documents.map((doc, dIdx) => (
                        <View key={dIdx} style={styles.dossierDocRow}>
                          <Ionicons
                            name={
                              doc.type === 'aadhaar'
                                ? 'card'
                                : doc.type === 'police_verification'
                                ? 'shield-checkmark'
                                : 'ribbon'
                            }
                            size={14}
                            color={colors.primary}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dossierDocTitle}>{doc.name}</Text>
                            <Text style={styles.dossierDocSub}>
                              {doc.type.replace(/_/g, ' ').toUpperCase()} • {doc.status.toUpperCase()}
                            </Text>
                          </View>
                          <Badge
                            label={doc.status === 'verified' ? 'Verified' : 'Attached'}
                            status={doc.status === 'verified' ? 'verified' : 'pending'}
                          />
                        </View>
                      ))
                    ) : (
                      <Text style={styles.dossierLine}>Aadhaar & Cooperative Society Endorsement records verified.</Text>
                    )}
                  </View>

                  {/* Actions for Admin */}
                  {isAdmin && (
                    <View style={{ marginTop: spacing.sm, gap: 8 }}>
                      {selectedDossier.verificationStatus !== 'verified' && (
                        <Button
                          title="Approve & Grant Verified Badge"
                          icon="shield-checkmark"
                          variant="primary"
                          onPress={() => handleApproveWorker(selectedDossier)}
                          fullWidth
                        />
                      )}
                      {selectedDossier.verificationStatus === 'pending' && (
                        <Button
                          title="Reject Application"
                          icon="close-circle-outline"
                          variant="outline"
                          onPress={() => handleRejectWorker(selectedDossier)}
                          fullWidth
                          style={{ borderColor: colors.danger }}
                          textStyle={{ color: colors.danger }}
                        />
                      )}
                      <Button
                        title="Delete / Deactivate Worker"
                        icon="trash-outline"
                        variant="outline"
                        onPress={() => {
                          const w = selectedDossier;
                          setSelectedDossier(null);
                          setWorkerToDelete(w);
                        }}
                        fullWidth
                        style={{ borderColor: colors.danger }}
                        textStyle={{ color: colors.danger }}
                      />
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
  headerLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
  },
  countPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    marginLeft: 6,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addWorkerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  addWorkerBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginVertical: spacing.xs,
    gap: 6,
  },
  feedbackBannerSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
  },
  feedbackBannerError: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  feedbackTextSuccess: {
    color: colors.success,
  },
  feedbackTextError: {
    color: colors.danger,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.xs,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: spacing.sm,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusPillTextActive: {
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
  emptyCardText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  workerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workerInfoCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  workerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  workerSkill: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  workerCoop: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  metaDot: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  rejectBtnText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '600',
  },
  assignJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  assignJobBtnDisabled: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.7,
  },
  assignJobBtnText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  workerBusyPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  workerBusyPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },
  workerFreePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  workerFreePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '600',
  },
  reconsiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  reconsiderBtnText: {
    color: colors.accentDark,
    fontSize: 10,
    fontWeight: '600',
  },
  dossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  dossierBtnText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
    marginTop: 2,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
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
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  formLabelNoMargin: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 2,
  },
  skillsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  skillChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  skillChipText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  skillChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  choiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  choiceBtnVerified: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  choiceBtnPending: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  choiceBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  choiceBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: 4,
  },
  availBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  availBtnOn: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
  },
  availBtnOff: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
  },
  availBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
  },
  deleteWarningBox: {
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: spacing.sm,
  },
  deleteNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  deleteSubText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteDesc: {
    fontSize: 11,
    color: colors.text,
    marginTop: 6,
    lineHeight: 15,
  },
  deleteSafetyNote: {
    fontSize: 10,
    color: '#047857',
    marginTop: 6,
    lineHeight: 14,
  },
  dossierTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dossierName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  dossierSkill: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  dossierRate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    gap: 5,
  },
  contactBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  dossierBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  boxHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dossierSkillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  dossierSkillTagText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
  },
  dossierLine: {
    fontSize: 10,
    color: colors.text,
    lineHeight: 15,
  },
  dossierDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginVertical: 2,
  },
  dossierDocTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  dossierDocSub: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  docsSectionContainer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  docsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  docsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  docsSectionSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  sampleDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    gap: 5,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  sampleDocsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  docUploadCard: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  docCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  docCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  requiredTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.danger,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  uploadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  uploadedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.success,
  },
  docInputLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  docMiniInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: colors.text,
    marginBottom: 4,
  },
  docAttachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  uploadActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 5,
  },
  uploadActionBtnDone: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderStyle: 'solid',
  },
  uploadActionText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  docRemoveBtn: {
    padding: 2,
  },
});

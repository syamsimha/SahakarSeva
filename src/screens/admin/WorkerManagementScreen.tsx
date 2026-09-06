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
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { WorkerProfile, WorkerVerificationStatus, WorkerDocument } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { workerService, documentService } from '../../services';
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
  const [selectedDocAudit, setSelectedDocAudit] = useState<{ doc: WorkerDocument; worker: WorkerProfile } | null>(null);
  const [docAuditValidated, setDocAuditValidated] = useState(false);
  const [docAuditSignedUrl, setDocAuditSignedUrl] = useState<string | null>(null);
  const [loadingDocAuditUrl, setLoadingDocAuditUrl] = useState(false);
  const [docAuditUrlError, setDocAuditUrlError] = useState<string | null>(null);
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

  const handleOpenDocAudit = async (doc: WorkerDocument, worker: WorkerProfile) => {
    setSelectedDocAudit({ doc, worker });
    setDocAuditValidated(doc.status === 'verified');
    setLoadingDocAuditUrl(true);
    setDocAuditUrlError(null);
    setDocAuditSignedUrl(null);

    try {
      const signedUrl = await documentService.getDocumentSignedUrl(doc.fileUrl);
      if (signedUrl) {
        setDocAuditSignedUrl(signedUrl);
      } else {
        setDocAuditUrlError('Could not retrieve secure viewing link for this document.');
      }
    } catch (err: any) {
      setDocAuditUrlError(err?.message || 'Failed to load document');
    } finally {
      setLoadingDocAuditUrl(false);
    }
  };

  const handleOpenExternal = (url: string | null) => {
    if (!url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {
        showFeedback('Unable to open document on this device');
      });
    }
  };

  const isPdf = (doc: WorkerDocument) => {
    const name = (doc.name || '').toLowerCase();
    const url = (doc.fileUrl || '').toLowerCase();
    return name.endsWith('.pdf') || url.includes('.pdf');
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

              {/* Authenticated Documents Badges (Tap to View) */}
              <View style={styles.docsChipRow}>
                {item.documents && item.documents.length > 0 ? (
                  item.documents.map((doc, dIdx) => (
                    <TouchableOpacity
                      key={doc.id || dIdx}
                      style={styles.docChip}
                      onPress={() => handleOpenDocAudit(doc, item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={doc.type === 'aadhaar' ? 'card-outline' : 'ribbon-outline'}
                        size={11}
                        color={colors.primary}
                      />
                      <Text style={styles.docChipText}>
                        {doc.type === 'aadhaar' ? 'ID Proof' : doc.type === 'skill_certificate' ? 'Skill Cert' : doc.name}
                      </Text>
                      <Ionicons name="eye-outline" size={11} color={colors.primary} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDocsChipText}>No verification documents uploaded</Text>
                )}
              </View>

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

                  {/* Authenticated Verification Documents */}
                  {(() => {
                    const docList = selectedWorker.documents || [];
                    return (
                      <View style={styles.dossierSection}>
                        <Text style={styles.sectionLabel}>
                          Authenticated Verification Proofs ({docList.length}) - Tap to Inspect
                        </Text>
                        {docList.length > 0 ? (
                          docList.map((doc, dIdx) => (
                            <TouchableOpacity
                              key={doc.id || dIdx}
                              style={styles.docItemRow}
                              onPress={() => handleOpenDocAudit(doc, selectedWorker)}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={doc.type === 'aadhaar' ? 'card' : 'ribbon'}
                                size={16}
                                color={colors.primary}
                              />
                              <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.docItemTitle}>{doc.name}</Text>
                                <Text style={styles.docItemSub}>
                                  {doc.type === 'aadhaar'
                                    ? 'GOVERNMENT ID PROOF'
                                    : doc.type === 'skill_certificate'
                                    ? 'TRADE SKILL CERTIFICATE'
                                    : doc.type.toUpperCase()}{' '}
                                  • {doc.status.toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Badge
                                  label={doc.status === 'verified' ? 'Verified' : 'Attached'}
                                  status={doc.status === 'verified' ? 'verified' : 'pending'}
                                />
                                <Ionicons name="eye-outline" size={16} color={colors.primary} />
                              </View>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={styles.noDocsDossierContainer}>
                            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                            <Text style={styles.noDocsDossierText}>No verification documents uploaded</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Actions */}
                  <View style={styles.actionBox}>

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

      {/* Document Inspection & Verification Proof Modal */}
      <Modal
        visible={Boolean(selectedDocAudit)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDocAudit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '92%' }]}>
            {selectedDocAudit && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Statutory Document Viewer</Text>
                    <Text style={styles.modalSub}>{selectedDocAudit.worker.name} • {selectedDocAudit.worker.primarySkill}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedDocAudit(null)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Document Badge Card */}
                  <View style={styles.docInspectCard}>
                    <View style={styles.docHeaderRow}>
                      <Ionicons
                        name={selectedDocAudit.doc.type === 'aadhaar' ? 'card-outline' : 'ribbon-outline'}
                        size={24}
                        color={colors.primary}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.docInspectionTitle}>{selectedDocAudit.doc.name}</Text>
                        <Text style={styles.docType}>
                          CATEGORY: {selectedDocAudit.doc.type === 'aadhaar' ? 'GOVERNMENT ID PROOF (AADHAAR)' : selectedDocAudit.doc.type === 'skill_certificate' ? 'TRADE SKILL QUALIFICATION' : selectedDocAudit.doc.type.toUpperCase()}
                        </Text>
                      </View>
                      <Badge
                        status={docAuditValidated ? 'verified' : 'pending'}
                        label={docAuditValidated ? 'VERIFIED' : 'ATTACHED'}
                      />
                    </View>

                    {/* Real Document Viewer */}
                    <View style={styles.viewerContainer}>
                      {loadingDocAuditUrl ? (
                        <View style={styles.viewerLoadingBox}>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text style={styles.viewerLoadingText}>Loading secure document view...</Text>
                        </View>
                      ) : docAuditUrlError ? (
                        <View style={styles.viewerErrorBox}>
                          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
                          <Text style={styles.viewerErrorText}>{docAuditUrlError}</Text>
                        </View>
                      ) : docAuditSignedUrl ? (
                        isPdf(selectedDocAudit.doc) ? (
                          <View style={styles.pdfCard}>
                            <Ionicons name="document-text" size={48} color={colors.primary} />
                            <Text style={styles.pdfCardName}>{selectedDocAudit.doc.name}</Text>
                            <Text style={styles.pdfCardType}>PDF Document</Text>
                            <TouchableOpacity
                              style={styles.openPdfBtn}
                              onPress={() => handleOpenExternal(docAuditSignedUrl)}
                            >
                              <Ionicons name="open-outline" size={16} color="#FFF" />
                              <Text style={styles.openPdfBtnText}>Open / View PDF</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.imageCard}>
                            <Image
                              source={{ uri: docAuditSignedUrl }}
                              style={styles.realDocImage}
                              resizeMode="contain"
                            />
                            <TouchableOpacity
                              style={styles.openExternalBtn}
                              onPress={() => handleOpenExternal(docAuditSignedUrl)}
                            >
                              <Ionicons name="open-outline" size={14} color={colors.primary} />
                              <Text style={styles.openExternalText}>Open Full Image</Text>
                            </TouchableOpacity>
                          </View>
                        )
                      ) : (
                        <View style={styles.viewerErrorBox}>
                          <Text style={styles.viewerErrorText}>No document preview available.</Text>
                        </View>
                      )}
                    </View>

                    {/* Real Document Metadata */}
                    <View style={styles.docMetaGrid}>
                      <Text style={styles.docMetaLine}>• Holder: {selectedDocAudit.worker.name}</Text>
                      <Text style={styles.docMetaLine}>• Affiliated Guild: {selectedDocAudit.worker.cooperativeName}</Text>
                      <Text style={styles.docMetaLine}>• Trade Discipline: {selectedDocAudit.worker.primarySkill}</Text>
                      <Text style={styles.docMetaLine}>• Verification Status: {docAuditValidated ? 'Verified ✅' : 'Pending Verification'}</Text>
                      <Text style={styles.docMetaLine}>• Date Uploaded: {new Date(selectedDocAudit.doc.uploadedAt).toLocaleDateString('en-IN')}</Text>
                    </View>
                  </View>

                  {/* Document Actions */}
                  <View style={{ marginTop: spacing.md, gap: 8 }}>
                    <Button
                      title={docAuditValidated ? 'Document Validated & Legible ✅' : 'Validate & Mark Legible'}
                      icon="checkmark-circle-outline"
                      variant="primary"
                      onPress={async () => {
                        await documentService.updateDocumentStatus(selectedDocAudit.doc.id, 'verified');
                        setDocAuditValidated(true);
                        setWorkers((prev) =>
                          prev.map((w) => {
                            if (w.id !== selectedDocAudit.worker.id) return w;
                            return {
                              ...w,
                              documents: w.documents.map((d) =>
                                d.id === selectedDocAudit.doc.id ? { ...d, status: 'verified' as const } : d
                              ),
                            };
                          })
                        );
                        if (selectedWorker && selectedWorker.id === selectedDocAudit.worker.id) {
                          setSelectedWorker((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  documents: prev.documents.map((d) =>
                                    d.id === selectedDocAudit.doc.id ? { ...d, status: 'verified' as const } : d
                                  ),
                                }
                              : null
                          );
                        }
                        showFeedback(`Marked ${selectedDocAudit.doc.name} as verified!`);
                        setTimeout(() => setSelectedDocAudit(null), 1000);
                      }}
                      fullWidth
                    />

                    <Button
                      title="Close Document Viewer"
                      variant="outline"
                      onPress={() => setSelectedDocAudit(null)}
                      fullWidth
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
  docsChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  docChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 3,
  },
  docChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  docItemSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  docInspectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docInspectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  docType: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  noDocsChipText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  noDocsDossierContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  noDocsDossierText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  viewerContainer: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerLoadingBox: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  viewerLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  viewerErrorBox: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  viewerErrorText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
  },
  pdfCard: {
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  pdfCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  pdfCardType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  openPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  openPdfBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  imageCard: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.sm,
  },
  realDocImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F8FAFC',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  openExternalText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  docMetaGrid: {
    gap: 3,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  docMetaLine: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});


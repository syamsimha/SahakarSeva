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
import { Header } from '../../components/common';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { workerService, documentService } from '../../services';
import { useLocation } from '../../context/LocationContext';
import { WorkerProfile, WorkerDocument, WorkerVerificationStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerVerificationAdminScreenProps {
  onBack?: () => void;
}

export const WorkerVerificationAdminScreen: React.FC<WorkerVerificationAdminScreenProps> = ({ onBack }) => {
  const { currentLocation, govtHeading } = useLocation();
  const [workersList, setWorkersList] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('pending');

  // Interactive Document Inspection Modal
  const [selectedDoc, setSelectedDoc] = useState<{
    doc: WorkerDocument;
    worker: WorkerProfile;
  } | null>(null);
  const [docValidated, setDocValidated] = useState<boolean>(false);
  const [docSignedUrl, setDocSignedUrl] = useState<string | null>(null);
  const [loadingDocUrl, setLoadingDocUrl] = useState<boolean>(false);
  const [docUrlError, setDocUrlError] = useState<string | null>(null);

  // Action feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      const all = await workerService.getWorkers();
      setWorkersList(all);
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectDoc = async (doc: WorkerDocument, worker: WorkerProfile) => {
    setSelectedDoc({ doc, worker });
    setDocValidated(doc.status === 'verified');
    setLoadingDocUrl(true);
    setDocUrlError(null);
    setDocSignedUrl(null);

    try {
      const signedUrl = await documentService.getDocumentSignedUrl(doc.fileUrl);
      if (signedUrl) {
        setDocSignedUrl(signedUrl);
      } else {
        setDocUrlError('Could not retrieve secure viewing link for this document.');
      }
    } catch (err: any) {
      setDocUrlError(err?.message || 'Failed to load document');
    } finally {
      setLoadingDocUrl(false);
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

  const handleApprove = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'verified');
    setWorkersList((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, verificationStatus: 'verified' as WorkerVerificationStatus } : w))
    );
    showFeedback(`Approved ${worker.name}. Cooperative ID and Verified Badge issued!`);
  };

  const handleReject = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'rejected');
    setWorkersList((prev) =>
      prev.map((w) => (w.id === worker.id ? { ...w, verificationStatus: 'rejected' as WorkerVerificationStatus } : w))
    );
    showFeedback(`${worker.name}'s membership application declined.`);
  };

  const handleRequestChanges = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'changes_required');
    setWorkersList((prev) =>
      prev.map((w) =>
        w.id === worker.id ? { ...w, verificationStatus: 'changes_required' as WorkerVerificationStatus } : w
      )
    );
    showFeedback(`Clarifications & certificate re-upload requested from ${worker.name}.`);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {
      showFeedback(`Dialer triggered for ${phone}`);
    });
  };

  const handleSMS = (phone: string, workerName: string) => {
    const msg = encodeURIComponent(`Hello ${workerName}, this is the SahakarSeva Verification Desk.`);
    Linking.openURL(`sms:${phone.replace(/[^0-9+]/g, '')}?body=${msg}`).catch(() => {
      showFeedback(`SMS messenger triggered for ${phone}`);
    });
  };

  const filterTabs = [
    { id: 'pending', label: 'Pending Review' },
    { id: 'all', label: 'All Applications' },
    { id: 'verified', label: 'Verified Guild' },
    { id: 'changes_required', label: 'Needs Changes' },
    { id: 'rejected', label: 'Declined' },
  ];

  const filteredList = workersList.filter((w) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') {
      return w.verificationStatus === 'pending' || w.verificationStatus === 'under_review';
    }
    return w.verificationStatus === filterStatus;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Worker Verification Queue"
        subtitle="Cooperative Guild Admissions Desk"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterPillsRow}
          renderItem={({ item }) => {
            const isSelected = filterStatus === item.id;
            return (
              <TouchableOpacity
                onPress={() => setFilterStatus(item.id)}
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

      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            {/* Worker Top Info */}
            <View style={styles.workerTop}>
              <Avatar name={item.name} size={54} showVerifiedBadge={item.verificationStatus === 'verified'} />
              <View style={styles.workerInfo}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Badge status={item.verificationStatus} />
                </View>
                <Text style={styles.tradeText}>{item.primarySkill} ({item.experienceYears} yrs exp)</Text>
                <Text style={styles.coopText}>{item.cooperativeName}</Text>
                <Text style={styles.memberIdText}>Member ID: {item.welfareMemberId}</Text>
              </View>
            </View>

            {/* Contact Quick Buttons */}
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => handleCall(item.phone)}
              >
                <Ionicons name="call-outline" size={14} color={colors.primary} />
                <Text style={styles.contactBtnText}>Call: {item.phone}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() => handleSMS(item.phone, item.name)}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                <Text style={styles.contactBtnText}>SMS Desk</Text>
              </TouchableOpacity>
            </View>

            {/* Submitted Documents Inspection Box */}
            <Text style={styles.docsHeader}>Uploaded Verification Proofs:</Text>
            {item.documents && item.documents.length > 0 ? (
              <View style={styles.docsGrid}>
                {item.documents.map((doc) => (
                  <TouchableOpacity
                    key={doc.id}
                    style={styles.docItem}
                    onPress={() => handleSelectDoc(doc, item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={doc.status === 'verified' ? 'checkmark-circle' : 'document-attach'}
                      size={16}
                      color={doc.status === 'verified' ? colors.success : colors.primary}
                    />
                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                    <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.noDocsContainer}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.noDocsText}>No verification documents uploaded</Text>
              </View>
            )}

            {/* About note */}
            <Text style={styles.aboutText}>"{item.about}"</Text>

            {/* Admin Action Buttons */}
            <View style={styles.actionsRow}>
              <Button
                title="Decline"
                onPress={() => handleReject(item)}
                variant="outline"
                size="sm"
                style={styles.declineBtn}
                textStyle={{ color: colors.danger }}
              />
              <Button
                title="Req. Changes"
                onPress={() => handleRequestChanges(item)}
                variant="outline"
                size="sm"
                style={styles.changeBtn}
              />
              <Button
                title={item.verificationStatus === 'verified' ? 'Member Verified' : 'Approve Member'}
                icon="shield-checkmark"
                onPress={() => handleApprove(item)}
                variant="primary"
                size="sm"
                style={styles.approveBtn}
                disabled={item.verificationStatus === 'verified'}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="No Applications Found"
            message={`No worker registrations match the '${filterStatus}' filter.`}
            actionTitle="View All"
            onAction={() => setFilterStatus('all')}
          />
        }
      />

      {/* Document Inspection & Verification Proof Modal */}
      <Modal
        visible={Boolean(selectedDoc)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDoc && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Statutory Document Audit</Text>
                    <Text style={styles.modalSub}>{selectedDoc.worker.name} • {selectedDoc.worker.primarySkill}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDoc(null)}
                    style={styles.closeIconBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Document Badge Card */}
                  <View style={styles.docInspectionCard}>
                    <View style={styles.docHeaderRow}>
                      <Ionicons
                        name={selectedDoc.doc.type === 'aadhaar' ? 'card-outline' : 'ribbon-outline'}
                        size={24}
                        color={colors.primary}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.docInspectionTitle}>{selectedDoc.doc.name}</Text>
                        <Text style={styles.docType}>
                          {selectedDoc.doc.type === 'aadhaar'
                            ? 'IDENTITY PROOF (AADHAAR)'
                            : selectedDoc.doc.type === 'skill_certificate'
                            ? 'TRADE SKILL CERTIFICATE'
                            : selectedDoc.doc.type.toUpperCase()}
                        </Text>
                      </View>
                      <Badge
                        variant={docValidated ? 'verified' : 'status'}
                        label={docValidated ? 'VERIFIED' : 'PENDING AUDIT'}
                      />
                    </View>

                    {/* Real Document Viewer */}
                    <View style={styles.viewerContainer}>
                      {loadingDocUrl ? (
                        <View style={styles.viewerLoadingBox}>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text style={styles.viewerLoadingText}>Loading secure document view...</Text>
                        </View>
                      ) : docUrlError ? (
                        <View style={styles.viewerErrorBox}>
                          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
                          <Text style={styles.viewerErrorText}>{docUrlError}</Text>
                        </View>
                      ) : docSignedUrl ? (
                        isPdf(selectedDoc.doc) ? (
                          <View style={styles.pdfCard}>
                            <Ionicons name="document-text" size={48} color={colors.primary} />
                            <Text style={styles.pdfCardName}>{selectedDoc.doc.name}</Text>
                            <Text style={styles.pdfCardType}>PDF Document</Text>
                            <TouchableOpacity
                              style={styles.openPdfBtn}
                              onPress={() => handleOpenExternal(docSignedUrl)}
                            >
                              <Ionicons name="open-outline" size={16} color="#FFF" />
                              <Text style={styles.openPdfBtnText}>Open / View PDF</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.imageCard}>
                            <Image
                              source={{ uri: docSignedUrl }}
                              style={styles.realDocImage}
                              resizeMode="contain"
                            />
                            <TouchableOpacity
                              style={styles.openExternalBtn}
                              onPress={() => handleOpenExternal(docSignedUrl)}
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

                    {/* Document Metadata Details */}
                    <View style={styles.docMetaGrid}>
                      <Text style={styles.docMetaLine}>• Worker: {selectedDoc.worker.name}</Text>
                      <Text style={styles.docMetaLine}>• Society: {selectedDoc.worker.cooperativeName}</Text>
                      <Text style={styles.docMetaLine}>• Trade: {selectedDoc.worker.primarySkill}</Text>
                      <Text style={styles.docMetaLine}>
                        • Uploaded: {new Date(selectedDoc.doc.uploadedAt).toLocaleDateString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Document Actions */}
                  <View style={styles.docActionsBox}>
                    <Button
                      title={docValidated ? 'Document Validated ✅' : 'Validate & Mark Legible'}
                      icon="checkmark-circle-outline"
                      variant="primary"
                      onPress={async () => {
                        await documentService.updateDocumentStatus(selectedDoc.doc.id, 'verified');
                        setDocValidated(true);
                        setWorkersList((prev) =>
                          prev.map((w) => {
                            if (w.id !== selectedDoc.worker.id) return w;
                            return {
                              ...w,
                              documents: w.documents.map((d) =>
                                d.id === selectedDoc.doc.id ? { ...d, status: 'verified' as const } : d
                              ),
                            };
                          })
                        );
                        showFeedback(`Marked ${selectedDoc.doc.name} as verified!`);
                        setTimeout(() => setSelectedDoc(null), 1200);
                      }}
                      fullWidth
                      style={{ marginBottom: spacing.sm }}
                    />

                    <Button
                      title="Request Clearer Scan"
                      icon="refresh-outline"
                      variant="outline"
                      onPress={async () => {
                        await documentService.updateDocumentStatus(selectedDoc.doc.id, 'rejected');
                        showFeedback(`Notified worker to submit a sharper copy of ${selectedDoc.doc.name}`);
                        setSelectedDoc(null);
                      }}
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
  filterContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPillsRow: {
    gap: 8,
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
  toastBanner: {
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
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  workerInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  tradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  coopText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  memberIdText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  docsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  docsGrid: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  docName: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  noDocsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  noDocsText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.textSecondary,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  declineBtn: {
    flex: 1,
    borderColor: colors.dangerLight,
  },
  changeBtn: {
    flex: 1,
  },
  approveBtn: {
    flex: 1.5,
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
    fontSize: 17,
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
  docInspectionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  docInspectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  docType: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  viewerContainer: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
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
  docActionsBox: {
    marginTop: spacing.sm,
  },
});


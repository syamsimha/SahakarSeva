import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { workerService } from '../../services';
import { WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerVerificationAdminScreenProps {
  onBack?: () => void;
}

export const WorkerVerificationAdminScreen: React.FC<WorkerVerificationAdminScreenProps> = ({ onBack }) => {
  const [pendingList, setPendingList] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await workerService.getPendingVerifications();
      setPendingList(data);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'verified');
    Alert.alert(
      'Worker Approved',
      `${worker.name} has been issued a verified cooperative membership badge. They can now receive customer bookings.`
    );
    loadPending();
  };

  const handleReject = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'rejected');
    Alert.alert('Worker Rejected', `${worker.name}'s application was declined.`);
    loadPending();
  };

  const handleRequestChanges = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'changes_required');
    Alert.alert(
      'Clarifications Requested',
      `Notification sent to ${worker.name} requesting re-upload of legible trade certificate.`
    );
    loadPending();
  };

  return (
    <View style={styles.container}>
      <Header
        title="Worker Verification Queue"
        subtitle="Cooperative Guild Admissions Desk"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <FlatList
        data={pendingList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            {/* Worker Top Info */}
            <View style={styles.workerTop}>
              <Avatar name={item.name} size={54} />
              <View style={styles.workerInfo}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.workerName}>{item.name}</Text>
                  <Badge status={item.verificationStatus} />
                </View>
                <Text style={styles.tradeText}>{item.primarySkill} ({item.experienceYears} yrs experience)</Text>
                <Text style={styles.coopText}>{item.cooperativeName}</Text>
                <Text style={styles.contactText}>Phone: {item.phone}</Text>
              </View>
            </View>

            {/* Submitted Documents Inspection Box */}
            <Text style={styles.docsHeader}>Uploaded Verification Proofs:</Text>
            <View style={styles.docsGrid}>
              {item.documents.map((doc) => (
                <View key={doc.id} style={styles.docItem}>
                  <Ionicons name="document-attach" size={16} color={colors.primary} />
                  <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                  <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                </View>
              ))}
            </View>

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
                title="Approve Member"
                icon="shield-checkmark"
                onPress={() => handleApprove(item)}
                variant="primary"
                size="sm"
                style={styles.approveBtn}
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="shield-checkmark-outline"
            title="No Pending Verifications"
            message="All cooperative worker onboarding applications have been processed!"
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
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  workerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerName: {
    ...typography.h4,
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
    marginTop: 2,
  },
  contactText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  docsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  docsGrid: {
    gap: 6,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginLeft: 6,
  },
  aboutText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 6,
  },
  declineBtn: {
    borderColor: colors.danger,
    flex: 1,
  },
  changeBtn: {
    flex: 1.3,
  },
  approveBtn: {
    flex: 1.5,
  },
});

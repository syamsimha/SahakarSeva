import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerVerificationScreenProps {
  onBack?: () => void;
}

export const WorkerVerificationScreen: React.FC<WorkerVerificationScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const worker = user as WorkerProfile;

  const status = worker?.verificationStatus || 'pending';

  const rawDocs = worker?.documents || [
    { id: '1', name: 'ID Proof (Aadhaar Card)', type: 'aadhaar', status: 'verified', uploadedAt: '2023-08-10' },
    { id: '2', name: 'Skill Certificate (ITI / Trade Qualification)', type: 'skill_certificate', status: 'verified', uploadedAt: '2023-08-11' },
  ];

  const documents = rawDocs.filter((d) => d.type === 'aadhaar' || d.type === 'skill_certificate');

  return (
    <View style={styles.container}>
      <Header
        title="Worker Verification"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Status Banner */}
        <View style={styles.statusHero}>
          <View style={styles.heroCircle}>
            <Ionicons
              name={status === 'verified' ? 'shield-checkmark' : 'hourglass-outline'}
              size={42}
              color={status === 'verified' ? colors.success : colors.warning}
            />
          </View>
          <Text style={styles.heroTitle}>
            {status === 'verified' ? 'Cooperative Verified Worker' : 'Verification Under Review'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {status === 'verified'
              ? 'Your ID proof and skill qualification certificate are fully authenticated by your cooperative society.'
              : 'Our cooperative registrar is currently examining your uploaded credentials.'}
          </Text>
          <Badge status={status} style={{ marginTop: spacing.sm }} />
        </View>

        {/* Verification Checklist */}
        <Text style={styles.sectionTitle}>Submitted Document Credentials (2)</Text>
        <View style={styles.docsList}>
          {documents.map((doc) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docLeft}>
                <Ionicons
                  name={
                    doc.type === 'aadhaar'
                      ? 'id-card-outline'
                      : 'ribbon-outline'
                  }
                  size={24}
                  color={colors.primary}
                />
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docDate}>Submitted on: {doc.uploadedAt}</Text>
                </View>
              </View>
              <Badge
                label={doc.status.toUpperCase()}
                status={doc.status === 'verified' ? 'verified' : 'pending'}
              />
            </View>
          ))}
        </View>

        {/* Cooperative Verification Rules */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sahakar Sathi Quality Standard</Text>
          <Text style={styles.infoText}>
            • 100% physically inspected trade skill credentials{'\n'}
            • Annual background verification renewal{'\n'}
            • Member protection under Cooperative By-laws Act{'\n'}
            • No arbitrary suspension without guild hearing
          </Text>
        </View>

        {/* Action Button */}
        <Button
          title="Upload Additional Document"
          icon="cloud-upload-outline"
          onPress={() => Alert.alert('Upload Document', 'Document upload placeholder ready for camera / file picker.')}
          variant="outline"
          size="md"
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  statusHero: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 290,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  docsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  docCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  docName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  docDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

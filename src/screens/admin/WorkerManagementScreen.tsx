import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { Avatar, Badge, Button, EmptyState } from '../../components/ui';
import { mockWorkers } from '../../data';
import { WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerManagementScreenProps {
  onBack?: () => void;
}

export const WorkerManagementScreen: React.FC<WorkerManagementScreenProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [workers, setWorkers] = useState<WorkerProfile[]>(mockWorkers);

  useEffect(() => {
    let list = [...mockWorkers];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.primarySkill.toLowerCase().includes(q) ||
          w.cooperativeName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((w) => w.verificationStatus === statusFilter);
    }
    setWorkers(list);
  }, [searchQuery, statusFilter]);

  const handleInspect = (worker: WorkerProfile) => {
    Alert.alert(
      `${worker.name} (${worker.primarySkill})`,
      `Cooperative: ${worker.cooperativeName}\nStatus: ${worker.verificationStatus.toUpperCase()}\nCompleted Jobs: ${worker.completedJobsCount}\nRating: ${worker.rating}★\nMember ID: ${worker.welfareMemberId}`
    );
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

      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleInspect(item)}
            style={styles.workerRowCard}
          >
            <Avatar name={item.name} url={item.avatarUrl} size={48} showVerifiedBadge={item.verificationStatus === 'verified'} />
            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.workerName}>{item.name}</Text>
                <Badge status={item.verificationStatus} />
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
});

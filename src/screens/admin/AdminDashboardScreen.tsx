import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { StatCard, BookingCard } from '../../components/cards';
import { Button, Badge } from '../../components/ui';
import { mockAdminStats, mockWorkers } from '../../data';
import { useBookings } from '../../context/BookingContext';
import { Ionicons } from '@expo/vector-icons';

interface AdminDashboardScreenProps {
  onNavigateToWorkers: () => void;
  onNavigateToVerification: () => void;
  onNavigateToBookings: () => void;
  onNavigateToForecast: () => void;
  onNavigateToNotifications: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onNavigateToWorkers,
  onNavigateToVerification,
  onNavigateToBookings,
  onNavigateToForecast,
  onNavigateToNotifications,
}) => {
  const { bookings } = useBookings();
  const stats = mockAdminStats;

  const pendingWorkers = mockWorkers.filter((w) => w.verificationStatus === 'pending');

  return (
    <View style={styles.container}>
      <Header
        title="Federation Admin"
        subtitle="Karnataka State Labour Cooperative Federation"
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={4}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* District Overview Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>District Labour Operations</Text>
              <Text style={styles.heroTitle}>Bengaluru Urban Cluster</Text>
            </View>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>14 Societies Live</Text>
            </View>
          </View>

          <View style={styles.heroMetrics}>
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroVal}>{stats.totalRegisteredWorkers}</Text>
              <Text style={styles.heroLabel}>Total Workers</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroVal}>{stats.verifiedWorkersCount}</Text>
              <Text style={styles.heroLabel}>Verified (95%)</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroMetricItem}>
              <Text style={styles.heroVal}>{stats.activeBookingsToday}</Text>
              <Text style={styles.heroLabel}>Active Today</Text>
            </View>
          </View>
        </View>

        {/* AI Demand Alert Action Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onNavigateToForecast}
          style={styles.forecastBanner}
        >
          <View style={styles.forecastIcon}>
            <Ionicons name="sparkles" size={24} color={colors.accent} />
          </View>
          <View style={styles.forecastTexts}>
            <View style={styles.aiTag}>
              <Text style={styles.aiTagText}>AI DEMAND PREDICTOR</Text>
            </View>
            <Text style={styles.forecastTitle}>Electrical Demand Surge (+42%)</Text>
            <Text style={styles.forecastSub}>
              Shortfall of 12 electricians predicted in Zone 4. Tap for allocation guidance.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </TouchableOpacity>

        {/* Secondary KPI Grid */}
        <View style={styles.kpiRow}>
          <StatCard
            title="Monthly Gross Disbursed"
            value={stats.grossWorkerWageDisbursedMonth}
            icon="wallet-outline"
            color={colors.primary}
            trend="+24%"
            subtitle="100% fair-wage payout"
          />
          <StatCard
            title="Registered Consumers"
            value={stats.totalCustomers}
            icon="people-outline"
            color={colors.info}
            trend="+15%"
            subtitle="Household accounts"
          />
        </View>

        {/* Urgent Action: Worker Verification Queue */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Verification Queue</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingWorkers.length} Pending</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onNavigateToVerification}>
              <Text style={styles.seeAllText}>Review All</Text>
            </TouchableOpacity>
          </View>

          {pendingWorkers.map((pw) => (
            <View key={pw.id} style={styles.pendingCard}>
              <View style={styles.pendingLeft}>
                <View style={styles.pendingAvatar}>
                  <Text style={styles.pendingInitials}>{pw.name.slice(0, 2)}</Text>
                </View>
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={styles.pendingName}>{pw.name}</Text>
                  <Text style={styles.pendingSkill}>{pw.primarySkill} • {pw.experienceYears} yrs exp</Text>
                  <Text style={styles.pendingCoop}>{pw.cooperativeName}</Text>
                </View>
              </View>
              <Button
                title="Review"
                icon="shield-checkmark"
                onPress={onNavigateToVerification}
                variant="primary"
                size="sm"
              />
            </View>
          ))}
        </View>

        {/* Live Cooperative Bookings Across City */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>District Active Bookings ({bookings.length})</Text>
            <TouchableOpacity onPress={onNavigateToBookings}>
              <Text style={styles.seeAllText}>Manage All</Text>
            </TouchableOpacity>
          </View>

          {bookings.slice(0, 2).map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              onPress={onNavigateToBookings}
            />
          ))}
        </View>

        {/* Quick Admin Menus */}
        <View style={styles.adminToolsRow}>
          <TouchableOpacity
            onPress={onNavigateToWorkers}
            style={styles.adminToolCard}
          >
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles.adminToolTitle}>Workers Roster</Text>
            <Text style={styles.adminToolSub}>Manage guild members</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNavigateToForecast}
            style={styles.adminToolCard}
          >
            <Ionicons name="bar-chart" size={24} color={colors.accent} />
            <Text style={styles.adminToolTitle}>AI Demand Forecast</Text>
            <Text style={styles.adminToolSub}>Ward allocation planner</Text>
          </TouchableOpacity>
        </View>
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
  heroCard: {
    backgroundColor: '#1E293B',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  heroMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  heroMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  heroLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#334155',
    alignSelf: 'center',
  },
  forecastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  forecastIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  forecastTexts: {
    flex: 1,
  },
  aiTag: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginBottom: 2,
  },
  aiTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textInverse,
  },
  forecastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentDark,
  },
  forecastSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 15,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  pendingBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    marginLeft: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  pendingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  pendingAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  pendingName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pendingSkill: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  pendingCoop: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  adminToolsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
  },
  adminToolCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminToolTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  adminToolSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

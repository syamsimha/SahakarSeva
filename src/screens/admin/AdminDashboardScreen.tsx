import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, AddWorkerModal } from '../../components/common';
import { StatCard } from '../../components/cards';
import { Button, Badge } from '../../components/ui';
import { mockAdminStats, mockWorkers, mockJobAnalytics, JobAnalytics } from '../../data';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { Booking, BookingStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface AdminDashboardScreenProps {
  onNavigateToWorkers: () => void;
  onNavigateToVerification: () => void;
  onNavigateToBookings: () => void;
  onNavigateToForecast: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToTracking?: (bookingId: string) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onNavigateToWorkers,
  onNavigateToVerification,
  onNavigateToBookings,
  onNavigateToForecast,
  onNavigateToNotifications,
  onNavigateToTracking,
}) => {
  const { t } = useLanguage();
  const { bookings } = useBookings();
  const stats = mockAdminStats;

  // Real-time live updating state for jobs and district aggregates
  const [liveJobs, setLiveJobs] = useState<JobAnalytics[]>(mockJobAnalytics);
  const [recentlyUpdatedJobId, setRecentlyUpdatedJobId] = useState<string | null>(null);
  const [recentLiveNotice, setRecentLiveNotice] = useState<string>(
    'Live District Ledger: Real-time synchronization active across all 14 cooperative societies.'
  );

  const [jobFilter, setJobFilter] = useState<'all' | 'highest_disbursed' | 'most_consumers'>('all');
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const pendingWorkers = mockWorkers.filter((w) => w.verificationStatus === 'pending');

  // Compute live aggregates dynamically from liveJobs
  const totalGrossDisbursed = useMemo(() => {
    return liveJobs.reduce((sum, j) => sum + j.grossDisbursedRaw, 0);
  }, [liveJobs]);

  const totalConsumers = useMemo(() => {
    return liveJobs.reduce((sum, j) => sum + j.registeredConsumers, 0);
  }, [liveJobs]);

  // Helper function to simulate a realistic live cooperative event
  const triggerLiveUpdate = (tradeId?: string) => {
    setLiveJobs((prevJobs) => {
      const targetIndex = tradeId
        ? prevJobs.findIndex((j) => j.id === tradeId)
        : Math.floor(Math.random() * prevJobs.length);
      const chosen = prevJobs[targetIndex >= 0 ? targetIndex : 0];

      // Decide event type: 65% wage payout from completed job, 35% new consumer registration
      const isJobPayout = Math.random() < 0.65;
      const payoutIncrement = Math.floor(Math.random() * 5 + 3) * 100; // ₹300 - ₹700
      const consumerIncrement = Math.floor(Math.random() * 2) + 1; // 1 or 2

      const updatedJobs = prevJobs.map((job, idx) => {
        if (idx !== (targetIndex >= 0 ? targetIndex : 0)) return job;

        const newGrossRaw = isJobPayout ? job.grossDisbursedRaw + payoutIncrement : job.grossDisbursedRaw;
        const newConsumers = isJobPayout ? job.registeredConsumers : job.registeredConsumers + consumerIncrement;
        const newCompleted = isJobPayout ? job.completedJobsCount + 1 : job.completedJobsCount;

        return {
          ...job,
          grossDisbursedRaw: newGrossRaw,
          monthlyGrossDisbursed: `₹${newGrossRaw.toLocaleString('en-IN')}`,
          registeredConsumers: newConsumers,
          completedJobsCount: newCompleted,
        };
      });

      // Recalculate share percentages dynamically
      const newTotalRaw = updatedJobs.reduce((acc, j) => acc + j.grossDisbursedRaw, 0);
      const finalJobs = updatedJobs.map((j) => ({
        ...j,
        sharePercentage: Number(((j.grossDisbursedRaw / newTotalRaw) * 100).toFixed(1)),
      }));

      // Update notification text
      if (isJobPayout) {
        setRecentLiveNotice(
          `⚡ Disbursed: +₹${payoutIncrement.toLocaleString('en-IN')} escrow wage transferred for ${chosen.jobTitle}.`
        );
      } else {
        setRecentLiveNotice(
          `👤 Consumer Added: +${consumerIncrement} new household consumer registered for ${chosen.jobTitle}.`
        );
      }

      setRecentlyUpdatedJobId(chosen.id);
      setTimeout(() => setRecentlyUpdatedJobId(null), 2500);

      return finalJobs;
    });
  };

  // Periodic automatic live updater: keeps updating every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      triggerLiveUpdate();
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const sortedJobs = useMemo(() => {
    const list = [...liveJobs];
    if (jobFilter === 'highest_disbursed') {
      return list.sort((a, b) => b.grossDisbursedRaw - a.grossDisbursedRaw);
    }
    if (jobFilter === 'most_consumers') {
      return list.sort((a, b) => b.registeredConsumers - a.registeredConsumers);
    }
    return list;
  }, [liveJobs, jobFilter]);

  const getWorkerStatusInfo = (status: BookingStatus) => {
    switch (status) {
      case 'on_the_way':
        return {
          title: 'EN ROUTE / ON THE WAY',
          badgeColor: colors.primary,
          badgeBg: colors.primaryLight,
          icon: 'bicycle' as const,
          actionText: 'Worker is dispatched and currently driving towards customer location.',
          radarStatus: 'Live GPS Telemetry Broadcasting • Speed 22 km/h',
        };
      case 'in_progress':
        return {
          title: 'ON-SITE • JOB IN PROGRESS',
          badgeColor: colors.accent,
          badgeBg: '#EDE9FE',
          icon: 'construct' as const,
          actionText: 'Worker is at customer location actively performing cooperative service.',
          radarStatus: 'Worker On-Site • Live time elapsed: 24 mins',
        };
      case 'accepted':
        return {
          title: 'ASSIGNED • PREPARING DEPARTURE',
          badgeColor: colors.success,
          badgeBg: colors.successLight,
          icon: 'checkmark-circle' as const,
          actionText: 'Worker has accepted allocation and is assembling tools for transit.',
          radarStatus: 'Standing by at Indiranagar Cooperative Guild Depot',
        };
      case 'requested':
        return {
          title: 'PENDING DISPATCH / UNASSIGNED',
          badgeColor: colors.warning,
          badgeBg: '#FEF3C7',
          icon: 'time' as const,
          actionText: 'Citizen requested service; cooperative dispatch pending worker confirmation.',
          radarStatus: 'Dispatch queue active • Matching nearest verified guild member',
        };
      case 'completed':
        return {
          title: 'COMPLETED & VERIFIED',
          badgeColor: colors.success,
          badgeBg: colors.successLight,
          icon: 'checkmark-done-circle' as const,
          actionText: 'Job completed successfully. Customer fair wage & cess verified.',
          radarStatus: 'Finished at scheduled slot',
        };
      default:
        return {
          title: 'SCHEDULED SERVICE',
          badgeColor: colors.textSecondary,
          badgeBg: colors.border,
          icon: 'calendar' as const,
          actionText: 'Scheduled under standard cooperative protocol.',
          radarStatus: 'Standing by',
        };
    }
  };

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.heroSub}>Master Administrator</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#FFFFFF' }}>SOLE CONTROLLER</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>Lakshmi Narayana • All District Jobs</Text>
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

        {/* Secondary KPI Grid (Continuously Live Updating) */}
        <View style={styles.kpiRow}>
          <StatCard
            title="Monthly Gross Disbursed"
            value={`₹${totalGrossDisbursed.toLocaleString('en-IN')}`}
            icon="wallet-outline"
            color={colors.primary}
            trend="Live Updating"
            subtitle="100% fair-wage escrow payout"
          />
          <StatCard
            title="Registered Consumers"
            value={totalConsumers.toLocaleString('en-IN')}
            icon="people-outline"
            color={colors.info}
            trend="Live Demand"
            subtitle="Verified household accounts"
          />
        </View>

        {/* Job-Wise Breakdown: Monthly Gross Disbursed & Registered Consumers for Every Job */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.sectionTitle}>Job Financials & Consumers</Text>
                <View style={styles.tradeCountBadge}>
                  <Text style={styles.tradeCountBadgeText}>{mockJobAnalytics.length} Trades</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Live dynamic ledger • Continuous disbursement & consumer updates
              </Text>
            </View>
          </View>

          {/* Live Updating Ticker Bar */}
          <View style={styles.liveTickerBar}>
            <View style={styles.liveTickerLeft}>
              <View style={styles.livePulsingDot} />
              <Text style={styles.liveTickerText} numberOfLines={2}>
                {recentLiveNotice}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => triggerLiveUpdate()}
              style={styles.liveTriggerBtn}
            >
              <Ionicons name="refresh" size={13} color={colors.primary} />
              <Text style={styles.liveTriggerBtnText}>Simulate Job</Text>
            </TouchableOpacity>
          </View>

          {/* Filter / Sort Pills */}
          <View style={styles.jobFilterRow}>
            <TouchableOpacity
              onPress={() => setJobFilter('all')}
              style={[styles.jobFilterPill, jobFilter === 'all' && styles.jobFilterPillActive]}
            >
              <Text style={[styles.jobFilterText, jobFilter === 'all' && styles.jobFilterTextActive]}>
                All Jobs ({mockJobAnalytics.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setJobFilter('highest_disbursed')}
              style={[styles.jobFilterPill, jobFilter === 'highest_disbursed' && styles.jobFilterPillActive]}
            >
              <Ionicons name="trending-up" size={12} color={jobFilter === 'highest_disbursed' ? '#FFFFFF' : colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.jobFilterText, jobFilter === 'highest_disbursed' && styles.jobFilterTextActive]}>
                Highest Disbursed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setJobFilter('most_consumers')}
              style={[styles.jobFilterPill, jobFilter === 'most_consumers' && styles.jobFilterPillActive]}
            >
              <Ionicons name="people" size={12} color={jobFilter === 'most_consumers' ? '#FFFFFF' : colors.info} style={{ marginRight: 4 }} />
              <Text style={[styles.jobFilterText, jobFilter === 'most_consumers' && styles.jobFilterTextActive]}>
                Most Consumers
              </Text>
            </TouchableOpacity>
          </View>

          {/* List of Job Cards */}
          <View style={styles.jobsListContainer}>
            {sortedJobs.map((job) => (
              <View
                key={job.id}
                style={[
                  styles.jobBreakdownCard,
                  recentlyUpdatedJobId === job.id && styles.jobBreakdownCardHighlight,
                ]}
              >
                {/* Header Row */}
                <View style={styles.jobCardHeader}>
                  <View style={styles.jobTitleLeft}>
                    <View style={[styles.jobIconBox, { backgroundColor: `${job.color}18` }]}>
                      <Ionicons name={job.iconName as any} size={20} color={job.color} />
                    </View>
                    <View>
                      <Text style={styles.jobCardTitle}>{job.jobTitle}</Text>
                      <Text style={styles.jobCardSub}>{job.completedJobsCount} jobs completed this month</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {recentlyUpdatedJobId === job.id && (
                      <View style={styles.justUpdatedPill}>
                        <View style={styles.justUpdatedDot} />
                        <Text style={styles.justUpdatedText}>LIVE UPDATE</Text>
                      </View>
                    )}
                    <View style={styles.jobGrowthTag}>
                      <Ionicons name="arrow-up" size={11} color="#059669" />
                      <Text style={styles.jobGrowthText}>{job.growthTrend}</Text>
                    </View>
                  </View>
                </View>

                {/* Metrics 2-Col Grid */}
                <View style={styles.jobMetricsGrid}>
                  <View style={[styles.jobMetricBox, { borderLeftColor: colors.primary, borderLeftWidth: 3 }]}>
                    <Text style={styles.jobMetricLabel}>MONTHLY GROSS DISBURSED</Text>
                    <Text style={[styles.jobMetricVal, { color: colors.primary }]}>{job.monthlyGrossDisbursed}</Text>
                    <Text style={styles.jobMetricFoot}>Avg {job.averageWorkerPayout}</Text>
                  </View>

                  <View style={[styles.jobMetricBox, { borderLeftColor: colors.info, borderLeftWidth: 3 }]}>
                    <Text style={styles.jobMetricLabel}>REGISTERED CONSUMERS</Text>
                    <Text style={[styles.jobMetricVal, { color: colors.info }]}>{job.registeredConsumers.toLocaleString('en-IN')}</Text>
                    <Text style={styles.jobMetricFoot}>Active consumer demand</Text>
                  </View>
                </View>

                {/* Wage Pool Share Bar */}
                <View style={styles.jobProgressBarSection}>
                  <View style={styles.jobProgressLabels}>
                    <Text style={styles.jobProgressTitle}>District Wage Pool Share</Text>
                    <Text style={styles.jobProgressPercent}>{job.sharePercentage}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(job.sharePercentage * 4.5, 100)}%`, backgroundColor: job.color },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
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

        {/* District Bookings Hub (Replaced inline bookings listing) */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.bookingsHubCard}
            onPress={onNavigateToBookings}
            activeOpacity={0.8}
          >
            <View style={styles.bookingsHubIconBox}>
              <Ionicons name="receipt-outline" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.bookingsHubTitle}>District Bookings Console</Text>
                <View style={styles.bookingsCountBadge}>
                  <Text style={styles.bookingsCountText}>{bookings.length} Active</Text>
                </View>
              </View>
              <Text style={styles.bookingsHubSub}>
                Manage active dispatch, worker assignments & live GPS tracking
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Admin Menus */}
        <View style={styles.adminToolsRow}>
          <TouchableOpacity
            onPress={() => setShowAddWorkerModal(true)}
            style={[styles.adminToolCard, { borderColor: colors.primary, borderWidth: 1.5 }]}
          >
            <Ionicons name="person-add" size={24} color={colors.primary} />
            <Text style={[styles.adminToolTitle, { color: colors.primary }]}>+ Add Worker</Text>
            <Text style={styles.adminToolSub}>OTP Phone Verification</Text>
          </TouchableOpacity>

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
            <Text style={styles.adminToolTitle}>AI Forecast</Text>
            <Text style={styles.adminToolSub}>Ward allocation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ADD WORKER WITH OTP VERIFICATION MODAL */}
      <AddWorkerModal
        visible={showAddWorkerModal}
        onClose={() => setShowAddWorkerModal(false)}
        onSuccess={() => {}}
      />

      {/* WORKER STATUS & LIVE GPS TRACKING MODAL */}
      <Modal visible={Boolean(trackingBooking)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.statusModalContainer}>
            {trackingBooking && (
              <>
                <View style={styles.statusModalHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.liveRadarTag}>
                      <View style={styles.liveRadarDot} />
                      <Text style={styles.liveRadarTagText}>LIVE WORKER STATUS & GPS TELEMETRY</Text>
                    </View>
                    <Text style={styles.statusModalCode}>
                      Booking #{trackingBooking.bookingCode} • {trackingBooking.serviceTitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => setTrackingBooking(null)}
                  >
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.statusModalScroll}>
                  {/* Worker Profile Strip */}
                  <View style={styles.workerProfileStrip}>
                    <View style={styles.workerModalAvatar}>
                      <Text style={styles.workerModalAvatarText}>
                        {trackingBooking.workerName.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.workerModalName}>{trackingBooking.workerName}</Text>
                        <View style={styles.verifiedMiniBadge}>
                          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                        </View>
                      </View>
                      <Text style={styles.workerModalSkill}>{trackingBooking.workerSkill}</Text>
                      <Text style={styles.workerModalCoop} numberOfLines={1}>{trackingBooking.cooperativeName}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.directCallCircle}
                      onPress={() => Linking.openURL(`tel:${trackingBooking.workerPhone}`)}
                    >
                      <Ionicons name="call" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>

                  {/* Worker Operational Status Banner */}
                  {(() => {
                    const info = getWorkerStatusInfo(trackingBooking.status);
                    return (
                      <View style={[styles.statusHighlightBox, { borderColor: info.badgeColor }]}>
                        <View style={styles.statusHighlightTop}>
                          <View style={[styles.statusIconPill, { backgroundColor: info.badgeBg }]}>
                            <Ionicons name={info.icon} size={18} color={info.badgeColor} />
                            <Text style={[styles.statusPillTitle, { color: info.badgeColor }]}>
                              {info.title}
                            </Text>
                          </View>
                          <View style={styles.livePulseMini}>
                            <View style={styles.liveDot} />
                            <Text style={styles.livePingText}>Live Signal</Text>
                          </View>
                        </View>
                        <Text style={styles.statusNarrativeText}>{info.actionText}</Text>
                        <View style={styles.radarStatusRow}>
                          <Ionicons name="radio-outline" size={14} color={colors.primary} />
                          <Text style={styles.radarStatusText}>{info.radarStatus}</Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* GPS Telemetry Grid */}
                  <View style={styles.telemetryGrid}>
                    <View style={styles.telemetryTile}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                      <Text style={styles.telemetryVal}>1.2 km</Text>
                      <Text style={styles.telemetryLabel}>Distance Away</Text>
                    </View>
                    <View style={styles.telemetryTile}>
                      <Ionicons name="time-outline" size={16} color={colors.accent} />
                      <Text style={styles.telemetryVal}>10 mins</Text>
                      <Text style={styles.telemetryLabel}>Estimated ETA</Text>
                    </View>
                    <View style={styles.telemetryTile}>
                      <Ionicons name="speedometer-outline" size={16} color={colors.warning} />
                      <Text style={styles.telemetryVal}>22 km/h</Text>
                      <Text style={styles.telemetryLabel}>Travel Speed</Text>
                    </View>
                    <View style={styles.telemetryTile}>
                      <Ionicons name="navigate-circle-outline" size={16} color={colors.success} />
                      <Text style={styles.telemetryVal}>12.9784° N</Text>
                      <Text style={styles.telemetryLabel}>77.6408° E</Text>
                    </View>
                  </View>

                  {/* Current Physical Location & Destination */}
                  <View style={styles.locationDetailCard}>
                    <View style={styles.locationDetailItem}>
                      <View style={[styles.locIconBubble, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="bicycle" size={16} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.locItemLabel}>Worker Current Location</Text>
                        <Text style={styles.locItemVal}>Near 12th Main Road, HAL 2nd Stage, Indiranagar</Text>
                      </View>
                    </View>

                    <View style={styles.locConnectorLine} />

                    <View style={styles.locationDetailItem}>
                      <View style={[styles.locIconBubble, { backgroundColor: '#EDE9FE' }]}>
                        <Ionicons name="home" size={16} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.locItemLabel}>Customer Destination</Text>
                        <Text style={styles.locItemVal}>{trackingBooking.serviceLocation.addressLine}</Text>
                        {trackingBooking.serviceLocation.landmark && (
                          <Text style={styles.locItemSub}>Landmark: {trackingBooking.serviceLocation.landmark}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Visual Route Radar Map */}
                  <View style={styles.visualRouteCard}>
                    <View style={styles.routeHeaderRow}>
                      <Text style={styles.routeTitle}>Live Transit Radar Map</Text>
                      <Text style={styles.routePill}>Satellite Linked</Text>
                    </View>
                    <View style={styles.radarSimulatedMap}>
                      {/* Worker radar marker */}
                      <View style={styles.radarWorkerMarker}>
                        <View style={styles.radarPulseCircleOuter} />
                        <View style={styles.radarPulseCircleInner} />
                        <View style={styles.radarWorkerCenterPin}>
                          <Ionicons name="bicycle" size={16} color="#FFFFFF" />
                        </View>
                      </View>

                      {/* Route Trajectory Line */}
                      <View style={styles.routeTrajectoryLine}>
                        <View style={styles.trajectoryDotted} />
                        <View style={styles.transitBadgeCenter}>
                          <Text style={styles.transitBadgeText}>In Transit (85%)</Text>
                        </View>
                      </View>

                      {/* Customer Destination Marker */}
                      <View style={styles.radarHomeMarker}>
                        <Ionicons name="location" size={26} color={colors.danger} />
                        <Text style={styles.radarHomeText}>Doorstep</Text>
                      </View>
                    </View>
                  </View>

                  {/* Customer Info & Scheduled Time */}
                  <View style={styles.customerSummaryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.summaryLabel}>Citizen / Customer</Text>
                      <Text style={styles.summaryVal}>{trackingBooking.customerName}</Text>
                      <Text style={styles.summarySub}>{trackingBooking.customerPhone}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.summaryLabel}>Fair Wage</Text>
                      <Text style={styles.summaryPrice}>₹{trackingBooking.estimatedAmount}</Text>
                      <Text style={styles.summarySub}>{trackingBooking.scheduledDate}</Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Footer Action Strip */}
                <View style={styles.statusModalFooter}>
                  <TouchableOpacity
                    style={styles.googleMapsBtn}
                    onPress={() => Linking.openURL('https://www.google.com/maps/search/?api=1&query=12.9784,77.6408')}
                  >
                    <Ionicons name="map-outline" size={16} color={colors.primary} />
                    <Text style={styles.googleMapsBtnText}>Google Maps</Text>
                  </TouchableOpacity>

                  {onNavigateToTracking && (
                    <TouchableOpacity
                      style={styles.fullTrackerBtn}
                      onPress={() => {
                        const id = trackingBooking.id;
                        setTrackingBooking(null);
                        onNavigateToTracking(id);
                      }}
                    >
                      <Ionicons name="expand-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.fullTrackerBtnText}>Full Satellite Tracker</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.modalDoneBtn}
                    onPress={() => setTrackingBooking(null)}
                  >
                    <Text style={styles.modalDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
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
  bookingsHubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.shadowSm,
  },
  bookingsHubIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bookingsHubTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  bookingsCountBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  bookingsCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  bookingsHubSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  statusModalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: spacing.sm,
  },
  statusModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  liveRadarTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  liveRadarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  liveRadarTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  statusModalCode: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  statusModalScroll: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  workerProfileStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  workerModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerModalAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  workerModalName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  verifiedMiniBadge: {
    marginLeft: 6,
    backgroundColor: colors.success,
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerModalSkill: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  workerModalCoop: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  directCallCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  statusHighlightBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  statusHighlightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statusIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusPillTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  livePulseMini: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.successLight,
  },
  livePingText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 4,
  },
  statusNarrativeText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  radarStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: borderRadius.md,
  },
  radarStatusText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  telemetryTile: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  telemetryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  telemetryLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  locationDetailCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  locationDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  locItemVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  locItemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locConnectorLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginLeft: 15,
    marginVertical: 4,
  },
  visualRouteCard: {
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  routePill: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  radarSimulatedMap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  radarWorkerMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  radarPulseCircleOuter: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.4)',
  },
  radarPulseCircleInner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
  },
  radarWorkerCenterPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTrajectoryLine: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trajectoryDotted: {
    width: '100%',
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  transitBadgeCenter: {
    position: 'absolute',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  transitBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#38BDF8',
  },
  radarHomeMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarHomeText: {
    fontSize: 9,
    color: '#F8FAFC',
    fontWeight: '700',
    marginTop: 2,
  },
  customerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  summarySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  googleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  googleMapsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  fullTrackerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  fullTrackerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  modalDoneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalDoneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  tradeCountBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tradeCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  jobFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: spacing.sm,
  },
  jobFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobFilterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  jobFilterText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  jobFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  jobsListContainer: {
    gap: 12,
    marginTop: spacing.xs,
  },
  jobBreakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  jobTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  jobIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  jobCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  jobCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  jobGrowthTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  jobGrowthText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 2,
  },
  jobMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  jobMetricBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  jobMetricVal: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  jobMetricFoot: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  jobProgressBarSection: {
    marginTop: 2,
  },
  jobProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobProgressTitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  jobProgressPercent: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  liveTickerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  liveTickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  livePulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 8,
  },
  liveTickerText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  liveTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  liveTriggerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 4,
  },
  jobBreakdownCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 1.8,
    backgroundColor: '#FAF5FF',
  },
  justUpdatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  justUpdatedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D97706',
    marginRight: 4,
  },
  justUpdatedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
});

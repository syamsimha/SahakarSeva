import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { StatCard, BookingCard } from '../../components/cards';
import { Button, Badge, Avatar } from '../../components/ui';
import { mockAdminStats } from '../../data';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { workerService } from '../../services';
import { WorkerProfile, WorkerDocument, Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { WorkerManagementSection, JobDispatchSection } from './components';

interface AdminDashboardScreenProps {
  onNavigateToWorkers: () => void;
  onNavigateToVerification: () => void;
  onNavigateToBookings: () => void;
  onNavigateToForecast: () => void;
  onNavigateToNotifications: () => void;
  onNavigateToProfile?: () => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onNavigateToWorkers,
  onNavigateToVerification,
  onNavigateToBookings,
  onNavigateToForecast,
  onNavigateToNotifications,
  onNavigateToProfile,
}) => {
  const { bookings, cancelBooking, updateStatus } = useBookings();
  const { t } = useLanguage();
  const { role } = useAuth();
  const { currentLocation, federationName, apexBankName, govtHeading, clusterName } = useLocation();
  const isAdmin = true; // Authorized Admin Access
  const stats = mockAdminStats;

  // Local state for pending workers to allow instant approvals & verification
  const [pendingWorkers, setPendingWorkers] = useState<WorkerProfile[]>([]);
  const [preselectedWorkerForAssign, setPreselectedWorkerForAssign] = useState<WorkerProfile | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      const all = await workerService.getWorkers({ status: 'pending' });
      setPendingWorkers(all);
    };
    fetchPending();
    const unsubscribe = workerService.subscribe(() => {
      fetchPending();
    });
    return () => unsubscribe();
  }, []);

  // Modals
  const [liveSocietiesVisible, setLiveSocietiesVisible] = useState(false);
  const [dailyReportVisible, setDailyReportVisible] = useState(false);
  const [wageBreakdownVisible, setWageBreakdownVisible] = useState(false);
  const [consumersModalVisible, setConsumersModalVisible] = useState(false);
  const [selectedPendingWorker, setSelectedPendingWorker] = useState<WorkerProfile | null>(null);
  const [selectedAuditDoc, setSelectedAuditDoc] = useState<{
    doc: WorkerDocument;
    worker: WorkerProfile;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [auditVisible, setAuditVisible] = useState(false);
  const [reassignSuccess, setReassignSuccess] = useState<string | null>(null);
  const [reportDownloadSuccess, setReportDownloadSuccess] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [escrowExportSuccess, setEscrowExportSuccess] = useState(false);
  const [auditExportSuccess, setAuditExportSuccess] = useState(false);

  const showVerificationToast = (msg: string) => {
    setVerificationFeedback(msg);
    setTimeout(() => setVerificationFeedback(null), 4000);
  };

  const handleApproveWorker = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'verified');
    setPendingWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    setSelectedPendingWorker(null);
    setSelectedAuditDoc(null);
    showVerificationToast(`✅ ${worker.name} approved & verified! Official Verified Badge & Cooperative ID issued.`);
  };

  const handleRejectWorker = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'rejected');
    setPendingWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    setSelectedPendingWorker(null);
    setSelectedAuditDoc(null);
    showVerificationToast(`❌ ${worker.name}'s membership application was declined.`);
  };

  const handleRequestChangesWorker = async (worker: WorkerProfile) => {
    await workerService.updateVerificationStatus(worker.id, 'changes_required');
    setSelectedPendingWorker(null);
    setSelectedAuditDoc(null);
    showVerificationToast(`⚠️ Clarifications & KYC certificate re-upload requested from ${worker.name}.`);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^0-9+]/g, '')}`).catch(() => {
      showVerificationToast(`Dialer triggered for ${phone}`);
    });
  };

  const handleSMS = (phone: string, name: string) => {
    const msg = encodeURIComponent(`Hello ${name}, regarding your SahakarSeva cooperative membership verification:`);
    Linking.openURL(`sms:${phone.replace(/[^0-9+]/g, '')}?body=${msg}`).catch(() => {
      showVerificationToast(`SMS messenger triggered for ${phone}`);
    });
  };

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) return;
    setBroadcastSuccess(true);
    setTimeout(() => {
      setBroadcastMessage('');
      setBroadcastSuccess(false);
      setBroadcastVisible(false);
    }, 1200);
  };

  const handleDownloadDailyPdf = () => {
    setIsExportingReport(true);
    const citySlug = (currentLocation.city || 'district').toLowerCase().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `district_labour_ops_${citySlug}_${dateStr}_brief.html`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>District Labour Operations Daily Summary - ${clusterName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0F172A; max-width: 820px; margin: 0 auto; background: #FFF; }
    .header { border-bottom: 2px solid #0D7A5F; padding-bottom: 12px; margin-bottom: 20px; }
    .gov-label { font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 1px; text-transform: uppercase; }
    h1 { color: #0D7A5F; margin: 4px 0 2px 0; font-size: 22px; font-weight: 800; }
    .sub { font-size: 12px; color: #475569; }
    .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 8px; margin-bottom: 16px; }
    .meta-item { font-size: 13px; }
    .meta-lbl { font-size: 11px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
    th { background: #E8F5F1; color: #085441; font-weight: 800; text-align: left; padding: 10px 12px; border: 1px solid #CBD5E1; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px 12px; border: 1px solid #E2E8F0; }
    tr:nth-child(even) { background: #F8FAFC; }
    .seal { text-align: center; padding: 16px; border-top: 1px dashed #CBD5E1; font-size: 12px; color: #0D7A5F; font-weight: bold; margin-top: 24px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #DCFCE7; color: #15803D; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov-label">${govtHeading}</div>
    <h1>DISTRICT LABOUR OPERATIONS DAILY SUMMARY</h1>
    <div class="sub">${federationName} • Operations Jurisdiction: ${clusterName}</div>
  </div>
  <div class="meta-box">
    <div class="meta-item"><div class="meta-lbl">Operating Cluster</div><strong>${clusterName}</strong></div>
    <div class="meta-item"><div class="meta-lbl">Date of Report</div><strong>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
    <div class="meta-item"><div class="meta-lbl">Settlement Banking Partner</div><strong>${apexBankName}</strong></div>
    <div class="meta-item"><div class="meta-lbl">Active Societies Live</div><strong>14 Primary Labour Guilds</strong></div>
  </div>
  <h3 style="font-size: 14px; margin-bottom: 8px; color: #0F172A; text-transform: uppercase;">Daily Operations & Disbursal Matrix</h3>
  <table>
    <thead>
      <tr>
        <th>Operational Indicator</th>
        <th>Reported Metric</th>
        <th>Statutory Standard</th>
        <th>Compliance Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Completed Service Bookings</strong></td>
        <td><strong>${stats.activeBookingsToday} Jobs</strong></td>
        <td>On-demand dispatch &lt;30 mins</td>
        <td><span class="badge">100% Fulfilled</span></td>
      </tr>
      <tr>
        <td><strong>Direct Worker Wages Disbursed</strong></td>
        <td><strong>₹38,400</strong></td>
        <td>Government Minimum Wage Guaranteed</td>
        <td><span class="badge">Disbursed (Escrow)</span></td>
      </tr>
      <tr>
        <td><strong>5% State Labour Welfare Cess</strong></td>
        <td><strong>₹1,920</strong></td>
        <td>State Labour Welfare Act</td>
        <td><span class="badge">Pool Credited</span></td>
      </tr>
      <tr>
        <td><strong>Commercial Aggregator Margin</strong></td>
        <td><strong>₹0.00 (Zero Cut)</strong></td>
        <td>Direct-to-worker model</td>
        <td><span class="badge">100% Retained</span></td>
      </tr>
      <tr>
        <td><strong>PMJJBY & PMSBY Insurance Shield</strong></td>
        <td><strong>100% Active Technicians</strong></td>
        <td>Accidental & Disability Coverage</td>
        <td><span class="badge">Active & Insured</span></td>
      </tr>
    </tbody>
  </table>
  <div class="seal">
    🛡️ Digitally Signed & Sealed • Directorate of Labour Cooperatives • Ref: SS-OPS-${(currentLocation.city || 'DIST').toUpperCase()}-${new Date().getFullYear()}
  </div>
</body>
</html>`;
        const blob = new Blob([htmlDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('PDF download error', err);
      }
    }

    setTimeout(() => {
      setIsExportingReport(false);
      setReportDownloadSuccess(true);
      showVerificationToast(`Downloaded: ${fileName}`);
      setTimeout(() => setReportDownloadSuccess(false), 4000);
    }, 600);
  };

  const handleDownloadDailyCsv = () => {
    setIsExportingReport(true);
    const citySlug = (currentLocation.city || 'district').toLowerCase().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `district_labour_ops_${citySlug}_${dateStr}_dataset.csv`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const csvHeader = 'Indicator,Metric_Value,Unit,Jurisdiction,State_Federation,Report_Date,Status\n';
        const rows = [
          `"Total Registered Workers",${stats.totalRegisteredWorkers},"Technicians","${clusterName}","${federationName}","${new Date().toISOString()}","Active Registered"`,
          `"Verified Workers",${stats.verifiedWorkersCount},"Technicians","${clusterName}","${federationName}","${new Date().toISOString()}","NCVT Certified"`,
          `"Daily Jobs Completed",${stats.activeBookingsToday},"Jobs","${clusterName}","${federationName}","${new Date().toISOString()}","Fulfilled"`,
          `"Daily Wages Disbursed",38400,"INR","${clusterName}","${federationName}","${new Date().toISOString()}","Credited via RBI Escrow"`,
          `"5% Welfare Fund Cess",1920,"INR","${clusterName}","${federationName}","${new Date().toISOString()}","Deposited to Fund"`,
          `"Aggregator Cut",0,"INR","${clusterName}","${federationName}","${new Date().toISOString()}","Zero Middleman Margin"`,
          `"Insurance Coverage",100,"Percentage","${clusterName}","${federationName}","${new Date().toISOString()}","PMJJBY Covered"`,
          `"Affiliated Live Societies",14,"Cooperatives","${clusterName}","${federationName}","${new Date().toISOString()}","Operational"`,
        ];
        const csvContent = csvHeader + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('CSV download error', err);
      }
    }

    setTimeout(() => {
      setIsExportingReport(false);
      setReportDownloadSuccess(true);
      showVerificationToast(`Exported CSV: ${fileName}`);
      setTimeout(() => setReportDownloadSuccess(false), 4000);
    }, 600);
  };

  const handlePrintDailyPdf = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).print) {
      setTimeout(() => {
        try {
          (window as any).print();
        } catch (e) {
          console.warn('Print error', e);
        }
      }, 300);
    }
    showVerificationToast(`Sent daily operations brief to print spooler!`);
  };

  const handleDownloadDistrictCsvPdf = () => {
    handleDownloadDailyPdf();
    setTimeout(() => {
      handleDownloadDailyCsv();
    }, 300);
  };

  const handleDownloadEscrowPdf = () => {
    setEscrowExportSuccess(true);
    const citySlug = (currentLocation.city || 'district').toLowerCase().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `rbi_escrow_statement_${citySlug}_${dateStr}.html`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>RBI Escrow Disbursal Statement - ${clusterName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #0F172A; max-width: 820px; margin: 0 auto; background: #FFF; }
    .header { border-bottom: 2px solid #0D7A5F; padding-bottom: 12px; margin-bottom: 20px; }
    .gov-label { font-size: 11px; font-weight: 800; color: #64748B; letter-spacing: 1px; text-transform: uppercase; }
    h1 { color: #0D7A5F; margin: 4px 0 2px 0; font-size: 22px; font-weight: 800; }
    .sub { font-size: 12px; color: #475569; }
    .meta-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 14px; border-radius: 8px; margin-bottom: 16px; }
    .meta-item { font-size: 13px; }
    .meta-lbl { font-size: 11px; color: #64748B; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 13px; }
    th { background: #E8F5F1; color: #085441; font-weight: 800; text-align: left; padding: 10px 12px; border: 1px solid #CBD5E1; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px 12px; border: 1px solid #E2E8F0; }
    tr:nth-child(even) { background: #F8FAFC; }
    .seal { text-align: center; padding: 16px; border-top: 1px dashed #CBD5E1; font-size: 12px; color: #0D7A5F; font-weight: bold; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="gov-label">${govtHeading} • RBI ESCROW COMPLIANCE</div>
    <h1>MONTHLY WAGE ESCROW DISBURSAL LEDGER</h1>
    <div class="sub">${federationName} • Settlement Node: ${apexBankName}</div>
  </div>
  <div class="meta-box">
    <div class="meta-item"><div class="meta-lbl">Jurisdiction Cluster</div><strong>${clusterName}</strong></div>
    <div class="meta-item"><div class="meta-lbl">Audit Reference</div><strong>SS-ESCROW-${(currentLocation.city || 'DIST').toUpperCase()}-${new Date().getFullYear()}</strong></div>
    <div class="meta-item"><div class="meta-lbl">Gross Circulated</div><strong style="color: #0D7A5F;">${stats.grossWorkerWageDisbursedMonth}</strong></div>
    <div class="meta-item"><div class="meta-lbl">Audit Status</div><strong style="color: #10B981;">100% Reconciled (Zero Leakage)</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Ledger Component</th>
        <th>Amount</th>
        <th>Settlement Channel</th>
        <th>Compliance Code</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Direct Worker Earnings (100%)</strong></td>
        <td><strong>₹18,40,000</strong></td>
        <td>Instant Direct Bank Transfer (NPCI)</td>
        <td>RBI-ESC-DIR-001</td>
      </tr>
      <tr>
        <td><strong>5% State Labour Welfare Fund Cess</strong></td>
        <td><strong>₹92,000</strong></td>
        <td>Dedicated Welfare Trust Account</td>
        <td>LWF-CESS-ACT-1965</td>
      </tr>
      <tr>
        <td><strong>Commercial Middleman Commission</strong></td>
        <td><strong>₹0.00 (Zero Cut)</strong></td>
        <td>Direct Cooperative Rails</td>
        <td>COOP-NO-CUT-CERT</td>
      </tr>
    </tbody>
  </table>
  <div class="seal">
    🏛️ Certified by ${apexBankName} & Directorate of Labour Cooperatives
  </div>
</body>
</html>`;
        const blob = new Blob([htmlDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.warn('Escrow download error', err);
      }
    }

    showVerificationToast(`Exported: ${fileName}`);
    setTimeout(() => setEscrowExportSuccess(false), 4000);
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('federation_admin')}
        subtitle={federationName}
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={4}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Verification Toast Feedback Banner */}
        {verificationFeedback && (
          <View style={styles.toastBanner}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.toastBannerText}>{verificationFeedback}</Text>
          </View>
        )}

        {/* District Overview Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroSub}>{t('district_labour_ops')}</Text>
              <Text style={styles.heroTitle}>{clusterName}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setLiveSocietiesVisible(true)}
              style={styles.livePill}
            >
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>14 Societies Live</Text>
              <Ionicons name="information-circle-outline" size={14} color={colors.success} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Interactive Metric Stat Buttons */}
          <View style={styles.heroMetrics}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onNavigateToWorkers}
              style={styles.heroMetricItem}
            >
              <Text style={styles.heroVal}>{stats.totalRegisteredWorkers}</Text>
              <Text style={styles.heroLabel}>{t('total_workers')} ↗</Text>
            </TouchableOpacity>

            <View style={styles.heroDivider} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onNavigateToVerification}
              style={styles.heroMetricItem}
            >
              <Text style={styles.heroVal}>{stats.verifiedWorkersCount}</Text>
              <Text style={styles.heroLabel}>{t('verified_workers_label')} ↗</Text>
            </TouchableOpacity>

            <View style={styles.heroDivider} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onNavigateToBookings}
              style={styles.heroMetricItem}
            >
              <Text style={styles.heroVal}>{stats.activeBookingsToday}</Text>
              <Text style={styles.heroLabel}>{t('active_bookings_today')} ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Hero Report Action */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDailyReportVisible(true)}
            style={styles.dailyReportBtn}
          >
            <Ionicons name="document-text-outline" size={14} color="#CBD5E1" />
            <Text style={styles.dailyReportBtnText}>View Daily Operations Brief & Export Report</Text>
          </TouchableOpacity>
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

        {/* Secondary KPI Grid with onPress */}
        <View style={styles.kpiRow}>
          <StatCard
            title="Monthly Gross Disbursed"
            value={stats.grossWorkerWageDisbursedMonth}
            icon="wallet-outline"
            color={colors.primary}
            trend="+24%"
            subtitle="Tap for escrow breakdown"
            onPress={() => setWageBreakdownVisible(true)}
          />
          <StatCard
            title="Registered Consumers"
            value={stats.totalCustomers}
            icon="people-outline"
            color={colors.info}
            trend="+15%"
            subtitle="Tap for ward demographics"
            onPress={() => setConsumersModalVisible(true)}
          />
        </View>

        {/* Worker Verification & Admissions Queue Widget */}
        <View style={styles.verificationQueueSection}>
          <View style={styles.verificationQueueHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.verificationAlertDot} />
                <Text style={styles.verificationQueueTitle}>Admissions & Verification Queue</Text>
                <View style={[styles.pendingBadge, { backgroundColor: pendingWorkers.length > 0 ? colors.warningLight : colors.successLight }]}>
                  <Text style={[styles.pendingBadgeText, { color: pendingWorkers.length > 0 ? colors.warning : colors.success }]}>
                    {pendingWorkers.length > 0 ? `${pendingWorkers.length} Pending` : 'All Verified ✅'}
                  </Text>
                </View>
              </View>
              <Text style={styles.verificationQueueSub}>
                Authenticate artisan credentials, Aadhaar KYC & issue official verified badges
              </Text>
            </View>
            <TouchableOpacity
              onPress={onNavigateToVerification}
              style={styles.openDeskBtn}
            >
              <Text style={styles.openDeskBtnText}>Verification Desk ↗</Text>
            </TouchableOpacity>
          </View>

          {pendingWorkers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingWorkersScroll}>
              {pendingWorkers.map((worker) => (
                <View key={worker.id} style={styles.pendingCandidateCard}>
                  <View style={styles.pendingCardTop}>
                    <Avatar name={worker.name} url={worker.avatarUrl} size={42} />
                    <View style={{ flex: 1, marginLeft: spacing.xs }}>
                      <Text style={styles.candidateName} numberOfLines={1}>{worker.name}</Text>
                      <Text style={styles.candidateSkill}>{worker.primarySkill} • {worker.experienceYears}y exp</Text>
                    </View>
                  </View>
                  <Text style={styles.candidateCoop} numberOfLines={1}>🏛️ {worker.cooperativeName}</Text>
                  <Text style={styles.candidateDocs}>📄 {worker.documents.filter((d) => d.type === 'aadhaar' || d.type === 'skill_certificate').length} Documents (ID Proof & Skill)</Text>

                  <View style={styles.candidateActionsRow}>
                    <TouchableOpacity
                      style={styles.quickInspectBtn}
                      onPress={() => setSelectedPendingWorker(worker)}
                    >
                      <Ionicons name="document-text-outline" size={13} color={colors.primary} />
                      <Text style={styles.quickInspectText}>Review</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickApproveBtn}
                      onPress={() => handleApproveWorker(worker)}
                    >
                      <Ionicons name="shield-checkmark" size={13} color="#FFF" />
                      <Text style={styles.quickApproveText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyVerificationBox}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.emptyVerificationText}>All artisan applications processed! Roster is 100% verified.</Text>
            </View>
          )}
        </View>

        {/* Worker Management: Add, Delete/Remove, Verify/Approve/Reject */}
        <WorkerManagementSection
          isAdmin={isAdmin}
          onNavigateToWorkers={onNavigateToWorkers}
          onSelectWorkerForJob={(worker) => setPreselectedWorkerForAssign(worker)}
        />

        {/* Job Management: Available Unassigned Jobs, Assigned Jobs, Verified-Only Dispatch */}
        <JobDispatchSection
          isAdmin={isAdmin}
          onNavigateToBookings={onNavigateToBookings}
          preselectedWorkerForAssign={preselectedWorkerForAssign}
          onClearPreselectedWorker={() => setPreselectedWorkerForAssign(null)}
        />

        {/* Quick Admin Menus */}
        <View style={styles.adminToolsRow}>
          <TouchableOpacity
            onPress={onNavigateToVerification}
            style={[styles.adminToolCard, { borderColor: colors.warning }]}
          >
            <Ionicons name="id-card" size={24} color={colors.warning} />
            <Text style={styles.adminToolTitle}>Worker Verification</Text>
            <Text style={styles.adminToolSub}>
              {pendingWorkers.length > 0 ? `${pendingWorkers.length} pending review` : 'Verify artisan credentials'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNavigateToWorkers}
            style={styles.adminToolCard}
          >
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles.adminToolTitle}>Workers Roster</Text>
            <Text style={styles.adminToolSub}>Manage guild members</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adminToolsRow}>
          <TouchableOpacity
            onPress={onNavigateToForecast}
            style={styles.adminToolCard}
          >
            <Ionicons name="bar-chart" size={24} color={colors.accent} />
            <Text style={styles.adminToolTitle}>AI Demand Forecast</Text>
            <Text style={styles.adminToolSub}>Ward allocation planner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setBroadcastVisible(true)}
            style={styles.adminToolCard}
          >
            <Ionicons name="megaphone" size={24} color={colors.info} />
            <Text style={styles.adminToolTitle}>Broadcast Notice</Text>
            <Text style={styles.adminToolSub}>SMS alert to district workers</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adminToolsRow}>
          <TouchableOpacity
            onPress={onNavigateToBookings}
            style={styles.adminToolCard}
          >
            <Ionicons name="document-text" size={24} color={colors.primary} />
            <Text style={styles.adminToolTitle}>Operations Manifest</Text>
            <Text style={styles.adminToolSub}>Shift ledger & printable PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setAuditVisible(true)}
            style={styles.adminToolCard}
          >
            <Ionicons name="ribbon" size={24} color={colors.success} />
            <Text style={styles.adminToolTitle}>Cooperative Audit</Text>
            <Text style={styles.adminToolSub}>Fair wage certification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 1. Live Cooperative Societies Status Modal */}
      <Modal visible={liveSocietiesVisible} transparent animationType="fade" onRequestClose={() => setLiveSocietiesVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Active Labour Cooperative Societies</Text>
                <Text style={styles.modalSub}>14 Affiliated Guilds in {currentLocation.placeName || currentLocation.city} Cluster</Text>
              </View>
              <TouchableOpacity onPress={() => setLiveSocietiesVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { name: `${currentLocation.city || 'District'} Electricians Guild`, zone: `Zone 1 (${currentLocation.placeName || 'Central'})`, workers: 42, status: 'Online • 38 On Duty' },
                { name: `${currentLocation.placeName || currentLocation.city} Plumbers Union`, zone: `Zone 2 (${currentLocation.area || 'Metro Sector'})`, workers: 36, status: 'Online • 32 On Duty' },
                { name: `${currentLocation.state || currentLocation.city} Carpenters Guild`, zone: `Zone 3 (Commercial Hub)`, workers: 28, status: 'Online • 24 On Duty' },
                { name: `${currentLocation.city || 'Urban'} Appliance Mechanics Society`, zone: `Zone 4 (East Sector)`, workers: 24, status: 'Online • 20 On Duty' },
                { name: `${currentLocation.city || 'Regional'} Sanitization Workers Union`, zone: `Zone 5 (Tech Corridor)`, workers: 30, status: 'Online • 28 On Duty' },
              ].map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => {
                    setLiveSocietiesVisible(false);
                    onNavigateToWorkers();
                  }}
                  style={styles.societyRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.societyNameText}>{s.name}</Text>
                    <Text style={styles.societyZoneText}>{s.zone} • {s.workers} active members ↗</Text>
                  </View>
                  <Badge label="Operational" variant="verified" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button
              title="Close"
              onPress={() => setLiveSocietiesVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* 2. Daily Operations Report Modal */}
      <Modal visible={dailyReportVisible} transparent animationType="fade" onRequestClose={() => setDailyReportVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Daily Operations Summary</Text>
                <Text style={styles.modalSub}>Generated for today • {federationName}</Text>
              </View>
              <TouchableOpacity onPress={() => setDailyReportVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.reportSummaryBox}>
              <View style={styles.reportStatItem}>
                <Text style={styles.reportStatVal}>{stats.activeBookingsToday}</Text>
                <Text style={styles.reportStatLabel}>Jobs Completed Today</Text>
              </View>
              <View style={styles.reportStatDivider} />
              <View style={styles.reportStatItem}>
                <Text style={styles.reportStatVal}>₹38,400</Text>
                <Text style={styles.reportStatLabel}>Wages Disbursed</Text>
              </View>
              <View style={styles.reportStatDivider} />
              <View style={styles.reportStatItem}>
                <Text style={styles.reportStatVal}>₹1,920</Text>
                <Text style={styles.reportStatLabel}>5% Cess to Fund</Text>
              </View>
            </View>

            <View style={{ gap: 6, marginVertical: spacing.sm }}>
              <Text style={styles.reportCheckText}>✓ Zero commercial aggregator cuts applied.</Text>
              <Text style={styles.reportCheckText}>✓ 100% on-time cooperative worker arrival rate.</Text>
              <Text style={styles.reportCheckText}>✓ All active technicians covered under PMJJBY accident shield.</Text>
            </View>

            {reportDownloadSuccess && (
              <View style={[styles.broadcastSuccessBox, { marginVertical: 6 }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={[styles.broadcastSuccessText, { fontWeight: '700' }]}>District Files Exported Successfully!</Text>
                  <Text style={[styles.broadcastSuccessText, { fontSize: 11, color: colors.textSecondary }]}>
                    Saved PDF Brief & CSV Dataset for {clusterName}.
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Main Download Button */}
            <Button
              title={isExportingReport ? 'Exporting PDF & CSV Files...' : reportDownloadSuccess ? 'Files Downloaded ✅' : 'Download District CSV / PDF'}
              icon="download-outline"
              onPress={handleDownloadDistrictCsvPdf}
              variant="primary"
              size="md"
              fullWidth
              disabled={isExportingReport}
              style={{ marginTop: spacing.sm }}
            />

            {/* Close Button */}
            <Button
              title="Close"
              onPress={() => setDailyReportVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </View>
      </Modal>

      {/* 3. Monthly Gross Disbursed Modal */}
      <Modal visible={wageBreakdownVisible} transparent animationType="fade" onRequestClose={() => setWageBreakdownVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Monthly Wage Escrow Ledger</Text>
                <Text style={styles.modalSub}>100% transparent cooperative earnings</Text>
              </View>
              <TouchableOpacity onPress={() => setWageBreakdownVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>Direct Worker Wages (100%):</Text>
              <Text style={styles.ledgerVal}>₹18,40,000</Text>
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>5% State Labour Welfare Cess:</Text>
              <Text style={styles.ledgerVal}>₹92,000</Text>
            </View>
            <View style={styles.ledgerRow}>
              <Text style={styles.ledgerLabel}>Private Aggregator Commission:</Text>
              <Text style={[styles.ledgerVal, { color: colors.success }]}>₹0 (Zero Cut)</Text>
            </View>
            <View style={[styles.ledgerRow, { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 6, marginTop: 4 }]}>
              <Text style={[styles.ledgerLabel, { fontWeight: '700' }]}>Gross Transferred via RBI Escrow:</Text>
              <Text style={[styles.ledgerVal, { fontWeight: '700', color: colors.primary }]}>{stats.grossWorkerWageDisbursedMonth}</Text>
            </View>

            {escrowExportSuccess && (
              <View style={[styles.broadcastSuccessBox, { marginVertical: 6 }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.broadcastSuccessText}>RBI Escrow Statement SS-ESCROW-2026.pdf Exported!</Text>
              </View>
            )}

            <Button
              title={escrowExportSuccess ? 'Statement Exported ✅' : 'Export RBI Escrow Statement (PDF)'}
              icon="download-outline"
              onPress={handleDownloadEscrowPdf}
              variant="primary"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />

            <Button
              title="Close Ledger"
              onPress={() => setWageBreakdownVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </View>
      </Modal>

      {/* 4. Registered Consumers Modal */}
      <Modal visible={consumersModalVisible} transparent animationType="fade" onRequestClose={() => setConsumersModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Registered Household Demographics</Text>
                <Text style={styles.modalSub}>Customer footprint across urban wards</Text>
              </View>
              <TouchableOpacity onPress={() => setConsumersModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.consumerStatBox}>
              <Text style={styles.consumerStatVal}>{stats.totalCustomers}</Text>
              <Text style={styles.consumerStatLabel}>Active Verified Households</Text>
            </View>

            <View style={{ gap: 6, marginVertical: spacing.sm }}>
              <Text style={styles.consumerItem}>• Indiranagar & Domlur: 620 Households</Text>
              <Text style={styles.consumerItem}>• Koramangala & HSR: 510 Households</Text>
              <Text style={styles.consumerItem}>• Whitefield & Marathahalli: 440 Households</Text>
              <Text style={styles.consumerItem}>• Malleshwaram & Rajajinagar: 270 Households</Text>
            </View>

            <Button
              title="View Ward Bookings & Requests"
              icon="receipt-outline"
              onPress={() => {
                setConsumersModalVisible(false);
                onNavigateToBookings();
              }}
              variant="primary"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />

            <Button
              title="Close Demographics"
              onPress={() => setConsumersModalVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.xs }}
            />
          </View>
        </View>
      </Modal>

      {/* 5. Worker Candidate Review & Verification Modal */}
      <Modal visible={Boolean(selectedPendingWorker)} transparent animationType="slide" onRequestClose={() => setSelectedPendingWorker(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            {selectedPendingWorker && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Artisan Verification & Admission</Text>
                    <Text style={styles.modalSub}>{selectedPendingWorker.welfareMemberId} • {selectedPendingWorker.cooperativeName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedPendingWorker(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Candidate Header Summary */}
                  <View style={styles.candidateReviewHeader}>
                    <Avatar name={selectedPendingWorker.name} url={selectedPendingWorker.avatarUrl} size={54} />
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.candidateReviewName}>{selectedPendingWorker.name}</Text>
                        <Badge status={selectedPendingWorker.verificationStatus} />
                      </View>
                      <Text style={styles.candidateReviewSkill}>
                        {selectedPendingWorker.primarySkill} ({selectedPendingWorker.experienceYears} Years Exp)
                      </Text>
                      <Text style={styles.candidateReviewRate}>Standard Base Rate: ₹{selectedPendingWorker.baseRate}/hr</Text>
                    </View>
                  </View>

                  {/* Contact Desk Actions */}
                  <View style={styles.candidateContactRow}>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleCall(selectedPendingWorker.phone)}
                    >
                      <Ionicons name="call" size={14} color={colors.primary} />
                      <Text style={styles.contactBtnText}>Call ({selectedPendingWorker.phone})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.contactBtn}
                      onPress={() => handleSMS(selectedPendingWorker.phone, selectedPendingWorker.name)}
                    >
                      <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
                      <Text style={styles.contactBtnText}>SMS Desk</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Key Profile Details */}
                  <View style={styles.workerDetailBox}>
                    <Text style={styles.workerDetailText}>• Guild Society: <Text style={{ fontWeight: '700' }}>{selectedPendingWorker.cooperativeName}</Text></Text>
                    <Text style={styles.workerDetailText}>• Operating Zone: <Text style={{ fontWeight: '700' }}>{selectedPendingWorker.serviceArea} ({selectedPendingWorker.serviceRadiusKm} km)</Text></Text>
                    <Text style={styles.workerDetailText}>• Bank Account: <Text style={{ fontWeight: '700', color: selectedPendingWorker.bankAccountLinked ? colors.success : colors.warning }}>{selectedPendingWorker.bankAccountLinked ? 'Linked & KYC Verified ✅' : 'Pending Linkage ⚠️'}</Text></Text>
                    <Text style={styles.workerDetailText}>• Address: <Text style={{ fontWeight: '600' }}>{selectedPendingWorker.address}, {selectedPendingWorker.city}</Text></Text>
                    <Text style={styles.workerDetailText}>• Languages: <Text style={{ fontWeight: '600' }}>{selectedPendingWorker.languages?.join(', ') || 'English, Kannada, Hindi'}</Text></Text>
                  </View>

                  {/* Submitted Documents Section (ID Proof & Skill Certificate only) */}
                  <Text style={styles.docsSectionTitle}>Submitted Credentials (ID Proof & Skill Certificate):</Text>
                  <View style={styles.docsRow}>
                    {selectedPendingWorker.documents
                      .filter((doc) => doc.type === 'aadhaar' || doc.type === 'skill_certificate')
                      .map((doc) => (
                        <TouchableOpacity
                          key={doc.id}
                          style={styles.docItemCard}
                          onPress={() => setSelectedAuditDoc({ doc, worker: selectedPendingWorker })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="document-text" size={18} color={colors.primary} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.docItemName} numberOfLines={1}>{doc.name}</Text>
                            <Text style={styles.docItemType}>
                              {doc.type === 'aadhaar' ? 'ID PROOF' : 'SKILL CERTIFICATE'}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Badge variant={doc.status === 'verified' ? 'verified' : 'status'} label={doc.status === 'verified' ? 'VERIFIED' : 'PROOF'} />
                            <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                          </View>
                        </TouchableOpacity>
                      ))}
                  </View>

                  {/* Admin Decision Actions */}
                  <View style={styles.workerActionsRow}>
                    <Button
                      title="Decline"
                      onPress={() => handleRejectWorker(selectedPendingWorker)}
                      variant="outline"
                      size="sm"
                      style={{ flex: 1, marginRight: 4, borderColor: colors.danger }}
                      textStyle={{ color: colors.danger }}
                    />
                    <Button
                      title="Req. Changes"
                      onPress={() => handleRequestChangesWorker(selectedPendingWorker)}
                      variant="outline"
                      size="sm"
                      style={{ flex: 1, marginHorizontal: 4 }}
                    />
                    <Button
                      title="Approve Member"
                      icon="shield-checkmark"
                      onPress={() => handleApproveWorker(selectedPendingWorker)}
                      variant="primary"
                      size="sm"
                      style={{ flex: 1.4, marginLeft: 4 }}
                    />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 5b. Document Statutory Audit & Certificate Modal */}
      <Modal visible={Boolean(selectedAuditDoc)} transparent animationType="slide" onRequestClose={() => setSelectedAuditDoc(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            {selectedAuditDoc && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Statutory Document Audit</Text>
                    <Text style={styles.modalSub}>{selectedAuditDoc.worker.name} • {selectedAuditDoc.doc.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedAuditDoc(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.certEmblemBox}>
                    <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
                    <Text style={styles.certGovtHeading}>{govtHeading} / NCVT ACCREDITATION</Text>
                    <Text style={styles.certSubHeading}>Cooperative Labour Directorate Verification Protocol</Text>
                  </View>

                  <View style={styles.certDetailCard}>
                    <View style={styles.certRow}>
                      <Text style={styles.certLabel}>Document Title:</Text>
                      <Text style={styles.certVal}>{selectedAuditDoc.doc.name}</Text>
                    </View>
                    <View style={styles.certRow}>
                      <Text style={styles.certLabel}>Document Type:</Text>
                      <Text style={styles.certVal}>{selectedAuditDoc.doc.type.toUpperCase()}</Text>
                    </View>
                    <View style={styles.certRow}>
                      <Text style={styles.certLabel}>Candidate Name:</Text>
                      <Text style={styles.certVal}>{selectedAuditDoc.worker.name}</Text>
                    </View>
                    <View style={styles.certRow}>
                      <Text style={styles.certLabel}>Society Affiliation:</Text>
                      <Text style={styles.certVal}>{selectedAuditDoc.worker.cooperativeName}</Text>
                    </View>
                    <View style={styles.certRow}>
                      <Text style={styles.certLabel}>Member Welfare ID:</Text>
                      <Text style={[styles.certVal, { color: colors.primary, fontWeight: '700' }]}>{selectedAuditDoc.worker.welfareMemberId}</Text>
                    </View>
                    <View style={styles.certRow}>
                      <Text style={styles.certLabel}>Audit Integrity:</Text>
                      <Text style={[styles.certVal, { color: colors.success, fontWeight: '700' }]}>Tamper-Evident SHA-256 Passed ✅</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
                    <Button
                      title="Back to Review"
                      variant="outline"
                      size="sm"
                      onPress={() => setSelectedAuditDoc(null)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Approve Worker Now"
                      icon="shield-checkmark"
                      variant="primary"
                      size="sm"
                      onPress={() => handleApproveWorker(selectedAuditDoc.worker)}
                      style={{ flex: 1.3 }}
                    />
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 6. Admin Booking Inspection & Dispatch Modal */}
      <Modal visible={Boolean(selectedBooking)} transparent animationType="slide" onRequestClose={() => setSelectedBooking(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Booking Operations Control</Text>
                    <Text style={styles.modalSub}>Code: {selectedBooking.bookingCode}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {reassignSuccess && (
                    <View style={styles.reassignSuccessBanner}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={styles.reassignSuccessText}>{reassignSuccess}</Text>
                    </View>
                  )}

                  <View style={styles.bookingStatusCard}>
                    <Text style={styles.bookingServiceTitle}>{selectedBooking.serviceTitle}</Text>
                    <Badge status={selectedBooking.status} />
                  </View>

                  <View style={styles.partyBox}>
                    <Text style={styles.partyHeading}>Customer Details</Text>
                    <Text style={styles.partyName}>{selectedBooking.customerName}</Text>
                    <Text style={styles.partySub}>📍 {selectedBooking.serviceLocation?.addressLine || 'Address on file'}</Text>
                    <TouchableOpacity
                      onPress={() => handleCall(selectedBooking.customerPhone)}
                      style={styles.partyCallBtn}
                    >
                      <Ionicons name="call" size={14} color={colors.primary} />
                      <Text style={styles.partyCallBtnText}>Call Customer: {selectedBooking.customerPhone}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.partyBox}>
                    <Text style={styles.partyHeading}>Assigned Cooperative Worker</Text>
                    <Text style={styles.partyName}>{selectedBooking.workerName}</Text>
                    <Text style={styles.partySub}>Schedule: {selectedBooking.scheduledDate} at {selectedBooking.scheduledTimeSlot}</Text>
                    <TouchableOpacity
                      onPress={() => handleCall(selectedBooking.workerPhone)}
                      style={styles.partyCallBtn}
                    >
                      <Ionicons name="call" size={14} color={colors.success} />
                      <Text style={[styles.partyCallBtnText, { color: colors.success }]}>Call Worker: {selectedBooking.workerPhone}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.partyBox}>
                    <Text style={styles.partyHeading}>Fare & Escrow Breakdown</Text>
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>Base Fare (100% to Worker):</Text>
                      <Text style={styles.fareVal}>₹{selectedBooking.estimatedAmount - selectedBooking.welfareCessAmount}</Text>
                    </View>
                    <View style={styles.fareRow}>
                      <Text style={styles.fareLabel}>5% Statutory Welfare Cess:</Text>
                      <Text style={styles.fareVal}>₹{selectedBooking.welfareCessAmount}</Text>
                    </View>
                    <View style={styles.fareRow}>
                      <Text style={[styles.fareLabel, { fontWeight: '700' }]}>Total Customer Bill:</Text>
                      <Text style={[styles.fareVal, { fontWeight: '700', color: colors.primary }]}>₹{selectedBooking.estimatedAmount}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 8, marginTop: spacing.md }}>
                    <Button
                      title="Reassign Technician (Backup Pool)"
                      icon="swap-horizontal"
                      onPress={() => {
                        setReassignSuccess(`Dispatched standby guild member to ${selectedBooking.customerName}.`);
                        setTimeout(() => setReassignSuccess(null), 3000);
                      }}
                      variant="outline"
                      size="sm"
                      fullWidth
                    />

                    {selectedBooking.status !== 'cancelled' && (
                      <Button
                        title="Override & Cancel Booking"
                        icon="close-circle-outline"
                        onPress={() => {
                          cancelBooking(selectedBooking.id, 'Cancelled via admin dashboard.');
                          setSelectedBooking(null);
                        }}
                        variant="outline"
                        size="sm"
                        fullWidth
                        style={{ borderColor: colors.danger }}
                        textStyle={{ color: colors.danger }}
                      />
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 7. Broadcast Guild Notice Modal */}
      <Modal visible={broadcastVisible} transparent animationType="slide" onRequestClose={() => setBroadcastVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Broadcast Guild Alert</Text>
                <Text style={styles.modalSub}>Push SMS & in-app alert to all active workers</Text>
              </View>
              <TouchableOpacity onPress={() => setBroadcastVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {broadcastSuccess ? (
              <View style={styles.broadcastSuccessBox}>
                <Ionicons name="checkmark-circle" size={44} color={colors.success} />
                <Text style={styles.broadcastSuccessText}>Broadcast Sent to 128 Guild Workers!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.formLabel}>Quick Notice Templates</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {[
                    '⛈️ Heavy Rainfall Standby Alert in Zone 4',
                    '⚡ Surge Incentive: +20% on Electrical Requests',
                    '🛡️ Cooperative Health Camp this Sunday',
                    '📢 Safety Advisory: Mandatory gear on site',
                  ].map((tpl, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => setBroadcastMessage(tpl)}
                      style={{
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: borderRadius.round,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>{tpl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Alert Message to Workers</Text>
                <TextInput
                  value={broadcastMessage}
                  onChangeText={setBroadcastMessage}
                  placeholder="e.g. Heavy rainfall alert in Zone 4. Standby surge incentive active."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={4}
                  style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                />

                <Button
                  title="Broadcast to All Workers"
                  icon="send"
                  onPress={handleSendBroadcast}
                  variant="primary"
                  size="md"
                  fullWidth
                  disabled={!broadcastMessage.trim()}
                  style={{ marginTop: spacing.md }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 8. Federation Statutory Audit Modal */}
      <Modal visible={auditVisible} transparent animationType="fade" onRequestClose={() => setAuditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Labour Federation Audit</Text>
                <Text style={styles.modalSub}>Department of Cooperation statutory audit</Text>
              </View>
              <TouchableOpacity onPress={() => setAuditVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.auditCardBox}>
              <Text style={styles.auditScoreBig}>99.4%</Text>
              <Text style={styles.auditScoreSub}>Statutory Fair-Wage Adherence Rating</Text>
            </View>

            <View style={{ gap: 6, marginVertical: spacing.sm }}>
              <Text style={styles.reportCheckText}>✓ Zero corporate commissions audited by State Registrar.</Text>
              <Text style={styles.reportCheckText}>✓ 100% Aadhaar-validated worker background check.</Text>
              <Text style={styles.reportCheckText}>✓ Escrow funds backed by {apexBankName}.</Text>
            </View>

            {auditExportSuccess && (
              <View style={[styles.broadcastSuccessBox, { marginVertical: 6 }]}>
                <Ionicons name="ribbon" size={20} color={colors.success} />
                <Text style={styles.broadcastSuccessText}>Official Audit Certificate SS-AUDIT-2026.pdf Exported!</Text>
              </View>
            )}

            <Button
              title={auditExportSuccess ? 'Certificate Exported ✅' : 'Download Audit Certificate (PDF)'}
              icon="download-outline"
              onPress={() => {
                setAuditExportSuccess(true);
                setTimeout(() => setAuditExportSuccess(false), 3000);
              }}
              variant="primary"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.sm }}
            />

            <Button
              title="Close"
              onPress={() => setAuditVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.xs }}
            />
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
    paddingVertical: 4,
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
  dailyReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingVertical: 8,
    backgroundColor: '#334155',
    borderRadius: borderRadius.md,
  },
  dailyReportBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F1F5F9',
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
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
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
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  societyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  societyNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  societyZoneText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reportSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
  reportStatItem: {
    alignItems: 'center',
  },
  reportStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  reportStatLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reportStatDivider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  reportCheckText: {
    fontSize: 11,
    color: colors.text,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  ledgerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ledgerVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  consumerStatBox: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  consumerStatVal: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  consumerStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  consumerItem: {
    fontSize: 12,
    color: colors.text,
  },
  workerDetailBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: 4,
  },
  workerDetailText: {
    fontSize: 12,
    color: colors.text,
  },
  docsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginVertical: 4,
  },
  docsRow: {
    gap: 6,
    marginBottom: spacing.md,
  },
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docItemName: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    marginLeft: 6,
  },
  workerActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  reassignSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: 6,
  },
  reassignSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  bookingStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  bookingServiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  partyBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partyHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  partySub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  partyCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  partyCallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  fareLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  fareVal: {
    fontSize: 11,
    color: colors.text,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  broadcastSuccessBox: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  broadcastSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    marginTop: 8,
  },
  auditCardBox: {
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  auditScoreBig: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.success,
  },
  auditScoreSub: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
  },
  auditRowText: {
    fontSize: 11,
    color: colors.text,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  toastBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  verificationQueueSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  verificationQueueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  verificationAlertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  verificationQueueTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  verificationQueueSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  openDeskBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  openDeskBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  pendingWorkersScroll: {
    paddingVertical: 4,
    gap: 10,
  },
  pendingCandidateCard: {
    width: 240,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  candidateName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  candidateSkill: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  candidateCoop: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  candidateDocs: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  candidateActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  quickInspectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickInspectText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  quickApproveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.success,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  quickApproveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyVerificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  emptyVerificationText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  candidateReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  candidateReviewName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  candidateReviewSkill: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  candidateReviewRate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  candidateContactRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.sm,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  docItemType: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  certEmblemBox: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  certGovtHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  certSubHeading: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  certDetailCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  certLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  certVal: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
});

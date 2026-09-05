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
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { BookingCard } from '../../components/cards';
import { EmptyState, Badge, Button, Avatar } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useLocation } from '../../context/LocationContext';
import { workerService } from '../../services';
import { Booking, BookingStatus, WorkerProfile } from '../../types';
import { isTradeMatching, getWorkerActiveJob, getRequiredTradeLabel } from '../../utils/workerMatching';
import { Ionicons } from '@expo/vector-icons';

interface AdminBookingsScreenProps {
  onBack?: () => void;
}

export const AdminBookingsScreen: React.FC<AdminBookingsScreenProps> = ({ onBack }) => {
  const { bookings, updateStatus, cancelBooking, assignJobToWorker } = useBookings();
  const { currentLocation, clusterName } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Interactive Inspection Modal
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [showReassignDropdown, setShowReassignDropdown] = useState(false);
  const [verifiedWorkers, setVerifiedWorkers] = useState<WorkerProfile[]>([]);

  // Operations Manifest Modal
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [manifestExported, setManifestExported] = useState(false);
  const [lastExportedFileName, setLastExportedFileName] = useState<string>('');
  const [lastExportType, setLastExportType] = useState<'pdf' | 'csv' | null>(null);
  const [isExportingManifest, setIsExportingManifest] = useState(false);

  useEffect(() => {
    const fetchWorkers = async () => {
      const data = await workerService.getWorkers({ status: 'verified' });
      setVerifiedWorkers(data);
    };
    fetchWorkers();
    const unsub = workerService.subscribe(() => {
      fetchWorkers();
    });
    return () => unsub();
  }, []);

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusTabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Bookings' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'on_the_way', label: 'On The Way' },
    { id: 'accepted', label: 'Accepted' },
    { id: 'requested', label: 'Requested' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const handleCall = (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      setActionSuccessMsg(`Triggered dialer for: ${phoneNumber}`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    });
  };

  const handleSMS = (phoneNumber: string, bookingCode: string) => {
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    const msg = encodeURIComponent(`Regarding SahakarSeva Booking ${bookingCode}: Official Cooperative update.`);
    Linking.openURL(`sms:${cleaned}?body=${msg}`).catch(() => {
      setActionSuccessMsg(`Triggered SMS messenger for: ${phoneNumber}`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    });
  };

  const handleUpdateStatus = async (status: BookingStatus, note: string) => {
    if (!selectedBooking) return;
    await updateStatus(selectedBooking.id, status, note);
    setSelectedBooking((prev) => (prev ? { ...prev, status } : null));
    setActionSuccessMsg(`Booking status updated to ${status.replace('_', ' ').toUpperCase()}`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const handleReassign = async (worker: WorkerProfile) => {
    if (!selectedBooking) return;

    // Check concurrency
    const activeJob = getWorkerActiveJob(worker.id, bookings, selectedBooking.id);
    if (activeJob) {
      setActionSuccessMsg(
        `Unavailable: ${worker.name} already has active job #${activeJob.bookingCode}. One worker to one job policy active.`
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
      return;
    }

    // Check trade matching
    if (!isTradeMatching(selectedBooking.categoryId, selectedBooking.serviceTitle, worker)) {
      setActionSuccessMsg(
        `Skill Mismatch: ${selectedBooking.serviceTitle} requires ${selectedBooking.categoryId || 'trade'} specialist. ${worker.name} is certified in ${worker.primarySkill}.`
      );
      setTimeout(() => setActionSuccessMsg(null), 4000);
      return;
    }

    try {
      const updated = await assignJobToWorker(selectedBooking.id, worker);
      if (updated) {
        setSelectedBooking(updated);
      } else {
        setSelectedBooking((prev) =>
          prev
            ? {
                ...prev,
                workerId: worker.id,
                workerName: worker.name,
                workerSkill: worker.primarySkill,
                workerPhone: worker.phone,
                cooperativeName: worker.cooperativeName,
              }
            : null
        );
      }
      setShowReassignDropdown(false);
      setActionSuccessMsg(`Technician reassigned to ${worker.name} (${worker.primarySkill})`);
      setTimeout(() => setActionSuccessMsg(null), 3500);
    } catch (err: any) {
      setActionSuccessMsg(err.message || 'Failed to reassign technician');
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    await cancelBooking(selectedBooking.id, 'Administrative cooperative intervention.');
    setSelectedBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    setActionSuccessMsg(`Booking ${selectedBooking.bookingCode} cancelled. Escrow returned to customer.`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Manifest Export Handlers
  const handleDownloadManifestPdf = () => {
    setIsExportingManifest(true);
    const citySlug = (currentLocation.city || 'visakhapatnam').toLowerCase().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `district_manifest_${citySlug}_${dateStr}.html`;
    const jurisdiction = clusterName || `${currentLocation.city || 'Visakhapatnam'}, ${currentLocation.state || 'Andhra Pradesh'}`;

    const bookingRows = bookings
      .map((b) => {
        const badgeClass = `badge-${b.status}`;
        const statusLabel = b.status.replace(/_/g, ' ').toUpperCase();
        const cess = b.welfareCessAmount || Math.round((b.estimatedAmount || 0) * 0.05);
        return `<tr>
          <td><strong>${b.bookingCode || 'BK-' + b.id}</strong></td>
          <td>
            <strong>${b.serviceTitle}</strong><br/>
            <span style="font-size: 11px; color: #64748B;">${b.categoryId || 'General'}</span>
          </td>
          <td>
            ${b.customerName}<br/>
            <span style="font-size: 11px; color: #64748B;">📞 ${b.customerPhone || 'N/A'}</span>
          </td>
          <td>
            <strong>${b.workerName || 'Unassigned'}</strong><br/>
            <span style="font-size: 11px; color: #64748B;">${b.workerSkill ? '🛠️ ' + b.workerSkill : (b.cooperativeName || 'Pending Assignment')}</span>
          </td>
          <td>
            ${b.scheduledDate || 'Today'}<br/>
            <span style="font-size: 11px; color: #64748B;">⏰ ${b.scheduledTimeSlot || 'Immediate'}</span>
          </td>
          <td style="font-weight: 700; color: #0F172A;">₹${(b.estimatedAmount || 0).toLocaleString('en-IN')}</td>
          <td style="font-weight: 600; color: #0D7A5F;">₹${cess.toLocaleString('en-IN')}</td>
          <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
        </tr>`;
      })
      .join('');

    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>District Operations Manifest - ${jurisdiction}</title>
  <style>
    @media print {
      body { padding: 0; background: #FFF; }
      .no-print { display: none; }
      @page { size: landscape; margin: 12mm; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 28px;
      color: #0F172A;
      max-width: 1080px;
      margin: 0 auto;
      background: #FFF;
      line-height: 1.4;
    }
    .header {
      border-bottom: 3px solid #0D7A5F;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .gov-label {
      font-size: 11px;
      font-weight: 800;
      color: #0D7A5F;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    h1 {
      color: #0F172A;
      margin: 0 0 4px 0;
      font-size: 22px;
      font-weight: 800;
    }
    .sub {
      font-size: 13px;
      color: #475569;
      font-weight: 500;
    }
    .meta-box {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 14px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-lbl {
      font-size: 11px;
      color: #64748B;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-val {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #085441;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 18px 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    th {
      background: #E8F5F1;
      color: #085441;
      font-weight: 800;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #CBD5E1;
      font-size: 11px;
      text-transform: uppercase;
    }
    td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background: #F8FAFC;
    }
    .badge {
      display: inline-block;
      padding: 3px 7px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-in_progress, .badge-on_the_way {
      background: #FEF3C7;
      color: #92400E;
    }
    .badge-completed {
      background: #DCFCE7;
      color: #15803D;
    }
    .badge-accepted {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .badge-requested {
      background: #F1F5F9;
      color: #475569;
    }
    .badge-cancelled {
      background: #FEE2E2;
      color: #991B1B;
    }
    .seal {
      text-align: center;
      padding: 14px;
      border-top: 2px dashed #CBD5E1;
      font-size: 11px;
      color: #0D7A5F;
      font-weight: 700;
      margin-top: 20px;
      background: #F0FDF4;
      border-radius: 6px;
    }
    .print-bar {
      margin-bottom: 20px;
      padding: 12px 16px;
      background: #0D7A5F;
      color: white;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #FFF;
      color: #0D7A5F;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span><strong>SahakarSeva District Operations Manifest</strong> — Ready to print or save as PDF</span>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save to PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="gov-label">SAHAKARSEVA COOPERATIVE FEDERATION • DISTRICT LABOUR CELL</div>
      <h1>DISTRICT MASTER OPERATIONS & DISPATCH MANIFEST</h1>
      <div class="sub">Jurisdiction Cluster: ${jurisdiction}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #64748B;">
      <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div><strong>Time:</strong> ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
      <div><strong>Ref:</strong> MANIFEST-${(currentLocation.city || 'DIST').toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}</div>
    </div>
  </div>

  <div class="meta-box">
    <div class="meta-item">
      <div class="meta-lbl">Total Logged Jobs</div>
      <div class="meta-val">${bookings.length} Operations</div>
    </div>
    <div class="meta-item">
      <div class="meta-lbl">Active In Field</div>
      <div class="meta-val" style="color: #D97706;">${activeCount} Active</div>
    </div>
    <div class="meta-item">
      <div class="meta-lbl">Completed & Disbursed</div>
      <div class="meta-val" style="color: #16A34A;">${completedCount} Settled</div>
    </div>
    <div class="meta-item">
      <div class="meta-lbl">Gross Escrow Turnover</div>
      <div class="meta-val" style="color: #0D7A5F;">₹${totalGrossDisbursed.toLocaleString('en-IN')}</div>
    </div>
  </div>

  <div class="section-title">
    <span>Itemized Shift Dispatch & Service Registry</span>
    <span style="font-size: 11px; color: #64748B; font-weight: normal;">Showing all ${bookings.length} recorded operations</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Code</th>
        <th>Service Title</th>
        <th>Customer</th>
        <th>Assigned Worker & Trade</th>
        <th>Slot / Timing</th>
        <th>Escrow (₹)</th>
        <th>5% Welfare</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${bookingRows}
    </tbody>
  </table>

  <div class="seal">
    🛡️ Certified by Directorate of Cooperative Labour & Urban Services • Zero Aggregator Commission Protected • Statutory Fair Wage Guaranteed
  </div>
</body>
</html>`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([htmlDoc], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Open in new window for direct printable PDF view
        window.open(url, '_blank');
      } catch (err) {
        console.warn('PDF/Manifest print download error', err);
      }
    }

    setTimeout(() => {
      setIsExportingManifest(false);
      setLastExportedFileName(fileName);
      setLastExportType('pdf');
      setManifestExported(true);
    }, 400);
  };

  const handleExportManifestCsv = () => {
    setIsExportingManifest(true);
    const citySlug = (currentLocation.city || 'visakhapatnam').toLowerCase().replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `district_manifest_${citySlug}_${dateStr}.csv`;

    const headers = [
      'Booking Code',
      'Service Title',
      'Category',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Assigned Worker',
      'Worker Trade',
      'Worker Phone',
      'Cooperative Name',
      'Scheduled Date',
      'Scheduled Time',
      'Escrow Amount (INR)',
      '5% Welfare Cess (INR)',
      'Status',
    ];

    const csvRows = bookings.map((b) => {
      const cess = b.welfareCessAmount || Math.round((b.estimatedAmount || 0) * 0.05);
      const address = b.serviceLocation ? `${b.serviceLocation.addressLine || ''}, ${b.serviceLocation.city || ''}` : '';
      return [
        `"${b.bookingCode || 'BK-' + b.id}"`,
        `"${(b.serviceTitle || '').replace(/"/g, '""')}"`,
        `"${(b.categoryId || '').replace(/"/g, '""')}"`,
        `"${(b.customerName || '').replace(/"/g, '""')}"`,
        `"${(b.customerPhone || '').replace(/"/g, '""')}"`,
        `"${address.replace(/"/g, '""')}"`,
        `"${(b.workerName || 'Unassigned').replace(/"/g, '""')}"`,
        `"${(b.workerSkill || '').replace(/"/g, '""')}"`,
        `"${(b.workerPhone || '').replace(/"/g, '""')}"`,
        `"${(b.cooperativeName || '').replace(/"/g, '""')}"`,
        `"${b.scheduledDate || ''}"`,
        `"${b.scheduledTimeSlot || ''}"`,
        b.estimatedAmount || 0,
        cess,
        `"${b.status}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
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
        console.warn('CSV export error', err);
      }
    }

    setTimeout(() => {
      setIsExportingManifest(false);
      setLastExportedFileName(fileName);
      setLastExportType('csv');
      setManifestExported(true);
    }, 400);
  };

  // Metrics for Manifest
  const activeCount = bookings.filter((b) => ['in_progress', 'on_the_way', 'accepted'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const totalGrossDisbursed = bookings.reduce((sum, b) => sum + (b.estimatedAmount || 0), 0);

  return (
    <View style={styles.container}>
      <Header
        title="District Master Bookings"
        subtitle={`${filtered.length} operations tracked`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <View style={styles.topSection}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Filter by code, worker, customer..."
            />
          </View>
          <TouchableOpacity
            style={styles.manifestBtn}
            onPress={() => {
              setShowManifestModal(true);
              setManifestExported(false);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text" size={16} color={colors.surface} />
            <Text style={styles.manifestBtnText}>Manifest</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusTabs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.statusPillsRow}
          renderItem={({ item }) => {
            const isSelected = statusFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setStatusFilter(item.id)}
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

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => {
              setSelectedBooking(item);
              setShowReassignDropdown(false);
              setActionSuccessMsg(null);
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No Bookings Match Query"
            message="Adjust your search filters or status criteria."
            actionTitle="Reset"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        }
      />

      {/* Booking Inspection & Dispatch Modal */}
      <Modal
        visible={Boolean(selectedBooking)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedBooking(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBooking && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <View style={styles.codeRow}>
                      <Text style={styles.modalTitle}>{selectedBooking.bookingCode}</Text>
                      <Badge status={selectedBooking.status} />
                    </View>
                    <Text style={styles.serviceSub}>{selectedBooking.serviceTitle}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedBooking(null)}
                    style={styles.closeIconBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {actionSuccessMsg && (
                  <View style={styles.successBanner}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={styles.successText}>{actionSuccessMsg}</Text>
                  </View>
                )}

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Scheduled Slot */}
                  <View style={styles.timeSlotCard}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.timeSlotText}>
                      Scheduled: {selectedBooking.scheduledDate} ({selectedBooking.scheduledTimeSlot})
                    </Text>
                  </View>

                  {/* Customer Card */}
                  <View style={styles.participantCard}>
                    <View style={styles.participantTop}>
                      <Avatar name={selectedBooking.customerName} size={42} />
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.participantRole}>CONSUMER / HOUSEHOLD</Text>
                        <Text style={styles.participantName}>{selectedBooking.customerName}</Text>
                        <Text style={styles.participantPhone}>{selectedBooking.customerPhone}</Text>
                      </View>
                    </View>
                    <View style={styles.addressBox}>
                      <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                      <Text style={styles.addressText} numberOfLines={2}>
                        {selectedBooking.serviceLocation.addressLine}, {selectedBooking.serviceLocation.city} - {selectedBooking.serviceLocation.pincode}
                      </Text>
                    </View>
                    <View style={styles.actionPillRow}>
                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => handleCall(selectedBooking.customerPhone)}
                      >
                        <Ionicons name="call" size={14} color={colors.primary} />
                        <Text style={styles.contactBtnText}>Call Customer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => handleSMS(selectedBooking.customerPhone, selectedBooking.bookingCode)}
                      >
                        <Ionicons name="chatbubble" size={14} color={colors.primary} />
                        <Text style={styles.contactBtnText}>SMS Alert</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Worker Card */}
                  <View style={styles.participantCard}>
                    <View style={styles.participantTop}>
                      <Avatar name={selectedBooking.workerName} size={42} showVerifiedBadge />
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.participantRole}>ASSIGNED GUILD TECHNICIAN</Text>
                        <Text style={styles.participantName}>{selectedBooking.workerName}</Text>
                        <Text style={styles.participantPhone}>
                          {selectedBooking.workerSkill} • {selectedBooking.cooperativeName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionPillRow}>
                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => handleCall(selectedBooking.workerPhone)}
                      >
                        <Ionicons name="call" size={14} color={colors.primary} />
                        <Text style={styles.contactBtnText}>Call Worker</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => handleSMS(selectedBooking.workerPhone, selectedBooking.bookingCode)}
                      >
                        <Ionicons name="chatbubble" size={14} color={colors.primary} />
                        <Text style={styles.contactBtnText}>SMS Worker</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.contactBtn, styles.reassignToggleBtn]}
                        onPress={() => setShowReassignDropdown(!showReassignDropdown)}
                      >
                        <Ionicons name="swap-horizontal" size={14} color={colors.warning} />
                        <Text style={[styles.contactBtnText, { color: colors.warning }]}>Reassign</Text>
                      </TouchableOpacity>
                    </View>

                    {showReassignDropdown && (
                      <View style={styles.reassignBox}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={styles.reassignTitle}>Select Qualified Artisan to Assign:</Text>
                          <View style={styles.reassignTradeTag}>
                            <Text style={styles.reassignTradeTagText}>
                              Trade: {getRequiredTradeLabel(selectedBooking.categoryId, selectedBooking.serviceTitle)}
                            </Text>
                          </View>
                        </View>

                        {(() => {
                          if (verifiedWorkers.length === 0) {
                            return (
                              <Text style={{ fontSize: 11, color: colors.textMuted, marginVertical: 6 }}>
                                Loading registered guild artisans...
                              </Text>
                            );
                          }

                          // Sort so trade-matched, non-busy workers appear first
                          const sorted = [...verifiedWorkers].sort((a, b) => {
                            const aMatches = isTradeMatching(selectedBooking.categoryId, selectedBooking.serviceTitle, a);
                            const bMatches = isTradeMatching(selectedBooking.categoryId, selectedBooking.serviceTitle, b);
                            const aBusy = Boolean(getWorkerActiveJob(a.id, bookings, selectedBooking.id));
                            const bBusy = Boolean(getWorkerActiveJob(b.id, bookings, selectedBooking.id));
                            const aScore = (aMatches ? 2 : 0) + (!aBusy ? 1 : 0);
                            const bScore = (bMatches ? 2 : 0) + (!bBusy ? 1 : 0);
                            return bScore - aScore;
                          });

                          return sorted.slice(0, 6).map((worker) => {
                            const matchesTrade = isTradeMatching(
                              selectedBooking.categoryId,
                              selectedBooking.serviceTitle,
                              worker
                            );
                            const activeJob = getWorkerActiveJob(worker.id, bookings, selectedBooking.id);
                            const isBusy = Boolean(activeJob);
                            const isEligible = matchesTrade && !isBusy;

                            return (
                              <TouchableOpacity
                                key={worker.id}
                                style={[
                                  styles.techChoiceRow,
                                  isEligible && styles.techChoiceRowEligible,
                                  isBusy && styles.techChoiceRowBusy,
                                  !matchesTrade && !isBusy && styles.techChoiceRowMismatched,
                                ]}
                                onPress={() => {
                                  if (isBusy) {
                                    setActionSuccessMsg(
                                      `Cannot assign: ${worker.name} is on active job #${activeJob?.bookingCode}. Max 1 active job allowed.`
                                    );
                                    setTimeout(() => setActionSuccessMsg(null), 3500);
                                    return;
                                  }
                                  if (!matchesTrade) {
                                    setActionSuccessMsg(
                                      `Skill Mismatch: ${selectedBooking.serviceTitle} requires ${selectedBooking.categoryId || 'trade'} specialist. ${worker.name} is certified as "${worker.primarySkill}".`
                                    );
                                    setTimeout(() => setActionSuccessMsg(null), 3500);
                                    return;
                                  }
                                  handleReassign(worker);
                                }}
                              >
                                <Ionicons
                                  name={isEligible ? 'checkmark-circle' : isBusy ? 'time' : 'alert-circle'}
                                  size={22}
                                  color={isEligible ? colors.success : isBusy ? colors.warning : colors.danger}
                                />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Text style={styles.techName}>{worker.name}</Text>
                                    {isEligible && (
                                      <Text style={styles.eligibleTagText}>Available</Text>
                                    )}
                                    {isBusy && (
                                      <Text style={styles.busyTagText}>Busy (#{activeJob?.bookingCode})</Text>
                                    )}
                                    {!matchesTrade && !isBusy && (
                                      <Text style={styles.mismatchTagText}>Trade Mismatch</Text>
                                    )}
                                  </View>
                                  <Text style={styles.techSkill}>
                                    {worker.primarySkill} • {worker.serviceArea}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          });
                        })()}
                      </View>
                    )}
                  </View>

                  {/* Financial & Welfare Breakdown */}
                  <View style={styles.financialCard}>
                    <Text style={styles.financialTitle}>Cooperative Escrow & Wages</Text>
                    <View style={styles.finRow}>
                      <Text style={styles.finLabel}>Service Fee (Direct to Worker):</Text>
                      <Text style={styles.finVal}>₹{selectedBooking.estimatedAmount}</Text>
                    </View>
                    <View style={styles.finRow}>
                      <Text style={styles.finLabel}>5% Worker Welfare Cess:</Text>
                      <Text style={styles.finVal}>₹{selectedBooking.welfareCessAmount}</Text>
                    </View>
                    <View style={styles.finRow}>
                      <Text style={styles.finLabel}>Escrow Protection:</Text>
                      <Text style={[styles.finVal, { color: colors.success }]}>Secured in Federation Pool</Text>
                    </View>
                  </View>

                  {/* Override Status Actions */}
                  <Text style={styles.overrideSectionTitle}>Administrative State Controls</Text>
                  <View style={styles.overrideActionsRow}>
                    {selectedBooking.status !== 'in_progress' && (
                      <Button
                        title="Set In-Progress"
                        icon="play"
                        size="sm"
                        variant="outline"
                        onPress={() => handleUpdateStatus('in_progress', 'Admin verified technician on site')}
                        style={styles.stateBtn}
                      />
                    )}
                    {selectedBooking.status !== 'completed' && (
                      <Button
                        title="Release Escrow (Complete)"
                        icon="checkmark-done"
                        size="sm"
                        variant="primary"
                        onPress={() => handleUpdateStatus('completed', 'Admin authorized job completion and escrow disbursement')}
                        style={styles.stateBtn}
                      />
                    )}
                    {selectedBooking.status !== 'cancelled' && (
                      <Button
                        title="Cancel & Refund"
                        icon="close-circle"
                        size="sm"
                        variant="outline"
                        onPress={handleCancelBooking}
                        style={styles.stateBtn}
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

      {/* District Operations Manifest Modal */}
      <Modal
        visible={showManifestModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowManifestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>District Operations Manifest</Text>
                <Text style={styles.serviceSub}>Daily Dispatch & Shift Ledger</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowManifestModal(false)}
                style={styles.closeIconBtn}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.manifestSummaryBox}>
                <View style={styles.manifestStat}>
                  <Text style={styles.manifestStatNum}>{bookings.length}</Text>
                  <Text style={styles.manifestStatLabel}>Total Logged</Text>
                </View>
                <View style={styles.manifestStat}>
                  <Text style={[styles.manifestStatNum, { color: colors.warning }]}>{activeCount}</Text>
                  <Text style={styles.manifestStatLabel}>In Field</Text>
                </View>
                <View style={styles.manifestStat}>
                  <Text style={[styles.manifestStatNum, { color: colors.success }]}>{completedCount}</Text>
                  <Text style={styles.manifestStatLabel}>Disbursed</Text>
                </View>
              </View>

              <View style={styles.manifestInfoSection}>
                <Text style={styles.manifestInfoTitle}>Operational Parameters</Text>
                <Text style={styles.manifestInfoItem}>• Federation Jurisdiction: {clusterName || `${currentLocation.city || 'District'} Urban Cluster`}</Text>
                <Text style={styles.manifestInfoItem}>• Gross Value in Circulation: ₹{totalGrossDisbursed.toLocaleString('en-IN')}</Text>
                <Text style={styles.manifestInfoItem}>• Fair Wage Escrow Compliance: 100% Guaranteed</Text>
                <Text style={styles.manifestInfoItem}>• Mandatory Welfare Contribution: 5% Dedicated Pool</Text>
              </View>

              {manifestExported ? (
                <View style={styles.manifestDownloadedCard}>
                  <Ionicons name="checkmark-circle" size={36} color={colors.success} />
                  <Text style={styles.manifestDownloadedTitle}>
                    {lastExportType === 'pdf' ? 'Manifest PDF Generated & Downloaded' : 'Shift Roster CSV Exported'}
                  </Text>
                  <Text style={styles.manifestDownloadedMsg}>
                    {lastExportType === 'pdf'
                      ? `File \`${lastExportedFileName}\` generated with all ${bookings.length} itemized assignments and printable ledger layout.`
                      : `File \`${lastExportedFileName}\` downloaded with full shift dataset.`}
                  </Text>
                  <View style={{ marginTop: spacing.md, width: '100%' }}>
                    <Button
                      title="Download / Export Again"
                      icon="refresh-outline"
                      variant="outline"
                      size="sm"
                      onPress={() => setManifestExported(false)}
                      fullWidth
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.manifestActionButtons}>
                  <Button
                    title="Export CSV Shift Roster"
                    icon="download-outline"
                    variant="primary"
                    loading={isExportingManifest && lastExportType === 'csv'}
                    disabled={isExportingManifest}
                    onPress={handleExportManifestCsv}
                    fullWidth
                    style={{ marginBottom: spacing.sm }}
                  />
                  <Button
                    title="Print Master Dispatch PDF"
                    icon="print-outline"
                    variant="outline"
                    loading={isExportingManifest && lastExportType === 'pdf'}
                    disabled={isExportingManifest}
                    onPress={handleDownloadManifestPdf}
                    fullWidth
                  />
                </View>
              )}
            </ScrollView>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  manifestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  manifestBtnText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  statusPillsRow: {
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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  serviceSub: {
    fontSize: 13,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
    flex: 1,
  },
  timeSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  participantCard: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participantTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantRole: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  participantPhone: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addressText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  actionPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  reassignToggleBtn: {
    borderColor: colors.warning,
  },
  reassignBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reassignTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  reassignTradeTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  reassignTradeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  techChoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  techChoiceRowEligible: {
    backgroundColor: '#F0FDF4',
  },
  techChoiceRowBusy: {
    backgroundColor: '#FFFBEB',
    opacity: 0.85,
  },
  techChoiceRowMismatched: {
    backgroundColor: colors.background,
    opacity: 0.7,
  },
  techName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  techSkill: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  eligibleTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  busyTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  mismatchTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.danger,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  financialCard: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  financialTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  finLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  finVal: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  overrideSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
    marginBottom: 6,
  },
  overrideActionsRow: {
    gap: 6,
  },
  stateBtn: {
    marginBottom: 4,
  },
  manifestSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  manifestStat: {
    alignItems: 'center',
  },
  manifestStatNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
  },
  manifestStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  manifestInfoSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  manifestInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  manifestInfoItem: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  manifestDownloadedCard: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.md,
  },
  manifestDownloadedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
    marginTop: spacing.sm,
  },
  manifestDownloadedMsg: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  manifestActionButtons: {
    marginTop: spacing.sm,
  },
});


import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Badge } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { FAQS_DATA, FAQItem } from '../../data/faqs';
import { databaseService } from '../../services/db/databaseService';
import { SupportRequest, SupportCategory, Booking } from '../../types';
import { formatDateTime } from '../../utils/dateTime';
import { triggerPhoneCall } from '../../utils/phone';

interface HelpSupportScreenProps {
  initialBookingId?: string;
  onBack: () => void;
}

type TabType = 'faqs' | 'ticket' | 'my_tickets';

const CATEGORIES: Array<{ key: SupportCategory; langKey: any }> = [
  { key: 'booking_issue', langKey: 'cat_booking_issue' },
  { key: 'payment_dispute', langKey: 'cat_payment_dispute' },
  { key: 'worker_conduct', langKey: 'cat_worker_conduct' },
  { key: 'location_gps', langKey: 'cat_location_gps' },
  { key: 'app_technical', langKey: 'cat_app_technical' },
  { key: 'general_inquiry', langKey: 'cat_general_inquiry' },
];

interface GrievanceTicket {
  id: string;
  category: string;
  bookingRef: string;
  description: string;
  urgency: 'Normal' | 'High' | 'Urgent';
  status: 'Received' | 'In Arbitration' | 'Resolved';
  createdAt: string;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  initialBookingId,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { currentLocation } = useLocation();

  // Active Screen Tab
  const [activeTab, setActiveTab] = useState<TabType>(initialBookingId ? 'ticket' : 'faqs');

  // FAQ State
  const [searchQuery, setSearchQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [faqFeedback, setFaqFeedback] = useState<Record<string, 'helpful' | 'not_helpful'>>({});

  // Modals & Helpline State
  const [helplineModalVisible, setHelplineModalVisible] = useState(false);
  const [activeCallVisible, setActiveCallVisible] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  // Grievance State
  const [grievanceModalVisible, setGrievanceModalVisible] = useState(false);
  const [grievanceCategory, setGrievanceCategory] = useState('Service Quality');
  const [bookingRef, setBookingRef] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [grievanceDesc, setGrievanceDesc] = useState('');
  const [grievanceSuccessMessage, setGrievanceSuccessMessage] = useState<string | null>(null);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<SupportCategory>(
    initialBookingId ? 'booking_issue' : 'general_inquiry'
  );
  const [selectedBookingId, setSelectedBookingId] = useState<string>(initialBookingId || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');

  // Customer Bookings for Dropdown
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<SupportRequest | null>(null);

  // My Tickets State
  const [myTickets, setMyTickets] = useState<SupportRequest[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Active Call Timer simulation
  useEffect(() => {
    let timer: any;
    if (activeCallVisible) {
      timer = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(timer);
  }, [activeCallVisible]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load customer bookings
  useEffect(() => {
    let isMounted = true;
    const loadBookings = async () => {
      try {
        const all = await databaseService.getBookings();
        if (!isMounted) return;
        if (user?.id) {
          const mine = all.filter((b) => b.customerId === user.id);
          setCustomerBookings(mine);
        } else {
          setCustomerBookings(all.slice(0, 5));
        }
      } catch (err) {
        console.warn('Failed to load bookings for support:', err);
      }
    };
    loadBookings();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Load customer support tickets
  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const tickets = await databaseService.getSupportRequests(user?.id);
      setMyTickets(tickets);
    } catch (err) {
      console.warn('Failed to load support tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user?.id]);

  // Subscribe to real-time ticket updates
  useEffect(() => {
    const unsubscribe = databaseService.onBroadcastUpdate((event) => {
      if (event?.type === 'SUPPORT_REQUEST_CREATED') {
        loadTickets();
      }
    });
    return unsubscribe;
  }, [user?.id]);

  // Communication Handlers
  const handleOpenPhone = (phoneNumber: string) => {
    triggerPhoneCall(phoneNumber);
  };

  const handleOpenWhatsApp = () => {
    Linking.openURL('https://wa.me/9118007242527?text=Hello%20Sahakar%20Sathi%20Support');
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@sahakarsathi.coop?subject=Support%20Request%20-%20Sahakar%20Sathi');
  };

  const handleSimulatedHelplineCall = () => {
    setHelplineModalVisible(false);
    setActiveCallVisible(true);
  };

  const handleFileGrievance = () => {
    if (!grievanceDesc.trim()) return;

    const newId = `GRV-${Date.now().toString().slice(-6)}`;
    setGrievanceDesc('');
    setBookingRef('');
    setGrievanceSuccessMessage(
      `Ticket ${newId} submitted. Cooperative Ombudsman will review within 24 hours under statutory SLA.`
    );
  };

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const lang = language === 'hi' || language === 'te' ? language : 'en';

    return FAQS_DATA.filter((faq) => {
      if (faqCategory !== 'all' && faq.category !== faqCategory) {
        return false;
      }
      if (!q) return true;

      const questionText = (faq.question[lang] || faq.question.en).toLowerCase();
      const answerText = (faq.answer[lang] || faq.answer.en).toLowerCase();
      const matchesText = questionText.includes(q) || answerText.includes(q);
      const matchesTags = faq.tags.some((tag) => tag.toLowerCase().includes(q));
      const enQuestion = faq.question.en.toLowerCase();
      const enAnswer = faq.answer.en.toLowerCase();
      const matchesEn = enQuestion.includes(q) || enAnswer.includes(q);

      return matchesText || matchesTags || matchesEn;
    });
  }, [searchQuery, faqCategory, language]);

  // Ticket Submission
  const handleTicketSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject) {
      setFormError('Please provide a subject for your issue.');
      return;
    }
    if (!trimmedMessage) {
      setFormError('Please provide details in the message box.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const linkedBooking = customerBookings.find((b) => b.id === selectedBookingId);

      const created = await databaseService.createSupportRequest({
        customerId: user?.id || 'guest',
        customerName: customerName.trim() || user?.name || 'Customer',
        customerPhone: customerPhone.trim() || user?.phone || '',
        customerEmail: customerEmail.trim() || user?.email || '',
        category: ticketCategory,
        bookingId: selectedBookingId || undefined,
        bookingCode: linkedBooking?.bookingCode,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      setSubmittedTicket(created);
      setSubject('');
      setMessage('');
      setSelectedBookingId(initialBookingId || '');
      loadTickets();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLang = language === 'hi' || language === 'te' ? language : 'en';
  const federationName = currentLocation?.state
    ? `${currentLocation.state} State Labour & Artisan Federation`
    : 'National Apex Labour Cooperative Federation';

  return (
    <View style={styles.container}>
      <Header
        title={t('help_support_title') || 'Help & Support'}
        subtitle="24x7 Cooperative Assistance"
        showBack
        onBack={onBack}
      />

      {/* Tabs Header */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'faqs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('faqs')}
        >
          <Ionicons
            name="help-circle-outline"
            size={18}
            color={activeTab === 'faqs' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'faqs' && styles.tabButtonTextActive,
            ]}
          >
            {(t as any)('tab_faqs') || 'FAQs & Helpline'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ticket' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ticket')}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === 'ticket' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'ticket' && styles.tabButtonTextActive,
            ]}
          >
            {(t as any)('tab_raise_ticket') || 'Raise Ticket'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'my_tickets' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('my_tickets');
            loadTickets();
          }}
        >
          <Ionicons
            name="ticket-outline"
            size={18}
            color={activeTab === 'my_tickets' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'my_tickets' && styles.tabButtonTextActive,
            ]}
          >
            {(t as any)('tab_my_tickets') || 'My Tickets'}
            {myTickets.length > 0 && ` (${myTickets.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TAB 1: FAQS & HELPLINE ================= */}
        {activeTab === 'faqs' && (
          <View>
            {/* Rapid Emergency Assistance */}
            <View style={styles.emergencyBanner}>
              <View style={styles.emergencyIconBox}>
                <Ionicons name="warning" size={24} color={colors.textInverse} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.emergencyTitle}>Immediate Emergency Help</Text>
                <Text style={styles.emergencySub}>For site safety, physical emergencies, or electrical hazards</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleOpenPhone('112')}
                style={styles.emergencyBtn}
              >
                <Ionicons name="call" size={14} color={colors.textInverse} />
                <Text style={styles.emergencyBtnText}>Call 112</Text>
              </TouchableOpacity>
            </View>

            {/* Helpline Fast Action Banner */}
            <View style={styles.helplineBanner}>
              <View style={styles.headsetIcon}>
                <Ionicons name="headset" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.heroTitle}>24x7 Cooperative Helpline</Text>
                <Text style={styles.heroSub}>Toll-Free Government Certified Support</Text>
                <View style={styles.heroButtonsRow}>
                  <TouchableOpacity
                    style={styles.heroCallBtn}
                    onPress={handleSimulatedHelplineCall}
                  >
                    <Ionicons name="call" size={14} color={colors.textInverse} />
                    <Text style={styles.heroCallBtnText}>1800-724-2527</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.heroOptionsBtn}
                    onPress={() => setHelplineModalVisible(true)}
                  >
                    <Ionicons name="options-outline" size={14} color={colors.primary} />
                    <Text style={styles.heroOptionsBtnText}>More Options</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={(t as any)('search_faq_placeholder') || 'Search FAQs, payments, guarantees, booking rules...'}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              <View style={styles.chipsRow}>
                {[
                  { key: 'all', label: 'All Topics' },
                  { key: 'bookings', label: 'Bookings' },
                  { key: 'payments', label: 'Payments & Rates' },
                  { key: 'workers', label: 'Worker Verification' },
                  { key: 'safety', label: 'Safety & Trust' },
                  { key: 'welfare', label: 'Welfare & Guild' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setFaqCategory(cat.key)}
                    style={[styles.chip, faqCategory === cat.key && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, faqCategory === cat.key && styles.chipTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* FAQs Accordion */}
            <Text style={styles.sectionTitle}>Frequently Asked Questions ({filteredFaqs.length})</Text>
            {filteredFaqs.length === 0 ? (
              <View style={styles.noFaqsBox}>
                <Ionicons name="help-circle-outline" size={36} color={colors.textMuted} />
                <Text style={styles.noFaqsTitle}>No matching FAQs found</Text>
                <Text style={styles.noFaqsSub}>Try searching with different keywords or raise a direct support ticket.</Text>
                <TouchableOpacity style={styles.inlineRaiseBtn} onPress={() => setActiveTab('ticket')}>
                  <Text style={styles.inlineRaiseBtnText}>Raise a Support Ticket</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;
                const qText = faq.question[currentLang] || faq.question.en;
                const aText = faq.answer[currentLang] || faq.answer.en;

                return (
                  <View key={faq.id} style={styles.faqCard}>
                    <TouchableOpacity
                      style={styles.faqHeader}
                      onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.faqTitleRow}>
                        <View style={styles.faqDot} />
                        <Text style={styles.faqQuestion}>{qText}</Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.primary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.faqBody}>
                        <Text style={styles.faqAnswer}>{aText}</Text>

                        {/* Helpful / Not Helpful Feedback */}
                        <View style={styles.faqFeedbackRow}>
                          <Text style={styles.faqFeedbackLabel}>Was this helpful?</Text>
                          <TouchableOpacity
                            style={[
                              styles.feedbackBtn,
                              faqFeedback[faq.id] === 'helpful' && styles.feedbackBtnSelected,
                            ]}
                            onPress={() =>
                              setFaqFeedback((prev) => ({ ...prev, [faq.id]: 'helpful' }))
                            }
                          >
                            <Ionicons
                              name="thumbs-up-outline"
                              size={12}
                              color={
                                faqFeedback[faq.id] === 'helpful' ? colors.primary : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.feedbackBtnText,
                                faqFeedback[faq.id] === 'helpful' && styles.feedbackBtnTextSelected,
                              ]}
                            >
                              Yes
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.feedbackBtn,
                              faqFeedback[faq.id] === 'not_helpful' && styles.feedbackBtnSelected,
                            ]}
                            onPress={() =>
                              setFaqFeedback((prev) => ({ ...prev, [faq.id]: 'not_helpful' }))
                            }
                          >
                            <Ionicons
                              name="thumbs-down-outline"
                              size={12}
                              color={
                                faqFeedback[faq.id] === 'not_helpful' ? colors.primary : colors.textSecondary
                              }
                            />
                            <Text
                              style={[
                                styles.feedbackBtnText,
                                faqFeedback[faq.id] === 'not_helpful' && styles.feedbackBtnTextSelected,
                              ]}
                            >
                              No
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Grievance Redressal Banner */}
            <TouchableOpacity
              onPress={() => {
                setGrievanceSuccessMessage(null);
                setGrievanceModalVisible(true);
              }}
              style={styles.reportBanner}
            >
              <View style={styles.reportIconBox}>
                <Ionicons name="shield-half" size={24} color={colors.danger} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={styles.reportTitle}>File a Cooperative Grievance</Text>
                <Text style={styles.reportSub}>Independent Ombudsman arbitration tribunal with 24-hr statutory SLA</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.danger} />
            </TouchableOpacity>

            {/* Local Cooperative Society Chapter Card */}
            <View style={styles.chapterCard}>
              <View style={styles.chapterHeader}>
                <Ionicons name="business" size={20} color={colors.primary} />
                <Text style={styles.chapterTitle}>Local Cooperative Society Chapter</Text>
              </View>
              <Text style={styles.chapterAddress}>
                {federationName} (Regional Operations){
}
                Cooperative Bhavan, {currentLocation?.placeName || currentLocation?.city || 'Regional Center'}, {currentLocation?.state || ''}
              </Text>
              <View style={styles.chapterDetailsRow}>
                <TouchableOpacity onPress={() => handleOpenPhone('+918023456789')} style={styles.chapterLink}>
                  <Ionicons name="call-outline" size={14} color={colors.primary} />
                  <Text style={styles.chapterLinkText}>+91 80 2345 6789</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleOpenEmail} style={styles.chapterLink}>
                  <Ionicons name="mail-outline" size={14} color={colors.primary} />
                  <Text style={styles.chapterLinkText}>support@sahakarsathi.coop</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.chapterHours}>Hours: Monday – Saturday, 09:00 AM – 06:00 PM IST</Text>
            </View>
          </View>
        )}

        {/* ================= TAB 2: RAISE TICKET ================= */}
        {activeTab === 'ticket' && (
          <View style={styles.ticketTabContainer}>
            {submittedTicket ? (
              <View style={styles.successTicketBox}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-done" size={36} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>Support Ticket Created!</Text>
                <Text style={styles.successCode}>Ticket ID: {submittedTicket.ticketCode || submittedTicket.id}</Text>
                <Text style={styles.successDesc}>
                  Our cooperative customer service team has received your ticket and will follow up within 2 hours.
                </Text>
                <View style={styles.successActionsRow}>
                  <Button
                    title="View My Tickets"
                    onPress={() => {
                      setSubmittedTicket(null);
                      setActiveTab('my_tickets');
                      loadTickets();
                    }}
                    style={{ flex: 1, marginRight: spacing.xs }}
                  />
                  <Button
                    title="Raise Another"
                    variant="outline"
                    onPress={() => setSubmittedTicket(null)}
                    style={{ flex: 1, marginLeft: spacing.xs }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.ticketForm}>
                <Text style={styles.formTitle}>Submit a Customer Care Request</Text>
                <Text style={styles.formSub}>
                  Logged issues are assigned directly to cooperative nodal officers for quick resolution.
                </Text>

                {formError && (
                  <View style={styles.errorAlert}>
                    <Ionicons name="alert-circle" size={16} color={colors.danger} />
                    <Text style={styles.errorAlertText}>{formError}</Text>
                  </View>
                )}

                {/* Category Selection */}
                <Text style={styles.inputLabel}>Issue Category *</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = ticketCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.categoryCard,
                          isSelected && styles.categoryCardSelected,
                        ]}
                        onPress={() => setTicketCategory(cat.key)}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={16}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.categoryCardText,
                            isSelected && styles.categoryCardTextSelected,
                          ]}
                        >
                          {t(cat.langKey) || cat.key.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Optional Linked Booking */}
                {customerBookings.length > 0 && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.inputLabel}>Linked Booking (Optional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            styles.bookingChip,
                            !selectedBookingId && styles.bookingChipSelected,
                          ]}
                          onPress={() => setSelectedBookingId('')}
                        >
                          <Text style={[styles.bookingChipText, !selectedBookingId && styles.bookingChipTextSelected]}>
                            None
                          </Text>
                        </TouchableOpacity>
                        {customerBookings.map((b) => {
                          const isSel = selectedBookingId === b.id;
                          return (
                            <TouchableOpacity
                              key={b.id}
                              style={[styles.bookingChip, isSel && styles.bookingChipSelected]}
                              onPress={() => setSelectedBookingId(b.id)}
                            >
                              <Text style={[styles.bookingChipText, isSel && styles.bookingChipTextSelected]}>
                                #{b.bookingCode || b.id.slice(-6)} - {b.serviceTitle}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Subject */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Subject *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Brief summary of the issue"
                    placeholderTextColor={colors.textSecondary}
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>

                {/* Message */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Description / Message *</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe what happened with clear details..."
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                {/* Contact Phone */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.inputLabel}>Callback Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Phone number for updates"
                    placeholderTextColor={colors.textSecondary}
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                  />
                </View>

                <Button
                  title={isSubmitting ? 'Submitting Ticket...' : 'Submit Support Request'}
                  onPress={handleTicketSubmit}
                  disabled={isSubmitting}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 3: MY TICKETS ================= */}
        {activeTab === 'my_tickets' && (
          <View style={styles.myTicketsContainer}>
            <View style={styles.myTicketsHeader}>
              <Text style={styles.sectionTitle}>Your Support Tickets ({myTickets.length})</Text>
              <TouchableOpacity onPress={loadTickets} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {isLoadingTickets ? (
              <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: spacing.sm, color: colors.textSecondary }}>Loading tickets...</Text>
              </View>
            ) : myTickets.length === 0 ? (
              <View style={styles.emptyTicketsBox}>
                <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTicketsTitle}>No Support Tickets</Text>
                <Text style={styles.emptyTicketsSub}>You have not submitted any customer support requests yet.</Text>
                <Button
                  title="Raise a Support Ticket"
                  onPress={() => setActiveTab('ticket')}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              myTickets.map((ticket) => {
                const isExpanded = expandedTicketId === ticket.id;
                const statusColor =
                  ticket.status === 'RESOLVED'
                    ? colors.success
                    : ticket.status === 'IN_PROGRESS'
                    ? colors.warning
                    : colors.info || colors.primary;

                return (
                  <View key={ticket.id} style={styles.ticketCard}>
                    <TouchableOpacity
                      style={styles.ticketHeader}
                      onPress={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.ticketCode}>#{ticket.ticketCode || ticket.id.slice(-6)}</Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                              {ticket.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                        <Text style={styles.ticketDate}>
                          {ticket.createdAt ? formatDateTime(ticket.createdAt) : 'Recently'}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.ticketDetailsBody}>
                        <Text style={styles.ticketMessageLabel}>Your Message:</Text>
                        <Text style={styles.ticketMessageText}>{ticket.message}</Text>

                        {(ticket as any).resolutionNotes && (
                          <View style={styles.resolutionBox}>
                            <Text style={styles.resolutionTitle}>Resolution Notes:</Text>
                            <Text style={styles.resolutionText}>{(ticket as any).resolutionNotes}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* 1. Helpline Channels Modal */}
      <Modal
        visible={helplineModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelplineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>24x7 Cooperative Helpdesk</Text>
                <Text style={styles.modalSub}>Select your preferred communication channel</Text>
              </View>
              <TouchableOpacity onPress={() => setHelplineModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.channelList}>
              <TouchableOpacity
                style={styles.channelItem}
                onPress={() => {
                  setHelplineModalVisible(false);
                  handleOpenPhone('18007242527');
                }}
              >
                <View style={[styles.channelIcon, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="call" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.channelName}>Toll-Free Phone</Text>
                  <Text style={styles.channelDetail}>1800-724-2527 (Toll-Free 24x7)</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.channelItem}
                onPress={() => {
                  setHelplineModalVisible(false);
                  handleOpenWhatsApp();
                }}
              >
                <View style={[styles.channelIcon, { backgroundColor: '#E8F8EE' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.channelName}>WhatsApp Cooperative Desk</Text>
                  <Text style={styles.channelDetail}>Instant chat & document sharing</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.channelItem}
                onPress={() => {
                  setHelplineModalVisible(false);
                  handleOpenEmail();
                }}
              >
                <View style={[styles.channelIcon, { backgroundColor: '#EBF4FF' }]}>
                  <Ionicons name="mail" size={22} color="#3B82F6" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.channelName}>Official Email Support</Text>
                  <Text style={styles.channelDetail}>support@sahakarsathi.coop</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Simulated Toll-Free Live Call Modal */}
      <Modal visible={activeCallVisible} transparent={false} animationType="slide">
        <View style={styles.callScreen}>
          <View style={styles.callHeader}>
            <Text style={styles.callOrg}>Sahakar Sathi National Federation</Text>
            <Text style={styles.callStatus}>Connected • 24x7 Citizen Care</Text>
            <Text style={styles.callTimerText}>{formatTimer(callTimer)}</Text>
          </View>

          <View style={styles.callCenter}>
            <View style={styles.callAvatarRing}>
              <Ionicons name="headset" size={56} color={colors.textInverse} />
            </View>
            <Text style={styles.callerName}>Cooperative Customer Desk</Text>
            <Text style={styles.callerNumber}>1800-724-2527 (Toll-Free)</Text>
            <Text style={styles.callNote}>
              This call is recorded for quality training and dispute arbitration under cooperative bylaws.
            </Text>
          </View>

          <View style={styles.callControls}>
            <TouchableOpacity
              style={[styles.callControlBtn, isMuted && styles.callControlBtnActive]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={colors.textInverse} />
              <Text style={styles.callControlText}>{isMuted ? 'Muted' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callControlBtn, isSpeaker && styles.callControlBtnActive]}
              onPress={() => setIsSpeaker(!isSpeaker)}
            >
              <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={24} color={colors.textInverse} />
              <Text style={styles.callControlText}>{isSpeaker ? 'Speaker On' : 'Speaker'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={() => setActiveCallVisible(false)}
            >
              <Ionicons name="call" size={28} color={colors.textInverse} style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Grievance Filing Modal */}
      <Modal
        visible={grievanceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGrievanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>File Cooperative Grievance</Text>
                <Text style={styles.modalSub}>Statutory dispute resolution and grievance filing</Text>
              </View>
              <TouchableOpacity onPress={() => setGrievanceModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {grievanceSuccessMessage ? (
                <View style={styles.grievanceSuccessCard}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                  <Text style={styles.grievanceSuccessTitle}>Grievance Filed Successfully</Text>
                  <Text style={styles.grievanceSuccessBody}>{grievanceSuccessMessage}</Text>
                  <Button
                    title="Close"
                    onPress={() => {
                      setGrievanceSuccessMessage(null);
                      setGrievanceModalVisible(false);
                    }}
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <Text style={styles.formLabel}>Grievance Category</Text>
                  <View style={styles.urgencyRow}>
                    {['Service Quality', 'Billing Dispute', 'Worker Misconduct', 'Other'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setGrievanceCategory(cat)}
                        style={[
                          styles.urgencyChip,
                          grievanceCategory === cat && styles.urgencyChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyChipText,
                            grievanceCategory === cat && styles.urgencyChipTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>Booking Reference (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. BK-98241"
                    placeholderTextColor={colors.textSecondary}
                    value={bookingRef}
                    onChangeText={setBookingRef}
                  />

                  <Text style={styles.formLabel}>Urgency Priority</Text>
                  <View style={styles.urgencyRow}>
                    {(['Normal', 'High', 'Urgent'] as const).map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        onPress={() => setUrgencyLevel(lvl)}
                        style={[
                          styles.urgencyChip,
                          urgencyLevel === lvl && styles.urgencyChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyChipText,
                            urgencyLevel === lvl && styles.urgencyChipTextActive,
                          ]}
                        >
                          {lvl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.formLabel}>Description of Complaint *</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Provide specific details of your grievance..."
                    placeholderTextColor={colors.textSecondary}
                    value={grievanceDesc}
                    onChangeText={setGrievanceDesc}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Button
                    title="Submit Statutory Grievance"
                    onPress={handleFileGrievance}
                    disabled={!grievanceDesc.trim()}
                    style={{ marginTop: spacing.md }}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  emergencyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  emergencySub: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },
  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  emergencyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  helplineBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  headsetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    ...typography.h4,
    color: colors.text,
  },
  heroSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: 8,
  },
  heroCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  heroCallBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  heroOptionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  heroOptionsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  chipsScroll: {
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  noFaqsBox: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  noFaqsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  noFaqsSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  inlineRaiseBtn: {
    marginTop: spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  inlineRaiseBtnText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 12,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  faqTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
    gap: 8,
  },
  faqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  faqBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  faqFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    gap: 8,
  },
  faqFeedbackLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 3,
  },
  feedbackBtnSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  feedbackBtnText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  feedbackBtnTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  reportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  reportSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chapterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  chapterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  chapterAddress: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  chapterDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: spacing.xs,
  },
  chapterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chapterLinkText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  chapterHours: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ticketTabContainer: {
    paddingVertical: spacing.xs,
  },
  ticketForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  formTitle: {
    ...typography.h4,
    color: colors.text,
  },
  formSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    gap: 6,
  },
  errorAlertText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  categoryCardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  categoryCardText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  categoryCardTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : 6,
    fontSize: 13,
    color: colors.text,
  },
  textArea: {
    height: 90,
  },
  bookingChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bookingChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bookingChipTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  successTicketBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.h3,
    color: colors.text,
  },
  successCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  successDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  successActionsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    width: '100%',
  },
  myTicketsContainer: {
    paddingVertical: spacing.xs,
  },
  myTicketsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyTicketsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  emptyTicketsTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyTicketsSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  ticketCode: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  ticketDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  ticketDetailsBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  ticketMessageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  ticketMessageText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  resolutionBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  resolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 2,
  },
  resolutionText: {
    fontSize: 11,
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  channelList: {
    gap: spacing.sm,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  channelDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  callScreen: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: spacing.xl,
    justifyContent: 'space-between',
  },
  callHeader: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  callOrg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  callStatus: {
    fontSize: 16,
    color: colors.textInverse,
    fontWeight: '700',
    marginTop: 4,
  },
  callTimerText: {
    fontSize: 18,
    color: colors.primaryLight,
    fontWeight: '700',
    marginTop: 8,
  },
  callCenter: {
    alignItems: 'center',
  },
  callAvatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  callerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textInverse,
  },
  callerNumber: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  callNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
  },
  callControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  callControlBtn: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: 70,
    height: 70,
    justifyContent: 'center',
  },
  callControlBtnActive: {
    backgroundColor: colors.primary,
  },
  callControlText: {
    fontSize: 10,
    color: colors.textInverse,
    marginTop: 4,
  },
  endCallBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: spacing.xs,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  urgencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  urgencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urgencyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  urgencyChipText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  urgencyChipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.text,
  },
  modalTextArea: {
    height: 80,
  },
  grievanceSuccessCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  grievanceSuccessTitle: {
    ...typography.h4,
    color: colors.success,
    marginTop: spacing.sm,
  },
  grievanceSuccessBody: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});

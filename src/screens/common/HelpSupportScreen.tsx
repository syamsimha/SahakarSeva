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
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
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

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  initialBookingId,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  // Active Screen Tab
  const [activeTab, setActiveTab] = useState<TabType>(initialBookingId ? 'ticket' : 'faqs');

  // FAQ State
  const [searchQuery, setSearchQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

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

  // Filtered FAQs
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const lang = (language === 'hi' || language === 'te') ? language : 'en';

    return FAQS_DATA.filter((faq) => {
      // Category filter
      if (faqCategory !== 'all' && faq.category !== faqCategory) {
        return false;
      }
      // Search query filter
      if (!q) return true;

      const questionText = (faq.question[lang] || faq.question.en).toLowerCase();
      const answerText = (faq.answer[lang] || faq.answer.en).toLowerCase();
      const matchesText = questionText.includes(q) || answerText.includes(q);
      const matchesTags = faq.tags.some((tag) => tag.toLowerCase().includes(q));

      // Also match English question/answer as cross-search
      const enQuestion = faq.question.en.toLowerCase();
      const enAnswer = faq.answer.en.toLowerCase();
      const matchesEn = enQuestion.includes(q) || enAnswer.includes(q);

      return matchesText || matchesTags || matchesEn;
    });
  }, [searchQuery, faqCategory, language]);

  // Handle Ticket Submit
  const handleTicketSubmit = async () => {
    setFormError(null);

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!customerName.trim()) {
      setFormError(t('validation_name_required'));
      return;
    }
    if (trimmedSubject.length < 3) {
      setFormError(t('validation_subject_required'));
      return;
    }
    if (trimmedMessage.length < 10) {
      setFormError(t('validation_message_required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const linkedBooking = customerBookings.find((b) => b.id === selectedBookingId);

      const created = await databaseService.createSupportRequest({
        customerId: user?.id || 'cust-anonymous',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        bookingId: selectedBookingId || undefined,
        bookingCode: linkedBooking?.bookingCode || undefined,
        category: ticketCategory,
        subject: trimmedSubject,
        message: trimmedMessage,
      });

      setSubmittedTicket(created);
      setSubject('');
      setMessage('');
      loadTickets();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Contact Handlers
  const supportPhone = process.env.EXPO_PUBLIC_SUPPORT_PHONE;
  const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

  const handleCallSupport = () => {
    if (supportPhone) {
      triggerPhoneCall(supportPhone);
    }
  };

  const handleEmailSupport = () => {
    if (supportEmail) {
      Linking.openURL(`mailto:${supportEmail}?subject=SahakarSeva Customer Support Request`);
    }
  };

  const currentLang = (language === 'hi' || language === 'te') ? language : 'en';

  return (
    <View style={styles.container}>
      <Header title={t('help_support_title')} showBack onBack={onBack} />

      {/* Screen Subtitle */}
      <View style={styles.subHeaderBar}>
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        <Text style={styles.subHeaderText}>{t('help_subtitle')}</Text>
      </View>

      {/* Top Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'faqs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('faqs')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="help-circle-outline"
            size={16}
            color={activeTab === 'faqs' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabButtonText, activeTab === 'faqs' && styles.tabButtonTextActive]}>
            {t('faq_tab')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'ticket' && styles.tabButtonActive]}
          onPress={() => {
            setSubmittedTicket(null);
            setActiveTab('ticket');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="create-outline"
            size={16}
            color={activeTab === 'ticket' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabButtonText, activeTab === 'ticket' && styles.tabButtonTextActive]}>
            {t('submit_ticket_tab')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'my_tickets' && styles.tabButtonActive]}
          onPress={() => {
            loadTickets();
            setActiveTab('my_tickets');
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeTab === 'my_tickets' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabButtonText, activeTab === 'my_tickets' && styles.tabButtonTextActive]}>
            {t('my_tickets_tab')}
          </Text>
          {myTickets.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{myTickets.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ======================================================== */}
        {/* TAB 1: FAQS & GUIDE */}
        {/* ======================================================== */}
        {activeTab === 'faqs' && (
          <View>
            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('faq_search_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
              {[
                { key: 'all', label: t('all_faqs') },
                { key: 'booking', label: 'Bookings' },
                { key: 'services', label: 'Services' },
                { key: 'emergency', label: 'Priority 24/7' },
                { key: 'tracking', label: 'Live Tracking' },
                { key: 'location', label: 'Location & GPS' },
                { key: 'account', label: 'Language & Profile' },
              ].map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  onPress={() => setFaqCategory(chip.key)}
                  style={[styles.chip, faqCategory === chip.key && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, faqCategory === chip.key && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* FAQs List */}
            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="search-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('no_faqs_found')}</Text>
                <Text style={styles.emptySub}>
                  Can't find what you're looking for? Submit a support request directly to our cooperative federation desk.
                </Text>
                <Button
                  title={t('submit_ticket_tab')}
                  icon="create-outline"
                  variant="primary"
                  size="sm"
                  onPress={() => setActiveTab('ticket')}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              <View style={styles.faqsList}>
                {filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  const questionText = faq.question[currentLang] || faq.question.en;
                  const answerText = faq.answer[currentLang] || faq.answer.en;

                  return (
                    <TouchableOpacity
                      key={faq.id}
                      activeOpacity={0.8}
                      onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}
                    >
                      <View style={styles.faqHeaderRow}>
                        <View style={styles.faqIconContainer}>
                          <Ionicons
                            name={isExpanded ? 'help-circle' : 'help-circle-outline'}
                            size={18}
                            color={isExpanded ? colors.primary : colors.textSecondary}
                          />
                        </View>
                        <Text style={[styles.faqQuestion, isExpanded && styles.faqQuestionExpanded]}>
                          {questionText}
                        </Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={isExpanded ? colors.primary : colors.textMuted}
                        />
                      </View>

                      {isExpanded && (
                        <View style={styles.faqBody}>
                          <Text style={styles.faqAnswer}>{answerText}</Text>
                          <View style={styles.faqTagsRow}>
                            {faq.tags.slice(0, 3).map((tag, idx) => (
                              <View key={idx} style={styles.faqTagPill}>
                                <Text style={styles.faqTagText}>#{tag}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Direct Contact Card */}
            <View style={styles.contactCard}>
              <View style={styles.contactCardHeader}>
                <Ionicons name="call-outline" size={20} color={colors.primary} />
                <Text style={styles.contactCardTitle}>{t('direct_helpline')}</Text>
              </View>
              <Text style={styles.contactCardHours}>{t('helpline_hours')}</Text>

              {supportPhone || supportEmail ? (
                <View style={styles.contactActionsRow}>
                  {supportPhone && (
                    <TouchableOpacity
                      onPress={handleCallSupport}
                      style={styles.contactActionBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="call" size={16} color={colors.primary} />
                      <Text style={styles.contactActionText}>{supportPhone}</Text>
                    </TouchableOpacity>
                  )}
                  {supportEmail && (
                    <TouchableOpacity
                      onPress={handleEmailSupport}
                      style={styles.contactActionBtn}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="mail" size={16} color={colors.primary} />
                      <Text style={styles.contactActionText}>{supportEmail}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.contactFallbackText}>{t('helpline_fallback')}</Text>
              )}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SUBMIT SUPPORT TICKET */}
        {/* ======================================================== */}
        {activeTab === 'ticket' && (
          <View>
            {submittedTicket ? (
              <View style={styles.successCard}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                </View>
                <Text style={styles.successTitle}>{t('ticket_submitted_success')}</Text>
                <Text style={styles.successDesc}>
                  {t('ticket_submitted_desc', { code: submittedTicket.ticketCode })}
                </Text>

                <View style={styles.ticketSummaryBox}>
                  <View style={styles.ticketSummaryRow}>
                    <Text style={styles.ticketSummaryLabel}>{t('support_ticket_id')}:</Text>
                    <Text style={styles.ticketSummaryCode}>{submittedTicket.ticketCode}</Text>
                  </View>
                  <View style={styles.ticketSummaryRow}>
                    <Text style={styles.ticketSummaryLabel}>{t('support_submitted_on')}:</Text>
                    <Text style={styles.ticketSummaryVal}>
                      {formatDateTime(submittedTicket.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.ticketSummaryRow}>
                    <Text style={styles.ticketSummaryLabel}>Status:</Text>
                    <View style={styles.statusPillOpen}>
                      <Text style={styles.statusPillTextOpen}>{t('ticket_status_open')}</Text>
                    </View>
                  </View>
                  <View style={styles.ticketSummaryRow}>
                    <Text style={styles.ticketSummaryLabel}>Subject:</Text>
                    <Text style={styles.ticketSummaryVal}>{submittedTicket.subject}</Text>
                  </View>
                </View>

                <View style={styles.successActionsRow}>
                  <Button
                    title="View My Support Requests"
                    icon="receipt-outline"
                    variant="primary"
                    size="md"
                    onPress={() => {
                      setSubmittedTicket(null);
                      setActiveTab('my_tickets');
                    }}
                    style={{ flex: 1, marginRight: spacing.sm }}
                  />
                  <Button
                    title="Submit Another"
                    icon="add-circle-outline"
                    variant="outline"
                    size="md"
                    onPress={() => setSubmittedTicket(null)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.formCard}>
                <Text style={styles.formHeaderTitle}>{t('contact_coop_support')}</Text>
                <Text style={styles.formHeaderSub}>{t('contact_support_desc')}</Text>

                {formError && (
                  <View style={styles.formErrorBanner}>
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    <Text style={styles.formErrorText}>{formError}</Text>
                  </View>
                )}

                {/* Category Selection */}
                <Text style={styles.fieldLabel}>{t('ticket_category')} *</Text>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = ticketCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setTicketCategory(cat.key)}
                        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={
                            cat.key === 'booking_issue'
                              ? 'calendar-outline'
                              : cat.key === 'payment_dispute'
                              ? 'card-outline'
                              : cat.key === 'worker_conduct'
                              ? 'people-outline'
                              : cat.key === 'location_gps'
                              ? 'navigate-outline'
                              : cat.key === 'app_technical'
                              ? 'hardware-chip-outline'
                              : 'information-circle-outline'
                          }
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.categoryCardText,
                            isSelected && styles.categoryCardTextSelected,
                          ]}
                        >
                          {t(cat.langKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Related Booking Selector */}
                <Text style={styles.fieldLabel}>{t('ticket_booking')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingsScroll}>
                  <TouchableOpacity
                    onPress={() => setSelectedBookingId('')}
                    style={[
                      styles.bookingOptionPill,
                      !selectedBookingId && styles.bookingOptionPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bookingOptionText,
                        !selectedBookingId && styles.bookingOptionTextActive,
                      ]}
                    >
                      {t('no_booking_linked')}
                    </Text>
                  </TouchableOpacity>

                  {customerBookings.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => setSelectedBookingId(b.id)}
                      style={[
                        styles.bookingOptionPill,
                        selectedBookingId === b.id && styles.bookingOptionPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bookingOptionText,
                          selectedBookingId === b.id && styles.bookingOptionTextActive,
                        ]}
                      >
                        #{b.bookingCode} - {b.serviceTitle}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Customer Details */}
                <View style={styles.formRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.fieldLabel}>{t('ticket_customer_name')} *</Text>
                    <TextInput
                      style={styles.input}
                      value={customerName}
                      onChangeText={setCustomerName}
                      placeholder="Your Full Name"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>{t('ticket_customer_phone')}</Text>
                    <TextInput
                      style={styles.input}
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                      placeholder="+91..."
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* Subject */}
                <Text style={styles.fieldLabel}>{t('ticket_subject')} *</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('ticket_subject_placeholder')}
                  value={subject}
                  onChangeText={setSubject}
                />

                {/* Message */}
                <Text style={styles.fieldLabel}>{t('ticket_message')} *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('ticket_message_placeholder')}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <Button
                  title={isSubmitting ? t('submitting_ticket') : t('submit_ticket_button')}
                  icon={isSubmitting ? undefined : 'send'}
                  variant="primary"
                  size="lg"
                  loading={isSubmitting}
                  onPress={handleTicketSubmit}
                  style={{ marginTop: spacing.lg }}
                />
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MY REQUESTS (STATUS TRACKING) */}
        {/* ======================================================== */}
        {activeTab === 'my_tickets' && (
          <View>
            <View style={styles.myTicketsHeader}>
              <Text style={styles.sectionTitle}>My Support Requests</Text>
              <TouchableOpacity onPress={loadTickets} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <Text style={styles.refreshBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {isLoadingTickets ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading your requests...</Text>
              </View>
            ) : myTickets.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="file-tray-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>{t('no_tickets_yet')}</Text>
                <Text style={styles.emptySub}>{t('no_tickets_desc')}</Text>
                <Button
                  title={t('submit_ticket_tab')}
                  icon="create-outline"
                  variant="primary"
                  size="sm"
                  onPress={() => setActiveTab('ticket')}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            ) : (
              <View style={styles.ticketsList}>
                {myTickets.map((tkt) => {
                  const isExpanded = expandedTicketId === tkt.id;
                  const catItem = CATEGORIES.find((c) => c.key === tkt.category);
                  const catLabel = catItem ? t(catItem.langKey) : tkt.category;

                  const statusPillStyle =
                    tkt.status === 'RESOLVED'
                      ? styles.statusPillResolved
                      : tkt.status === 'IN_PROGRESS'
                      ? styles.statusPillProgress
                      : styles.statusPillOpen;

                  const statusTextStyle =
                    tkt.status === 'RESOLVED'
                      ? styles.statusPillTextResolved
                      : tkt.status === 'IN_PROGRESS'
                      ? styles.statusPillTextProgress
                      : styles.statusPillTextOpen;

                  const statusLabel =
                    tkt.status === 'RESOLVED'
                      ? t('ticket_status_resolved')
                      : tkt.status === 'IN_PROGRESS'
                      ? t('ticket_status_in_progress')
                      : t('ticket_status_open');

                  return (
                    <TouchableOpacity
                      key={tkt.id}
                      style={styles.ticketCard}
                      activeOpacity={0.8}
                      onPress={() => setExpandedTicketId(isExpanded ? null : tkt.id)}
                    >
                      <View style={styles.ticketCardHeader}>
                        <View>
                          <Text style={styles.ticketCode}>{tkt.ticketCode}</Text>
                          <Text style={styles.ticketCatText}>{catLabel}</Text>
                        </View>
                        <View style={statusPillStyle}>
                          <Text style={statusTextStyle}>{statusLabel}</Text>
                        </View>
                      </View>

                      <Text style={styles.ticketSubject}>{tkt.subject}</Text>

                      {tkt.bookingCode && (
                        <View style={styles.ticketBookingPill}>
                          <Ionicons name="link-outline" size={12} color={colors.primary} />
                          <Text style={styles.ticketBookingCode}>Booking #{tkt.bookingCode}</Text>
                        </View>
                      )}

                      <View style={styles.ticketFooterRow}>
                        <Text style={styles.ticketDate}>{formatDateTime(tkt.createdAt)}</Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>

                      {isExpanded && (
                        <View style={styles.ticketDetailBox}>
                          <Text style={styles.ticketDetailLabel}>Message:</Text>
                          <Text style={styles.ticketDetailMsg}>{tkt.message}</Text>
                          <View style={styles.ticketOfficerNote}>
                            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                            <Text style={styles.ticketOfficerNoteText}>
                              Your ticket has been logged with the Cooperative Dispute Tribunal & Support Desk.
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  subHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  badgeCount: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  badgeCountText: {
    color: colors.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  chipsScroll: {
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  faqsList: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqCardExpanded: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqIconContainer: {
    marginRight: 8,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginRight: 6,
  },
  faqQuestionExpanded: {
    color: colors.primary,
  },
  faqBody: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  faqAnswer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  faqTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  faqTagPill: {
    backgroundColor: colors.divider,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  faqTagText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 320,
  },
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactCardTitle: {
    ...typography.h4,
    color: colors.text,
  },
  contactCardHours: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xs,
  },
  contactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    gap: 6,
  },
  contactActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  contactFallbackText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeaderTitle: {
    ...typography.h3,
    color: colors.text,
  },
  formHeaderSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  formErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 8,
    marginBottom: spacing.md,
  },
  formErrorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryCardText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  categoryCardTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  bookingsScroll: {
    marginBottom: spacing.sm,
  },
  bookingOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  bookingOptionPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  bookingOptionText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bookingOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.text,
  },
  textArea: {
    minHeight: 90,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  successIconCircle: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.h3,
    color: colors.success,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  ticketSummaryBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: 8,
  },
  ticketSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  ticketSummaryCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  ticketSummaryVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  successActionsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  myTicketsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  refreshBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  centerLoading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  ticketsList: {
    gap: spacing.sm,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  ticketCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  ticketCatText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  ticketBookingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  ticketBookingCode: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  ticketFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  ticketDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  ticketDetailBox: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketDetailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  ticketDetailMsg: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 16,
  },
  ticketOfficerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: borderRadius.sm,
    marginTop: 8,
  },
  ticketOfficerNoteText: {
    fontSize: 10,
    color: colors.textSecondary,
    flex: 1,
  },
  statusPillOpen: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillTextOpen: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  statusPillProgress: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillTextProgress: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
  },
  statusPillResolved: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusPillTextResolved: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
});

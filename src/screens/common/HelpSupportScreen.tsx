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
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Badge } from '../../components/ui';
import { useLocation } from '../../context/LocationContext';
import { Ionicons } from '@expo/vector-icons';

interface HelpSupportScreenProps {
  onBack: () => void;
}

interface FaqItem {
  id: string;
  category: 'bookings' | 'payments' | 'workers' | 'cooperative';
  q: string;
  a: string;
}

interface GrievanceTicket {
  id: string;
  category: string;
  bookingRef: string;
  description: string;
  urgency: 'Normal' | 'High' | 'Urgent';
  status: 'Received' | 'In Arbitration' | 'Resolved';
  createdAt: string;
}

const FAQS_DATA: FaqItem[] = [
  {
    id: '1',
    category: 'workers',
    q: 'How does Sahakar Sathi verify and certify workers?',
    a: 'Every worker must be an active member of a registered Labour Cooperative Society. Verification requires government Aadhaar biometric authentication, police clearance certificate, and trade competency certification from recognized ITI or state skill councils.',
  },
  {
    id: '2',
    category: 'cooperative',
    q: 'What is the 5% Cooperative Welfare Cess on bills?',
    a: 'Unlike commercial aggregators charging 20% to 30% corporate commissions, Sahakar Sathi is non-profit and worker-owned. A statutory 5% cess is deposited straight into the State Worker Welfare Fund for emergency health insurance (PMJJBY) and pension pools.',
  },
  {
    id: '3',
    category: 'bookings',
    q: 'Can I reschedule or cancel a booking with zero penalty?',
    a: 'Yes. You can reschedule or cancel with 100% full refund and zero penalty at any time before the cooperative technician marks their status as "On The Way". After that, a nominal ₹50 fuel transit allowance applies.',
  },
  {
    id: '4',
    category: 'payments',
    q: 'How are worker payments settled and protected?',
    a: 'Payments are settled directly via RBI-approved cooperative banking payment gateways (UPI, debit/credit cards, or post-service cash). 100% of the agreed service rate goes directly to the technician with zero hidden cuts.',
  },
  {
    id: '5',
    category: 'bookings',
    q: 'What if a technician does not arrive on time?',
    a: 'If a cooperative worker is delayed by more than 20 minutes without prior communication, our automated dispatch system alerts the nearest backup guild member. You also receive an automatic ₹100 credit on your booking bill.',
  },
  {
    id: '6',
    category: 'payments',
    q: 'How fast are refunds processed if I cancel?',
    a: 'Refunds for digital payments (UPI / Cards) are initiated immediately and credited back to your original source account within 2 to 4 hours via automated cooperative banking rails.',
  },
  {
    id: '7',
    category: 'workers',
    q: 'Are workers covered under insurance during service?',
    a: 'Yes. Every verified technician is protected under the Cooperative Group Accident Shield (up to ₹5,00,000) and third-party household property damage guarantee up to ₹25,000.',
  },
  {
    id: '8',
    category: 'cooperative',
    q: 'What is the role of the Cooperative Ombudsman?',
    a: 'The Ombudsman is an independent state judicial officer designated to resolve customer and worker disputes fairly without commercial bias. Decisions are legally binding under the State Cooperative Societies Act.',
  },
];

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const { currentLocation, federationName } = useLocation();
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('1');
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [faqFeedback, setFaqFeedback] = useState<Record<string, 'helpful' | 'not_helpful'>>({});

  // Modals
  const [helplineModalVisible, setHelplineModalVisible] = useState(false);
  const [activeCallVisible, setActiveCallVisible] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  const [selectedTopic, setSelectedTopic] = useState<{
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    summary: string;
    points: string[];
    actionLabel: string;
    onAction: () => void;
  } | null>(null);

  const [grievanceModalVisible, setGrievanceModalVisible] = useState(false);
  const [grievanceCategory, setGrievanceCategory] = useState('Service Quality');
  const [bookingRef, setBookingRef] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [grievanceDesc, setGrievanceDesc] = useState('');
  const [grievanceSuccessMessage, setGrievanceSuccessMessage] = useState<string | null>(null);

  const [tickets, setTickets] = useState<GrievanceTicket[]>([
    {
      id: '#COOP-GR-9921',
      category: 'Billing Query',
      bookingRef: 'SS-BK-1049',
      description: 'Requesting clarification on the 5% cooperative welfare cess itemization.',
      urgency: 'Normal',
      status: 'Resolved',
      createdAt: 'Yesterday, 4:20 PM',
    },
  ]);

  // Live Call Timer effect
  useEffect(() => {
    let interval: any;
    if (activeCallVisible) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeCallVisible]);

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleOpenPhone = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      // Fallback to simulated call
      setHelplineModalVisible(false);
      setActiveCallVisible(true);
    });
  };

  const handleOpenWhatsApp = () => {
    Linking.openURL('https://wa.me/918007242527?text=Hello%20Sahakar%20Sathi%20Helpdesk%2C%20I%20need%20assistance.').catch(() => {});
  };

  const handleOpenEmail = () => {
    Linking.openURL('mailto:support@sahakarsathi.coop?subject=Support%20Request%20-%20Sahakar%20Sathi').catch(() => {});
  };

  const handleFileGrievance = () => {
    if (!grievanceDesc.trim()) return;
    const newId = `#COOP-GR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: GrievanceTicket = {
      id: newId,
      category: grievanceCategory,
      bookingRef: bookingRef.trim() || 'General Inquiry',
      description: grievanceDesc.trim(),
      urgency: urgencyLevel,
      status: 'Received',
      createdAt: 'Just now',
    };
    setTickets([newTicket, ...tickets]);
    setGrievanceDesc('');
    setBookingRef('');
    setGrievanceSuccessMessage(`Ticket ${newId} submitted. Cooperative Ombudsman will review within 24 hours.`);
  };

  // Filtered FAQs
  const filteredFaqs = FAQS_DATA.filter((item) => {
    const matchesCategory = faqCategory === 'all' || item.category === faqCategory;
    const matchesQuery =
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <View style={styles.container}>
      <Header title="Help & Support Desk" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Support Channels Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <View style={styles.headsetIcon}>
              <Ionicons name="headset" size={28} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.heroTitle}>24x7 Cooperative Helpdesk</Text>
              <Text style={styles.heroSub}>Toll-free assistance in English, Hindi, Kannada & Telugu</Text>
            </View>
          </View>
          <View style={styles.heroButtonsRow}>
            <Button
              title="Call Helpline"
              icon="call"
              onPress={() => setHelplineModalVisible(true)}
              variant="primary"
              size="sm"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="WhatsApp"
              icon="logo-whatsapp"
              onPress={handleOpenWhatsApp}
              variant="outline"
              size="sm"
              style={{ flex: 1, marginLeft: 6, borderColor: colors.success }}
              textStyle={{ color: colors.success }}
            />
          </View>
        </View>

        {/* Quick Help Topics */}
        <Text style={styles.sectionTitle}>Help Topics</Text>
        <View style={styles.topicsGrid}>
          {[
            {
              title: 'Booking Help',
              icon: 'calendar-outline' as const,
              summary: 'Modify, track, or reschedule technician visits',
              points: [
                'Free rescheduling anytime before worker departs.',
                'Real-time GPS tracking enabled once worker starts travel.',
                'Direct OTP authentication ensures correct technician arrival.',
                'Option to reassign worker if delayed beyond 20 minutes.',
              ],
              actionLabel: 'Call Dispatch Desk',
              onAction: () => {
                setSelectedTopic(null);
                setHelplineModalVisible(true);
              },
            },
            {
              title: 'Payment Help',
              icon: 'card-outline' as const,
              summary: 'Pricing, welfare cess & instant refund assistance',
              points: [
                '100% transparent pricing with zero commercial markups.',
                'Only 5% statutory welfare cess for worker healthcare fund.',
                'Instant UPI refunds processed within 2 to 4 hours.',
                'Official GST and cooperative tax invoices generated automatically.',
              ],
              actionLabel: 'View Cess Policy',
              onAction: () => {
                setSelectedTopic(null);
                setExpandedFaqId('2');
              },
            },
            {
              title: 'Worker Support',
              icon: 'construct-outline' as const,
              summary: 'Member welfare, tools fund & guild standards',
              points: [
                'Standardized minimum wage guarantee for all registered trades.',
                'Access to interest-free cooperative tool equipment loans.',
                'Direct state labor board welfare registration assistance.',
                'Free annual health checkup at empanelled cooperative hospitals.',
              ],
              actionLabel: 'Guild Welfare Inquiries',
              onAction: () => {
                setSelectedTopic(null);
                setHelplineModalVisible(true);
              },
            },
            {
              title: 'Emergency SOS',
              icon: 'flash-outline' as const,
              summary: 'Immediate rapid intervention & grievance triage',
              points: [
                'Priority dispatch of cooperative supervisor within 15 minutes.',
                'Direct escalation to Women Safety & Labor Vigilance Cell.',
                'Third-party household accidental damage insurance coverage.',
                'Police (112) and ambulance direct helpline links available 24/7.',
              ],
              actionLabel: 'Trigger Emergency Dispatch',
              onAction: () => {
                setSelectedTopic(null);
                handleOpenPhone('112');
              },
            },
          ].map((topic, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => setSelectedTopic(topic)}
              style={styles.topicCard}
            >
              <View style={styles.topicIconCircle}>
                <Ionicons name={topic.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicSub} numberOfLines={1}>{topic.summary}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs Section */}
        <View style={styles.faqSectionHeader}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.faqCountText}>{filteredFaqs.length} answers</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search questions, keywords (cess, refund...)"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryPills}>
          {[
            { id: 'all', label: 'All' },
            { id: 'bookings', label: 'Bookings' },
            { id: 'payments', label: 'Payments & Cess' },
            { id: 'workers', label: 'Verification' },
            { id: 'cooperative', label: 'Cooperative Model' },
          ].map((cat) => {
            const isSelected = faqCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFaqCategory(cat.id)}
                style={[styles.catPill, isSelected && styles.catPillActive]}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* FAQ Accordion List */}
        <View style={styles.faqsList}>
          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyFaq}>
              <Ionicons name="help-circle-outline" size={32} color={colors.textMuted} />
              <Text style={styles.emptyFaqTitle}>No matching answers found</Text>
              <Text style={styles.emptyFaqSub}>Try another search query or ask our helpdesk directly.</Text>
            </View>
          ) : (
            filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              const feedback = faqFeedback[faq.id];
              return (
                <View key={faq.id} style={[styles.faqCard, isExpanded && styles.faqCardExpanded]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    style={styles.faqTop}
                  >
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={isExpanded ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqBody}>
                      <Text style={styles.faqAnswer}>{faq.a}</Text>
                      <View style={styles.feedbackRow}>
                        <Text style={styles.feedbackPrompt}>Was this answer helpful?</Text>
                        {feedback ? (
                          <Text style={styles.feedbackThanks}>✓ Thank you for your feedback</Text>
                        ) : (
                          <View style={styles.feedbackButtons}>
                            <TouchableOpacity
                              onPress={() => setFaqFeedback((prev) => ({ ...prev, [faq.id]: 'helpful' }))}
                              style={styles.feedbackBtn}
                            >
                              <Ionicons name="thumbs-up-outline" size={14} color={colors.primary} />
                              <Text style={styles.feedbackBtnText}>Yes</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setFaqFeedback((prev) => ({ ...prev, [faq.id]: 'not_helpful' }))}
                              style={styles.feedbackBtn}
                            >
                              <Ionicons name="thumbs-down-outline" size={14} color={colors.textMuted} />
                              <Text style={styles.feedbackBtnText}>No</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Report an Issue / Dispute Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
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
            {federationName} (Regional Operations){'\n'}
            Cooperative Bhavan, {currentLocation.placeName || currentLocation.city}, {currentLocation.state || ''} - {currentLocation.pincode || '530003'}
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
      </ScrollView>

      {/* 1. Helpline Modal */}
      <Modal visible={helplineModalVisible} transparent animationType="fade" onRequestClose={() => setHelplineModalVisible(false)}>
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
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.channelTitle}>Toll-Free Helpline (National)</Text>
                  <Text style={styles.channelDesc}>1800-SAHAKAR (1800-724-2527) • Zero Call Charges</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.channelItem}
                onPress={() => {
                  setHelplineModalVisible(false);
                  handleOpenWhatsApp();
                }}
              >
                <View style={[styles.channelIcon, { backgroundColor: '#DCF8C6' }]}>
                  <Ionicons name="logo-whatsapp" size={22} color="#075E54" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.channelTitle}>WhatsApp Support Desk</Text>
                  <Text style={styles.channelDesc}>Chat with live cooperative officer • Quick resolution</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.channelItem}
                onPress={() => {
                  setHelplineModalVisible(false);
                  setActiveCallVisible(true);
                }}
              >
                <View style={[styles.channelIcon, { backgroundColor: colors.accentLight }]}>
                  <Ionicons name="headset" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.channelTitle}>In-App Voice Call (Simulated)</Text>
                  <Text style={styles.channelDesc}>Connect directly with on-duty cooperative agent</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Simulated In-App Live Call Screen */}
      <Modal visible={activeCallVisible} transparent={false} animationType="slide">
        <View style={styles.callScreen}>
          <View style={styles.callTop}>
            <View style={styles.callShieldBadge}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.callShieldText}>ENCRYPTED COOPERATIVE LINE</Text>
            </View>
            <Text style={styles.callTitle}>Sahakar Sathi Support</Text>
            <Text style={styles.callAgent}>Officer Savitha K. (Malleshwaram Hub)</Text>
            <Text style={styles.callTimer}>{formatCallTime(callTimer)}</Text>
          </View>

          <View style={styles.callCenterAvatar}>
            <View style={styles.callAvatarCircle}>
              <Ionicons name="person" size={64} color={colors.primary} />
            </View>
            <View style={styles.waveContainer}>
              <View style={[styles.waveDot, { height: 16 }]} />
              <View style={[styles.waveDot, { height: 28 }]} />
              <View style={[styles.waveDot, { height: 42 }]} />
              <View style={[styles.waveDot, { height: 24 }]} />
              <View style={[styles.waveDot, { height: 36 }]} />
              <View style={[styles.waveDot, { height: 20 }]} />
            </View>
            <Text style={styles.callNotice}>
              "Hello! Welcome to Sahakar Sathi Cooperative Desk. How can we help you today?"
            </Text>
          </View>

          <View style={styles.callControls}>
            <TouchableOpacity
              onPress={() => setIsMuted(!isMuted)}
              style={[styles.callControlBtn, isMuted && styles.callControlBtnActive]}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={colors.text} />
              <Text style={styles.callControlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveCallVisible(false)}
              style={styles.endCallBtn}
            >
              <Ionicons name="call" size={32} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSpeaker(!isSpeaker)}
              style={[styles.callControlBtn, isSpeaker && styles.callControlBtnActive]}
            >
              <Ionicons name={isSpeaker ? 'volume-high' : 'volume-mute'} size={24} color={colors.text} />
              <Text style={styles.callControlLabel}>{isSpeaker ? 'Speaker' : 'Earpiece'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Help Topic Detail Modal */}
      <Modal visible={Boolean(selectedTopic)} transparent animationType="fade" onRequestClose={() => setSelectedTopic(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedTopic && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.channelIcon, { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: colors.primaryLight }]}>
                      <Ionicons name={selectedTopic.icon} size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>{selectedTopic.title}</Text>
                      <Text style={styles.modalSub}>{selectedTopic.summary}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedTopic(null)}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.topicPointsList}>
                  {selectedTopic.points.map((pt, idx) => (
                    <View key={idx} style={styles.topicPointRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginTop: 2, marginRight: 8 }} />
                      <Text style={styles.topicPointText}>{pt}</Text>
                    </View>
                  ))}
                </View>

                <View style={{ marginTop: spacing.md }}>
                  <Button
                    title={selectedTopic.actionLabel}
                    onPress={selectedTopic.onAction}
                    variant="primary"
                    size="md"
                    fullWidth
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. Grievance & Dispute Filing Modal */}
      <Modal visible={grievanceModalVisible} transparent animationType="slide" onRequestClose={() => setGrievanceModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Cooperative Ombudsman Tribunal</Text>
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
                    title="File Another Dispute"
                    onPress={() => setGrievanceSuccessMessage(null)}
                    variant="outline"
                    size="sm"
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.formLabel}>Grievance Category</Text>
                  <View style={styles.categoryGrid}>
                    {['Service Quality', 'Billing / Overcharging', 'Delay / No-Show', 'Safety & Conduct', 'Other'].map((cat) => {
                      const isSel = grievanceCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setGrievanceCategory(cat)}
                          style={[styles.miniCatPill, isSel && styles.miniCatPillActive]}
                        >
                          <Text style={[styles.miniCatText, isSel && styles.miniCatTextActive]}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.formLabel}>Booking Reference ID (Optional)</Text>
                  <TextInput
                    value={bookingRef}
                    onChangeText={setBookingRef}
                    placeholder="e.g. SS-BK-2024"
                    placeholderTextColor={colors.textMuted}
                    style={styles.formInput}
                  />

                  <Text style={styles.formLabel}>Urgency Level</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm }}>
                    {(['Normal', 'High', 'Urgent'] as const).map((lvl) => {
                      const isSel = urgencyLevel === lvl;
                      return (
                        <TouchableOpacity
                          key={lvl}
                          onPress={() => setUrgencyLevel(lvl)}
                          style={[styles.urgencyPill, isSel && styles.urgencyPillActive]}
                        >
                          <Text style={[styles.urgencyText, isSel && styles.urgencyTextActive]}>{lvl}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.formLabel}>Describe Your Issue</Text>
                  <TextInput
                    value={grievanceDesc}
                    onChangeText={setGrievanceDesc}
                    placeholder="Please provide specifics of what happened..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    style={[styles.formInput, { height: 90, textAlignVertical: 'top' }]}
                  />

                  <Button
                    title="Submit to Cooperative Ombudsman"
                    icon="shield-checkmark"
                    onPress={handleFileGrievance}
                    variant="primary"
                    size="md"
                    fullWidth
                    style={{ marginTop: spacing.md }}
                    disabled={!grievanceDesc.trim()}
                  />
                </>
              )}

              {/* Previously Filed Tickets */}
              {tickets.length > 0 && (
                <View style={{ marginTop: spacing.lg }}>
                  <Text style={styles.filedHeader}>Your Filed Disputes ({tickets.length})</Text>
                  {tickets.map((t) => (
                    <View key={t.id} style={styles.ticketCard}>
                      <View style={styles.ticketTop}>
                        <Text style={styles.ticketId}>{t.id}</Text>
                        <Badge
                          label={t.status}
                          variant={t.status === 'Resolved' ? 'verified' : 'status'}
                          status={t.status === 'Resolved' ? 'completed' : 'requested'}
                        />
                      </View>
                      <Text style={styles.ticketCategory}>{t.category} • Ref: {t.bookingRef}</Text>
                      <Text style={styles.ticketDesc}>{t.description}</Text>
                      <Text style={styles.ticketDate}>{t.createdAt}</Text>
                    </View>
                  ))}
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroLeft: {
    flexDirection: 'row',
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
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginVertical: spacing.xs,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  topicCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  topicSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  faqSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  faqCountText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    color: colors.text,
    padding: 0,
  },
  categoryPills: {
    gap: 6,
    paddingBottom: spacing.sm,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catPillTextActive: {
    color: colors.primary,
  },
  faqsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  emptyFaq: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  emptyFaqTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  emptyFaqSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
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
  },
  faqTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  faqBody: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  faqAnswer: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  feedbackPrompt: {
    fontSize: 10,
    color: colors.textMuted,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  feedbackThanks: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.success,
  },
  reportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    marginBottom: spacing.md,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  reportSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  chapterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  chapterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  chapterAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  chapterDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chapterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chapterLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  chapterHours: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
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
  channelList: {
    gap: spacing.sm,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  channelDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  callScreen: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  callTop: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  callShieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    marginBottom: spacing.sm,
  },
  callShieldText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
  },
  callTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
  callAgent: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  callTimer: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  callCenterAvatar: {
    alignItems: 'center',
    width: '100%',
  },
  callAvatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.lg,
    height: 50,
  },
  waveDot: {
    width: 5,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  callNotice: {
    fontSize: 12,
    color: '#CBD5E1',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  callControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
  },
  callControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E293B',
  },
  callControlBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  callControlLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  endCallBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicPointsList: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  topicPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  topicPointText: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  miniCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniCatPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  miniCatText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  miniCatTextActive: {
    color: colors.primary,
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
  urgencyPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urgencyPillActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyTextActive: {
    color: colors.accentDark,
    fontWeight: '700',
  },
  grievanceSuccessCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  grievanceSuccessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  grievanceSuccessBody: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  filedHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  ticketCategory: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  ticketDesc: {
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
  },
  ticketDate: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
  },
});

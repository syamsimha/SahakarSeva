import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';

interface HelpSupportScreenProps {
  onBack: () => void;
}

const faqs = [
  {
    q: 'How does Sahakar Sathi verify workers?',
    a: 'Every worker must be an active member of a registered Labour Cooperative Society with Aadhaar validation, police clearance certificate, and trade competency diploma.',
  },
  {
    q: 'What is the 5% Cooperative Welfare Cess on bills?',
    a: 'Unlike private aggregator commissions of 20-30%, Sahakar Sathi takes zero corporate profit. A nominal 5% cess is deposited straight into the cooperative fund for worker health and pension coverage.',
  },
  {
    q: 'Can I cancel or reschedule a booking?',
    a: 'Yes, you can cancel or reschedule with zero penalty up until the cooperative technician marks "On The Way".',
  },
  {
    q: 'How do workers receive their fair payments?',
    a: 'Settlements occur directly through RBI-approved cooperative banking channels with immediate transaction receipts.',
  },
];

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ onBack }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const handleHelpline = () => {
    Alert.alert('Emergency Helpline', 'Connecting to 24x7 Cooperative Call Center: +91 1800-SAHAKAR (Toll-Free)');
  };

  const handleReport = () => {
    Alert.alert('Report a Grievance', 'Grievance ticket created under Cooperative Ombudsman Tribunal Protocol (Mock ticket #GT-9921).');
  };

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
              <Text style={styles.heroSub}>Toll-free assistance in English, Hindi & Telugu</Text>
            </View>
          </View>
          <Button
            title="Call Helpline"
            icon="call"
            onPress={handleHelpline}
            variant="primary"
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* Quick Help Topics */}
        <Text style={styles.sectionTitle}>Help Topics</Text>
        <View style={styles.topicsGrid}>
          {[
            { title: 'Booking Help', icon: 'calendar-outline' },
            { title: 'Payment Help', icon: 'card-outline' },
            { title: 'Worker Support', icon: 'construct-outline' },
            { title: 'Emergency SOS', icon: 'flash-outline' },
          ].map((t, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => Alert.alert(t.title, `Help articles and automated resolution for ${t.title}.`)}
              style={styles.topicCard}
            >
              <Ionicons name={t.icon as any} size={22} color={colors.primary} />
              <Text style={styles.topicTitle}>{t.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqsList}>
          {faqs.map((faq, i) => {
            const isExpanded = expandedIndex === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => toggleFaq(i)}
                style={styles.faqCard}
              >
                <View style={styles.faqTop}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
                {isExpanded && <Text style={styles.faqAnswer}>{faq.a}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Report an Issue */}
        <TouchableOpacity onPress={handleReport} style={styles.reportBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.reportTitle}>Report an Issue or Dispute</Text>
            <Text style={styles.reportSub}>File an immediate complaint with Cooperative Arbitration Desk</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.danger} />
        </TouchableOpacity>
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
  topicTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: 6,
  },
  faqsList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  faqAnswer: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  reportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
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
});

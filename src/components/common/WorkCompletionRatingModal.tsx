import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Button, Avatar } from '../ui';
import { Booking } from '../../types';
import { useBookings } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface WorkCompletionRatingModalProps {
  visible: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  5: '⭐⭐⭐⭐⭐ Outstanding • 5.0',
  4: '⭐⭐⭐⭐ Very Good • 4.0',
  3: '⭐⭐⭐ Good Service • 3.0',
  2: '⭐⭐ Needs Improvement • 2.0',
  1: '⭐ Unsatisfactory • 1.0',
};

const COMPLIMENT_TAGS = [
  'Punctual & On-Time',
  'Expert Workmanship',
  'Courteous & Polite',
  'Cleaned Up Afterwards',
  'Fair & Transparent Pricing',
  'Used Safety Gear',
];

export const WorkCompletionRatingModal: React.FC<WorkCompletionRatingModalProps> = ({
  visible,
  booking,
  onClose,
  onSubmitSuccess,
}) => {
  const { user } = useAuth();
  const { rateBooking } = useBookings();
  const { t } = useLanguage();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Punctual & On-Time',
    'Expert Workmanship',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!booking) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const fullComment =
        selectedTags.length > 0
          ? `[${selectedTags.join(', ')}] ${comment.trim()}`
          : comment.trim() || 'Work completed satisfactorily.';

      await rateBooking(
        booking.id,
        booking.workerId,
        user?.id || booking.customerId || 'cust-101',
        user?.name || booking.customerName || 'Valued Member',
        rating,
        fullComment
      );

      Alert.alert(
        'Rating & Review Submitted',
        `Thank you! Your verified feedback helps recognize ${booking.workerName} and strengthen our cooperative community.`
      );

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Unable to submit review at this moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Banner */}
          <View style={styles.topHeader}>
            <View style={styles.celebrationBadge}>
              <Ionicons name="checkmark-done-circle" size={18} color="#16A34A" />
              <Text style={styles.celebrationBadgeText}>WORK COMPLETED</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.title}>How was your service experience?</Text>
            <Text style={styles.subtitle}>
              Your rating and review directly support cooperative workers and help maintain high quality standards.
            </Text>

            {/* Worker Summary Strip */}
            <View style={styles.workerStrip}>
              <Avatar name={booking.workerName} size={48} showVerifiedBadge />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.workerName}>{booking.workerName}</Text>
                <Text style={styles.workerSkill}>
                  {booking.workerSkill} • {booking.cooperativeName}
                </Text>
                <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
              </View>
            </View>

            {/* Star Rating Selection */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionLabel}>Select Your Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => setRating(star)}
                    style={styles.starTouch}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingLabelText}>{RATING_LABELS[rating]}</Text>
            </View>

            {/* Compliments / Quality Tags */}
            <View style={styles.tagsSection}>
              <Text style={styles.sectionLabel}>What went well?</Text>
              <View style={styles.tagsGrid}>
                {COMPLIMENT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      style={[styles.tagPill, isSelected && styles.tagPillSelected]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark' : 'add'}
                        size={13}
                        color={isSelected ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.tagPillText,
                          isSelected && styles.tagPillTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Review Comment Box */}
            <View style={styles.commentSection}>
              <Text style={styles.sectionLabel}>Write a Review (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Share your experience to help the cooperative community..."
                placeholderTextColor={colors.textSecondary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={styles.footerRow}>
            <Button
              title="Remind Later"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title={isSubmitting ? 'Submitting...' : 'Submit Rating & Review'}
              variant="primary"
              loading={isSubmitting}
              onPress={handleSubmit}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    ...typography.shadowLg,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  celebrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  celebrationBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
    marginBottom: spacing.md,
  },
  workerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  workerSkill: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  serviceTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 3,
  },
  ratingSection: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  starTouch: {
    padding: 2,
  },
  ratingLabelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 6,
  },
  tagsSection: {
    marginBottom: spacing.md,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tagPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  commentSection: {
    marginBottom: spacing.md,
  },
  commentInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
});

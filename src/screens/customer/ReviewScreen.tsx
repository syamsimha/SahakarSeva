import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Avatar } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface ReviewScreenProps {
  bookingId: string;
  onSuccess: () => void;
  onBack: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  bookingId,
  onSuccess,
  onBack,
}) => {
  const { user } = useAuth();
  const { bookings, rateBooking } = useBookings();
  const booking = bookings.find((b) => b.id === bookingId);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Punctual & Polite', 'Fair Pricing']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header title="Rate Service" showBack onBack={onBack} />
        <View style={styles.center}><Text>Booking not found</Text></View>
      </View>
    );
  }

  const tags = [
    'Punctual & Polite',
    'Fair Pricing',
    'Expert Workmanship',
    'Cleaned Up Afterwards',
    'Cooperative Etiquette',
    'Safety Tools Used',
  ];

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
      const fullComment = selectedTags.length > 0
        ? `[${selectedTags.join(', ')}] ${comment}`
        : comment || 'Excellent cooperative service!';

      await rateBooking(
        booking.id,
        booking.workerId,
        user?.id || 'cust-101',
        user?.name || 'Ramesh Sharma',
        rating,
        fullComment
      );

      Alert.alert('Review Submitted', 'Thank you! Your verified feedback helps strengthen our cooperative.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Rate & Review Service" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Worker Card Header */}
        <View style={styles.workerSummary}>
          <Avatar name={booking.workerName} size={64} showVerifiedBadge />
          <Text style={styles.workerName}>{booking.workerName}</Text>
          <Text style={styles.workerSkill}>{booking.workerSkill}</Text>
          <Text style={styles.coopName}>{booking.cooperativeName}</Text>
          <Text style={styles.serviceCompletedText}>Completed: {booking.serviceTitle}</Text>
        </View>

        {/* 5-Star Selector */}
        <View style={styles.starsCard}>
          <Text style={styles.starsTitle}>How was your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starBtn}
              >
                <Ionicons
                  name={rating >= star ? 'star' : 'star-outline'}
                  size={36}
                  color="#F59E0B"
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingDescriptor}>
            {rating === 5
              ? 'Outstanding Cooperative Service ⭐⭐⭐⭐⭐'
              : rating === 4
              ? 'Very Good'
              : rating === 3
              ? 'Satisfactory'
              : 'Needs Improvement'}
          </Text>
        </View>

        {/* Quality Tags */}
        <View style={styles.tagsCard}>
          <Text style={styles.tagsTitle}>What did you like the most?</Text>
          <View style={styles.tagsGrid}>
            {tags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tagPill, isSelected && styles.tagPillActive]}
                >
                  <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>
                    {isSelected ? '✓ ' : '+ '}
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Written Review */}
        <View style={styles.commentCard}>
          <Text style={styles.commentTitle}>Detailed Feedback (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={comment}
            onChangeText={setComment}
            placeholder="Share details of worker behavior, cleanliness, and fair-wage satisfaction..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Submit */}
        <Button
          title="Submit Verified Review"
          icon="checkmark-circle"
          onPress={handleSubmit}
          loading={isSubmitting}
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  workerSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerName: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  workerSkill: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  serviceCompletedText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
  },
  starsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  starsTitle: {
    ...typography.h4,
    color: colors.text,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.md,
  },
  starBtn: {
    padding: 4,
  },
  ratingDescriptor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  tagsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  tagText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tagTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  commentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 90,
  },
});

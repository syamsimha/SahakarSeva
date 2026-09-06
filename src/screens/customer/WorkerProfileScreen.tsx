import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Avatar, StarRating, Badge, Button } from '../../components/ui';
import { workerService, bookingService } from '../../services';
import { WorkerProfile, Review } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface WorkerProfileScreenProps {
  workerId: string;
  onBookService: (workerId: string) => void;
  onBack: () => void;
}

export const WorkerProfileScreen: React.FC<WorkerProfileScreenProps> = ({
  workerId,
  onBookService,
  onBack,
}) => {
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const w = await workerService.getWorkerById(workerId);
        if (w) setWorker(w);
        const revs = await bookingService.getReviewsForWorker(workerId);
        setReviews(revs);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workerId]);

  if (loading || !worker) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Worker Profile" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <Avatar
            name={worker.name}
            url={worker.avatarUrl}
            size={72}
            showVerifiedBadge={worker.verificationStatus === 'verified'}
          />

          <View style={styles.headerInfo}>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={styles.primaryTrade}>{worker.primarySkill}</Text>
            
            <View style={styles.coopRow}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.coopName}>{worker.cooperativeName}</Text>
            </View>

            <View style={styles.statusRow}>
              <Badge variant="verified" />
              {worker.isAvailable ? (
                <Badge label="Available Today" style={{ marginLeft: 6 }} />
              ) : (
                <Badge label="Busy" style={{ marginLeft: 6, backgroundColor: colors.border }} />
              )}
            </View>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {reviews.length > 0
                ? `⭐ ${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}`
                : (worker.reviewCount > 0 && worker.rating ? `⭐ ${worker.rating.toFixed(1)}` : 'New')}
            </Text>
            <Text style={styles.statLabel}>
              {reviews.length > 0
                ? `${reviews.length} ${reviews.length === 1 ? 'Review' : 'Reviews'}`
                : (worker.reviewCount > 0 ? `${worker.reviewCount} Reviews` : 'No ratings yet')}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{worker.experienceYears}+ Yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{worker.completedJobsCount}</Text>
            <Text style={styles.statLabel}>Jobs Done</Text>
          </View>
        </View>

        {/* Transparent Fair Wage Pricing Box */}
        <View style={styles.pricingCard}>
          <View style={styles.pricingHeader}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.pricingTitle}>Cooperative Fair Wage Tariff</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Base Visit & Inspection Fee</Text>
            <Text style={styles.pricingAmount}>₹{worker.baseRate}</Text>
          </View>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Standard Hourly Labour Rate</Text>
            <Text style={styles.pricingAmount}>₹{worker.hourlyRate}/hr</Text>
          </View>
          <View style={styles.welfareNotice}>
            <Ionicons name="heart" size={12} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.welfareNoticeText}>
              Includes 5% welfare cess for health & pension security
            </Text>
          </View>
        </View>

        {/* About & Craftsmanship */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{worker.about}</Text>
        </View>

        {/* Skills & Specializations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specializations & Trade Skills</Text>
          <View style={styles.skillsChips}>
            {worker.allSkills.map((skill, index) => (
              <View key={index} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Certifications & Cooperative Endorsement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications & Guild Verification</Text>
          {worker.certifications.map((cert, index) => (
            <View key={index} style={styles.certRow}>
              <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
              <Text style={styles.certText}>{cert}</Text>
            </View>
          ))}
        </View>

        {/* Service Area & Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Coverage & Languages</Text>
          <View style={styles.metaInfoRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaInfoText}>
              <Text style={{ fontWeight: '600' }}>Zones: </Text>{worker.serviceArea} (Within {worker.serviceRadiusKm} km)
            </Text>
          </View>
          <View style={[styles.metaInfoRow, { marginTop: 6 }]}>
            <Ionicons name="chatbubbles-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.metaInfoText}>
              <Text style={{ fontWeight: '600' }}>Languages: </Text>{worker.languages.join(', ')}
            </Text>
          </View>
        </View>

        {/* Customer Testimonials & Reviews */}
        <View style={styles.section}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Customer Testimonials ({reviews.length})</Text>
            <StarRating rating={worker.rating} count={worker.reviewCount} size={13} />
          </View>

          {reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>Verified jobs completed. Reviews updating soon.</Text>
          ) : (
            reviews.map((rev) => (
              <View key={rev.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={styles.reviewerName}>{rev.customerName}</Text>
                  <Text style={styles.reviewDate}>{rev.createdAt}</Text>
                </View>
                <StarRating rating={rev.rating} showCount={false} size={12} style={{ marginVertical: 4 }} />
                <Text style={styles.reviewComment}>"{rev.comment}"</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Booking Action */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Base Booking</Text>
          <Text style={styles.bottomPriceVal}>₹{worker.baseRate}</Text>
        </View>
        <Button
          title="Book Service"
          icon="calendar"
          onPress={() => onBookService(worker.id)}
          variant="primary"
          size="lg"
          style={styles.bookBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  workerName: {
    ...typography.h3,
    color: colors.text,
  },
  primaryTrade: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  coopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  pricingCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pricingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  pricingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pricingAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  welfareNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    marginTop: spacing.sm,
  },
  welfareNoticeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  aboutText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  skillsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  skillChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  skillChipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  certText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 8,
    fontWeight: '500',
  },
  metaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  noReviewsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  reviewCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  reviewComment: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomPriceCol: {
    flexDirection: 'column',
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  bottomPriceVal: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  bookBtn: {
    minWidth: 160,
  },
});

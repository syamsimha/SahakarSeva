import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    icon: 'people' as const,
    badgeText: 'Verified & Trusted',
    title: 'Find Trusted Local Cooperative Workers',
    subtitle:
      'Connect with skilled electricians, plumbers, carpenters and technicians endorsed by genuine Labour Cooperative Societies with police clearance.',
    accentColor: colors.primary,
  },
  {
    id: 2,
    icon: 'calendar-outline' as const,
    badgeText: 'Transparent Booking',
    title: 'Book Verified Services With Fair Pricing',
    subtitle:
      'Select time slots, review transparent rates without hidden surge charges, and track verified workers arriving at your doorstep.',
    accentColor: colors.accent,
  },
  {
    id: 3,
    icon: 'shield-checkmark' as const,
    badgeText: 'Worker Welfare',
    title: 'Empower Workers & Strengthen Cooperatives',
    subtitle:
      '100% of fair wages reach workers directly with comprehensive group health cover, accident insurance, and collective dignity.',
    accentColor: colors.secondary,
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { completeOnboarding } = useAuth();

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
      onComplete();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    onComplete();
  };

  const slide = slides[currentSlideIndex];
  const isLastSlide = currentSlideIndex === slides.length - 1;

  return (
    <View style={styles.container}>
      {/* Top Bar with Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>SAHAKAR SATHI</Text>
        </View>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Slide Content */}
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${slide.accentColor}18`, borderColor: slide.accentColor }]}>
          <Ionicons name={slide.icon} size={64} color={slide.accentColor} />
        </View>

        <View style={[styles.badge, { backgroundColor: `${slide.accentColor}15` }]}>
          <Text style={[styles.badgeText, { color: slide.accentColor }]}>{slide.badgeText}</Text>
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomBar}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentSlideIndex
                  ? [styles.activeDot, { backgroundColor: slide.accentColor }]
                  : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <Button
          title={isLastSlide ? 'Get Started' : 'Next'}
          icon={isLastSlide ? 'checkmark-circle' : 'arrow-forward'}
          iconPosition="right"
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
          style={{ backgroundColor: slide.accentColor }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  skipBtn: {
    padding: 6,
  },
  skipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: spacing.xl,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  bottomBar: {
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: colors.border,
  },
});

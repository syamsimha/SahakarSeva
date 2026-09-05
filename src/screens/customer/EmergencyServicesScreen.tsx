import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, MapPlaceholder } from '../../components/ui';
import { emergencyServices } from '../../data';
import { useBookings } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { EmergencyService, Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface EmergencyServicesScreenProps {
  onBookingSuccess: (booking: Booking) => void;
  onBack: () => void;
}

export const EmergencyServicesScreen: React.FC<EmergencyServicesScreenProps> = ({
  onBookingSuccess,
  onBack,
}) => {
  const { user } = useAuth();
  const { createBooking } = useBookings();
  const { currentLocation, openLocationModal } = useLocation();
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyService>(emergencyServices[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTriggerEmergency = async () => {
    setIsSubmitting(true);
    try {
      const created = await createBooking({
        customerId: user?.id || 'cust-101',
        customerName: user?.name || 'Ramesh Sharma',
        customerPhone: user?.phone || '+91 98450 12345',
        workerId: 'worker-101',
        workerName: 'Suresh Kumar (Priority On-Call)',
        workerSkill: selectedEmergency.title.split(' ')[1] || 'Technician',
        workerPhone: '+91 98765 43210',
        cooperativeName: 'Nagarika Seva Sahakari Samiti Ltd.',
        categoryId: selectedEmergency.categoryId,
        serviceTitle: selectedEmergency.title,
        scheduledDate: 'Immediate Dispatch',
        scheduledTimeSlot: `ETA: ${selectedEmergency.etaMinutes} mins`,
        status: 'on_the_way',
        serviceLocation: {
          addressLine: currentLocation.address || user?.address || 'Service Location',
          city: currentLocation.city || 'Bengaluru',
          pincode: currentLocation.pincode || '560038',
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        instructions: `URGENT: Cooperative Emergency SOS Protocol [Area: ${currentLocation.placeName || currentLocation.city}]`,
        estimatedAmount: selectedEmergency.baseEmergencyPrice,
        welfareCessAmount: Math.round(selectedEmergency.baseEmergencyPrice * 0.05),
        isEmergency: true,
        paymentMethod: 'upi',
        paymentStatus: 'pending',
      });

      onBookingSuccess(created);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Emergency 24x7 Response" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Emergency Alert Banner */}
        <View style={styles.alertHeader}>
          <View style={styles.alertIcon}>
            <Ionicons name="flash" size={28} color={colors.textInverse} />
          </View>
          <View style={styles.alertTexts}>
            <Text style={styles.alertTitle}>Cooperative Rapid Dispatch</Text>
            <Text style={styles.alertSubtitle}>
              Direct hotline for water leaks, short circuits & urgent technical assistance.
            </Text>
          </View>
        </View>

        {/* Current Location & Map Indicator */}
        <View style={styles.mapBox}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openLocationModal}
            style={styles.locRow}
          >
            <Ionicons
              name={currentLocation.isGPS ? 'navigate' : 'location'}
              size={16}
              color={colors.danger}
            />
            <Text style={styles.locText} numberOfLines={1}>
              Dispatch to: {currentLocation.placeName || currentLocation.city} ({currentLocation.address})
            </Text>
            <Text style={styles.changeGpsLink}>Modify / GPS</Text>
          </TouchableOpacity>
          <MapPlaceholder
            height={140}
            locationName={`${currentLocation.isGPS ? '🛰️ Live GPS Active' : '📍 Place'}: ${currentLocation.placeName || currentLocation.city}`}
            workerCount={5}
          />
        </View>

        {/* Emergency Trade Selection */}
        <Text style={styles.sectionTitle}>Select Urgent Requirement</Text>

        <View style={styles.servicesList}>
          {emergencyServices.map((svc) => {
            const isSelected = selectedEmergency.id === svc.id;
            return (
              <TouchableOpacity
                key={svc.id}
                onPress={() => setSelectedEmergency(svc)}
                style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
              >
                <View style={styles.serviceTop}>
                  <View style={styles.serviceTitleRow}>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.danger : colors.textMuted}
                    />
                    <Text style={[styles.serviceTitle, isSelected && styles.serviceTitleActive]}>
                      {svc.title}
                    </Text>
                  </View>
                  <View style={styles.etaBadge}>
                    <Ionicons name="time" size={12} color={colors.danger} />
                    <Text style={styles.etaText}>{svc.etaMinutes} min ETA</Text>
                  </View>
                </View>

                <Text style={styles.serviceDesc}>{svc.description}</Text>

                <View style={styles.serviceBottom}>
                  <Text style={styles.availText}>
                    🟢 {svc.activeWorkersNearby} verified workers nearby
                  </Text>
                  <Text style={styles.priceText}>₹{svc.baseEmergencyPrice}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Emergency SOS Button */}
        <View style={styles.ctaBox}>
          <Button
            title={`Dispatch Now • ₹${selectedEmergency.baseEmergencyPrice}`}
            icon="flash"
            onPress={handleTriggerEmergency}
            loading={isSubmitting}
            variant="emergency"
            size="lg"
            fullWidth
          />
          <Text style={styles.helplineText}>
            Or call Cooperative Emergency Desk: +91 1800-SAHAKAR (Toll-Free)
          </Text>
        </View>
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
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertTexts: {
    flex: 1,
  },
  alertTitle: {
    ...typography.h4,
    color: colors.textInverse,
  },
  alertSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 16,
  },
  mapBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  locText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
    marginRight: 8,
  },
  changeGpsLink: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  servicesList: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  serviceCardActive: {
    borderColor: colors.danger,
    backgroundColor: '#FFF5F5',
  },
  serviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6,
  },
  serviceTitleActive: {
    color: colors.danger,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  etaText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
    marginLeft: 3,
  },
  serviceDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginVertical: 6,
    lineHeight: 16,
  },
  serviceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  availText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },
  ctaBox: {
    alignItems: 'center',
  },
  helplineText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

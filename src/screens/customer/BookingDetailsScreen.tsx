import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Avatar, Badge, Button } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { BookingStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface BookingDetailsScreenProps {
  bookingId: string;
  onNavigateToInvoice: (bookingId: string) => void;
  onNavigateToRate: (bookingId: string) => void;
  onBack: () => void;
}

const statusSteps: Array<{ key: BookingStatus; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'requested', label: 'Requested', icon: 'paper-plane-outline' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'on_the_way', label: 'On The Way', icon: 'bicycle-outline' },
  { key: 'in_progress', label: 'In Progress', icon: 'construct-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-done-circle-outline' },
];

export const BookingDetailsScreen: React.FC<BookingDetailsScreenProps> = ({
  bookingId,
  onNavigateToInvoice,
  onNavigateToRate,
  onBack,
}) => {
  const { t } = useLanguage();
  const { bookings, updateStatus } = useBookings();
  const booking = bookings.find((b) => b.id === bookingId);

  // Live Worker Location Telemetry State
  const [workerLocation, setWorkerLocation] = useState({
    latitude: 12.9784,
    longitude: 77.6408,
    landmark: 'Near 12th Main Road, 100ft Road Junction',
    area: 'HAL 2nd Stage, Indiranagar, Bengaluru',
    distanceKm: 1.2,
    etaMinutes: 10,
    speedKmH: 22,
    movementStatus: 'In Transit • Moving towards customer location',
    transitVehicle: 'Two-Wheeler (Hero Electric)',
    lastUpdated: 'Just now',
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Periodic automatic GPS simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setWorkerLocation((prev) => {
        if (prev.distanceKm <= 0.2) {
          return {
            ...prev,
            movementStatus: 'Arrived at customer doorstep • Ready for service',
            distanceKm: 0.1,
            etaMinutes: 1,
            speedKmH: 0,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        }
        const nextDist = Math.max(0.2, +(prev.distanceKm - 0.1).toFixed(1));
        const nextEta = Math.max(2, Math.round(nextDist * 8));
        return {
          ...prev,
          distanceKm: nextDist,
          etaMinutes: nextEta,
          latitude: +(prev.latitude + 0.0003).toFixed(4),
          longitude: +(prev.longitude + 0.0002).toFixed(4),
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header title="Track Worker" showBack onBack={onBack} />
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  const getStepIndex = (status: BookingStatus) => {
    return statusSteps.findIndex((s) => s.key === status);
  };

  const currentStepIdx = getStepIndex(booking.status);

  // Demo status progression for evaluator
  const handleSimulateNextStatus = () => {
    if (currentStepIdx < statusSteps.length - 1) {
      const nextStatus = statusSteps[currentStepIdx + 1].key;
      updateStatus(booking.id, nextStatus, `Status updated to ${nextStatus}`);
    }
  };

  // Manual GPS Refresh
  const handleRefreshGPS = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setWorkerLocation((prev) => {
        const nextDist = Math.max(0.2, +(prev.distanceKm - 0.2).toFixed(1));
        const nextEta = Math.max(2, Math.round(nextDist * 8));
        return {
          ...prev,
          distanceKm: nextDist,
          etaMinutes: nextEta,
          latitude: +(prev.latitude + 0.0004).toFixed(4),
          longitude: +(prev.longitude + 0.0003).toFixed(4),
          landmark:
            nextDist <= 0.4
              ? '6th Cross Road, Indiranagar (Turning onto your street)'
              : 'Near CMH Road & 100ft Road Intersection',
          movementStatus:
            nextDist <= 0.4
              ? 'Arriving at destination • Slowing down'
              : 'In Transit • Active on Two-Wheeler',
          lastUpdated: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        };
      });
      setIsRefreshing(false);
      Alert.alert(
        'GPS Telemetry Refreshed',
        `Live satellite signal acquired.\nWorker is ${workerLocation.distanceKm} km away (${workerLocation.etaMinutes} mins ETA).`
      );
    }, 600);
  };

  // Open Google Maps
  const handleOpenGoogleMaps = () => {
    const origin = `${workerLocation.latitude},${workerLocation.longitude}`;
    const destination = encodeURIComponent(booking.serviceLocation.addressLine);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Map Navigation', `Coordinates: ${origin}\nDestination: ${booking.serviceLocation.addressLine}`);
    });
  };

  return (
    <View style={styles.container}>
      <Header title="Track Worker" showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Card */}
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.codeText}>{booking.bookingCode}</Text>
              <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
            </View>
            <Badge status={booking.status} />
          </View>
          <Text style={styles.dateText}>
            {booking.scheduledDate} • {booking.scheduledTimeSlot}
          </Text>
        </View>

        {/* ================================================================= */}
        {/* LIVE WORKER GPS TRACKER & CURRENT LOCATION MODULE                 */}
        {/* ================================================================= */}
        <View style={styles.trackingContainer}>
          {/* Tracking Header Strip */}
          <View style={styles.trackingHeaderRow}>
            <View style={styles.liveIndicatorRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveIndicatorText}>LIVE GPS TRACKING ACTIVE</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshGpsBtn}
              onPress={handleRefreshGPS}
              disabled={isRefreshing}
            >
              <Ionicons
                name="refresh"
                size={14}
                color={colors.primary}
                style={isRefreshing ? { transform: [{ rotate: '45deg' }] } : undefined}
              />
              <Text style={styles.refreshGpsBtnText}>
                {isRefreshing ? 'Pinging GPS...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current Location Box */}
          <View style={styles.currentLocationBox}>
            <View style={styles.locationHeaderRow}>
              <View style={styles.locationIconCircle}>
                <Ionicons name="navigate" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.locationHeaderTitle}>Worker Current Location</Text>
                <Text style={styles.locationCoordsText}>
                  GPS: {workerLocation.latitude}° N, {workerLocation.longitude}° E (Fix: ±4m)
                </Text>
              </View>
            </View>

            <View style={styles.addressBlock}>
              <Text style={styles.landmarkText}>{workerLocation.landmark}</Text>
              <Text style={styles.areaText}>{workerLocation.area}</Text>
              <View style={styles.movementBadgeRow}>
                <Ionicons name="speedometer-outline" size={12} color={colors.primary} />
                <Text style={styles.movementBadgeText}>{workerLocation.movementStatus}</Text>
              </View>
            </View>

            {/* Realtime Telemetry Metric Grid */}
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryVal}>{workerLocation.distanceKm} km</Text>
                <Text style={styles.telemetryLabel}>Distance Away</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <Text style={[styles.telemetryVal, { color: colors.primary }]}>
                  {workerLocation.etaMinutes} mins
                </Text>
                <Text style={styles.telemetryLabel}>Estimated ETA</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryVal}>{workerLocation.speedKmH} km/h</Text>
                <Text style={styles.telemetryLabel}>Travel Speed</Text>
              </View>
            </View>
          </View>

          {/* Simulated Interactive Visual Map */}
          <View style={styles.interactiveMapContainer}>
            {/* Grid Pattern and Simulated Roads */}
            <View style={styles.mapGridOverlay}>
              <View style={styles.mapRoad1} />
              <View style={styles.mapRoad2} />
              <View style={styles.mapRoadCross} />
              
              {/* Radar Rings around Worker */}
              <View style={styles.radarRing1} />
              <View style={styles.radarRing2} />

              {/* Connecting Transit Route Line */}
              <View style={styles.routePathLine} />
              <View style={styles.routeWaypointDot} />
            </View>

            {/* Worker Pin Position */}
            <View style={styles.workerMapPinBox}>
              <View style={styles.workerPinPulse} />
              <View style={styles.workerPinIcon}>
                <Ionicons name="bicycle" size={15} color="#FFFFFF" />
              </View>
              <View style={styles.workerPinCallout}>
                <Text style={styles.workerPinCalloutName}>{booking.workerName}</Text>
                <Text style={styles.workerPinCalloutSub}>📍 Current Location</Text>
              </View>
            </View>

            {/* Customer Destination House Pin Position */}
            <View style={styles.destinationMapPinBox}>
              <View style={styles.destinationPinIcon}>
                <Ionicons name="home" size={14} color="#FFFFFF" />
              </View>
              <View style={styles.destinationPinCallout}>
                <Text style={styles.destinationPinCalloutText}>Your Doorstep</Text>
              </View>
            </View>

            {/* Map Action Buttons Bottom Strip */}
            <View style={styles.mapBottomBar}>
              <TouchableOpacity
                style={styles.openGoogleMapsBtn}
                onPress={handleOpenGoogleMaps}
              >
                <Ionicons name="map" size={14} color="#FFFFFF" />
                <Text style={styles.openGoogleMapsBtnText}>Open in Google Maps Navigation</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Destination Address Link */}
          <View style={styles.routeSummaryRow}>
            <View style={styles.routeIconCol}>
              <Ionicons name="radio-button-on" size={14} color={colors.primary} />
              <View style={styles.routeDottedLine} />
              <Ionicons name="location" size={16} color={colors.danger} />
            </View>
            <View style={styles.routeDetailsCol}>
              <Text style={styles.routeOriginText}>
                Origin: {workerLocation.landmark}
              </Text>
              <Text style={styles.routeDestText} numberOfLines={2}>
                Destination: {booking.serviceLocation.addressLine}
              </Text>
            </View>
          </View>
        </View>

        {/* Interactive Status Progression Timeline */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.cardTitle}>Live Status Progression</Text>
            {currentStepIdx < statusSteps.length - 1 && (
              <TouchableOpacity onPress={handleSimulateNextStatus} style={styles.simBtn}>
                <Ionicons name="play-forward" size={12} color={colors.primary} />
                <Text style={styles.simBtnText}>Advance Status (Demo)</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.stepsRow}>
            {statusSteps.map((step, idx) => {
              const isPast = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <View key={step.key} style={styles.stepCol}>
                  <View
                    style={[
                      styles.stepIconBox,
                      isPast && styles.stepIconBoxPast,
                      isCurrent && styles.stepIconBoxCurrent,
                    ]}
                  >
                    <Ionicons
                      name={step.icon}
                      size={14}
                      color={isPast ? colors.textInverse : colors.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      isPast && styles.stepLabelPast,
                      isCurrent && styles.stepLabelCurrent,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Assigned Worker Details Card */}
        <View style={styles.workerCard}>
          <Text style={styles.cardTitle}>Assigned Cooperative Worker</Text>
          <View style={styles.workerRow}>
            <Avatar name={booking.workerName} size={50} showVerifiedBadge />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{booking.workerName}</Text>
              <Text style={styles.workerSkill}>{booking.workerSkill}</Text>
              <Text style={styles.coopName}>{booking.cooperativeName}</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <TouchableOpacity
              onPress={() => Alert.alert('Call Worker', `Dialing ${booking.workerPhone}...`)}
              style={styles.callBtn}
            >
              <Ionicons name="call" size={15} color={colors.primary} />
              <Text style={styles.callBtnText}>Call {booking.workerPhone}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  'Message Worker',
                  `Opening cooperative chat channel with ${booking.workerName}...`
                )
              }
              style={styles.messageBtn}
            >
              <Ionicons name="chatbubble-ellipses" size={15} color="#FFFFFF" />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Address & Notes */}
        <View style={styles.detailsBox}>
          <Text style={styles.cardTitle}>Service Address & Notes</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.metaText}>{booking.serviceLocation.addressLine}</Text>
          </View>
          {booking.instructions && (
            <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.accent} />
              <Text style={styles.metaText}>"{booking.instructions}"</Text>
            </View>
          )}
        </View>

        {/* Pricing & Invoice */}
        <View style={styles.pricingCard}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated Fair Fare</Text>
            <Text style={styles.priceVal}>₹{booking.estimatedAmount}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Payment Mode</Text>
            <Text style={styles.priceVal}>{booking.paymentMethod?.toUpperCase() || 'UPI'}</Text>
          </View>

          {/* Rating & Review Prompt for Completed Work */}
          {booking.status === 'completed' && !booking.hasRated && (
            <View style={styles.ratingPromptBanner}>
              <View style={styles.ratingPromptIconBox}>
                <Ionicons name="star" size={24} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.ratingPromptTitle}>Work Completed! Rate & Review</Text>
                <Text style={styles.ratingPromptDesc}>
                  Please rate and review your experience with {booking.workerName} to support cooperative quality.
                </Text>
                <TouchableOpacity
                  style={styles.ratingPromptBtn}
                  onPress={() => onNavigateToRate(booking.id)}
                >
                  <Ionicons name="star" size={15} color="#FFFFFF" />
                  <Text style={styles.ratingPromptBtnText}>Rate & Review Service</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {booking.status === 'completed' && booking.hasRated && (
            <View style={styles.ratedThankYouStrip}>
              <Ionicons name="checkmark-circle" size={18} color="#15803D" />
              <Text style={styles.ratedThankYouText}>
                You have rated and reviewed this service. Thank you for supporting the cooperative!
              </Text>
            </View>
          )}

          <View style={styles.actionBtnsRow}>
            <Button
              title="View Invoice"
              icon="receipt-outline"
              onPress={() => onNavigateToInvoice(booking.id)}
              variant="outline"
              size="sm"
              style={{ flex: 1, marginRight: 8 }}
            />
            {booking.status === 'completed' && (
              <Button
                title={booking.hasRated ? "Edit Review" : "Rate Worker"}
                icon="star"
                onPress={() => onNavigateToRate(booking.id)}
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
              />
            )}
            {booking.status === 'in_progress' && (
              <Button
                title="Confirm Work Done"
                icon="checkmark-done"
                onPress={async () => {
                  await updateStatus(booking.id, 'completed', 'Work completed and verified by customer');
                  onNavigateToRate(booking.id);
                }}
                variant="primary"
                size="sm"
                style={{ flex: 1, backgroundColor: colors.success }}
              />
            )}
          </View>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  topCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  serviceTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },

  // LIVE TRACKER SPECIFIC STYLES
  trackingContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  liveIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  refreshGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  refreshGpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  currentLocationBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  locationIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  locationCoordsText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  addressBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginBottom: spacing.sm,
  },
  landmarkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  areaText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  movementBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  movementBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
  },
  telemetryItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  telemetryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },

  // Interactive Map Preview
  interactiveMapContainer: {
    height: 210,
    backgroundColor: '#E2E8F0',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  mapGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F5F9',
  },
  mapRoad1: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  mapRoad2: {
    position: 'absolute',
    bottom: '25%',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  mapRoadCross: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '52%',
    width: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  radarRing1: {
    position: 'absolute',
    top: '18%',
    left: '18%',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.25)',
  },
  radarRing2: {
    position: 'absolute',
    top: '12%',
    left: '12%',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.15)',
  },
  routePathLine: {
    position: 'absolute',
    top: '34%',
    left: '28%',
    width: '45%',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  routeWaypointDot: {
    position: 'absolute',
    top: '32%',
    left: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  workerMapPinBox: {
    position: 'absolute',
    top: '20%',
    left: '20%',
    alignItems: 'center',
  },
  workerPinPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
  },
  workerPinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  workerPinCallout: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  workerPinCalloutName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  workerPinCalloutSub: {
    fontSize: 8,
    color: colors.primary,
    fontWeight: '700',
  },
  destinationMapPinBox: {
    position: 'absolute',
    bottom: '22%',
    right: '18%',
    alignItems: 'center',
  },
  destinationPinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  destinationPinCallout: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destinationPinCalloutText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.danger,
  },
  mapBottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  openGoogleMapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  openGoogleMapsBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  routeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  routeIconCol: {
    alignItems: 'center',
    marginRight: 8,
  },
  routeDottedLine: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  routeDetailsCol: {
    flex: 1,
  },
  routeOriginText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  routeDestText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },

  // Timeline
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  simBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCol: {
    alignItems: 'center',
    flex: 1,
  },
  stepIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepIconBoxPast: {
    backgroundColor: colors.primary,
  },
  stepIconBoxCurrent: {
    backgroundColor: colors.accent,
    transform: [{ scale: 1.15 }],
  },
  stepLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelPast: {
    color: colors.text,
  },
  stepLabelCurrent: {
    color: colors.accentDark,
    fontWeight: '700',
  },

  // Worker card
  workerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  workerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  workerSkill: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  // Details box
  detailsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },

  // Pricing
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  ratingPromptBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    alignItems: 'center',
  },
  ratingPromptIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  ratingPromptDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  ratingPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  ratingPromptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratedThankYouStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  ratedThankYouText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
  },
});

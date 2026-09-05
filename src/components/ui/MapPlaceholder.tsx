import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../../theme';
import { useLocation } from '../../context/LocationContext';

interface MapPlaceholderProps {
  height?: number;
  locationName?: string;
  workerCount?: number;
  showWorkers?: boolean;
  style?: ViewStyle;
}

export const MapPlaceholder: React.FC<MapPlaceholderProps> = ({
  height = 180,
  locationName,
  workerCount = 6,
  showWorkers = true,
  style,
}) => {
  const { currentLocation } = useLocation();
  const displayLocation =
    locationName ||
    `${currentLocation.placeName}, ${currentLocation.city || currentLocation.state} (${currentLocation.latitude.toFixed(4)}° N, ${currentLocation.longitude.toFixed(4)}° E)`;

  return (
    <View style={[styles.container, { height }, style]}>
      {/* Grid Pattern Background simulation */}
      <View style={styles.gridOverlay}>
        <View style={styles.roadH1} />
        <View style={styles.roadH2} />
        <View style={styles.roadV1} />
        <View style={styles.roadV2} />
        
        {/* Radar Ring */}
        <View style={styles.radarRingOuter} />
        <View style={styles.radarRingInner} />
      </View>

      {/* Center User Pin */}
      <View style={styles.centerPinContainer}>
        <View style={styles.pinPulse} />
        <View style={styles.userPin}>
          <Ionicons name="person" size={14} color={colors.textInverse} />
        </View>
        <View style={styles.pinCallout}>
          <Text style={styles.calloutText}>Your Location</Text>
        </View>
      </View>

      {/* Simulated Nearby Worker Pins */}
      {showWorkers && (
        <>
          <View style={[styles.workerPin, { top: '22%', left: '26%' }]}>
            <Ionicons name="flash" size={11} color={colors.textInverse} />
          </View>
          <View style={[styles.workerPin, { top: '30%', right: '28%' }]}>
            <Ionicons name="water" size={11} color={colors.textInverse} />
          </View>
          <View style={[styles.workerPin, { bottom: '26%', left: '32%' }]}>
            <Ionicons name="construct" size={11} color={colors.textInverse} />
          </View>
          <View style={[styles.workerPin, { bottom: '22%', right: '35%' }]}>
            <Ionicons name="sparkles" size={11} color={colors.textInverse} />
          </View>
        </>
      )}

      {/* Bottom Map Info Overlay */}
      <View style={styles.bottomBar}>
        <Ionicons name="location" size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={styles.locationText} numberOfLines={1}>{displayLocation}</Text>
        <View style={styles.workerBadge}>
          <Text style={styles.workerBadgeText}>{workerCount} Active</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E2E8F0',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EEF2F6',
  },
  roadH1: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  roadH2: {
    position: 'absolute',
    top: '68%',
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  roadV1: {
    position: 'absolute',
    left: '42%',
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  roadV2: {
    position: 'absolute',
    right: '25%',
    top: 0,
    bottom: 0,
    width: 10,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  radarRingOuter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 160,
    height: 160,
    marginLeft: -80,
    marginTop: -80,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
    backgroundColor: 'rgba(13, 122, 95, 0.05)',
  },
  radarRingInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.35)',
  },
  centerPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinPulse: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },
  userPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pinCallout: {
    marginTop: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  calloutText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  workerPin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 15,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  workerBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginLeft: 6,
  },
  workerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button, Badge } from '../ui';
import { defaultLocations, LocationCoords, locationService } from '../../services/locationService';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface LocationSelectorModalProps {
  visible: boolean;
  currentAddress?: string;
  onClose: () => void;
  onSelectLocation: (location: LocationCoords, label: string) => void;
  onManageAddresses?: () => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  visible,
  currentAddress,
  onClose,
  onSelectLocation,
  onManageAddresses,
}) => {
  const { user } = useAuth();
  const customer = user?.role === 'customer' ? (user as Customer) : null;
  const savedAddresses = customer?.savedAddresses || [];

  const clusters: Array<{ key: string; name: string; hubName: string; coords: LocationCoords }> = [
    {
      key: 'indiranagar',
      name: 'Indiranagar, Bengaluru',
      hubName: 'Indiranagar Cooperative Guild Hub • Pin 560038',
      coords: defaultLocations.indiranagar,
    },
    {
      key: 'koramangala',
      name: 'Koramangala, Bengaluru',
      hubName: 'Koramangala 4th Block Labour Hub • Pin 560034',
      coords: defaultLocations.koramangala,
    },
    {
      key: 'whitefield',
      name: 'Whitefield, Bengaluru',
      hubName: 'Whitefield ITPL Corridor Guild • Pin 560066',
      coords: defaultLocations.whitefield,
    },
  ];

  const handleSelectCluster = (c: typeof clusters[0]) => {
    locationService.setLocation(c.key as any);
    onSelectLocation(c.coords, c.name);
    onClose();
  };

  const handleSelectSavedAddress = (addr: { id: string; title: string; address: string }) => {
    // Map saved address to approximate location coords
    const coords: LocationCoords = {
      latitude: defaultLocations.indiranagar.latitude,
      longitude: defaultLocations.indiranagar.longitude,
      address: addr.address,
      city: 'Bengaluru',
      pincode: '560038',
    };
    onSelectLocation(coords, `${addr.title}: ${addr.address.slice(0, 30)}...`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.dragBar} />

              <View style={styles.headerRow}>
                <View style={styles.headerIconBox}>
                  <Ionicons name="location" size={22} color={colors.primary} />
                </View>
                <View style={styles.headerTitles}>
                  <Text style={styles.title}>Select Service Location</Text>
                  <Text style={styles.subtitle}>Workers will be dispatched from this cooperative zone</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Simulated GPS Button */}
                <TouchableOpacity
                  style={styles.gpsBtn}
                  onPress={() => handleSelectCluster(clusters[0])}
                  activeOpacity={0.8}
                >
                  <Ionicons name="navigate-circle" size={24} color={colors.primary} />
                  <View style={styles.gpsTextCol}>
                    <Text style={styles.gpsTitle}>Use Live GPS Location</Text>
                    <Text style={styles.gpsSub}>Auto-detect current cooperative cluster</Text>
                  </View>
                  <Badge label="GPS Active" variant="verified" />
                </TouchableOpacity>

                {/* Section: Cooperative Clusters */}
                <Text style={styles.sectionHeading}>Cooperative Cluster Zones</Text>
                {clusters.map((c) => {
                  const isSelected = currentAddress?.includes(c.coords.city) && currentAddress?.includes(c.key);
                  return (
                    <TouchableOpacity
                      key={c.key}
                      onPress={() => handleSelectCluster(c)}
                      style={[styles.clusterCard, isSelected && styles.cardSelected]}
                    >
                      <View style={styles.cardRadio}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={[styles.cardTitle, isSelected && styles.cardTitleActive]}>
                          {c.name}
                        </Text>
                        <Text style={styles.cardSub}>{c.hubName}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Section: Saved Addresses */}
                {savedAddresses.length > 0 && (
                  <>
                    <View style={styles.savedSectionHeader}>
                      <Text style={styles.sectionHeading}>My Saved Addresses</Text>
                      {onManageAddresses && (
                        <TouchableOpacity onPress={onManageAddresses}>
                          <Text style={styles.manageLink}>+ Manage</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {savedAddresses.map((addr) => (
                      <TouchableOpacity
                        key={addr.id}
                        onPress={() => handleSelectSavedAddress(addr)}
                        style={styles.savedAddrCard}
                      >
                        <Ionicons
                          name={addr.title.toLowerCase().includes('home') ? 'home-outline' : 'business-outline'}
                          size={18}
                          color={colors.primary}
                        />
                        <View style={styles.savedAddrInfo}>
                          <View style={styles.savedTitleRow}>
                            <Text style={styles.savedTitle}>{addr.title}</Text>
                            {addr.isDefault && (
                              <View style={styles.defaultBadge}>
                                <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.savedAddressText} numberOfLines={2}>
                            {addr.address}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.3)',
    marginBottom: spacing.lg,
  },
  gpsTextCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  gpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  gpsSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  clusterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardRadio: {
    marginRight: spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cardTitleActive: {
    color: colors.primary,
  },
  cardSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  manageLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  savedAddrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  savedAddrInfo: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  defaultBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginLeft: 6,
  },
  defaultBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textInverse,
  },
  savedAddressText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
});

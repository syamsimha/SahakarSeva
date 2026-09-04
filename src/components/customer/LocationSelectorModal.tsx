import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button, Badge } from '../ui';
import { defaultLocations, LocationCoords, locationService } from '../../services/locationService';
import { databaseService } from '../../services/db/databaseService';
import { useAuth } from '../../context/AuthContext';
import { Customer } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

interface LocationSelectorModalProps {
  visible: boolean;
  currentLocation?: LocationCoords | null;
  currentAddress?: string;
  onClose: () => void;
  onSelectLocation: (location: LocationCoords, label: string) => void;
  onUseGps?: () => void;
  onManageAddresses?: () => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  visible,
  currentLocation,
  currentAddress,
  onClose,
  onSelectLocation,
  onUseGps,
  onManageAddresses,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
    {
      key: 'mumbai_central',
      name: 'Dadar / Central, Mumbai',
      hubName: 'Mumbai Shramik Seva Sahakari Guild • Pin 400014',
      coords: { latitude: 19.0178, longitude: 72.8478, address: 'Dadar TT Circle, Mumbai', city: 'Mumbai', pincode: '400014', isGps: false },
    },
    {
      key: 'delhi_south',
      name: 'Hauz Khas / South, New Delhi',
      hubName: 'Delhi Cooperative Workers Federation • Pin 110016',
      coords: { latitude: 28.5494, longitude: 77.2001, address: 'Hauz Khas, New Delhi', city: 'New Delhi', pincode: '110016', isGps: false },
    },
    {
      key: 'hyderabad_west',
      name: 'Hitec City / Madhapur, Hyderabad',
      hubName: 'Telangana Artisan & Gig Cooperative Hub • Pin 500081',
      coords: { latitude: 17.4435, longitude: 78.3772, address: 'Madhapur, Hitec City, Hyderabad', city: 'Hyderabad', pincode: '500081', isGps: false },
    },
    {
      key: 'pune_central',
      name: 'Shivajinagar / Deccan, Pune',
      hubName: 'Pune Karigar Sahakari Mandali • Pin 411004',
      coords: { latitude: 18.5204, longitude: 73.8567, address: 'FC Road, Shivajinagar, Pune', city: 'Pune', pincode: '411004', isGps: false },
    },
  ];

  const [isRequestingGps, setIsRequestingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Manual Address Entry Form States
  const [showManualForm, setShowManualForm] = useState(false);
  const [houseFlat, setHouseFlat] = useState(currentLocation?.manualDetails?.houseFlat || '');
  const [street, setStreet] = useState(currentLocation?.manualDetails?.street || '');
  const [area, setArea] = useState(currentLocation?.manualDetails?.area || '');
  const [city, setCity] = useState(currentLocation?.manualDetails?.city || customer?.city || '');
  const [stateVal, setStateVal] = useState(currentLocation?.manualDetails?.state || '');
  const [pincode, setPincode] = useState(currentLocation?.manualDetails?.pincode || currentLocation?.pincode || '');
  const [saveToAddresses, setSaveToAddresses] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualFormError, setManualFormError] = useState<string | null>(null);

  const handleRequestGps = async () => {
    setIsRequestingGps(true);
    setGpsError(null);
    try {
      if (onUseGps) {
        onUseGps();
      }
      const res = await locationService.requestLiveGpsLocation();
      if (res.success && res.coords) {
        onSelectLocation(res.coords, `📍 ${res.coords.address}`);
        onClose();
      } else {
        setGpsError(res.error || 'Failed to acquire live GPS location.');
      }
    } finally {
      setIsRequestingGps(false);
    }
  };

  const handleSaveManualAddress = async () => {
    if (!houseFlat.trim() || !street.trim() || !area.trim() || !city.trim() || !pincode.trim()) {
      setManualFormError('Please fill required fields (House, Street, Area, City, PIN)');
      return;
    }

    setIsSavingManual(true);
    setManualFormError(null);

    try {
      const fullQuery = `${street.trim()}, ${area.trim()}, ${city.trim()}, ${stateVal.trim()} ${pincode.trim()}`.trim();
      const geo = await locationService.geocodeAddress(fullQuery);

      const manualCoords = await locationService.setManualLocation({
        houseFlat: houseFlat.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        pincode: pincode.trim(),
        latitude: geo?.latitude,
        longitude: geo?.longitude,
      });

      if (saveToAddresses && customer) {
        await databaseService.addCustomerSavedAddress(customer.id, {
          title: `${houseFlat.trim()} ${area.trim()}`,
          address: manualCoords.address,
        });
      }

      onSelectLocation(manualCoords, `✍️ ${manualCoords.address}`);
      setShowManualForm(false);
      onClose();
    } catch {
      // Offline fallback: save text directly without coordinates
      const manualCoords = await locationService.setManualLocation({
        houseFlat: houseFlat.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        state: stateVal.trim(),
        pincode: pincode.trim(),
      });
      onSelectLocation(manualCoords, `✍️ ${manualCoords.address}`);
      setShowManualForm(false);
      onClose();
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleSelectCluster = (c: typeof clusters[0]) => {
    locationService.setCustomLocation(c.coords);
    onSelectLocation(c.coords, c.name);
    onClose();
  };

  const handleSelectSavedAddress = (addr: { id: string; title: string; address: string }) => {
    const coords: LocationCoords = {
      latitude: currentLocation?.latitude,
      longitude: currentLocation?.longitude,
      address: addr.address,
      city: customer?.city || 'Local Area',
      pincode: '400001',
      isGps: false,
      locationMode: 'MANUAL',
      coordinatesAvailable: typeof currentLocation?.latitude === 'number',
    };
    locationService.setCustomLocation(coords);
    onSelectLocation(coords, `${addr.title}: ${addr.address.slice(0, 30)}...`);
    onClose();
  };

  const activeModeLabel = () => {
    if (!currentLocation) return t('no_workers_found');
    if (currentLocation.isGps) return `Currently active: 📍 ${t('live_gps_loc')}`;
    if (currentLocation.locationMode === 'MANUAL') {
      const summary = currentLocation.address.length > 28 ? `${currentLocation.address.slice(0, 28)}...` : currentLocation.address;
      return `Currently active: ✍️ ${t('active_manual_location')} (${summary})`;
    }
    return `Currently active: 🗺️ ${t('manual_selected_zone')}`;
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
                  <Text style={styles.title}>{t('select_location_title')}</Text>
                  <Text style={styles.subtitle}>{t('workers_dispatched_from_zone')}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close-circle" size={26} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Active Location Indicator Pill */}
              <View style={[
                styles.currentStatusPill,
                currentLocation?.isGps ? styles.gpsActivePill : styles.manualPill
              ]}>
                <Ionicons
                  name={currentLocation?.isGps ? 'navigate' : currentLocation?.locationMode === 'MANUAL' ? 'create-outline' : 'map'}
                  size={14}
                  color={currentLocation?.isGps ? colors.info : colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.currentStatusText}>{activeModeLabel()}</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Mode Selector / Primary Controls */}
                <View style={styles.topActionsContainer}>
                  {/* Option 1: Live Device / Browser GPS Button */}
                  <TouchableOpacity
                    style={[styles.actionOptionBtn, currentLocation?.isGps && styles.actionOptionBtnActive]}
                    onPress={handleRequestGps}
                    disabled={isRequestingGps}
                    activeOpacity={0.8}
                  >
                    {isRequestingGps ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                    ) : (
                      <Ionicons
                        name="navigate-circle"
                        size={26}
                        color={currentLocation?.isGps ? colors.info : colors.primary}
                      />
                    )}
                    <View style={styles.actionOptionTextCol}>
                      <Text style={styles.actionOptionTitle}>
                        {isRequestingGps
                          ? t('acquiring_gps_live')
                          : currentLocation?.isGps
                          ? t('refresh_device_gps')
                          : t('use_gps')}
                      </Text>
                      <Text style={styles.actionOptionSub}>
                        {currentLocation?.isGps
                          ? `Connected: (${currentLocation.latitude?.toFixed(4)}, ${currentLocation.longitude?.toFixed(4)})`
                          : t('acquiring_coordinates')}
                      </Text>
                    </View>
                    <Badge label={currentLocation?.isGps ? 'ACTIVE' : 'GPS'} variant={currentLocation?.isGps ? 'verified' : 'status'} />
                  </TouchableOpacity>

                  {/* Option 2: Enter Location Manually Button */}
                  <TouchableOpacity
                    style={[
                      styles.actionOptionBtn,
                      styles.manualOptionBtn,
                      (showManualForm || currentLocation?.locationMode === 'MANUAL') && styles.manualOptionBtnActive,
                    ]}
                    onPress={() => setShowManualForm(!showManualForm)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="create"
                      size={24}
                      color={showManualForm || currentLocation?.locationMode === 'MANUAL' ? colors.primary : colors.textSecondary}
                    />
                    <View style={styles.actionOptionTextCol}>
                      <Text style={styles.actionOptionTitle}>{t('enter_location_manually')}</Text>
                      <Text style={styles.actionOptionSub}>
                        {currentLocation?.locationMode === 'MANUAL'
                          ? 'Manual address active (Tap to edit)'
                          : 'Type house, street, city & PIN code'}
                      </Text>
                    </View>
                    <Ionicons
                      name={showManualForm ? 'chevron-up-circle' : 'chevron-down-circle'}
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>

                {/* GPS Failure Fallback Banner */}
                {gpsError && (
                  <View style={styles.gpsErrorBanner}>
                    <Ionicons name="warning-outline" size={20} color={colors.danger} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gpsErrorTitle}>{t('unable_determine_location')}</Text>
                      <Text style={styles.gpsErrorText}>{gpsError}</Text>
                      <View style={styles.errorBtnGroup}>
                        <TouchableOpacity
                          style={styles.errorRetryBtn}
                          onPress={handleRequestGps}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="navigate-circle" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                          <Text style={styles.errorRetryText}>{t('retry_gps')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.errorManualBtn}
                          onPress={() => setShowManualForm(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="create-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.errorManualText}>{t('enter_location_manually')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Inline Manual Address Entry Form */}
                {showManualForm && (
                  <View style={styles.manualFormCard}>
                    <View style={styles.manualFormHeader}>
                      <Ionicons name="home" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.manualFormTitle}>{t('manual_address_entry')}</Text>
                    </View>
                    <Text style={styles.manualFormDesc}>
                      Works completely offline without GPS. Text address will be saved and used for dispatch.
                    </Text>

                    {manualFormError && (
                      <View style={styles.manualFormErrorBox}>
                        <Ionicons name="alert-circle" size={16} color={colors.danger} style={{ marginRight: 4 }} />
                        <Text style={styles.manualFormErrorText}>{manualFormError}</Text>
                      </View>
                    )}

                    <Text style={styles.fieldLabel}>{t('house_flat')} *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={houseFlat}
                      onChangeText={setHouseFlat}
                      placeholder="e.g. Flat 402, Shanti Apts"
                      placeholderTextColor={colors.textMuted}
                    />

                    <Text style={styles.fieldLabel}>{t('street_road')} *</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={street}
                      onChangeText={setStreet}
                      placeholder="e.g. 12th Main Road, 4th Cross"
                      placeholderTextColor={colors.textMuted}
                    />

                    <View style={styles.fieldRow}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={styles.fieldLabel}>{t('area_locality')} *</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={area}
                          onChangeText={setArea}
                          placeholder="e.g. Indiranagar"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>{t('city_label')} *</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={city}
                          onChangeText={setCity}
                          placeholder="e.g. Bengaluru"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={styles.fieldLabel}>{t('state_label')}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={stateVal}
                          onChangeText={setStateVal}
                          placeholder="e.g. Karnataka"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>{t('pincode_label')} *</Text>
                        <TextInput
                          style={styles.fieldInput}
                          value={pincode}
                          onChangeText={setPincode}
                          placeholder="e.g. 560038"
                          keyboardType="number-pad"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>
                    </View>

                    {customer && (
                      <TouchableOpacity
                        style={styles.saveCheckRow}
                        onPress={() => setSaveToAddresses(!saveToAddresses)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={saveToAddresses ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={saveToAddresses ? colors.primary : colors.textMuted}
                        />
                        <Text style={styles.saveCheckText}>{t('save_to_my_addresses')}</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.formButtonRow}>
                      <TouchableOpacity
                        style={styles.cancelFormBtn}
                        onPress={() => setShowManualForm(false)}
                      >
                        <Text style={styles.cancelFormText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.submitFormBtn}
                        onPress={handleSaveManualAddress}
                        disabled={isSavingManual}
                        activeOpacity={0.8}
                      >
                        {isSavingManual ? (
                          <ActivityIndicator size="small" color={colors.textInverse} />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                            <Text style={styles.submitFormText}>{t('save_use_address')}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Section: Cooperative Clusters */}
                <Text style={styles.sectionHeading}>{t('coop_cluster_zones')}</Text>
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
                      <Text style={styles.sectionHeading}>{t('my_saved_addresses')}</Text>
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
  gpsErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  gpsErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 2,
  },
  gpsErrorText: {
    fontSize: 11,
    color: colors.danger,
    lineHeight: 15,
  },
  gpsErrorHelp: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  currentStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  gpsActivePill: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  manualPill: {
    backgroundColor: 'rgba(13, 122, 95, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.3)',
  },
  currentStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  gpsBtnSelected: {
    borderColor: colors.info,
    borderWidth: 2,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  topActionsContainer: {
    marginBottom: spacing.md,
  },
  actionOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 122, 95, 0.3)',
    marginBottom: spacing.sm,
  },
  actionOptionBtnActive: {
    borderColor: colors.info,
    borderWidth: 2,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  manualOptionBtn: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  manualOptionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  actionOptionTextCol: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  actionOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  actionOptionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  errorBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.xs,
  },
  errorRetryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  errorManualText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  manualFormCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  manualFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  manualFormTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  manualFormDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 15,
  },
  manualFormErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.sm,
  },
  manualFormErrorText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.text,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  saveCheckText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    marginLeft: 8,
  },
  formButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cancelFormBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelFormText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
  },
  submitFormText: {
    fontSize: 12,
    color: colors.textInverse,
    fontWeight: '700',
  },
});

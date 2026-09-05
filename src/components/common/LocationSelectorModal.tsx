import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { useLocation } from '../../context/LocationContext';
import { LocationCoords } from '../../services/locationService';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui';

interface LocationSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({ visible, onClose }) => {
  const {
    currentLocation,
    isLocating,
    locationError,
    detectLiveGPS,
    modifyPlaceName,
    selectPresetLocation,
    searchPlaces,
    defaultLocations,
  } = useLocation();

  // Mode: 'quick' | 'modify' | 'search'
  const [activeTab, setActiveTab] = useState<'quick' | 'modify' | 'search'>('quick');

  // Modify form state
  const [editPlaceName, setEditPlaceName] = useState(currentLocation.placeName || currentLocation.city);
  const [editCity, setEditCity] = useState(currentLocation.city);
  const [editState, setEditState] = useState(currentLocation.state || '');
  const [editAddress, setEditAddress] = useState(currentLocation.address);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationCoords[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      setEditPlaceName(currentLocation.placeName || currentLocation.city);
      setEditCity(currentLocation.city);
      setEditState(currentLocation.state || '');
      setEditAddress(currentLocation.address);
      setSaveFeedback(null);
    }
  }, [visible, currentLocation]);

  const handleDetectGPS = async () => {
    try {
      const detected = await detectLiveGPS();
      const stateName = detected.state ? ` (${detected.state})` : '';
      setSaveFeedback(`📍 Live GPS synced to ${detected.placeName || detected.city}${stateName}!`);
      setTimeout(() => {
        setSaveFeedback(null);
        onClose();
      }, 1400);
    } catch (err: any) {
      Alert.alert('GPS Location Error', err.message || 'Could not acquire GPS position. Please check permissions.');
    }
  };

  const handleSavePlaceName = async () => {
    if (!editPlaceName.trim()) {
      Alert.alert('Place Name Required', 'Please enter a name for this place or locality.');
      return;
    }
    await modifyPlaceName(editPlaceName.trim(), editCity.trim(), editAddress.trim(), editState.trim());
    setSaveFeedback(`✅ Location set to "${editPlaceName.trim()}"${editState.trim() ? ` [${editState.trim()}]` : ''}!`);
    setTimeout(() => {
      setSaveFeedback(null);
      onClose();
    }, 1200);
  };

  const handleSelectPreset = async (key: string) => {
    await selectPresetLocation(key);
    onClose();
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (place: LocationCoords) => {
    await modifyPlaceName(place.placeName || place.city, place.city, place.address, place.state);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="location" size={20} color={colors.primary} />
                <Text style={styles.title}>Service Location & Place</Text>
              </View>
              <Text style={styles.subtitle}>Set your live GPS coordinates or customize place name</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current Active Location Preview */}
          <View style={styles.currentLocationCard}>
            <View style={styles.currentLocationTop}>
              <View style={styles.gpsIconCircle}>
                <Ionicons
                  name={currentLocation.isGPS ? 'navigate' : 'pin'}
                  size={18}
                  color={currentLocation.isGPS ? colors.success : colors.primary}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.currentPlaceName} numberOfLines={1}>
                    {currentLocation.placeName || currentLocation.city}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: currentLocation.isGPS ? colors.successLight : colors.primaryLight }]}>
                    <Text style={[styles.statusPillText, { color: currentLocation.isGPS ? colors.success : colors.primary }]}>
                      {currentLocation.isGPS ? '🛰️ Live GPS Active' : '📍 Saved Place'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.currentAddressText} numberOfLines={2}>
                  {currentLocation.address}
                </Text>
                <Text style={styles.currentCoordsText}>
                  {(currentLocation.latitude ?? 0).toFixed(4)}° N, {(currentLocation.longitude ?? 0).toFixed(4)}° E • {currentLocation.city} {currentLocation.pincode}
                </Text>
              </View>
            </View>
          </View>

          {/* Toast / Feedback Banner */}
          {saveFeedback && (
            <View style={styles.feedbackBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.feedbackText}>{saveFeedback}</Text>
            </View>
          )}

          {/* Tab Selector */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('quick')}
              style={[styles.tabItem, activeTab === 'quick' && styles.tabItemActive]}
            >
              <Ionicons name="compass-outline" size={15} color={activeTab === 'quick' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'quick' && styles.tabTextActive]}>GPS & Hubs</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('modify')}
              style={[styles.tabItem, activeTab === 'modify' && styles.tabItemActive]}
            >
              <Ionicons name="create-outline" size={15} color={activeTab === 'modify' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'modify' && styles.tabTextActive]}>Modify Name</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('search')}
              style={[styles.tabItem, activeTab === 'search' && styles.tabItemActive]}
            >
              <Ionicons name="search-outline" size={15} color={activeTab === 'search' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Search Map</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 15 }}>
            {/* TAB 1: QUICK GPS & HUBS */}
            {activeTab === 'quick' && (
              <View style={{ gap: 12 }}>
                {/* Live GPS Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleDetectGPS}
                  disabled={isLocating}
                  style={styles.gpsActionBtn}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="navigate-circle" size={24} color="#FFF" />
                  )}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.gpsBtnTitle}>
                      {isLocating ? 'Acquiring Satellite GPS Fix...' : 'Use My Live GPS Location'}
                    </Text>
                    <Text style={styles.gpsBtnSub}>
                      Auto-detect exact street, colony & coordinates via device GPS
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </TouchableOpacity>

                {/* Popular Cooperative Zones across India */}
                <Text style={styles.sectionHeader}>National Cooperative Hubs & Regional Zones</Text>
                <View style={styles.hubsGrid}>
                  {Object.entries(defaultLocations).map(([key, loc]) => {
                    const isSelected = currentLocation.placeName === loc.placeName;
                    return (
                      <TouchableOpacity
                        key={key}
                        activeOpacity={0.7}
                        onPress={() => handleSelectPreset(key)}
                        style={[styles.hubCard, isSelected && styles.hubCardActive]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                            <Ionicons
                              name="business-outline"
                              size={16}
                              color={isSelected ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[styles.hubTitle, isSelected && styles.hubTitleActive]}>
                              {loc.placeName}
                            </Text>
                          </View>
                          {loc.state && (
                            <View style={styles.hubStateBadge}>
                              <Text style={styles.hubStateBadgeText}>{loc.state}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.hubSub} numberOfLines={1}>{loc.address}</Text>
                        <Text style={styles.hubPin}>{loc.city}, {loc.state || ''} - {loc.pincode}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* TAB 2: MODIFY PLACE NAME */}
            {activeTab === 'modify' && (
              <View style={{ gap: 10 }}>
                <Text style={styles.formSectionDesc}>
                  Customize the displayed place name, state, and city to adapt all cooperative features & local hubs:
                </Text>

                <Text style={styles.inputLabel}>Place / Area / Locality Name *</Text>
                <TextInput
                  value={editPlaceName}
                  onChangeText={setEditPlaceName}
                  placeholder="e.g. Visakhapatnam Beach Road, Banjara Hills, Bandra West"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City / District</Text>
                    <TextInput
                      value={editCity}
                      onChangeText={setEditCity}
                      placeholder="e.g. Visakhapatnam, Hyderabad, Mumbai"
                      placeholderTextColor={colors.textMuted}
                      style={styles.textInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>State / Union Territory</Text>
                    <TextInput
                      value={editState}
                      onChangeText={setEditState}
                      placeholder="e.g. Andhra Pradesh, Telangana, Maharashtra"
                      placeholderTextColor={colors.textMuted}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Complete Address / Landmark</Text>
                <TextInput
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="e.g. Flat 302, Sea View Apartments, Near RTC Complex"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                />

                <Button
                  title="Save & Set Active Place & State"
                  icon="checkmark-done"
                  variant="primary"
                  size="md"
                  onPress={handleSavePlaceName}
                  fullWidth
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}

            {/* TAB 3: SEARCH PLACES */}
            {activeTab === 'search' && (
              <View style={{ gap: 10 }}>
                <View style={styles.searchBarRow}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearchSubmit}
                    placeholder="Search any locality, street, landmark, city..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity onPress={handleSearchSubmit} style={styles.searchGoBtn}>
                    <Text style={styles.searchGoBtnText}>Search</Text>
                  </TouchableOpacity>
                </View>

                {isSearching && (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.searchingText}>Searching OpenStreetMap Geocoding...</Text>
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={styles.sectionHeader}>Matching Locations Found ({searchResults.length}):</Text>
                    {searchResults.map((place, idx) => (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => handleSelectSearchResult(place)}
                        style={styles.searchResultCard}
                      >
                        <Ionicons name="location-outline" size={18} color={colors.primary} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={styles.searchResultTitle}>{place.placeName}</Text>
                          <Text style={styles.searchResultAddress} numberOfLines={2}>{place.address}</Text>
                          <Text style={styles.searchResultCoords}>
                            {(place.latitude ?? 0).toFixed(4)}° N, {(place.longitude ?? 0).toFixed(4)}° E • {place.city}
                          </Text>
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: '90%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
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
  currentLocationCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  currentLocationTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gpsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  currentPlaceName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  currentAddressText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  currentCoordsText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.successLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  gpsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  gpsBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  gpsBtnSub: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  hubsGrid: {
    gap: 8,
  },
  hubCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hubCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  hubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  hubTitleActive: {
    color: colors.primary,
  },
  hubStateBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  hubStateBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  hubSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  hubPin: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  formSectionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    paddingVertical: 4,
  },
  searchGoBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  searchGoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  searchingText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResultTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  searchResultAddress: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  searchResultCoords: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
});

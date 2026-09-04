import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, MapPlaceholder, Badge } from '../../components/ui';
import { emergencyServices } from '../../data';
import { useBookings } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LocationCoords, locationService } from '../../services/locationService';
import { LocationSelectorModal } from '../../components/customer';
import { EmergencyService, Booking, Customer, ServiceLocation } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { triggerPhoneCall } from '../../utils/phone';

interface EmergencyServicesScreenProps {
  currentLocation?: LocationCoords;
  onBookingSuccess: (booking: Booking) => void;
  onBack: () => void;
}

type StepNumber = 1 | 2 | 3;

export const EmergencyServicesScreen: React.FC<EmergencyServicesScreenProps> = ({
  currentLocation,
  onBookingSuccess,
  onBack,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { dispatchPriorityBooking } = useBookings();

  // Wizard Step: 1 = Service, 2 = Location, 3 = Review & Payment
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);

  // Step 1: Emergency Service Selection
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyService>(emergencyServices[0]);

  // Step 2: Location Selection & Confirmation
  const [activeLocation, setActiveLocation] = useState<LocationCoords | null>(currentLocation || null);
  const [landmark, setLandmark] = useState('');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Inline Manual Address Form
  const [showInlineManual, setShowInlineManual] = useState(false);
  const [manualHouse, setManualHouse] = useState('');
  const [manualStreet, setManualStreet] = useState('');
  const [manualArea, setManualArea] = useState('');
  const [manualCity, setManualCity] = useState(user?.city || 'Bengaluru');
  const [manualState, setManualState] = useState('Karnataka');
  const [manualPincode, setManualPincode] = useState(user?.pincode || '');

  // Step 3: Payment & Submission
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'netbanking'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Honest unassigned status state if no worker is currently online
  const [unassignedResult, setUnassignedResult] = useState<{
    booking: Booking;
    message: string;
  } | null>(null);

  // Bootstrap initial location if not passed via props
  useEffect(() => {
    let isMounted = true;
    if (!activeLocation) {
      locationService.getCurrentLocation().then((saved) => {
        if (isMounted && saved) {
          setActiveLocation(saved);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Update active location if prop changes and not yet manually overridden
  useEffect(() => {
    if (currentLocation && !activeLocation) {
      setActiveLocation(currentLocation);
    }
  }, [currentLocation]);

  const customer = user?.role === 'customer' ? (user as Customer) : null;
  const savedAddresses = customer?.savedAddresses || [];

  // Tariff calculation
  const basePrice = selectedEmergency.baseEmergencyPrice;
  const welfareCess = Math.round(basePrice * 0.05); // 5%
  const gst = Math.round(basePrice * 0.05); // 5%
  const totalAmount = basePrice + welfareCess + gst;

  // Handle GPS Refresh
  const handleUseGps = async () => {
    setIsLocatingGps(true);
    setErrorMessage(null);
    try {
      const result = await locationService.requestLiveGpsLocation();
      if (result.success && result.coords) {
        setActiveLocation(result.coords);
        setShowInlineManual(false);
      } else {
        setErrorMessage(result.error || 'GPS location unavailable. Please enter your location manually.');
      }
    } catch {
      setErrorMessage('Could not retrieve GPS location. Please enter your address manually.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  // Handle Manual Form Save
  const handleSaveManualLocation = async () => {
    if (!manualStreet.trim() && !manualArea.trim()) {
      Alert.alert('Address Incomplete', 'Please enter at least a Street / Road or Area / Locality.');
      return;
    }

    const details = {
      houseFlat: manualHouse.trim(),
      street: manualStreet.trim(),
      area: manualArea.trim(),
      city: manualCity.trim() || 'City',
      state: manualState.trim() || 'State',
      pincode: manualPincode.trim(),
    };

    const savedCoords = await locationService.setManualLocation(details);
    setActiveLocation(savedCoords);
    setShowInlineManual(false);
  };

  // Handle Step Navigation
  const handleNextFromService = () => {
    setErrorMessage(null);
    setCurrentStep(2);
  };

  const handleNextFromLocation = () => {
    setErrorMessage(null);
    if (!activeLocation || (!activeLocation.address && !activeLocation.city)) {
      setErrorMessage(t('location_required_error'));
      Alert.alert('Location Required', t('location_required_error'));
      return;
    }
    setCurrentStep(3);
  };

  // Final Confirmation & Real Dispatch Creation
  const handleConfirmEmergencyBooking = async () => {
    if (!activeLocation || (!activeLocation.address && !activeLocation.city)) {
      setErrorMessage(t('location_required_error'));
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const hasCoords =
        activeLocation.latitude != null &&
        activeLocation.longitude != null &&
        !isNaN(activeLocation.latitude) &&
        !isNaN(activeLocation.longitude) &&
        activeLocation.coordinatesAvailable !== false;

      const serviceLocation: ServiceLocation = {
        addressLine: activeLocation.address || activeLocation.city || 'Emergency Service Address',
        landmark: landmark.trim() || undefined,
        city: activeLocation.city || 'Area',
        pincode: activeLocation.pincode || '',
        latitude: hasCoords ? activeLocation.latitude : undefined,
        longitude: hasCoords ? activeLocation.longitude : undefined,
        locationMode: activeLocation.locationMode || (activeLocation.isGps ? 'GPS' : 'MANUAL'),
        manualDetails: activeLocation.manualDetails,
      };

      const result = await dispatchPriorityBooking({
        customerId: user?.id || 'cust-101',
        customerName: user?.name || 'Customer Member',
        customerPhone: user?.phone || '+91 98450 12345',
        categoryId: selectedEmergency.categoryId,
        serviceTitle: `${selectedEmergency.title} [Priority 24/7]`,
        customerLocation: serviceLocation,
        instructions: `URGENT PRIORITY 24/7: Cooperative Rapid Response for ${selectedEmergency.title}.${
          landmark.trim() ? ` Landmark/Access: ${landmark.trim()}` : ''
        }`,
        estimatedAmount: totalAmount,
        welfareCessAmount: welfareCess,
        paymentMethod,
      });

      if (!result.success || !result.booking) {
        const errorText = result.error || 'No available worker is currently available for this priority request.';
        setErrorMessage(errorText);
        return;
      }

      if (!result.workerAssigned) {
        // Honest state: booking was recorded in queue, but no worker is immediately available
        setUnassignedResult({
          booking: result.booking,
          message:
            result.message ||
            t('no_worker_available_recorded'),
        });
        return;
      }

      // Legitimate worker assigned in 'requested' state!
      onBookingSuccess(result.booking);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch priority booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportPhone = process.env.EXPO_PUBLIC_SUPPORT_PHONE;

  const handleCallSupport = () => {
    if (supportPhone) {
      triggerPhoneCall(supportPhone);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={t('emergency_flow_title')}
        showBack
        onBack={() => {
          if (currentStep > 1 && !unassignedResult) {
            setCurrentStep((prev) => (prev - 1) as StepNumber);
          } else {
            onBack();
          }
        }}
      />

      {/* Wizard Progress Bar */}
      <View style={styles.stepperContainer}>
        {[
          { num: 1, label: t('step_service') },
          { num: 2, label: t('step_location') },
          { num: 3, label: t('step_review_payment') },
        ].map((s) => {
          const isCurrent = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <View key={s.num} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  isDone && styles.stepCircleDone,
                  isCurrent && styles.stepCircleCurrent,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={12} color={colors.textInverse} />
                ) : (
                  <Text
                    style={[
                      styles.stepCircleText,
                      isCurrent && styles.stepCircleTextCurrent,
                    ]}
                  >
                    {s.num}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (isCurrent || isDone) && styles.stepLabelActive]}>
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ======================================================== */}
        {/* UNASSIGNED HONEST RESULT MODAL / BANNER */}
        {/* ======================================================== */}
        {unassignedResult && (
          <View style={styles.unassignedCard}>
            <View style={styles.unassignedIconBox}>
              <Ionicons name="alert-circle" size={40} color={colors.accent} />
            </View>
            <Text style={styles.unassignedTitle}>Priority Request Recorded</Text>
            <Text style={styles.unassignedDesc}>{unassignedResult.message}</Text>

            <View style={styles.unassignedSummaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Booking ID:</Text>
                <Text style={styles.summaryValueCode}>{unassignedResult.booking.bookingCode}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service:</Text>
                <Text style={styles.summaryValue}>{unassignedResult.booking.serviceTitle}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>
                  {unassignedResult.booking.serviceLocation.addressLine}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status:</Text>
                <Badge status="requested" />
              </View>
            </View>

            <View style={styles.unassignedActionsRow}>
              <Button
                title="View in My Bookings"
                icon="calendar-outline"
                variant="primary"
                size="md"
                onPress={() => onBookingSuccess(unassignedResult.booking)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Back to Home"
                variant="outline"
                size="md"
                onPress={onBack}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}

        {!unassignedResult && (
          <>
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 1: SELECT EMERGENCY SERVICE */}
            {/* ======================================================== */}
            {currentStep === 1 && (
              <View>
                <View style={styles.alertHeader}>
                  <View style={styles.alertIcon}>
                    <Ionicons name="flash" size={24} color={colors.textInverse} />
                  </View>
                  <View style={styles.alertTexts}>
                    <Text style={styles.alertTitle}>Emergency Cooperative Response</Text>
                    <Text style={styles.alertSubtitle}>
                      Rapid priority dispatch for electrical breakdowns, burst pipes & urgent repairs.
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>{t('step_service')}</Text>

                <View style={styles.servicesList}>
                  {emergencyServices.map((svc) => {
                    const isSelected = selectedEmergency.id === svc.id;
                    return (
                      <TouchableOpacity
                        key={svc.id}
                        onPress={() => setSelectedEmergency(svc)}
                        style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                        activeOpacity={0.8}
                      >
                        <View style={styles.serviceTop}>
                          <View style={styles.serviceTitleRow}>
                            <Ionicons
                              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                              size={20}
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

                <View style={styles.ctaBox}>
                  <Button
                    title="Next: Confirm Location"
                    icon="arrow-forward"
                    onPress={handleNextFromService}
                    variant="emergency"
                    size="lg"
                    fullWidth
                  />
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 2: CONFIRM SERVICE LOCATION */}
            {/* ======================================================== */}
            {currentStep === 2 && (
              <View>
                <Text style={styles.sectionTitle}>{t('step_location')}</Text>
                <Text style={styles.sectionSubtitle}>{t('select_location_prompt')}</Text>

                {/* Active Selected Location Display Card */}
                <View style={styles.locationDisplayCard}>
                  <View style={styles.locationDisplayHeader}>
                    <Ionicons name="location" size={20} color={colors.danger} />
                    <Text style={styles.locationDisplayTitle}>{t('emergency_location_label')}</Text>
                    <View
                      style={[
                        styles.sourcePill,
                        activeLocation?.isGps ? styles.sourcePillGps : styles.sourcePillManual,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sourcePillText,
                          activeLocation?.isGps ? styles.sourcePillTextGps : styles.sourcePillTextManual,
                        ]}
                      >
                        {activeLocation?.isGps
                          ? '📍 Live GPS'
                          : activeLocation?.locationMode === 'MANUAL'
                          ? '🏠 Manual Address'
                          : '🏷️ Saved Address'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.locationAddressText}>
                    {activeLocation?.address || activeLocation?.city || 'No service address selected'}
                  </Text>

                  {activeLocation?.coordinatesAvailable === false && (
                    <View style={styles.coordNoteBox}>
                      <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
                      <Text style={styles.coordNoteText}>
                        Physical address confirmed. Dispatched workers will navigate directly to this address.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Location Switching Actions */}
                <View style={styles.locationSwitchActions}>
                  {/* GPS Option */}
                  <TouchableOpacity
                    onPress={handleUseGps}
                    style={[styles.locActionBtn, activeLocation?.isGps && styles.locActionBtnActive]}
                    activeOpacity={0.8}
                    disabled={isLocatingGps}
                  >
                    {isLocatingGps ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="navigate-circle" size={18} color={colors.primary} />
                    )}
                    <Text style={styles.locActionBtnText}>Use My Real GPS Location</Text>
                  </TouchableOpacity>

                  {/* Manual Option */}
                  <TouchableOpacity
                    onPress={() => setShowInlineManual(!showInlineManual)}
                    style={[
                      styles.locActionBtn,
                      showInlineManual && styles.locActionBtnActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.locActionBtnText}>Enter Location Manually</Text>
                  </TouchableOpacity>

                  {/* Saved Addresses Modal Picker */}
                  <TouchableOpacity
                    onPress={() => setShowLocationModal(true)}
                    style={styles.locActionBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="bookmarks-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.locActionBtnText}>Saved Addresses ({savedAddresses.length})</Text>
                  </TouchableOpacity>
                </View>

                {/* Inline Manual Form (if toggled) */}
                {showInlineManual && (
                  <View style={styles.manualFormBox}>
                    <Text style={styles.manualFormTitle}>Enter Service Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="House / Flat / Building No."
                      value={manualHouse}
                      onChangeText={setManualHouse}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Street / Road *"
                      value={manualStreet}
                      onChangeText={setManualStreet}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Area / Locality *"
                      value={manualArea}
                      onChangeText={setManualArea}
                    />
                    <View style={styles.formRow}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                        placeholder="City"
                        value={manualCity}
                        onChangeText={setManualCity}
                      />
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="PIN Code"
                        value={manualPincode}
                        onChangeText={setManualPincode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <Button
                      title="Set as Emergency Destination"
                      variant="primary"
                      size="sm"
                      onPress={handleSaveManualLocation}
                      style={{ marginTop: spacing.sm }}
                    />
                  </View>
                )}

                {/* Landmark / Urgent Access Notes */}
                <View style={styles.landmarkBox}>
                  <Text style={styles.fieldLabel}>{t('emergency_landmark_label')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('emergency_landmark_placeholder')}
                    value={landmark}
                    onChangeText={setLandmark}
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.stepBtnRow}>
                  <Button
                    title="Back"
                    icon="arrow-back"
                    variant="outline"
                    size="lg"
                    onPress={() => setCurrentStep(1)}
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  <Button
                    title="Next: Review & Pay"
                    icon="arrow-forward"
                    variant="emergency"
                    size="lg"
                    onPress={handleNextFromLocation}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}

            {/* ======================================================== */}
            {/* STEP 3: REVIEW & PAYMENT CONFIRMATION */}
            {/* ======================================================== */}
            {currentStep === 3 && (
              <View>
                <Text style={styles.sectionTitle}>{t('step_review_payment')}</Text>

                {/* Emergency Booking Review Card */}
                <View style={styles.reviewCard}>
                  <Text style={styles.reviewCardTitle}>Emergency Booking Summary</Text>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Selected Service:</Text>
                    <Text style={styles.reviewValBold}>{selectedEmergency.title}</Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Destination:</Text>
                    <Text style={styles.reviewVal} numberOfLines={2}>
                      {activeLocation?.address || activeLocation?.city}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Location Mode:</Text>
                    <Text style={styles.reviewVal}>
                      {activeLocation?.isGps ? '📍 Live GPS Location' : '🏠 Manual / Saved Address'}
                    </Text>
                  </View>

                  {landmark.trim().length > 0 && (
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Access Instructions:</Text>
                      <Text style={styles.reviewVal}>{landmark.trim()}</Text>
                    </View>
                  )}

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Priority Level:</Text>
                    <View style={styles.priorityPill}>
                      <Ionicons name="flash" size={12} color={colors.danger} />
                      <Text style={styles.priorityPillText}>24/7 Rapid Emergency</Text>
                    </View>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Dispatch Status:</Text>
                    <Badge status="requested" />
                  </View>
                </View>

                {/* Transparent Cooperative Fare Breakdown */}
                <View style={styles.fareBreakdownCard}>
                  <Text style={styles.fareBreakdownTitle}>{t('emergency_pricing_breakdown')}</Text>

                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>{t('emergency_base_price')}</Text>
                    <Text style={styles.fareVal}>₹{basePrice}</Text>
                  </View>

                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>{t('emergency_welfare_cess')}</Text>
                    <Text style={styles.fareVal}>₹{welfareCess}</Text>
                  </View>

                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>{t('emergency_gst')}</Text>
                    <Text style={styles.fareVal}>₹{gst}</Text>
                  </View>

                  <View style={styles.fareTotalRow}>
                    <Text style={styles.fareTotalLabel}>{t('emergency_total')}</Text>
                    <Text style={styles.fareTotalVal}>₹{totalAmount}</Text>
                  </View>
                </View>

                {/* Honest Payment Method Selection */}
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentCardTitle}>{t('payment_method_label')}</Text>

                  {[
                    { id: 'cash', label: t('payment_cash'), icon: 'cash-outline', tag: 'Fastest for Emergency' },
                    { id: 'upi', label: t('payment_upi'), icon: 'qr-code-outline', tag: 'Doorstep QR' },
                    { id: 'card', label: t('payment_card'), icon: 'card-outline' },
                    { id: 'netbanking', label: t('payment_netbanking'), icon: 'globe-outline' },
                  ].map((m) => {
                    const isSelected = paymentMethod === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setPaymentMethod(m.id as any)}
                        style={[styles.paymentMethodRow, isSelected && styles.paymentMethodRowSelected]}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Ionicons
                          name={m.icon as any}
                          size={18}
                          color={isSelected ? colors.primary : colors.textSecondary}
                          style={{ marginLeft: 8 }}
                        />
                        <Text
                          style={[
                            styles.paymentMethodLabel,
                            isSelected && styles.paymentMethodLabelSelected,
                          ]}
                        >
                          {m.label}
                        </Text>
                        {m.tag && (
                          <View style={styles.paymentTag}>
                            <Text style={styles.paymentTagText}>{m.tag}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Honest Disclosure Notice */}
                  <View style={styles.honestPaymentNotice}>
                    <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                    <Text style={styles.honestPaymentNoticeText}>
                      {t('pay_on_completion_note')}
                    </Text>
                  </View>
                </View>

                {/* Final Confirm Button */}
                <View style={styles.stepBtnRow}>
                  <Button
                    title="Back"
                    icon="arrow-back"
                    variant="outline"
                    size="lg"
                    onPress={() => setCurrentStep(2)}
                    style={{ flex: 1, marginRight: 8 }}
                    disabled={isSubmitting}
                  />
                  <Button
                    title={
                      isSubmitting
                        ? t('dispatching_priority')
                        : t('confirm_emergency_booking_btn', { amount: totalAmount })
                    }
                    icon={isSubmitting ? undefined : 'flash'}
                    variant="emergency"
                    size="lg"
                    loading={isSubmitting}
                    onPress={handleConfirmEmergencyBooking}
                    style={{ flex: 2 }}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* Direct Emergency Contact Helpline (if configured) */}
        {supportPhone && (
          <View style={styles.helplineContainer}>
            <TouchableOpacity onPress={handleCallSupport} style={styles.helplineBtn}>
              <Ionicons name="call" size={16} color={colors.primary} />
              <Text style={styles.helplineBtnText}>Cooperative Emergency Phone: {supportPhone}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Location Selector Modal */}
      <LocationSelectorModal
        visible={showLocationModal}
        currentLocation={activeLocation}
        currentAddress={activeLocation?.address}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={(loc) => {
          setActiveLocation(loc);
          setShowLocationModal(false);
          setShowInlineManual(false);
        }}
        onUseGps={handleUseGps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCurrent: {
    backgroundColor: colors.danger,
  },
  stepCircleDone: {
    backgroundColor: colors.success,
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stepCircleTextCurrent: {
    color: colors.textInverse,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  alertHeader: {
    flexDirection: 'row',
    backgroundColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  alertTexts: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  alertSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  servicesList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  serviceCardActive: {
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  serviceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  serviceTitleActive: {
    color: colors.danger,
    fontWeight: '700',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  serviceDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  serviceBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  availText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  ctaBox: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  locationDisplayCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  locationDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  locationDisplayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginLeft: 6,
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sourcePillGps: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  sourcePillManual: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  sourcePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sourcePillTextGps: {
    color: '#2563eb',
  },
  sourcePillTextManual: {
    color: '#d97706',
  },
  locationAddressText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  coordNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: borderRadius.sm,
    marginTop: 8,
  },
  coordNoteText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  locationSwitchActions: {
    gap: 8,
    marginBottom: spacing.md,
  },
  locActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  locActionBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  locActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  manualFormBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 8,
  },
  manualFormTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  formRow: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 12,
    color: colors.text,
  },
  landmarkBox: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  stepBtnRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 10,
  },
  reviewCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 6,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reviewVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  reviewValBold: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  fareBreakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 8,
  },
  fareBreakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 6,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  fareVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  fareTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  fareTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  fareTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 8,
  },
  paymentCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  paymentMethodRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  paymentMethodLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  paymentTag: {
    backgroundColor: 'rgba(13, 122, 95, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  paymentTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  honestPaymentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: 6,
  },
  honestPaymentNoticeText: {
    fontSize: 11,
    color: colors.primaryDark,
    lineHeight: 15,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing.md,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  unassignedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  unassignedIconBox: {
    marginBottom: spacing.sm,
  },
  unassignedTitle: {
    ...typography.h3,
    color: colors.accentDark,
    textAlign: 'center',
  },
  unassignedDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  unassignedSummaryBox: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    maxWidth: '65%',
    textAlign: 'right',
  },
  summaryValueCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  unassignedActionsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  helplineContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  helplineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  helplineBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
});

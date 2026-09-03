import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Avatar, StarRating } from '../../components/ui';
import { serviceCategories, subServices } from '../../data';
import { workerService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { WorkerProfile, ServiceCategoryKey, Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface BookingFlowScreenProps {
  initialWorkerId?: string;
  initialServiceId?: string;
  onBookingSuccess: (booking: Booking) => void;
  onCancel: () => void;
}

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({
  initialWorkerId,
  initialServiceId,
  onBookingSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const { createBooking } = useBookings();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  // Step 1: Service
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey>(
    (initialServiceId as ServiceCategoryKey) || 'electrical'
  );
  const [selectedSubServiceId, setSelectedSubServiceId] = useState<string>('sub-elec-1');

  // Step 2: Worker
  const [workersList, setWorkersList] = useState<WorkerProfile[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(initialWorkerId || 'worker-101');

  // Step 3: Date
  const [selectedDate, setSelectedDate] = useState<string>('Today, 2 March');

  // Step 4: Time Slot
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:00 AM - 12:00 PM');

  // Step 5: Location
  const [addressLine, setAddressLine] = useState(
    user?.address || 'Flat 402, Shanti Niketan Apts, 12th Main, Indiranagar'
  );
  const [landmark, setLandmark] = useState('Opposite Defense Colony Park');

  // Step 6: Instructions
  const [instructions, setInstructions] = useState('');

  // Step 8: Payment
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'cash'>('upi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    workerService.getWorkers({ category: selectedCategory }).then((data) => {
      setWorkersList(data);
      if (!initialWorkerId && data.length > 0) {
        setSelectedWorkerId(data[0].id);
      }
    });
  }, [selectedCategory, initialWorkerId]);

  const selectedWorker = workersList.find((w) => w.id === selectedWorkerId) || workersList[0];
  const activeSubServices = subServices.filter((s) => s.categoryId === selectedCategory);
  const currentSubService =
    activeSubServices.find((s) => s.id === selectedSubServiceId) || activeSubServices[0];

  // Pricing calculation
  const baseRate = currentSubService?.standardPrice || 299;
  const welfareCess = Math.round(baseRate * 0.05); // 5%
  const gst = Math.round(baseRate * 0.05); // 5%
  const totalAmount = baseRate + welfareCess + gst;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinalConfirm();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      onCancel();
    }
  };

  const handleFinalConfirm = async () => {
    setIsSubmitting(true);
    try {
      const newBooking = await createBooking({
        customerId: user?.id || 'cust-101',
        customerName: user?.name || 'Ramesh Sharma',
        customerPhone: user?.phone || '+91 98450 12345',
        workerId: selectedWorker?.id || 'worker-101',
        workerName: selectedWorker?.name || 'Suresh Kumar',
        workerSkill: selectedWorker?.primarySkill || 'Electrician',
        workerPhone: selectedWorker?.phone || '+91 98765 43210',
        cooperativeName: selectedWorker?.cooperativeName || 'Nagarika Seva Sahakari Samiti Ltd.',
        categoryId: selectedCategory,
        serviceTitle: currentSubService?.title || 'Electrical Repair',
        scheduledDate: selectedDate,
        scheduledTimeSlot: selectedTimeSlot,
        status: 'requested',
        serviceLocation: {
          addressLine,
          landmark,
          city: 'Bengaluru',
          pincode: '560038',
          latitude: 12.9784,
          longitude: 77.6408,
        },
        instructions: instructions || 'Standard cooperative service request',
        estimatedAmount: totalAmount,
        welfareCessAmount: welfareCess,
        isEmergency: false,
        paymentMethod,
        paymentStatus: 'pending',
      });

      onBookingSuccess(newBooking);
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeSlots = [
    '08:30 AM - 10:30 AM',
    '10:30 AM - 12:30 PM',
    '02:00 PM - 04:00 PM',
    '04:30 PM - 06:30 PM',
    '06:30 PM - 08:30 PM',
  ];

  const dateOptions = [
    { label: 'Today', value: 'Today, 2 March' },
    { label: 'Tomorrow', value: 'Tomorrow, 3 March' },
    { label: 'Mon, 4 Mar', value: 'Monday, 4 March' },
    { label: 'Tue, 5 Mar', value: 'Tuesday, 5 March' },
  ];

  return (
    <View style={styles.container}>
      <Header
        title={`Book Service (Step ${currentStep}/${totalSteps})`}
        showBack
        onBack={handleBack}
      />

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${(currentStep / totalSteps) * 100}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: SELECT SERVICE & SUB-SERVICE */}
        {currentStep === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>1. Select Service & Task</Text>
            <Text style={styles.stepSubtitle}>Choose the trade and specific repair requirement</Text>

            <Text style={styles.sectionHeader}>Service Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizPills}>
              {serviceCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[styles.catPill, selectedCategory === cat.id && styles.catPillActive]}
                >
                  <Text style={[styles.catPillText, selectedCategory === cat.id && styles.catPillTextActive]}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionHeader, { marginTop: spacing.md }]}>Common Tasks</Text>
            {activeSubServices.map((sub) => {
              const isSelected = selectedSubServiceId === sub.id;
              return (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => setSelectedSubServiceId(sub.id)}
                  style={[styles.taskCard, isSelected && styles.taskCardActive]}
                >
                  <View style={styles.taskRadio}>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTitle}>{sub.title}</Text>
                    <Text style={styles.taskDesc}>{sub.description}</Text>
                    <Text style={styles.taskPrice}>
                      Fair Rate: ₹{sub.standardPrice} • {sub.estimatedMinutes} mins
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP 2: SELECT WORKER */}
        {currentStep === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>2. Choose Verified Cooperative Worker</Text>
            <Text style={styles.stepSubtitle}>
              All workers are background-checked members of local labour cooperatives
            </Text>

            {workersList.map((worker) => {
              const isSelected = selectedWorkerId === worker.id;
              return (
                <TouchableOpacity
                  key={worker.id}
                  onPress={() => setSelectedWorkerId(worker.id)}
                  style={[styles.workerSelectCard, isSelected && styles.workerSelectCardActive]}
                >
                  <Avatar name={worker.name} url={worker.avatarUrl} size={48} showVerifiedBadge />
                  <View style={styles.workerSelectInfo}>
                    <View style={styles.workerSelectNameRow}>
                      <Text style={styles.workerSelectName}>{worker.name}</Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.workerSelectSkill}>{worker.primarySkill}</Text>
                    <Text style={styles.workerSelectCoop}>{worker.cooperativeName}</Text>
                    <StarRating rating={worker.rating} count={worker.reviewCount} size={11} style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* STEP 3: SELECT DATE */}
        {currentStep === 3 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>3. Select Service Date</Text>
            <Text style={styles.stepSubtitle}>When would you like the cooperative worker to visit?</Text>

            <View style={styles.datesGrid}>
              {dateOptions.map((opt) => {
                const isSelected = selectedDate === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setSelectedDate(opt.value)}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  >
                    <Ionicons
                      name="calendar"
                      size={22}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.dateSubtext}>{opt.value.split(',')[1] || opt.value}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 4: SELECT TIME SLOT */}
        {currentStep === 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>4. Select Time Slot</Text>
            <Text style={styles.stepSubtitle}>Choose a 2-hour window that fits your schedule</Text>

            <View style={styles.slotsList}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTimeSlot === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => setSelectedTimeSlot(slot)}
                    style={[styles.slotItem, isSelected && styles.slotItemActive]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                      {slot}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 5: SERVICE LOCATION */}
        {currentStep === 5 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>5. Confirm Service Location</Text>
            <Text style={styles.stepSubtitle}>Where should the cooperative technician report?</Text>

            <Text style={styles.inputLabel}>Street Address / Flat Number</Text>
            <TextInput
              style={styles.textInput}
              value={addressLine}
              onChangeText={setAddressLine}
              placeholder="House/Flat number, Building name, Street"
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Nearby Landmark</Text>
            <TextInput
              style={styles.textInput}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Opposite Park, Behind Metro Station"
            />

            <View style={styles.locationTrustNotice}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.locationTrustText}>
                Zone: Indiranagar Cooperative Guild Hub (Bengaluru)
              </Text>
            </View>
          </View>
        )}

        {/* STEP 6: INSTRUCTIONS */}
        {currentStep === 6 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>6. Instructions & Specifics</Text>
            <Text style={styles.stepSubtitle}>
              Help the worker prepare appropriate tools or spare parts
            </Text>

            <TextInput
              style={styles.textArea}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="e.g. Please bring an extra 16A modular switch and long tester. Living room ceiling is 10ft high."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.hintsTitle}>Suggestions:</Text>
            <View style={styles.hintsRow}>
              {['Power tripping often', 'Need extra ladder', 'Pet in household', 'Urgent call on arrival'].map((h, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setInstructions((prev) => (prev ? `${prev}, ${h}` : h))}
                  style={styles.hintPill}
                >
                  <Text style={styles.hintPillText}>+ {h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 7: REVIEW BOOKING */}
        {currentStep === 7 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>7. Review Booking Summary</Text>
            <Text style={styles.stepSubtitle}>Verify details before proceeding to payment confirmation</Text>

            <View style={styles.reviewSummaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Selected Service</Text>
                <Text style={styles.summaryValue}>{currentSubService?.title || 'Electrical Repair'}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cooperative Worker</Text>
                <Text style={styles.summaryValue}>{selectedWorker?.name} ({selectedWorker?.primarySkill})</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Cooperative Society</Text>
                <Text style={styles.summaryValue}>{selectedWorker?.cooperativeName}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Appointment Slot</Text>
                <Text style={styles.summaryValue}>{selectedDate} • {selectedTimeSlot}</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Service Location</Text>
                <Text style={styles.summaryValue}>{addressLine}</Text>
              </View>
            </View>

            {/* Fair-Wage Price Breakdown */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownHeader}>Fair Wage Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Service Base Fare</Text>
                <Text style={styles.breakdownAmount}>₹{baseRate}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Cooperative Worker Welfare Cess (5%)</Text>
                <Text style={styles.breakdownAmount}>₹{welfareCess}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>GST (5%)</Text>
                <Text style={styles.breakdownAmount}>₹{gst}</Text>
              </View>
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalAmount}>₹{totalAmount}</Text>
              </View>
            </View>
          </View>
        )}

        {/* STEP 8: PAYMENT & CONFIRM */}
        {currentStep === 8 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>8. Payment Method</Text>
            <Text style={styles.stepSubtitle}>
              Mock Payment Interface (Zero Real Transactions)
            </Text>

            <View style={styles.paymentMethods}>
              {[
                { id: 'upi', label: 'UPI (GPay / PhonePe / Paytm)', icon: 'phone-portrait-outline' },
                { id: 'card', label: 'Debit / Credit Card', icon: 'card-outline' },
                { id: 'netbanking', label: 'Net Banking', icon: 'business-outline' },
                { id: 'cash', label: 'Cash / Pay After Service', icon: 'cash-outline' },
              ].map((m) => {
                const isSelected = paymentMethod === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setPaymentMethod(m.id as any)}
                    style={[styles.methodCard, isSelected && styles.methodCardActive]}
                  >
                    <Ionicons
                      name={m.icon as any}
                      size={20}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[styles.methodLabel, isSelected && styles.methodLabelActive]}>
                      {m.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="radio-button-on" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.mockDisclaimer}>
              <Ionicons name="information-circle" size={16} color={colors.accent} />
              <Text style={styles.mockDisclaimerText}>
                Notice: This uses a simulated payment service. No actual funds are transferred. The booking will appear immediately in "My Bookings".
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Step Bar */}
      <View style={styles.stepFooter}>
        <Button
          title={currentStep === 1 ? 'Cancel' : 'Back'}
          onPress={handleBack}
          variant="outline"
          size="md"
          style={{ minWidth: 100 }}
        />
        <Button
          title={currentStep === totalSteps ? 'Confirm & Book' : 'Continue'}
          icon={currentStep === totalSteps ? 'checkmark-done' : 'arrow-forward'}
          iconPosition="right"
          onPress={handleNext}
          loading={isSubmitting}
          variant="primary"
          size="md"
          style={{ minWidth: 160 }}
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
  progressBarBg: {
    height: 4,
    backgroundColor: colors.border,
    width: '100%',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 90,
  },
  stepBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepTitle: {
    ...typography.h3,
    color: colors.text,
  },
  stepSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  horizPills: {
    marginBottom: spacing.md,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  catPillTextActive: {
    color: colors.primary,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  taskCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  taskRadio: {
    marginRight: spacing.sm,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  taskDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  taskPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  workerSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  workerSelectCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  workerSelectInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  workerSelectNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workerSelectName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  workerSelectSkill: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  workerSelectCoop: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  datesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  dateCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  dateLabelActive: {
    color: colors.primary,
  },
  dateSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  slotsList: {
    gap: 8,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  slotItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  slotText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  slotTextActive: {
    color: colors.primary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: 13,
    color: colors.text,
  },
  locationTrustNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  locationTrustText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
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
    minHeight: 100,
  },
  hintsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  hintsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hintPill: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  hintPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  reviewSummaryCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  summaryItem: {
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  breakdownBox: {
    backgroundColor: colors.primarySurface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.2)',
  },
  breakdownHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  breakdownAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(13, 122, 95, 0.2)',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  paymentMethods: {
    gap: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  methodCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  methodLabelActive: {
    color: colors.primary,
  },
  mockDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.accentLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  mockDisclaimerText: {
    fontSize: 11,
    color: colors.accentDark,
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  stepFooter: {
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
  },
});

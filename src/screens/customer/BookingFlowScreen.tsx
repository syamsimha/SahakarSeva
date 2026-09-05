import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Avatar, StarRating } from '../../components/ui';
import { serviceCategories, subServices } from '../../data';
import { workerService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { WorkerProfile, ServiceCategoryKey, Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export interface DynamicDateOption {
  id: string;
  label: string;
  subtext: string;
  value: string;
  fullDate: string;
  isToday: boolean;
  isTomorrow: boolean;
  isoDate: string;
}

export interface TimeSlotDef {
  id: string;
  label: string;
  subtitle: string;
  startHour: number;
  endHour: number;
  isAsap?: boolean;
}

export const getDynamicDateOptions = (): DynamicDateOption[] => {
  const options: DynamicDateOption[] = [];
  const now = new Date();
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fullMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (let i = 0; i < 7; i++) {
    const target = new Date(now);
    target.setDate(now.getDate() + i);

    const dayNum = target.getDate();
    const monthShort = monthsShort[target.getMonth()];
    const dayShort = daysShort[target.getDay()];
    const fullDay = fullDays[target.getDay()];
    const fullMonth = fullMonths[target.getMonth()];
    const year = target.getFullYear();
    const isoDate = `${year}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    if (i === 0) {
      options.push({
        id: 'today',
        label: 'Today',
        subtext: `${dayNum} ${monthShort}`,
        value: `Today, ${dayNum} ${monthShort}`,
        fullDate: `${fullDay}, ${dayNum} ${fullMonth} ${year}`,
        isToday: true,
        isTomorrow: false,
        isoDate,
      });
    } else if (i === 1) {
      options.push({
        id: 'tomorrow',
        label: 'Tomorrow',
        subtext: `${dayNum} ${monthShort}`,
        value: `Tomorrow, ${dayNum} ${monthShort}`,
        fullDate: `${fullDay}, ${dayNum} ${fullMonth} ${year}`,
        isToday: false,
        isTomorrow: true,
        isoDate,
      });
    } else {
      options.push({
        id: `day-${i}`,
        label: `${dayShort}, ${dayNum} ${monthShort}`,
        subtext: fullDay,
        value: `${fullDay}, ${dayNum} ${monthShort}`,
        fullDate: `${fullDay}, ${dayNum} ${fullMonth} ${year}`,
        isToday: false,
        isTomorrow: false,
        isoDate,
      });
    }
  }

  return options;
};

export const ALL_TIME_SLOTS: TimeSlotDef[] = [
  {
    id: 'asap',
    label: '⚡ Immediate / Right Now',
    subtitle: 'Priority cooperative dispatch within 30-45 mins',
    startHour: 0,
    endHour: 24,
    isAsap: true,
  },
  {
    id: 'slot-1',
    label: '08:30 AM - 10:30 AM',
    subtitle: 'Morning Slot',
    startHour: 8.5,
    endHour: 10.5,
  },
  {
    id: 'slot-2',
    label: '10:30 AM - 12:30 PM',
    subtitle: 'Late Morning Slot',
    startHour: 10.5,
    endHour: 12.5,
  },
  {
    id: 'slot-3',
    label: '02:00 PM - 04:00 PM',
    subtitle: 'Afternoon Slot',
    startHour: 14.0,
    endHour: 16.0,
  },
  {
    id: 'slot-4',
    label: '04:30 PM - 06:30 PM',
    subtitle: 'Late Afternoon Slot',
    startHour: 16.5,
    endHour: 18.5,
  },
  {
    id: 'slot-5',
    label: '06:30 PM - 08:30 PM',
    subtitle: 'Evening Slot',
    startHour: 18.5,
    endHour: 20.5,
  },
  {
    id: 'slot-6',
    label: '08:30 PM - 10:30 PM',
    subtitle: 'Night / Urgent Slot',
    startHour: 20.5,
    endHour: 22.5,
  },
];

export const getInitialTimeSlot = (): string => {
  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const upcoming = ALL_TIME_SLOTS.find(
    (s) => !s.isAsap && s.endHour > currentDecimalHour + 0.5
  );
  if (upcoming) {
    return upcoming.label;
  }
  return '⚡ Immediate / Right Now (Within 30-45 mins)';
};

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
  const { t } = useLanguage();

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

  // Dynamic Date & Time states
  const dateOptions = getDynamicDateOptions();
  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].value);
  const [isCustomDateActive, setIsCustomDateActive] = useState<boolean>(false);
  const [customDateValue, setCustomDateValue] = useState<string>('');

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(getInitialTimeSlot());
  const [isCustomTimeActive, setIsCustomTimeActive] = useState<boolean>(false);
  const [customTimeValue, setCustomTimeValue] = useState<string>('');

  // Live clock display
  const [currentLiveClock, setCurrentLiveClock] = useState<string>(() => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} • ${hours}:${minutesStr} ${ampm}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      let hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      setCurrentLiveClock(
        `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} • ${hours}:${minutesStr} ${ampm}`
      );
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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
    workerService.getWorkers({ category: selectedCategory, verifiedOnly: true }).then((data) => {
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

  const now = new Date();
  const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
  const isSelectedDateToday = selectedDate.startsWith('Today');

  // GPS / Geolocation detection
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const handleDetectGPSLocation = () => {
    setIsDetectingLocation(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setAddressLine(`GPS Verified: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`);
          setLandmark('Current Live GPS Coordinates Detected');
          setIsDetectingLocation(false);
        },
        () => {
          setAddressLine('Flat 402, Shanti Niketan, 12th Main, Indiranagar');
          setLandmark('Opposite Defense Colony Park (GPS Hub)');
          setIsDetectingLocation(false);
        },
        { timeout: 5000 }
      );
    } else {
      setTimeout(() => {
        setAddressLine('Flat 402, Shanti Niketan, 12th Main, Indiranagar');
        setLandmark('Opposite Defense Colony Park (GPS Hub)');
        setIsDetectingLocation(false);
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={`${t('book_now')} (${t('Step')} ${currentStep}/${totalSteps})`}
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

            {/* Live Clock Status Banner */}
            <View style={styles.liveClockBanner}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveBadgeText}>LIVE SYSTEM TIME & DATE</Text>
              </View>
              <Text style={styles.liveClockValue}>{currentLiveClock}</Text>
            </View>

            {/* Quick One-Tap Action: Today & Immediate Time */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.immediateCard,
                selectedDate.startsWith('Today') && selectedTimeSlot.includes('Immediate') && styles.immediateCardActive,
              ]}
              onPress={() => {
                setSelectedDate(dateOptions[0].value);
                setSelectedTimeSlot('⚡ Immediate / Right Now (Within 30-45 mins)');
                setIsCustomDateActive(false);
                setIsCustomTimeActive(false);
              }}
            >
              <View style={styles.immediateIconCircle}>
                <Ionicons name="flash" size={20} color="#D97706" />
              </View>
              <View style={styles.immediateCardText}>
                <View style={styles.immediateTagRow}>
                  <Text style={styles.immediateCardTitle}>Book for Current Date & Time</Text>
                  <View style={styles.asapBadge}>
                    <Text style={styles.asapBadgeText}>RIGHT NOW</Text>
                  </View>
                </View>
                <Text style={styles.immediateCardSubtitle}>
                  Immediate dispatch to your doorstep within 30-45 mins (Live Slot)
                </Text>
              </View>
              <Ionicons
                name={selectedDate.startsWith('Today') && selectedTimeSlot.includes('Immediate') ? 'checkmark-circle' : 'chevron-forward'}
                size={22}
                color={selectedDate.startsWith('Today') && selectedTimeSlot.includes('Immediate') ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.dateSectionHeaderRow}>
              <Text style={styles.sectionSubHeader}>Rolling 7-Day Calendar</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedDate(dateOptions[0].value);
                  setIsCustomDateActive(false);
                }}
              >
                <Text style={styles.todayJumpText}>Jump to Today</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.datesGrid}>
              {dateOptions.map((opt) => {
                const isSelected = !isCustomDateActive && selectedDate === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => {
                      setSelectedDate(opt.value);
                      setIsCustomDateActive(false);
                    }}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                  >
                    <View style={styles.dateCardHeader}>
                      <Ionicons
                        name="calendar"
                        size={20}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      {opt.isToday && (
                        <View style={styles.currentDayChip}>
                          <Text style={styles.currentDayChipText}>CURRENT</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.dateSubtext}>{opt.subtext}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Custom Date Option Card */}
              <TouchableOpacity
                onPress={() => setIsCustomDateActive(true)}
                style={[styles.dateCard, isCustomDateActive && styles.dateCardActive]}
              >
                <Ionicons
                  name="calendar-number-outline"
                  size={20}
                  color={isCustomDateActive ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.dateLabel, isCustomDateActive && styles.dateLabelActive]}>
                  Custom Date
                </Text>
                <Text style={styles.dateSubtext}>Pick any date</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Date Input Field */}
            {isCustomDateActive && (
              <View style={styles.customDateBox}>
                <Text style={styles.customDateTitle}>Enter or Select Future Service Date</Text>
                <View style={styles.customDateInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="YYYY-MM-DD or DD Month (e.g. 15 Sep)"
                    value={customDateValue}
                    onChangeText={(val) => {
                      setCustomDateValue(val);
                      if (val.trim()) {
                        setSelectedDate(val.trim());
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.applyDateBtn}
                    onPress={() => {
                      if (customDateValue.trim()) {
                        setSelectedDate(customDateValue.trim());
                      }
                    }}
                  >
                    <Text style={styles.applyDateBtnText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quick Preferred Time Slot in Step 3 */}
            <View style={styles.step3TimeContainer}>
              <View style={styles.step3TimeHeaderRow}>
                <Text style={styles.sectionSubHeader}>Select Preferred Time for {selectedDate}</Text>
                <TouchableOpacity onPress={() => setCurrentStep(4)}>
                  <Text style={styles.seeAllSlotsText}>View All Slots ›</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizTimePills}>
                {ALL_TIME_SLOTS.slice(0, 5).map((slot) => {
                  const isPast = isSelectedDateToday && !slot.isAsap && currentDecimalHour >= slot.endHour;
                  const isSelected = selectedTimeSlot === slot.label;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      disabled={isPast}
                      onPress={() => {
                        setSelectedTimeSlot(slot.label);
                        setIsCustomTimeActive(false);
                      }}
                      style={[
                        styles.quickTimePill,
                        isSelected && styles.quickTimePillActive,
                        isPast && styles.quickTimePillDisabled,
                      ]}
                    >
                      <Ionicons
                        name={slot.isAsap ? 'flash' : 'time-outline'}
                        size={14}
                        color={isPast ? colors.textMuted : isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.quickTimePillText,
                          isSelected && styles.quickTimePillTextActive,
                          isPast && styles.quickTimePillTextDisabled,
                        ]}
                      >
                        {slot.isAsap ? '⚡ Right Now' : slot.label.split(' - ')[0]}
                      </Text>
                      {isPast && <Text style={styles.pastMiniTag}>Past</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selection Summary Banner */}
            <View style={styles.selectionSummaryBanner}>
              <Ionicons name="checkmark-done-circle" size={18} color={colors.primary} />
              <Text style={styles.selectionSummaryText}>
                Selected: <Text style={{ fontWeight: '700' }}>{selectedDate}</Text> at{' '}
                <Text style={{ fontWeight: '700' }}>{selectedTimeSlot}</Text>
              </Text>
            </View>
          </View>
        )}

        {/* STEP 4: SELECT TIME SLOT */}
        {currentStep === 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>4. Select Time Slot</Text>
            <Text style={styles.stepSubtitle}>
              Available 2-hour cooperative service windows for {selectedDate}
            </Text>

            {isSelectedDateToday && (
              <View style={styles.liveClockBanner}>
                <View style={styles.liveIndicatorRow}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>CURRENT TIME: {currentLiveClock.split('•')[1] || currentLiveClock}</Text>
                </View>
                <Text style={styles.liveSubNotice}>
                  Past time slots for today are automatically marked unavailable
                </Text>
              </View>
            )}

            <View style={styles.slotsList}>
              {ALL_TIME_SLOTS.map((slot) => {
                const isPast = isSelectedDateToday && !slot.isAsap && currentDecimalHour >= slot.endHour;
                const isSelected = !isCustomTimeActive && selectedTimeSlot === slot.label;
                return (
                  <TouchableOpacity
                    key={slot.id}
                    disabled={isPast}
                    onPress={() => {
                      setSelectedTimeSlot(slot.label);
                      setIsCustomTimeActive(false);
                    }}
                    style={[
                      styles.slotItem,
                      isSelected && styles.slotItemActive,
                      isPast && styles.slotItemDisabled,
                    ]}
                  >
                    <View style={styles.slotIconBox}>
                      <Ionicons
                        name={slot.isAsap ? 'flash' : 'time-outline'}
                        size={20}
                        color={isPast ? colors.textMuted : isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <View style={styles.slotTitleRow}>
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.slotTextActive,
                            isPast && styles.slotTextDisabled,
                          ]}
                        >
                          {slot.label}
                        </Text>
                        {slot.isAsap ? (
                          <View style={styles.liveDispatchChip}>
                            <Text style={styles.liveDispatchChipText}>PRIORITY</Text>
                          </View>
                        ) : isPast ? (
                          <View style={styles.pastChip}>
                            <Text style={styles.pastChipText}>PASSED</Text>
                          </View>
                        ) : (
                          <View style={styles.availableChip}>
                            <Text style={styles.availableChipText}>AVAILABLE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.slotSubtitle}>{slot.subtitle}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Custom Time Selection Option */}
              <TouchableOpacity
                onPress={() => setIsCustomTimeActive(true)}
                style={[styles.slotItem, isCustomTimeActive && styles.slotItemActive]}
              >
                <View style={styles.slotIconBox}>
                  <Ionicons
                    name="alarm-outline"
                    size={20}
                    color={isCustomTimeActive ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={[styles.slotText, isCustomTimeActive && styles.slotTextActive]}>
                    Custom Preferred Time
                  </Text>
                  <Text style={styles.slotSubtitle}>Specify your own arrival time</Text>
                </View>
                {isCustomTimeActive && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {isCustomTimeActive && (
              <View style={styles.customTimeBox}>
                <Text style={styles.customDateTitle}>Enter Custom Arrival Time</Text>
                <View style={styles.customDateInputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="e.g. 03:30 PM, 11:15 AM"
                    value={customTimeValue}
                    onChangeText={(val) => {
                      setCustomTimeValue(val);
                      if (val.trim()) {
                        setSelectedTimeSlot(`Custom: ${val.trim()}`);
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={styles.applyDateBtn}
                    onPress={() => {
                      if (customTimeValue.trim()) {
                        setSelectedTimeSlot(`Custom: ${customTimeValue.trim()}`);
                      }
                    }}
                  >
                    <Text style={styles.applyDateBtnText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP 5: SERVICE LOCATION */}
        {currentStep === 5 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>5. Confirm Service Location</Text>
            <Text style={styles.stepSubtitle}>Where should the cooperative technician report?</Text>

            {/* GPS Location Button */}
            <TouchableOpacity
              style={styles.gpsDetectBtn}
              onPress={handleDetectGPSLocation}
              disabled={isDetectingLocation}
            >
              <Ionicons
                name={isDetectingLocation ? 'sync' : 'navigate'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.gpsDetectBtnText}>
                {isDetectingLocation ? 'Detecting GPS Co-ordinates...' : 'Use Current Live GPS Location'}
              </Text>
            </TouchableOpacity>

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
          title={currentStep === 1 ? t('cancel') : t('back')}
          onPress={handleBack}
          variant="outline"
          size="md"
          style={{ minWidth: 100 }}
        />
        <Button
          title={currentStep === totalSteps ? t('confirm_and_pay') : t('next')}
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
  // Live clock banner
  liveClockBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  liveClockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  liveSubNotice: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
  },
  // Immediate booking action card
  immediateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  immediateCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  immediateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  immediateCardText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  immediateTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  immediateCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  immediateCardSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  asapBadge: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  asapBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Date section header
  dateSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: 4,
  },
  sectionSubHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  todayJumpText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  dateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  currentDayChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentDayChipText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Custom date / time box
  customDateBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  customDateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  customDateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  applyDateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    height: 46,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyDateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Step 3 time selection
  step3TimeContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  step3TimeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  seeAllSlotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  horizTimePills: {
    flexDirection: 'row',
  },
  quickTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 8,
  },
  quickTimePillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quickTimePillDisabled: {
    opacity: 0.45,
    backgroundColor: '#F3F4F6',
  },
  quickTimePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  quickTimePillTextActive: {
    color: colors.primary,
  },
  quickTimePillTextDisabled: {
    color: colors.textMuted,
  },
  pastMiniTag: {
    fontSize: 9,
    color: colors.textMuted,
    marginLeft: 2,
  },
  // Selection summary banner
  selectionSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  selectionSummaryText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 6,
    flex: 1,
  },
  // Step 4 slots enhancements
  slotIconBox: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  slotItemDisabled: {
    opacity: 0.5,
    backgroundColor: '#F9FAFB',
  },
  slotTextDisabled: {
    color: colors.textMuted,
  },
  liveDispatchChip: {
    backgroundColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDispatchChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pastChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pastChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
  },
  availableChip: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  availableChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#16A34A',
  },
  customTimeBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  // GPS detect button in Step 5
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  gpsDetectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
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

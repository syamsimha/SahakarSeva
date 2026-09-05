import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Button, Avatar, StarRating } from '../../components/ui';
import { serviceCategories, subServices } from '../../data';
import { workerService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useLocation } from '../../context/LocationContext';
import {
  WorkerProfile,
  ServiceCategoryKey,
  Booking,
  Customer,
} from '../../types';
import { filterWorkersByCategory } from './customerWorkerFilter';
import { getDynamicDateOptions } from '../../utils/dateTime';
import { LocationCoords } from '../../services/locationService';
import { Ionicons } from '@expo/vector-icons';

interface BookingFlowScreenProps {
  initialWorkerId?: string;
  initialServiceId?: string;
  customerLocation?: LocationCoords;
  onBookingSuccess: (booking: Booking) => void;
  onCancel: () => void;
}

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'cash';

interface Coordinates {
  latitude: number;
  longitude: number;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateForBooking = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatShortDate = (date: Date): string => {
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const dateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const startOfDay = (date: Date): Date => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const isSameDay = (a: Date, b: Date): boolean => {
  return dateKey(a) === dateKey(b);
};

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({
  initialWorkerId,
  initialServiceId,
  customerLocation,
  onBookingSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const customer = user?.role === 'customer' ? (user as Customer) : null;
  const savedAddresses = customer?.savedAddresses || [];
  const { createBooking } = useBookings();
  const { currentLocation, openLocationModal, detectLiveGPS } = useLocation();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;

  // ============================================================
  // STEP 1 - SERVICE
  // ============================================================

  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategoryKey>(
      (initialServiceId as ServiceCategoryKey) || 'electrical'
    );

  const [selectedSubServiceId, setSelectedSubServiceId] =
    useState<string>('sub-elec-1');

  // ============================================================
  // STEP 2 - WORKER
  // ============================================================

  const [workersList, setWorkersList] = useState<WorkerProfile[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    initialWorkerId || 'worker-101'
  );

  const [workersLoading, setWorkersLoading] = useState(false);

  // ============================================================
  // STEP 3 - LIVE CALENDAR
  // ============================================================

  const today = useMemo(() => startOfDay(new Date()), []);

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return startOfDay(tomorrow);
  });

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      1
    );
  });

  // ============================================================
  // STEP 4 - TIME SLOT
  // ============================================================

  const timeSlots = [
    '08:30 AM - 10:30 AM',
    '10:30 AM - 12:30 PM',
    '02:00 PM - 04:00 PM',
    '04:30 PM - 06:30 PM',
    '06:30 PM - 08:30 PM',
  ];

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
    '10:30 AM - 12:30 PM'
  );

  // ============================================================
  // STEP 5 - LIVE LOCATION
  // ============================================================

  const [addressLine, setAddressLine] = useState(
    customerLocation?.address || currentLocation?.address || user?.address || ''
  );

  const [landmark, setLandmark] = useState('');

  const [coordinates, setCoordinates] = useState<Coordinates | null>(() => {
    if (typeof customerLocation?.latitude === 'number' && typeof customerLocation?.longitude === 'number') {
      return {
        latitude: customerLocation.latitude,
        longitude: customerLocation.longitude,
      };
    }
    if (typeof currentLocation?.latitude === 'number' && typeof currentLocation?.longitude === 'number') {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
    }
    return null;
  });

  const [locationLoading, setLocationLoading] = useState(false);

  const [locationDetected, setLocationDetected] = useState(
    Boolean(currentLocation?.isGPS)
  );

  useEffect(() => {
    if (
      currentLocation?.address &&
      typeof currentLocation.latitude === 'number' &&
      typeof currentLocation.longitude === 'number'
    ) {
      setAddressLine(currentLocation.address);
      setCoordinates({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      setLocationDetected(Boolean(currentLocation.isGPS));
    }
  }, [currentLocation]);

  // ============================================================
  // STEP 6 - INSTRUCTIONS
  // ============================================================

  const [instructions, setInstructions] = useState('');

  // ============================================================
  // STEP 8 - PAYMENT
  // ============================================================

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('upi');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPriority, setIsPriority] = useState(false);

  // Sync category if worker was provided initially
  useEffect(() => {
    if (initialWorkerId) {
      workerService.getWorkerById(initialWorkerId).then((w) => {
        if (w) {
          const matchedCat = serviceCategories.find(
            (c) =>
              w.primarySkill.toLowerCase().includes(c.id) ||
              (c.id === 'electrical' && w.primarySkill.toLowerCase().includes('electric')) ||
              (c.id === 'cleaning' && w.primarySkill.toLowerCase().includes('clean')) ||
              (c.id === 'technical' && w.primarySkill.toLowerCase().includes('tech')) ||
              (c.id === 'driving' && w.primarySkill.toLowerCase().includes('driv')) ||
              (c.id === 'gardening' && w.primarySkill.toLowerCase().includes('garden'))
          );
          if (matchedCat) {
            setSelectedCategory(matchedCat.id);
          }
        }
      });
    }
  }, [initialWorkerId]);

  // ============================================================
  // LOAD WORKERS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    setWorkersLoading(true);

    workerService
      .getWorkers({ category: selectedCategory })
      .then((data) => {
        if (!mounted) return;

        setWorkersList(data);

        if (initialWorkerId) {
          setSelectedWorkerId(initialWorkerId);
        } else if (data.length > 0) {
          setSelectedWorkerId(data[0].id);
        } else {
          setSelectedWorkerId('');
        }
      })
      .catch(() => {
        if (!mounted) return;
        setWorkersList([]);
      })
      .finally(() => {
        if (mounted) {
          setWorkersLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedCategory, initialWorkerId]);

  // ============================================================
  // SERVICE DATA
  // ============================================================

  const selectedWorker =
    workersList.find((worker) => worker.id === selectedWorkerId) ||
    workersList[0];

  const activeSubServices = subServices.filter(
    (service) => service.categoryId === selectedCategory
  );

  const currentSubService =
    activeSubServices.find(
      (service) => service.id === selectedSubServiceId
    ) || activeSubServices[0];

  // ============================================================
  // PRICING
  // ============================================================

  const baseRate = currentSubService?.standardPrice || 299;

  const welfareCess = Math.round(baseRate * 0.05);

  const gst = Math.round(baseRate * 0.05);

  const priorityFee = isPriority ? 150 : 0;

  const totalAmount = baseRate + welfareCess + gst + priorityFee;

  // ============================================================
  // LIVE CALENDAR HELPERS
  // ============================================================

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const cells: Array<Date | null> = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    return cells;
  }, [calendarMonth]);

  const goToPreviousMonth = () => {
    const previous = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() - 1,
      1
    );

    const currentMonthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    if (previous >= currentMonthStart) {
      setCalendarMonth(previous);
    }
  };

  const goToNextMonth = () => {
    const next = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      1
    );

    setCalendarMonth(next);
  };

  const selectCalendarDate = (date: Date) => {
    if (startOfDay(date) < today) {
      return;
    }

    setSelectedDate(startOfDay(date));
  };

  // ============================================================
  // LIVE LOCATION
  // ============================================================

  const getCurrentLocation = () => {
    setLocationLoading(true);

    if (
      typeof navigator === 'undefined' ||
      !navigator.geolocation
    ) {
      setLocationLoading(false);

      Alert.alert(
        'Location Unavailable',
        'Location services are not available in this browser/device.'
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setCoordinates({
          latitude,
          longitude,
        });

        try {
          /*
           * OpenStreetMap Nominatim reverse-geocoding API.
           * This converts the live GPS coordinates into a readable address.
           */
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Reverse geocoding failed');
          }

          const data = await response.json();

          const displayName =
            typeof data?.display_name === 'string'
              ? data.display_name
              : '';

          const address = data?.address || {};

          const readableAddress =
            displayName ||
            [
              address.house_number,
              address.road,
              address.neighbourhood,
              address.suburb,
              address.city || address.town || address.village,
              address.state,
              address.postcode,
            ]
              .filter(Boolean)
              .join(', ');

          if (readableAddress) {
            setAddressLine(readableAddress);
          }

          setLocationDetected(true);

          Alert.alert(
            'Location Detected',
            'Your current location has been added to the booking.'
          );
        } catch {
          /*
           * GPS is still valid even if reverse geocoding fails.
           */
          setLocationDetected(true);

          Alert.alert(
            'Location Detected',
            'GPS coordinates were detected, but the readable address could not be retrieved. You can enter the address manually.'
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        setLocationLoading(false);

        let message =
          'Unable to get your current location.';

        if (error.code === 1) {
          message =
            'Location permission was denied. Please allow location access in your browser/device settings and try again.';
        } else if (error.code === 2) {
          message =
            'Your location could not be determined. Please try again.';
        } else if (error.code === 3) {
          message =
            'Location request timed out. Please try again.';
        }

        Alert.alert('Location Error', message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleNext = () => {
    // STEP 1 VALIDATION
    if (currentStep === 1) {
      if (!currentSubService) {
        Alert.alert(
          'Select a Service',
          'Please select a service before continuing.'
        );
        return;
      }
    }

    // STEP 2 VALIDATION
    if (currentStep === 2) {
      if (!selectedWorker) {
        Alert.alert(
          'Select a Worker',
          'Please select an available cooperative worker before continuing.'
        );
        return;
      }
    }

    // STEP 3 VALIDATION
    if (currentStep === 3) {
      if (selectedDate < today) {
        Alert.alert(
          'Invalid Date',
          'Please select today or a future date.'
        );
        return;
      }
    }

    // STEP 4 VALIDATION
    if (currentStep === 4) {
      if (!selectedTimeSlot) {
        Alert.alert(
          'Select a Time Slot',
          'Please select a service time.'
        );
        return;
      }
    }

    // STEP 5 VALIDATION
    if (currentStep === 5) {
      if (!addressLine.trim()) {
        Alert.alert(
          'Service Location Required',
          'Please enter the service address or use Current Location.'
        );
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((previous) => previous + 1);
    } else {
      handleFinalConfirm();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((previous) => previous - 1);
    } else {
      onCancel();
    }
  };

  // ============================================================
  // FINAL BOOKING
  // ============================================================

  const handleFinalConfirm = async () => {
    if (!addressLine.trim()) {
      Alert.alert(
        'Location Required',
        'Please provide a service location.'
      );
      setCurrentStep(5);
      return;
    }

    if (!selectedWorker) {
      Alert.alert(
        'Worker Required',
        'Please select a cooperative worker.'
      );
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);

    try {
      const newBooking = await createBooking({
        customerId: user?.id || 'cust-101',

        customerName:
          user?.name || 'Ramesh Sharma',

        customerPhone:
          user?.phone || '+91 98450 12345',

        workerId:
          selectedWorker.id,

        workerName:
          selectedWorker.name,

        workerSkill:
          selectedWorker.primarySkill || 'Electrician',

        workerPhone:
          selectedWorker.phone || '+91 98765 43210',

        cooperativeName:
          selectedWorker.cooperativeName ||
          'Nagarika Seva Sahakari Samiti Ltd.',

        categoryId:
          selectedCategory,

        serviceTitle:
          currentSubService?.title ||
          'Electrical Repair',

        /*
         * REAL SELECTED DATE
         */
        scheduledDate:
          formatDateForBooking(selectedDate),

        /*
         * REAL SELECTED TIME
         */
        scheduledTimeSlot:
          selectedTimeSlot,

        status:
          'requested',

        /*
         * REAL LOCATION DATA
         */
        serviceLocation: {
          addressLine:
            addressLine.trim(),

          landmark:
            landmark.trim() || 'Not provided',

          city:
            customerLocation?.city || customer?.city || 'Bengaluru',

          pincode:
            customerLocation?.pincode || '560038',

          latitude:
            coordinates?.latitude ??
            (customerLocation?.coordinatesAvailable !== false ? customerLocation?.latitude : undefined) ??
            12.9784,

          longitude:
            coordinates?.longitude ??
            (customerLocation?.coordinatesAvailable !== false ? customerLocation?.longitude : undefined) ??
            77.6408,

          locationMode:
            coordinates ? 'GPS' : (customerLocation?.locationMode || (customerLocation?.isGps ? 'GPS' : 'MANUAL')),

          manualDetails:
            customerLocation?.manualDetails,
        },

        instructions:
          instructions.trim() ||
          'Standard cooperative service request',

        estimatedAmount:
          totalAmount,

        welfareCessAmount:
          welfareCess,

        isEmergency:
          false,

        isPriority:
          isPriority,

        paymentMethod,

        paymentStatus:
          'pending',
      });

      onBookingSuccess(newBooking);
    } catch (error) {
      Alert.alert(
        'Booking Failed',
        'Unable to create the booking. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <View style={styles.container}>
      <Header
        title={`Book Service (Step ${currentStep}/${totalSteps})`}
        showBack
        onBack={handleBack}
      />

      {/* PROGRESS BAR */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${(currentStep / totalSteps) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ======================================================
            STEP 1
        ====================================================== */}

        {currentStep === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              1. Select Service & Task
            </Text>

            <Text style={styles.stepSubtitle}>
              Choose the trade and specific repair requirement
            </Text>

            <Text style={styles.sectionHeader}>
              Service Category
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.horizPills}
            >
              {serviceCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubServiceId('');
                  }}
                  style={[
                    styles.catPill,
                    selectedCategory === cat.id &&
                    styles.catPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      selectedCategory === cat.id &&
                      styles.catPillTextActive,
                    ]}
                  >
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text
              style={[
                styles.sectionHeader,
                { marginTop: spacing.md },
              ]}
            >
              Common Tasks
            </Text>

            {activeSubServices.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="information-circle-outline"
                  size={26}
                  color={colors.textSecondary}
                />

                <Text style={styles.emptyText}>
                  No tasks available for this service category.
                </Text>
              </View>
            ) : (
              activeSubServices.map((sub) => {
                const isSelected =
                  selectedSubServiceId === sub.id;

                return (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() =>
                      setSelectedSubServiceId(sub.id)
                    }
                    style={[
                      styles.taskCard,
                      isSelected &&
                      styles.taskCardActive,
                    ]}
                  >
                    <View style={styles.taskRadio}>
                      <Ionicons
                        name={
                          isSelected
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={18}
                        color={
                          isSelected
                            ? colors.primary
                            : colors.textMuted
                        }
                      />
                    </View>

                    <View style={styles.taskInfo}>
                      <Text style={styles.taskTitle}>
                        {sub.title}
                      </Text>

                      <Text style={styles.taskDesc}>
                        {sub.description}
                      </Text>

                      <Text style={styles.taskPrice}>
                        Fair Rate: ₹{sub.standardPrice} •{' '}
                        {sub.estimatedMinutes} mins
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================
            STEP 2
        ====================================================== */}

        {currentStep === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              2. Choose Verified Cooperative Worker
            </Text>

            <Text style={styles.stepSubtitle}>
              All workers are background-checked members of local
              labour cooperatives
            </Text>

            {workersLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                />

                <Text style={styles.loadingText}>
                  Finding verified cooperative workers...
                </Text>
              </View>
            ) : workersList.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="people-outline"
                  size={32}
                  color={colors.textSecondary}
                />

                <Text style={styles.emptyTitle}>
                  No workers available
                </Text>

                <Text style={styles.emptyText}>
                  No verified worker is currently available for
                  this service.
                </Text>
              </View>
            ) : (
              workersList.map((worker) => {
                const isSelected =
                  selectedWorkerId === worker.id;

                return (
                  <TouchableOpacity
                    key={worker.id}
                    onPress={() =>
                      setSelectedWorkerId(worker.id)
                    }
                    style={[
                      styles.workerSelectCard,
                      isSelected &&
                      styles.workerSelectCardActive,
                    ]}
                  >
                    <Avatar
                      name={worker.name}
                      url={worker.avatarUrl}
                      size={48}
                      showVerifiedBadge
                    />

                    <View style={styles.workerSelectInfo}>
                      <View
                        style={
                          styles.workerSelectNameRow
                        }
                      >
                        <Text
                          style={
                            styles.workerSelectName
                          }
                        >
                          {worker.name}
                        </Text>

                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </View>

                      <Text
                        style={
                          styles.workerSelectSkill
                        }
                      >
                        {worker.primarySkill}
                      </Text>

                      <Text
                        style={
                          styles.workerSelectCoop
                        }
                      >
                        {worker.cooperativeName}
                      </Text>

                      <StarRating
                        rating={worker.rating}
                        count={worker.reviewCount}
                        size={11}
                        style={{ marginTop: 2 }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================
            STEP 3 - LIVE CALENDAR
        ====================================================== */}

        {currentStep === 3 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              3. Select Service Date
            </Text>

            <Text style={styles.stepSubtitle}>
              Select a real service date from the calendar
            </Text>

            <View style={styles.selectedDateBanner}>
              <Ionicons
                name="calendar"
                size={22}
                color={colors.primary}
              />

              <View style={styles.selectedDateInfo}>
                <Text style={styles.selectedDateLabel}>
                  Selected Date
                </Text>

                <Text style={styles.selectedDateValue}>
                  {formatDateForBooking(selectedDate)}
                </Text>
              </View>
            </View>

            {/* CALENDAR HEADER */}

            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={goToPreviousMonth}
                style={styles.calendarArrow}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>

              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[calendarMonth.getMonth()]}{' '}
                {calendarMonth.getFullYear()}
              </Text>

              <TouchableOpacity
                onPress={goToNextMonth}
                style={styles.calendarArrow}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* DAY NAMES */}

            <View style={styles.calendarWeekRow}>
              {DAY_NAMES.map((day) => (
                <Text
                  key={day}
                  style={styles.calendarDayName}
                >
                  {day}
                </Text>
              ))}
            </View>

            {/* CALENDAR DAYS */}

            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={styles.calendarDay}
                    />
                  );
                }

                const disabled =
                  startOfDay(date) < today;

                const selected =
                  isSameDay(date, selectedDate);

                const isToday =
                  isSameDay(date, today);

                return (
                  <TouchableOpacity
                    key={dateKey(date)}
                    disabled={disabled}
                    onPress={() =>
                      selectCalendarDate(date)
                    }
                    style={[
                      styles.calendarDay,
                      selected &&
                      styles.calendarDaySelected,
                      isToday &&
                      !selected &&
                      styles.calendarDayToday,
                      disabled &&
                      styles.calendarDayDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        selected &&
                        styles.calendarDayTextSelected,
                        disabled &&
                        styles.calendarDayTextDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calendarHint}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.textSecondary}
              />

              <Text style={styles.calendarHintText}>
                Past dates are disabled. Select any available
                future date.
              </Text>
            </View>
          </View>
        )}

        {/* ======================================================
            STEP 4
        ====================================================== */}

        {currentStep === 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              4. Select Time Slot
            </Text>

            <Text style={styles.stepSubtitle}>
              Choose a 2-hour window that fits your schedule
            </Text>

            <View style={styles.slotsList}>
              {timeSlots.map((slot) => {
                const isSelected =
                  selectedTimeSlot === slot;

                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() =>
                      setSelectedTimeSlot(slot)
                    }
                    style={[
                      styles.slotItem,
                      isSelected &&
                      styles.slotItemActive,
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />

                    <Text
                      style={[
                        styles.slotText,
                        isSelected &&
                        styles.slotTextActive,
                      ]}
                    >
                      {slot}
                    </Text>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ======================================================
            STEP 5 - LIVE LOCATION
        ====================================================== */}

        {currentStep === 5 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              5. Confirm Service Location
            </Text>

            <Text style={styles.stepSubtitle}>
              Use your live location or enter the service address
            </Text>

            {/* LIVE LOCATION BUTTONS */}

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
              <TouchableOpacity
                onPress={getCurrentLocation}
                disabled={locationLoading}
                style={[styles.currentLocationButton, { flex: 1, marginBottom: 0 }]}
              >
                {locationLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.textInverse}
                  />
                ) : (
                  <Ionicons
                    name="locate"
                    size={18}
                    color={colors.textInverse}
                  />
                )}

                <Text style={styles.currentLocationText}>
                  {locationLoading
                    ? 'Acquiring GPS...'
                    : 'Live GPS Fix'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openLocationModal}
                style={[
                  styles.currentLocationButton,
                  {
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.primary,
                    marginBottom: 0,
                  },
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.currentLocationText, { color: colors.primary }]}>
                  Modify / Area
                </Text>
              </TouchableOpacity>
            </View>

            {/* LOCATION STATUS */}

            {locationDetected && coordinates && (
              <View style={styles.locationDetectedBox}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />

                <View style={styles.locationDetectedInfo}>
                  <Text
                    style={
                      styles.locationDetectedTitle
                    }
                  >
                    Live Location Detected
                  </Text>

                  <Text
                    style={
                      styles.locationCoordinates
                    }
                  >
                    {coordinates.latitude.toFixed(6)},{' '}
                    {coordinates.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
            )}

            {savedAddresses.length > 0 && (
              <View style={styles.savedAddressesBox}>
                <Text style={styles.savedChipGroupTitle}>Quick Select from Saved Addresses:</Text>
                <View style={styles.savedChipsRow}>
                  {savedAddresses.map((addr) => {
                    const isSelected = addressLine === addr.address;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        onPress={() => {
                          setAddressLine(addr.address);
                          setLandmark(addr.title);
                        }}
                        style={[
                          styles.savedAddressChip,
                          isSelected && styles.savedAddressChipActive,
                        ]}
                      >
                        <Ionicons
                          name="bookmark-outline"
                          size={12}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.savedAddressChipText,
                            isSelected && styles.savedAddressChipTextActive,
                          ]}
                        >
                          {addr.title}: {addr.address.substring(0, 20)}...
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <Text style={styles.inputLabel}>
              Street Address / Flat Number
            </Text>

            <TextInput
              style={styles.textInput}
              value={addressLine}
              onChangeText={(value) => {
                setAddressLine(value);
                setLocationDetected(false);
              }}
              placeholder="House/Flat number, Building name, Street"
              placeholderTextColor={colors.textMuted}
            />

            <Text
              style={[
                styles.inputLabel,
                { marginTop: spacing.md },
              ]}
            >
              Nearby Landmark
            </Text>

            <TextInput
              style={styles.textInput}
              value={landmark}
              onChangeText={setLandmark}
              placeholder="e.g. Opposite Park, Behind Metro Station"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.locationTrustNotice}>
              <Ionicons
                name={customerLocation?.isGps ? 'navigate' : customerLocation?.locationMode === 'MANUAL' ? 'create' : 'shield-checkmark'}
                size={16}
                color={customerLocation?.isGps ? colors.info : colors.primary}
              />
              <Text style={styles.locationTrustText}>
                {customerLocation?.isGps
                  ? `Source: Live GPS Coordinates (${customerLocation.latitude?.toFixed(4)}, ${customerLocation.longitude?.toFixed(4)})`
                  : customerLocation?.locationMode === 'MANUAL'
                  ? `Source: Manual Address Entry ${customerLocation.coordinatesAvailable === false ? '(Offline Mode)' : ''}`
                  : `Your location is used only to help the cooperative worker reach the service address.`}
              </Text>
            </View>

            <View style={styles.apiNotice}>
              <Ionicons
                name="globe-outline"
                size={16}
                color={colors.accent}
              />

              <Text style={styles.apiNoticeText}>
                Live GPS + reverse geocoding are used when Current
                Location is selected.
              </Text>
            </View>
          </View>
        )}

        {/* ======================================================
            STEP 6
        ====================================================== */}

        {currentStep === 6 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              6. Instructions & Specifics
            </Text>

            <Text style={styles.stepSubtitle}>
              Help the worker prepare appropriate tools or spare
              parts
            </Text>

            <TextInput
              style={styles.textArea}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="e.g. Please bring an extra 16A modular switch and long tester."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.hintsTitle}>
              Suggestions:
            </Text>

            <View style={styles.hintsRow}>
              {[
                'Power tripping often',
                'Need extra ladder',
                'Pet in household',
                'Urgent call on arrival',
              ].map((hint) => (
                <TouchableOpacity
                  key={hint}
                  onPress={() =>
                    setInstructions((previous) =>
                      previous
                        ? `${previous}, ${hint}`
                        : hint
                    )
                  }
                  style={styles.hintPill}
                >
                  <Text style={styles.hintPillText}>
                    + {hint}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ======================================================
            STEP 7
        ====================================================== */}

        {currentStep === 7 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              7. Review Booking Summary
            </Text>

            <Text style={styles.stepSubtitle}>
              Verify details before proceeding to payment
            </Text>

            <View style={styles.reviewSummaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Selected Service
                </Text>

                <Text style={styles.summaryValue}>
                  {currentSubService?.title ||
                    'Electrical Repair'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Cooperative Worker
                </Text>

                <Text style={styles.summaryValue}>
                  {selectedWorker?.name || 'Not selected'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Cooperative Society
                </Text>

                <Text style={styles.summaryValue}>
                  {selectedWorker?.cooperativeName ||
                    'Cooperative Worker'}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Appointment
                </Text>

                <Text style={styles.summaryValue}>
                  {formatDateForBooking(selectedDate)}
                </Text>

                <Text style={styles.summarySecondary}>
                  {selectedTimeSlot}
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Service Location
                </Text>

                <Text style={styles.summaryValue}>
                  {addressLine}
                </Text>

                <Text style={{ fontSize: 11, color: colors.primary, marginTop: 2, fontWeight: '600' }}>
                  {coordinates || customerLocation?.isGps ? '📍 Source: Live Device GPS' : '📍 Source: Manual Address Entry'}
                </Text>
              </View>
            </View>

            {/* Priority 24/7 Option Toggle */}
            <TouchableOpacity
              style={[styles.priorityCard, isPriority && styles.priorityCardActive]}
              onPress={() => setIsPriority(!isPriority)}
            >
              <View style={styles.priorityLeft}>
                <Ionicons
                  name="flash"
                  size={20}
                  color={isPriority ? colors.danger : colors.textMuted}
                />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.priorityTitle}>Priority 24/7 Dispatch</Text>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityBadgeText}>+₹150</Text>
                    </View>
                  </View>
                  <Text style={styles.priorityDesc}>
                    Guaranteed immediate dispatch & prioritized guild worker assignment.
                  </Text>
                </View>
              </View>
              <View style={[styles.priorityToggle, isPriority && styles.priorityToggleActive]}>
                <Ionicons
                  name={isPriority ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={isPriority ? colors.danger : colors.textMuted}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownHeader}>
                Fair Wage Breakdown
              </Text>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Service Base Fare
                </Text>

                <Text style={styles.breakdownAmount}>
                  ₹{baseRate}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  Cooperative Worker Welfare Cess (5%)
                </Text>

                <Text style={styles.breakdownAmount}>
                  ₹{welfareCess}
                </Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>
                  GST (5%)
                </Text>

                <Text style={styles.breakdownAmount}>
                  ₹{gst}
                </Text>
              </View>

              {isPriority && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Priority 24/7 Dispatch Fee</Text>
                  <Text style={[styles.breakdownAmount, { color: colors.danger }]}>₹{priorityFee}</Text>
                </View>
              )}

              <View style={styles.breakdownTotalRow}>
                <Text style={styles.totalLabel}>
                  Total Payable
                </Text>

                <Text style={styles.totalAmount}>
                  ₹{totalAmount}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================
            STEP 8
        ====================================================== */}

        {currentStep === 8 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>
              8. Payment Method
            </Text>

            <Text style={styles.stepSubtitle}>
              Select how you want to pay for the service
            </Text>

            <View style={styles.paymentMethods}>
              {[
                {
                  id: 'upi' as PaymentMethod,
                  label: 'UPI (GPay / PhonePe / Paytm)',
                  icon: 'phone-portrait-outline' as const,
                },
                {
                  id: 'card' as PaymentMethod,
                  label: 'Debit / Credit Card',
                  icon: 'card-outline' as const,
                },
                {
                  id: 'netbanking' as PaymentMethod,
                  label: 'Net Banking',
                  icon: 'business-outline' as const,
                },
                {
                  id: 'cash' as PaymentMethod,
                  label: 'Cash / Pay After Service',
                  icon: 'cash-outline' as const,
                },
              ].map((method) => {
                const isSelected =
                  paymentMethod === method.id;

                return (
                  <TouchableOpacity
                    key={method.id}
                    onPress={() =>
                      setPaymentMethod(method.id)
                    }
                    style={[
                      styles.methodCard,
                      isSelected &&
                      styles.methodCardActive,
                    ]}
                  >
                    <Ionicons
                      name={method.icon}
                      size={20}
                      color={
                        isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />

                    <Text
                      style={[
                        styles.methodLabel,
                        isSelected &&
                        styles.methodLabelActive,
                      ]}
                    >
                      {method.label}
                    </Text>

                    {isSelected && (
                      <Ionicons
                        name="radio-button-on"
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.mockDisclaimer}>
              <Ionicons
                name="information-circle"
                size={16}
                color={colors.accent}
              />

              <Text style={styles.mockDisclaimerText}>
                This prototype uses a simulated payment flow. No
                real funds are transferred.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================
          BOTTOM NAVIGATION
      ======================================================== */}

      <View style={styles.stepFooter}>
        <Button
          title={currentStep === 1 ? 'Cancel' : 'Back'}
          onPress={handleBack}
          variant="outline"
          size="md"
          style={{ minWidth: 100 }}
        />

        <Button
          title={
            currentStep === totalSteps
              ? 'Confirm & Book'
              : 'Continue'
          }
          icon={
            currentStep === totalSteps
              ? 'checkmark-done'
              : 'arrow-forward'
          }
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

// ============================================================
// STYLES
// ============================================================

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
    paddingBottom: 100,
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
    paddingVertical: 8,
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

  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginTop: spacing.md,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: spacing.md,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },

  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },

  // ==========================================================
  // CALENDAR
  // ==========================================================

  selectedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },

  selectedDateInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },

  selectedDateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  selectedDateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  calendarMonthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },

  calendarArrow: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  calendarDayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calendarDay: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.round,
  },

  calendarDaySelected: {
    backgroundColor: colors.primary,
  },

  calendarDayToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  calendarDayDisabled: {
    opacity: 0.35,
  },

  calendarDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  calendarDayTextSelected: {
    color: colors.textInverse,
    fontWeight: '800',
  },

  calendarDayTextDisabled: {
    color: colors.textMuted,
  },

  calendarHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },

  calendarHintText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 11,
    color: colors.textSecondary,
  },

  // ==========================================================
  // TIME
  // ==========================================================

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

  // ==========================================================
  // LOCATION
  // ==========================================================

  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },

  currentLocationText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },

  locationDetectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  locationDetectedInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },

  locationDetectedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },

  locationCoordinates: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
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
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },

  apiNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },

  apiNoticeText: {
    flex: 1,
    fontSize: 10,
    color: colors.accentDark,
    marginLeft: 6,
  },

  // ==========================================================
  // INSTRUCTIONS
  // ==========================================================

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
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },

  hintPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  // ==========================================================
  // REVIEW
  // ==========================================================

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
    marginTop: 2,
  },

  summarySecondary: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },


  savedAddressesBox: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedChipGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  savedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  savedAddressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  savedAddressChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  savedAddressChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  savedAddressChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  priorityCardActive: {
    borderColor: colors.danger,
    backgroundColor: '#FFFBFB',
  },
  priorityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  priorityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  priorityBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginLeft: spacing.xs,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  priorityDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  priorityToggle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityToggleActive: {},

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
    flex: 1,
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

  // ==========================================================
  // PAYMENT
  // ==========================================================

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

  // ==========================================================
  // FOOTER
  // ==========================================================

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
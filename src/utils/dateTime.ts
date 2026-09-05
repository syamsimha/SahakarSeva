/**
 * Dynamic Date and Time Utility for SahakarSeva
 * Computes calendar dates dynamically using native Date and Intl APIs.
 */

export interface DateOption {
  label: string;
  value: string;
  isoDate: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Returns dynamic date options starting from today
 * e.g., "Today, 4 September", "Tomorrow, 5 September", "Sat, 6 Sep", "Sun, 7 Sep"
 */
export function getDynamicDateOptions(daysCount = 5): DateOption[] {
  const options: DateOption[] = [];
  const now = new Date();

  for (let i = 0; i < daysCount; i++) {
    const target = new Date(now);
    target.setDate(now.getDate() + i);

    const dayName = DAY_NAMES[target.getDay()];
    const dayShort = DAY_SHORT[target.getDay()];
    const dayNum = target.getDate();
    const monthName = MONTH_NAMES[target.getMonth()];
    const monthShort = monthName.slice(0, 3);
    const isoDate = target.toISOString().split('T')[0];

    if (i === 0) {
      options.push({
        label: 'Today',
        value: `Today, ${dayNum} ${monthName}`,
        isoDate,
      });
    } else if (i === 1) {
      options.push({
        label: 'Tomorrow',
        value: `Tomorrow, ${dayNum} ${monthName}`,
        isoDate,
      });
    } else {
      options.push({
        label: `${dayShort}, ${dayNum} ${monthShort}`,
        value: `${dayName}, ${dayNum} ${monthName}`,
        isoDate,
      });
    }
  }

  return options;
}

/**
 * Formats an ISO string or Date into human-readable format
 */
export function formatReadableDate(dateInput?: string | Date): string {
  if (!dateInput) return 'Today';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats seconds/milliseconds into a "X seconds ago" or "X mins ago" string
 */
export function formatTimeAgo(isoTimestamp?: string): string {
  if (!isoTimestamp) return 'just now';
  const time = new Date(isoTimestamp).getTime();
  if (isNaN(time)) return 'just now';

  const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}

/**
 * Formats a completion timestamp into a clean localized date and time
 * e.g. "Today, 9:15 PM" or "4 Sep 2026, 9:15 PM"
 */
export function formatCompletedDate(isoTimestamp?: string): string {
  if (!isoTimestamp) return 'Recently Completed';
  const d = new Date(isoTimestamp);
  if (isNaN(d.getTime())) return String(isoTimestamp);

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  // Time in 12-hour format e.g. "09:15 PM"
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // hour 0 is 12
  const formattedTime = `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;

  if (isToday) {
    return `Today, ${formattedTime}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Yesterday, ${formattedTime}`;
  }

  const day = d.getDate();
  const monthShort = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  return `${day} ${monthShort} ${year}, ${formattedTime}`;
}

/**
 * Formats an ISO timestamp into localized Date & Time string
 */
export function formatDateTime(isoTimestamp?: string): string {
  if (!isoTimestamp) return '';
  const d = new Date(isoTimestamp);
  if (isNaN(d.getTime())) return String(isoTimestamp);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

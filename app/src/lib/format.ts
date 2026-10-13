/**
 * Pure formatting and validation helpers: no React Native or Expo imports, so this module
 * can be exercised by scripts/selfcheck.ts outside the app runtime.
 */

/** ₹1,199 — Indian digit grouping. */
export function formatInr(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

/** A lesson's length as shown in lists: under a minute in seconds ("20 sec"), otherwise minutes ("12 min"). */
export function lessonLength(lesson: { minutes: number; seconds?: number }): string {
  const seconds = lesson.seconds ?? lesson.minutes * 60;
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} sec`;
  return `${Math.round(seconds / 60)} min`;
}

/** 95 -> "1h 35m", 42 -> "42m" */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** 125 -> "2:05", 3672 -> "1:01:12" */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

const DIGITS = /\D/g;

/** Accepts pasted "+91 98765 43210", "09876543210", "91-9876543210" -> "9876543210". */
export function normalizePhone(input: string): string {
  let digits = input.replace(DIGITS, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/**
 * India-only prototype validation: 10 digits starting 6-9 (the real mobile series).
 * Not a carrier lookup — the backend remains the source of truth.
 */
export function validateIndianMobile(digits: string): string | null {
  if (digits.length === 0) return 'Enter your mobile number to continue.';
  if (digits.length < 10) return 'A mobile number has 10 digits. You entered a shorter number.';
  if (!/^[6-9]/.test(digits)) return 'Indian mobile numbers start with 6, 7, 8 or 9.';
  return null;
}

/** "9876543210" -> "+91 98765 43210" (shown back to the user, never to anyone else). */
export function formatIndianMobile(digits: string): string {
  if (digits.length !== 10) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function maskPhone(digits: string): string {
  return digits.length === 10 ? `+91 ••••• ${digits.slice(5)}` : formatIndianMobile(digits);
}

/** Rough cook-time scaling: scales a leading number, leaves "to taste" style quantities alone. */
export function scaleQuantity(quantity: string, factor: number): string {
  const match = quantity.match(/^(\d+(?:\.\d+)?)(.*)$/);
  if (!match || factor === 1) return quantity;
  const value = Number(match[1]) * factor;
  const rounded = Math.round(value * 100) / 100;
  return `${rounded}${match[2]}`;
}

export function timeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function minutesAgoLabel(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/* ------------------------------------------------------------------ *
 * Profile fields (email)
 * ------------------------------------------------------------------ */

const EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** Email is optional, so an empty value is valid; anything typed must look like an address. */
export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!EMAIL.test(trimmed)) return 'Enter an email like name@example.com.';
  return null;
}

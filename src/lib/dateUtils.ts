/**
 * Date and Timestamp Utilities for ReflectAI
 * Ensures zero "Invalid Date" errors across Firestore snapshots, REST responses, and client state.
 */

/**
 * Normalizes any timestamp or date input into a clean, valid ISO 8601 string.
 * Safely handles:
 * - null or undefined
 * - Valid ISO strings
 * - Firestore Timestamp objects (.toDate())
 * - Serialized Firestore objects ({ seconds, nanoseconds } or { _seconds, _nanoseconds })
 * - Firestore FieldValue sentinels ({ _methodName: "serverTimestamp" })
 * - JavaScript Date objects
 * - Numeric timestamps (milliseconds or seconds)
 * - Invalid date strings
 */
export function normalizeToIsoString(val: any, fallback: string = new Date().toISOString()): string {
  if (val === null || val === undefined) {
    return fallback;
  }

  // Already a Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val.toISOString();
  }

  // Firestore Timestamp instance with .toDate()
  if (typeof val?.toDate === "function") {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? fallback : d.toISOString();
    } catch {
      return fallback;
    }
  }

  // String handling
  if (typeof val === "string") {
    if (!val.trim() || val.toLowerCase() === "invalid date") {
      return fallback;
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toISOString();
  }

  // Numeric timestamp (ms or unix seconds)
  if (typeof val === "number") {
    if (isNaN(val) || val <= 0) return fallback;
    const ms = val > 1e11 ? val : val * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? fallback : d.toISOString();
  }

  // Serialized Firestore Timestamp object { seconds, nanoseconds } or { _seconds, _nanoseconds }
  if (typeof val === "object") {
    // If it is a pending serverTimestamp sentinel or unknown structure
    if ("_methodName" in val || "_delegate" in val) {
      return fallback;
    }

    const sec = val.seconds ?? val._seconds;
    if (typeof sec === "number" && !isNaN(sec)) {
      const nanos = val.nanoseconds ?? val._nanoseconds ?? 0;
      const ms = sec * 1000 + Math.floor((Number(nanos) || 0) / 1000000);
      const d = new Date(ms);
      return isNaN(d.getTime()) ? fallback : d.toISOString();
    }
  }

  return fallback;
}

/**
 * Returns a safe epoch milliseconds number for sorting. Guaranteed never to return NaN.
 */
export function safeGetTime(val: any): number {
  try {
    const iso = normalizeToIsoString(val);
    const time = new Date(iso).getTime();
    return isNaN(time) ? Date.now() : time;
  } catch {
    return Date.now();
  }
}

/**
 * Formats any date input into a clean, human-readable display string (e.g. "Sep 3" or "2:30 PM").
 * Will NEVER output "Invalid Date".
 */
export function formatDisplayDate(val: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const iso = normalizeToIsoString(val);
    const d = new Date(iso);

    if (isNaN(d.getTime())) {
      return "Recent";
    }

    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    if (isToday) {
      return d.toLocaleTimeString([], options || { hour: "numeric", minute: "2-digit" });
    }

    return d.toLocaleDateString("en-US", options || { month: "short", day: "numeric" });
  } catch {
    return "Recent";
  }
}

/**
 * Sanitizes an object by recursively removing all `undefined` values and normalizing keys.
 * Handles circular references safely using a WeakSet.
 * Crucial for Firebase Firestore payload hygiene (preventing crashes on undefined fields).
 */
export function stripUndefined<T>(obj: T, seen: WeakSet<object> = new WeakSet()): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (seen.has(obj)) {
    return undefined as unknown as T;
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj
      .map((item) => stripUndefined(item, seen))
      .filter((item) => item !== undefined) as unknown as T;
  }

  // Preserve Date instances
  if (obj instanceof Date) {
    return obj;
  }
  // Preserve Firestore Timestamp instances or FieldValue sentinels (e.g. serverTimestamp, deleteField)
  if (
    typeof (obj as any).toDate === "function" ||
    "_methodName" in (obj as any) ||
    "_delegate" in (obj as any)
  ) {
    return obj;
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      const cleaned = stripUndefined(value, seen);
      if (cleaned !== undefined) {
        cleanObj[key] = cleaned;
      }
    }
  }
  return cleanObj as T;
}

/**
 * Circular-safe JSON stringifier that prevents "Converting circular structure to JSON" crashes.
 */
export function safeJsonStringify(
  value: any,
  replacer?: ((key: string, value: any) => any) | null,
  space?: string | number
): string {
  const seen = new WeakSet();
  return JSON.stringify(
    value,
    (key, val) => {
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) {
          return "[Circular]";
        }
        seen.add(val);
      }
      if (typeof replacer === "function") {
        return replacer(key, val);
      }
      return val;
    },
    space
  );
}

/**
 * Sanitizes user input text by trimming whitespace and enforcing safe lengths.
 */
export function sanitizeInput(text: string, maxLength: number = 50000): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}

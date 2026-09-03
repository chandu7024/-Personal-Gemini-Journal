/**
 * Sanitizes an object by recursively removing all `undefined` values and normalizing keys.
 * Crucial for Firebase Firestore payload hygiene (preventing crashes on undefined fields).
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (typeof obj === "object") {
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
        cleanObj[key] = stripUndefined(value);
      }
    }
    return cleanObj as T;
  }
  return obj;
}

/**
 * Sanitizes user input text by trimming whitespace and enforcing safe lengths.
 */
export function sanitizeInput(text: string, maxLength: number = 50000): string {
  if (typeof text !== "string") return "";
  return text.trim().slice(0, maxLength);
}

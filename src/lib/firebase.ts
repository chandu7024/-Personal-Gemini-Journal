import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { stripUndefined } from "./sanitizer";
import type { JournalEntry, JournalMessage, JournalSummary, CognitiveAnalysisResult, ReflectionMode, UserProfile, UserRole, SystemAuditLog, EmailReminderSettings } from "../types";

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize Firestore targeting the specific database ID
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Sign in using Google OAuth Popup with RBAC provisioning
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  // Retrieve existing profile or establish role
  const userDocRef = doc(db, "users", user.uid);
  
  // Designate first user or chandu7024 as admin, otherwise preserve existing or default to 'user'
  let role: UserRole = "user";
  if (user.email === "chandu7024@gmail.com") {
    role = "admin";
  }

  await setDoc(
    userDocRef,
    stripUndefined({
      uid: user.uid,
      displayName: user.displayName || "Anonymous User",
      email: user.email,
      photoURL: user.photoURL,
      role,
      lastLogin: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );

  return user;
}

/**
 * Subscribe to current user's profile to monitor role in real-time
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  const userDocRef = doc(db, "users", userId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          uid: snap.id,
          displayName: data.displayName || "User",
          email: data.email || null,
          photoURL: data.photoURL || null,
          role: (data.role as UserRole) || "user",
          createdAt: data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin || new Date().toISOString(),
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn("[Firestore] User profile snapshot error:", err);
      if (onError) onError(err);
    }
  );
}

/**
 * Admin: Fetch all registered users for RBAC management
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, "users");
    const snap = await getDocs(usersCol);
    const users: UserProfile[] = [];
    snap.forEach((d) => {
      const data = d.data();
      users.push({
        uid: d.id,
        displayName: data.displayName || "User",
        email: data.email || null,
        photoURL: data.photoURL || null,
        role: (data.role as UserRole) || "user",
        createdAt: data.createdAt || new Date().toISOString(),
        lastLogin: data.lastLogin || new Date().toISOString(),
      });
    });
    return users;
  } catch (err) {
    console.error("[Firestore] Error fetching users list:", err);
    return [];
  }
}

/**
 * Admin: Update user role
 */
export async function updateUserRole(
  actor: { email?: string | null; uid: string },
  targetUid: string,
  newRole: UserRole
): Promise<void> {
  const userDocRef = doc(db, "users", targetUid);
  await updateDoc(userDocRef, {
    role: newRole,
    updatedAt: serverTimestamp(),
  });

  // Log audit event
  await logAuditEvent({
    action: "ROLE_MODIFICATION",
    actorEmail: actor.email || "admin@system",
    actorUid: actor.uid,
    targetResource: `/users/${targetUid}`,
    status: "success",
    details: `Role updated to ${newRole}`,
  });
}

/**
 * Record system security audit log via server proxy
 */
export async function logAuditEvent(log: Omit<SystemAuditLog, "id" | "timestamp">): Promise<void> {
  try {
    await fetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
  } catch (err) {
    console.warn("[Security Audit] Could not record audit log to server:", err);
  }
}

/**
 * Fetch immutable system security audit logs
 */
export async function fetchAuditLogs(): Promise<SystemAuditLog[]> {
  try {
    const res = await fetch("/api/admin/audit-logs");
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    const data = await res.json();
    return data.logs || [];
  } catch (err) {
    console.warn("[Admin] Could not fetch audit logs:", err);
    return [];
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to the real-time list of journal entries strictly isolated to the user
 */
export function subscribeToUserEntries(
  userId: string,
  onUpdate: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const entriesRef = collection(db, "users", userId, "entries");
  const q = query(entriesRef, orderBy("updatedAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        entries.push({
          id: docSnap.id,
          userId,
          title: data.title || "Untitled Reflection",
          snippet: data.snippet || "",
          mode: (data.mode as ReflectionMode) || "mindful",
          tags: Array.isArray(data.tags) ? data.tags : [],
          mood: data.mood,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === "function" ? data.updatedAt.toDate().toISOString() : data.updatedAt) : new Date().toISOString(),
          messageCount: data.messageCount || 0,
          summary: data.summary || null,
          cognitiveAnalysis: data.cognitiveAnalysis || null,
          pinned: Boolean(data.pinned),
          location: data.location || null,
        });
      });
      onUpdate(entries);
    },
    (error) => {
      console.error("[Firestore] Error subscribing to entries:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe to real-time messages within a specific journal entry
 */
export function subscribeToEntryMessages(
  userId: string,
  entryId: string,
  onUpdate: (messages: JournalMessage[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId || !entryId) {
    onUpdate([]);
    return () => {};
  }

  const messagesRef = collection(db, "users", userId, "entries", entryId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: JournalMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          role: data.role === "assistant" ? "assistant" : "user",
          content: data.content || "",
          timestamp: data.timestamp || new Date().toISOString(),
          modelUsed: data.modelUsed,
        });
      });
      onUpdate(messages);
    },
    (error) => {
      console.error("[Firestore] Error subscribing to messages:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Create a new Journal Entry
 */
export async function createJournalEntry(
  userId: string,
  initialTitle?: string,
  mode: ReflectionMode = "mindful",
  tags: string[] = []
): Promise<string> {
  const newDocRef = doc(collection(db, "users", userId, "entries"));
  const now = new Date().toISOString();
  
  const payload = stripUndefined({
    userId,
    title: initialTitle || "New Reflection",
    snippet: "Started a new reflection...",
    mode,
    tags,
    messageCount: 0,
    createdAt: now,
    updatedAt: serverTimestamp(),
  });

  await setDoc(newDocRef, payload);
  return newDocRef.id;
}

/**
 * Update an existing Journal Entry metadata
 */
export async function updateJournalEntry(
  userId: string,
  entryId: string,
  updates: Partial<JournalEntry>
): Promise<void> {
  const docRef = doc(db, "users", userId, "entries", entryId);
  const cleanPayload = stripUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(docRef, cleanPayload);
}

/**
 * Delete a journal entry and its subcollection messages
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  // Delete messages first
  const messagesRef = collection(db, "users", userId, "entries", entryId, "messages");
  const msgSnap = await getDocs(messagesRef);
  const deletePromises = msgSnap.docs.map((d) => deleteDoc(d.ref));
  await Promise.all(deletePromises);

  // Delete main entry document
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(entryDocRef);
}

/**
 * Save a message into the entry subcollection and update entry snippet/timestamp
 */
export async function saveJournalMessage(
  userId: string,
  entryId: string,
  message: {
    id?: string;
    role: "user" | "assistant";
    content: string;
    modelUsed?: string;
    timestamp?: string;
  }
): Promise<string> {
  const msgId = message.id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const messageDocRef = doc(db, "users", userId, "entries", entryId, "messages", msgId);
  const now = message.timestamp || new Date().toISOString();

  const msgPayload = stripUndefined({
    role: message.role,
    content: message.content,
    modelUsed: message.modelUsed || (message.role === "assistant" ? "gemini-3.6-flash" : undefined),
    timestamp: now,
  });

  await setDoc(messageDocRef, msgPayload);

  // Update parent entry with snippet and count
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  const snippet = message.content.slice(0, 120);
  await updateDoc(entryDocRef, {
    snippet,
    updatedAt: serverTimestamp(),
  });

  return msgId;
}

/**
 * Save entry summary/synthesis results to Firestore
 */
export async function saveEntrySummary(
  userId: string,
  entryId: string,
  summary: JournalSummary
): Promise<void> {
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  await updateDoc(
    entryDocRef,
    stripUndefined({
      title: summary.title,
      summary,
      mood: summary.mood,
      updatedAt: serverTimestamp(),
    })
  );
}

/**
 * Save Cognitive Distortion & Bias Analysis to Firestore
 */
export async function saveEntryCognitiveAnalysis(
  userId: string,
  entryId: string,
  cognitiveAnalysis: CognitiveAnalysisResult
): Promise<void> {
  const entryDocRef = doc(db, "users", userId, "entries", entryId);
  await updateDoc(
    entryDocRef,
    stripUndefined({
      cognitiveAnalysis,
      updatedAt: serverTimestamp(),
    })
  );
}

/**
 * Save user's email reflection reminder preferences to Firestore
 */
export async function saveUserReminderSettings(
  userId: string,
  settings: EmailReminderSettings
): Promise<void> {
  const userDocRef = doc(db, "users", userId);
  await setDoc(
    userDocRef,
    stripUndefined({
      reminderSettings: {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );
}

/**
 * Subscribe to real-time reminder settings for the active user
 */
export function subscribeUserReminderSettings(
  userId: string,
  onUpdate: (settings: EmailReminderSettings | null) => void
) {
  if (!userId) {
    onUpdate(null);
    return () => {};
  }

  const userDocRef = doc(db, "users", userId);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.reminderSettings) {
          onUpdate(data.reminderSettings as EmailReminderSettings);
          return;
        }
      }
      onUpdate(null);
    },
    (err) => {
      console.warn("[Firestore] Reminder settings snapshot error:", err);
      onUpdate(null);
    }
  );
}



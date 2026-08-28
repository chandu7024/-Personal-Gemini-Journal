import type { EmailNotificationPayload, NotificationDispatchResult, ReminderDispatchPayload, ReminderThemeMetadata } from "../types";
import { sanitizeInput } from "./sanitizer";

/**
 * Dispatch an executive reflection summary via Email API
 */
export async function sendEmailNotification(
  payload: EmailNotificationPayload
): Promise<NotificationDispatchResult> {
  const sanitizedPayload: EmailNotificationPayload = {
    recipientEmail: sanitizeInput(payload.recipientEmail.trim().toLowerCase()),
    entryTitle: sanitizeInput(payload.entryTitle),
    executiveSummary: sanitizeInput(payload.executiveSummary),
    keyInsights: payload.keyInsights.map((k) => sanitizeInput(k)),
    actionItems: payload.actionItems.map((a) => sanitizeInput(a)),
    mood: payload.mood ? sanitizeInput(payload.mood) : undefined,
    tags: payload.tags ? payload.tags.map((t) => sanitizeInput(t)) : undefined,
    locationName: payload.locationName ? sanitizeInput(payload.locationName) : undefined,
    formattedDate: sanitizeInput(payload.formattedDate),
  };

  const response = await fetch("/api/notifications/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sanitizedPayload),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Notification server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Dispatch or Test an Email Reminder for Reflection Sessions
 */
export async function dispatchReminderNotification(
  payload: ReminderDispatchPayload
): Promise<NotificationDispatchResult & { promptDetails?: any }> {
  const sanitizedPayload: ReminderDispatchPayload = {
    recipientEmail: sanitizeInput(payload.recipientEmail.trim().toLowerCase()),
    frequency: payload.frequency,
    dayOfWeek: payload.dayOfWeek,
    theme: payload.theme,
    time: payload.time ? sanitizeInput(payload.time) : "08:30",
    timezone: payload.timezone ? sanitizeInput(payload.timezone) : Intl.DateTimeFormat().resolvedOptions().timeZone,
    customIntent: payload.customIntent ? sanitizeInput(payload.customIntent) : undefined,
    includeSocraticPrompt: payload.includeSocraticPrompt ?? true,
    isTest: Boolean(payload.isTest),
    appUrl: typeof window !== "undefined" ? window.location.origin : undefined,
  };

  const response = await fetch("/api/notifications/reminder/dispatch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sanitizedPayload),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Failed to dispatch reminder: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch available reminder themes metadata
 */
export async function fetchReminderThemes(): Promise<ReminderThemeMetadata[]> {
  try {
    const res = await fetch("/api/notifications/reminder/themes");
    if (res.ok) {
      const data = await res.json();
      return data.themes || [];
    }
  } catch (err) {
    console.warn("Failed to fetch reminder themes, using fallback:", err);
  }

  return [
    {
      id: "mindful",
      label: "Mindful Pause",
      tagline: "Present-moment grounding, breath awareness, emotional temperature check.",
      samplePrompt: "What physical sensation or subtle emotion is asking for your attention right now?",
      recommendedTime: "07:30",
      badgeColor: "emerald",
    },
    {
      id: "socratic",
      label: "Socratic Inquiry",
      tagline: "Unpack cognitive assumptions, reality-test fears, discover hidden clarity.",
      samplePrompt: "What is a core belief you held this week that might not be 100% true?",
      recommendedTime: "18:00",
      badgeColor: "amber",
    },
    {
      id: "executive",
      label: "Executive Agency",
      tagline: "Cut through noise, identify top 3 priorities, convert tension into decisive next actions.",
      samplePrompt: "What is the highest-leverage decision you can make today that reduces the most friction?",
      recommendedTime: "08:30",
      badgeColor: "blue",
    },
    {
      id: "gratitude",
      label: "Gratitude & Grounding",
      tagline: "Restore perspective by celebrating micro-wins, quiet support, and internal resilience.",
      samplePrompt: "Who or what made a quiet, positive difference in your energy today that you haven't yet acknowledged?",
      recommendedTime: "20:30",
      badgeColor: "rose",
    },
    {
      id: "reframe",
      label: "Cognitive Reframe",
      tagline: "Dismantle catastrophic narratives, all-or-nothing thinking, and imposter filters.",
      samplePrompt: "If you looked at your current biggest obstacle as a tailored training ground, what is it teaching you?",
      recommendedTime: "12:00",
      badgeColor: "purple",
    },
  ];
}

/**
 * Send a test webhook / payload for external platforms (Slack, Discord, Email)
 */
export async function testExternalNotification(params: {
  channel: "email" | "slack" | "discord";
  target: string;
  entryTitle: string;
  executiveSummary: string;
}): Promise<NotificationDispatchResult> {
  const response = await fetch("/api/notifications/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || `Failed test notification: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the current configuration status of the server-side Notification Engine
 */
export async function fetchNotificationEngineStatus(): Promise<{
  smtpConfigured: boolean;
  smtpHost?: string;
  slackConfigured: boolean;
  discordConfigured: boolean;
}> {
  try {
    const response = await fetch("/api/notifications/status");
    if (!response.ok) {
      return { smtpConfigured: false, slackConfigured: false, discordConfigured: false };
    }
    return response.json();
  } catch (err) {
    console.error("Failed to check notification engine status:", err);
    return { smtpConfigured: false, slackConfigured: false, discordConfigured: false };
  }
}



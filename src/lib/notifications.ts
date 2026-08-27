import type { EmailNotificationPayload, NotificationDispatchResult } from "../types";
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


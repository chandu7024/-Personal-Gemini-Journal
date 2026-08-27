import type { JournalMessage, JournalSummary, ReflectionMode } from "../types";
import { sanitizeInput } from "./sanitizer";

export interface ChatResponse {
  success: boolean;
  text: string;
  modelUsed: string;
  error?: string;
}

export interface SummarizeResponse {
  success: boolean;
  summary: JournalSummary;
  modelUsed?: string;
  error?: string;
}

/**
 * Send multi-turn reflections/prompts to Gemini backend API
 */
export async function sendChatMessage(params: {
  messages: Array<{ role: string; content: string }>;
  mode: ReflectionMode;
  systemInstruction?: string;
  location?: { lat: number; lng: number; placeName: string } | null;
}): Promise<ChatResponse> {
  const sanitizedMessages = params.messages.map((m) => ({
    role: m.role,
    content: sanitizeInput(m.content),
  }));

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: sanitizedMessages,
      mode: params.mode,
      systemInstruction: params.systemInstruction,
      location: params.location,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

/**
 * Request comprehensive journal synthesis and summary
 */
export async function summarizeJournalEntry(params: {
  messages: JournalMessage[];
  title?: string;
}): Promise<SummarizeResponse> {
  const sanitizedMessages = params.messages.map((m) => ({
    role: m.role,
    content: sanitizeInput(m.content),
  }));

  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: sanitizedMessages,
      title: params.title,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server responded with status ${response.status}`);
  }

  return response.json();
}

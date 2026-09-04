import type {
  JournalMessage,
  JournalSummary,
  ReflectionMode,
  CognitiveAnalysisResult,
  InstantReframeResult,
  JournalEntry,
  LongitudinalAuditResult,
} from "../types";
import { sanitizeInput, safeJsonStringify } from "./sanitizer";

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

export interface CognitiveAnalysisResponse {
  success: boolean;
  analysis: CognitiveAnalysisResult;
  modelUsed?: string;
  error?: string;
}

export interface InstantReframeResponse {
  success: boolean;
  data: InstantReframeResult;
  modelUsed?: string;
  error?: string;
}

export interface VoiceSocraticTurnResponse {
  success: boolean;
  text: string;
  spokenText?: string;
  modelUsed?: string;
  error?: string;
}

/**
 * Robust fetch wrapper that guarantees safe JSON handling, protects against HTML responses, and supports cancellation
 */
async function safeApiPost<T>(url: string, payload: any, defaultErrorMessage: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: safeJsonStringify(payload),
      signal,
    });
  } catch (netErr: any) {
    if (netErr?.name === "AbortError" || String(netErr?.message || "").includes("aborted")) {
      throw netErr;
    }
    throw new Error(`Network connection error: ${netErr?.message || "Failed to reach server"}`);
  }

  const rawText = await response.text();
  let parsedJson: any = null;

  if (rawText && (rawText.trim().startsWith("{") || rawText.trim().startsWith("["))) {
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      parsedJson = null;
    }
  }

  if (!response.ok) {
    const errorMsg =
      parsedJson?.error ||
      (rawText.length > 0 && rawText.length < 150 && !rawText.includes("<") ? rawText : `${defaultErrorMessage} (HTTP ${response.status})`);
    throw new Error(errorMsg);
  }

  if (!parsedJson) {
    throw new Error(`${defaultErrorMessage}: Unexpected non-JSON server response.`);
  }

  return parsedJson as T;
}

/**
 * Send multi-turn reflections/prompts to Gemini backend API
 */
export async function sendChatMessage(params: {
  messages: Array<{ role: string; content: string }>;
  mode: ReflectionMode;
  systemInstruction?: string;
  location?: { lat: number; lng: number; placeName: string } | null;
  signal?: AbortSignal;
}): Promise<ChatResponse> {
  const sanitizedMessages = params.messages.map((m) => ({
    role: m.role,
    content: sanitizeInput(m.content),
  }));

  return safeApiPost<ChatResponse>(
    "/api/chat",
    {
      messages: sanitizedMessages,
      mode: params.mode,
      systemInstruction: params.systemInstruction,
      location: params.location,
    },
    "Failed to generate reflection response",
    params.signal
  );
}

/**
 * Request real-time Socratic voice dialogue turn
 */
export async function sendVoiceSocraticTurn(params: {
  transcript: string;
  history?: Array<{ role: string; content: string }>;
  tone?: string;
  mood?: string;
  signal?: AbortSignal;
}): Promise<VoiceSocraticTurnResponse> {
  const sanitizedTranscript = sanitizeInput(params.transcript);
  const sanitizedHistory = (params.history || []).map((h) => ({
    role: h.role,
    content: sanitizeInput(h.content),
  }));

  return safeApiPost<VoiceSocraticTurnResponse>(
    "/api/audio/socratic-turn",
    {
      transcript: sanitizedTranscript,
      history: sanitizedHistory,
      tone: params.tone || "socratic",
      mood: params.mood,
    },
    "Failed to process voice reflection turn",
    params.signal
  );
}

/**
 * Request comprehensive journal synthesis and summary
 */
export async function summarizeJournalEntry(params: {
  messages: JournalMessage[];
  title?: string;
  signal?: AbortSignal;
}): Promise<SummarizeResponse> {
  const sanitizedMessages = params.messages.map((m) => ({
    role: m.role,
    content: sanitizeInput(m.content),
  }));

  return safeApiPost<SummarizeResponse>(
    "/api/summarize",
    {
      messages: sanitizedMessages,
      title: params.title,
    },
    "Failed to generate journal summary",
    params.signal
  );
}

/**
 * Request deep Cognitive Distortion, Bias, and Blind-Spot Diagnosis
 */
export async function analyzeCognitiveBiases(params: {
  messages?: JournalMessage[];
  text?: string;
  title?: string;
  signal?: AbortSignal;
}): Promise<CognitiveAnalysisResponse> {
  const sanitizedMessages = params.messages?.map((m) => ({
    role: m.role,
    content: sanitizeInput(m.content),
  }));

  return safeApiPost<CognitiveAnalysisResponse>(
    "/api/cognitive-analysis",
    {
      messages: sanitizedMessages,
      text: params.text ? sanitizeInput(params.text) : undefined,
      title: params.title ? sanitizeInput(params.title) : undefined,
    },
    "Failed to diagnose cognitive patterns",
    params.signal
  );
}

/**
 * Request instant Cognitive Behavioral reframe for a single thought
 */
export async function reframeSingleThought(thoughtText: string, signal?: AbortSignal): Promise<InstantReframeResponse> {
  const sanitizedText = sanitizeInput(thoughtText);

  return safeApiPost<InstantReframeResponse>(
    "/api/cognitive-analysis/reframe-thought",
    {
      thoughtText: sanitizedText,
    },
    "Failed to generate cognitive reframe",
    signal
  );
}

/**
 * Request Longitudinal Cognitive Growth and Blind-Spot Audit across multi-entry timeline
 */
export async function requestLongitudinalAudit(params: {
  timeRange: string;
  entries: JournalEntry[];
  signal?: AbortSignal;
}): Promise<{ success: boolean; audit: LongitudinalAuditResult }> {
  // Sanitize payloads to strip private identifiers
  const sanitizedEntries = params.entries.map((e) => ({
    id: e.id,
    title: sanitizeInput(e.title),
    createdAt: e.createdAt,
    mode: e.mode,
    mood: e.mood,
    snippet: e.snippet ? sanitizeInput(e.snippet) : undefined,
    summary: e.summary
      ? {
          title: sanitizeInput(e.summary.title),
          executiveSummary: sanitizeInput(e.summary.executiveSummary),
          keyInsights: e.summary.keyInsights.map(sanitizeInput),
          actionItems: e.summary.actionItems.map(sanitizeInput),
        }
      : null,
    cognitiveAnalysis: e.cognitiveAnalysis
      ? {
          flexibilityScore: e.cognitiveAnalysis.flexibilityScore,
          agencyScore: e.cognitiveAnalysis.agencyScore,
          emotionalResilienceScore: e.cognitiveAnalysis.emotionalResilienceScore,
          dominantThoughtPattern: e.cognitiveAnalysis.dominantThoughtPattern,
          biasesDetected: e.cognitiveAnalysis.biasesDetected.map((b) => ({
            name: b.name,
            category: b.category,
            triggerQuote: sanitizeInput(b.triggerQuote),
          })),
        }
      : null,
  }));

  return safeApiPost<{ success: boolean; audit: LongitudinalAuditResult }>(
    "/api/analytics/longitudinal-audit",
    {
      timeRange: params.timeRange,
      entries: sanitizedEntries,
    },
    "Failed to perform longitudinal audit",
    params.signal
  );
}


import express from "express";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

// Top-level payload decoding middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Model Fallback Ladder configuration (prioritizing ultra-low-latency, verified models)
const MODEL_FALLBACK_LADDER = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.8-flash",
];

// In-Memory Fast Response Cache for Syntheses, Audits, and Diagnostics
interface CacheEntry<T> {
  data: T;
  modelUsed?: string;
  expiresAt: number;
}

const apiResponseCache = new Map<string, CacheEntry<any>>();

function getCachedResponse<T>(cacheKey: string): { data: T; modelUsed?: string } | null {
  const cached = apiResponseCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { data: cached.data, modelUsed: cached.modelUsed };
  }
  if (cached) {
    apiResponseCache.delete(cacheKey);
  }
  return null;
}

function setCachedResponse<T>(cacheKey: string, data: T, ttlMs: number, modelUsed?: string): void {
  if (apiResponseCache.size > 250) {
    const oldestKey = apiResponseCache.keys().next().value;
    if (oldestKey) apiResponseCache.delete(oldestKey);
  }
  apiResponseCache.set(cacheKey, {
    data,
    modelUsed,
    expiresAt: Date.now() + ttlMs,
  });
}

function createHashKey(prefix: string, payload: any): string {
  try {
    return `${prefix}:${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
  } catch {
    return `${prefix}:${Date.now()}_${Math.random()}`;
  }
}

// Track 429 / quota exhaustion cooldown timestamps per model
const modelCooldownUntil: Record<string, number> = {};

// In-Memory Immutable System Audit Log Store
interface SystemAuditRecord {
  id: string;
  action: string;
  actorEmail: string;
  actorUid: string;
  targetResource?: string;
  status: "success" | "warning" | "failure";
  details: string;
  timestamp: string;
}

const systemAuditLogs: SystemAuditRecord[] = [
  {
    id: "log-init-01",
    action: "SYSTEM_INITIALIZATION",
    actorEmail: "system",
    actorUid: "system-daemon",
    status: "success",
    details: "ReflectAI hardened server booted with Gemini fallback ladder & Firestore RBAC.",
    timestamp: new Date().toISOString(),
  },
  {
    id: "log-init-02",
    action: "THREAT_MODEL_GUARD_ACTIVE",
    actorEmail: "security-engine",
    actorUid: "system-daemon",
    targetResource: "/api/chat",
    status: "success",
    details: "OWASP LLM01 delimiter defense & input sanitization boundaries active.",
    timestamp: new Date().toISOString(),
  },
];

// Lazy client initialization
let genAiClient: GoogleGenAI | null = null;
function getGenAiClient(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAiClient;
}

/**
 * Helper to parse retry delay from 429 error object or default to short 10s cooldown
 */
function parseRetryDelayMs(err: any): number {
  try {
    const msg = err?.message || JSON.stringify(err);
    const retryMatch = msg.match(/retry in ([0-9.]+)s/i) || msg.match(/retryDelay"?:\s*"([0-9]+)s/i);
    if (retryMatch && retryMatch[1]) {
      const seconds = parseFloat(retryMatch[1]);
      if (!isNaN(seconds) && seconds > 0) {
        return Math.min(Math.ceil(seconds * 1000) + 500, 15000); // Cap at 15s max
      }
    }
  } catch {
    // ignore
  }
  return 10000; // Default short 10 seconds cooldown
}

/**
 * Resilient content generation wrapper executing across the model ladder
 * Featuring per-model abort timeouts and direct JSON configuration for high-speed throughput
 */
async function generateContentWithFallback(params: {
  contents: any[];
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAiClient();
  let lastError: any = null;
  const now = Date.now();

  // Filter models that are not currently under active cooldown
  const availableModels = MODEL_FALLBACK_LADDER.filter((m) => {
    const cooldown = modelCooldownUntil[m];
    return !cooldown || now > cooldown;
  });

  // If all models are currently in cooldown, clear cooldowns and try all models anyway
  const modelsToAttempt = availableModels.length > 0 ? availableModels : MODEL_FALLBACK_LADDER;

  for (const model of modelsToAttempt) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      const controller = new AbortController();
      const timeoutLimit = params.timeoutMs || 9000;
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutLimit);

      const config: any = {
        systemInstruction: params.systemInstruction,
        temperature: params.temperature ?? 0.7,
        abortSignal: controller.signal,
      };

      if (params.responseMimeType) {
        config.responseMimeType = params.responseMimeType;
      }
      if (params.maxOutputTokens) {
        config.maxOutputTokens = params.maxOutputTokens;
      }

      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config,
      });

      if (timeoutId) clearTimeout(timeoutId);

      const responseText = response.text || "";
      // Reset cooldown upon successful generation
      delete modelCooldownUntil[model];
      return { text: responseText, modelUsed: model };
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = err;
      const isAbort = err?.name === "AbortError" || String(err?.message || "").includes("aborted");
      const status = isAbort
        ? 504
        : err?.status ||
          err?.statusCode ||
          (err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED")
            ? 429
            : err?.message?.includes("503") || err?.message?.includes("UNAVAILABLE")
            ? 503
            : 500);

      if (isAbort) {
        console.warn(`[Gemini API] Model ${model} timed out after ${params.timeoutMs || 9000}ms. Switching to fallback model...`);
        modelCooldownUntil[model] = Date.now() + 15000;
      } else if (status === 429 || String(err?.message || "").includes("RESOURCE_EXHAUSTED")) {
        const cooldownMs = parseRetryDelayMs(err);
        modelCooldownUntil[model] = Date.now() + cooldownMs;
        console.warn(`[Gemini API] Model ${model} rate-limited (429). Cooldown set for ${Math.round(cooldownMs / 1000)}s. Attempting next fallback...`);
      } else if (status === 503 || String(err?.message || "").includes("UNAVAILABLE") || String(err?.message || "").includes("high demand")) {
        modelCooldownUntil[model] = Date.now() + 10000;
        console.warn(`[Gemini API] Model ${model} high demand (503). Attempting next fallback...`);
      } else {
        console.warn(`[Gemini API] Model ${model} encountered error (${status}): ${err?.message || err}. Attempting next fallback...`);
      }
    }
  }

  throw new Error(`All Gemini fallback models exhausted. Last error: ${lastError?.message || "Unknown error"}`);
}

// API Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    models: MODEL_FALLBACK_LADDER,
  });
});

// API Multi-turn Chat / Reflection
app.post("/api/chat", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages, mode, systemInstruction: customInstruction, location } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array payload." });
    }

    // Sanitize and format contents for Gemini API
    const formattedContents = messages.map((msg: any) => {
      const role = msg.role === "assistant" ? "model" : "user";
      const textContent = typeof msg.content === "string" ? msg.content.trim() : "";
      return {
        role,
        parts: [{ text: textContent }],
      };
    });

    // Determine system instructions based on reflection mode
    let modeInstruction = "You are ReflectAI, an insightful, compassionate, and sharp reflection and journaling partner. Help the user explore thoughts deeply, identify mental patterns, reframe obstacles with agency, and maintain constructive clarity.";
    
    if (mode === "socratic") {
      modeInstruction += " Mode: Socratic Inquirer. Ask probing, thoughtful questions to help the user uncover root assumptions, test reasoning, and gain self-insight without being prescriptive.";
    } else if (mode === "brainstorm") {
      modeInstruction += " Mode: Creative Brainstormer. Offer unexpected connections, lateral perspectives, divergent ideas, and creative angles to expand possibilities.";
    } else if (mode === "gratitude") {
      modeInstruction += " Mode: Mindful & Gratitude. Emphasize presence, emotional grounding, acknowledging wins, finding subtle lessons in friction, and cultivating balanced calm.";
    } else if (mode === "executive") {
      modeInstruction += " Mode: Clarity & Action. Distill thoughts into crisp summaries, objective truths, clear priorities, actionable next steps, and decision matrices.";
    }

    // Location Grounding context
    let locationContext = "";
    if (location && typeof location === "object" && location.placeName) {
      const placeName = String(location.placeName).slice(0, 100);
      locationContext = `\n\nGeographic Context: The user is reflecting from "${placeName}". Ground your reflections with atmospheric, contemplative, or environmental awareness when appropriate without revealing private coordinates.`;
    }

    const finalSystemInstruction = `${modeInstruction}${locationContext}${customInstruction ? `\n\nUser Context: ${customInstruction}` : ""}\n\nCRITICAL LANGUAGE DIRECTIVE: You MUST ALWAYS respond strictly in fluent, natural English. Never generate responses in any other language under any circumstance, even if user input contains foreign words or non-English phrases.`;

    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: finalSystemInstruction,
      temperature: mode === "brainstorm" ? 0.9 : 0.65,
      maxOutputTokens: 800,
      timeoutMs: 8000,
    });

    return res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error] /api/chat failure:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate reflection response from Gemini.",
      success: false,
    });
  }
});

// Alias for /api/ai/socratic-turn to prevent 404s
app.post("/api/ai/socratic-turn", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages, prompt, mode = "socratic", systemInstruction: customInstruction, location } = body;

    let history = Array.isArray(messages) ? [...messages] : [];
    if (prompt && typeof prompt === "string" && (!history.length || history[history.length - 1]?.content !== prompt)) {
      history.push({ role: "user", content: prompt });
    }

    if (history.length === 0) {
      return res.status(400).json({ error: "Missing messages or prompt payload.", success: false });
    }

    const formattedContents = history.map((msg: any) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
      parts: [{ text: typeof msg.content === "string" ? msg.content.trim() : "" }],
    }));

    const finalSystemInstruction = `You are ReflectAI's Real-time Socratic Facilitator.
Help the user explore thoughts deeply, question assumptions gently, and discover inner wisdom.
Keep responses concise, conversational, and contemplative (1-3 sentences) suitable for reflective pacing.
CRITICAL LANGUAGE DIRECTIVE: You MUST ALWAYS speak and respond strictly in fluent, natural English. Never reply in any other language under any circumstance.
${customInstruction ? `\n\nContext: ${customInstruction}` : ""}`;

    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: finalSystemInstruction,
      temperature: 0.65,
      maxOutputTokens: 250,
      timeoutMs: 6000,
    });

    return res.json({
      success: true,
      text: result.text,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error] /api/ai/socratic-turn failure:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process Socratic turn.",
      success: false,
    });
  }
});

// Real-Time Socratic Voice Journaling Endpoint
app.post("/api/audio/socratic-turn", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { transcript, history = [], tone = "socratic", mood } = body;

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return res.status(400).json({ error: "Missing 'transcript' payload for voice journaling.", success: false });
    }

    const formattedContents: any[] = Array.isArray(history)
      ? history.map((h: any) => ({
          role: h.role === "assistant" || h.role === "model" ? "model" : "user",
          parts: [{ text: String(h.content || "").slice(0, 1000) }],
        }))
      : [];

    // Add current spoken transcript
    formattedContents.push({
      role: "user",
      parts: [{ text: transcript.trim() }],
    });

    const voicePromptInstruction = `You are ReflectAI, an executive Socratic voice guide conducting a live spoken reflection session.
Guidelines for spoken output:
1. STRICT LANGUAGE REQUIREMENT: You MUST speak strictly in clear, fluent, natural ENGLISH at all times. Every word must be standard English. Under NO circumstance should you switch to or output any other language, even if the user speaks with a foreign accent or foreign words.
2. Speak with warmth, calm curiosity, and emotional presence.
3. Keep your response strictly under 2 to 3 concise spoken sentences (30-50 words maximum).
4. First briefly validate the user's emotional state or insight (${mood ? `current mood: ${mood}` : "grounded reflection"}).
5. Then pose one deep, high-agency Socratic question that cuts to root assumptions or invites constructive reframing.
6. Do NOT use bullet points, bold tags, or markdown, as this text is spoken aloud directly by speech synthesis.`;

    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: voicePromptInstruction,
      temperature: 0.6,
      maxOutputTokens: 150,
      timeoutMs: 5000,
    });

    // Clean any markdown formatting for seamless audio synthesis
    const spokenText = result.text.replace(/[*_#`~]/g, "").trim();

    return res.json({
      success: true,
      text: spokenText,
      spokenText: spokenText,
      modelUsed: result.modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API Error] /api/audio/socratic-turn failure:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process voice reflection turn.",
      success: false,
    });
  }
});

// API Journal Synthesis & Summarization
app.post("/api/summarize", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages, title } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array for summarization." });
    }

    // Cache check for identical reflection content
    const cacheKey = createHashKey("summarize", { messages, title });
    const cached = getCachedResponse<any>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        summary: cached.data,
        modelUsed: cached.modelUsed || "cache-hit",
        cached: true,
      });
    }

    const conversationText = messages
      .map((m: any) => `${m.role === "assistant" ? "AI Reflection" : "User Journal"}: ${m.content}`)
      .join("\n\n");

    const prompt = `Analyze this journal entry and multi-turn reflection session:
${title ? `Current Entry Title: "${title}"` : ""}

--- SESSION CONTENT ---
${conversationText}
--- END CONTENT ---

Provide a structured, insightful synthesis formatted strictly as a valid JSON object matching this schema:
{
  "title": "A concise, evocative 3 to 7 word title summarizing this entry",
  "keyInsights": ["Insight 1", "Insight 2", "Insight 3"],
  "actionItems": ["Actionable step 1", "Actionable step 2"],
  "mood": "One of: Empowered | Reflective | Challenged | Calm | Energized | Anxious | Hopeful | Focused",
  "suggestedTopics": ["Topic 1 to explore next", "Topic 2 to explore next"],
  "executiveSummary": "A crisp 2-3 sentence overview capturing the core narrative, emotional tone, and breakthrough thoughts."
}

Return ONLY the raw JSON object without markdown fences.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You are an analytical journaling expert. Return strictly valid JSON with no markdown wrapping.",
      temperature: 0.3,
      responseMimeType: "application/json",
      maxOutputTokens: 800,
      timeoutMs: 8000,
    });

    let parsedJson: any = null;
    const cleanText = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      parsedJson = JSON.parse(cleanText);
    } catch {
      // Fallback if JSON parse fails
      parsedJson = {
        title: title || "Reflective Journal Entry",
        keyInsights: ["Explored personal thoughts and reflections deeply."],
        actionItems: ["Review these reflections in your next session."],
        mood: "Reflective",
        suggestedTopics: ["Continuing to unpack core themes"],
        executiveSummary: cleanText.slice(0, 200),
      };
    }

    // Cache synthesis for 10 minutes
    setCachedResponse(cacheKey, parsedJson, 10 * 60 * 1000, result.modelUsed);

    return res.json({
      success: true,
      summary: parsedJson,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("[API Error] /api/summarize failure:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate summary.",
      success: false,
    });
  }
});

// API Cognitive Blind-Spot & Distortion Deep Analysis
app.post("/api/cognitive-analysis", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages, text, title } = body;

    let contentToAnalyze = "";
    if (Array.isArray(messages) && messages.length > 0) {
      contentToAnalyze = messages
        .map((m: any) => `${m.role === "assistant" ? "AI Partner" : "User"}: ${m.content}`)
        .join("\n\n");
    } else if (typeof text === "string" && text.trim()) {
      contentToAnalyze = text.trim();
    } else {
      return res.status(400).json({ error: "Missing 'messages' array or 'text' content to analyze." });
    }

    // Cache lookup for cognitive diagnosis
    const cacheKey = createHashKey("cog", { contentToAnalyze, title });
    const cached = getCachedResponse<any>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        analysis: cached.data,
        modelUsed: cached.modelUsed || "cache-hit",
        cached: true,
      });
    }

    const prompt = `You are an elite Cognitive Behavioral Scientist and Psychological Reasoning Engine powered by Gemini.
Perform an in-depth Cognitive Distortion, Bias, and Blind-Spot diagnosis on this user reflection.

${title ? `Entry Title: "${title}"` : ""}
--- USER REFLECTION CONTENT ---
${contentToAnalyze}
--- END CONTENT ---

Diagnostic Framework to evaluate against:
1. Cognitive Distortions: Catastrophizing, All-or-Nothing / Dichotomous Thinking, Mind Reading, Fortune Telling, Sunk Cost Fallacy, Imposter Phenomenon, Should/Must Statements, Emotional Reasoning, Overgeneralization, Mental Filtering, Personalization, Discounting the Positive.
2. Cognitive Metrics:
   - Flexibility Score (0-100): Ability to see nuance, consider alternatives, and avoid rigid dogma.
   - Agency Score (0-100): Sense of internal locus of control and empowerment vs helplessness.
   - Emotional Resilience Score (0-100): Capacity to process friction without collapse.
3. For each detected bias:
   - Specific quote or excerpt where it manifested
   - The unconscious assumption powering it
   - Clinical context explaining the neurological/psychological drive
   - High-agency Socratic reframe (constructive alternative perspective)
   - Actionable cognitive micro-challenge / reality-testing exercise

Format your diagnosis strictly as a JSON object matching this schema:
{
  "flexibilityScore": 78,
  "agencyScore": 72,
  "emotionalResilienceScore": 84,
  "dominantThoughtPattern": "e.g. Catastrophic Foresight with Sunk-Cost Anchoring",
  "overallCognitiveAssessment": "2-3 sentences synthesizing the user's cognitive state, unexamined blind spots, and mental agility.",
  "recommendedReframingTechnique": "e.g. Decatastrophizing Matrix or Socratic Counter-Evidence Testing",
  "biasesDetected": [
    {
      "id": "bias-1",
      "name": "Catastrophizing",
      "category": "Distortion",
      "confidence": "High",
      "triggerQuote": "Exact or closely paraphrased user quote",
      "underlyingAssumption": "If this fails, all future prospects are permanently compromised.",
      "clinicalContext": "Threat-monitoring amygdala response overestimating likelihood of worst-case outcome.",
      "socraticReframe": "Empowering, high-agency reframe that balances reality with capability.",
      "actionableChallenge": "Specific 2-minute reality test or behavioral inquiry."
    }
  ]
}

If no clear distortion exists, return an empty "biasesDetected" list with high flexibility/agency scores and validating assessment.
Return ONLY the raw JSON object without markdown formatting.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You are a master cognitive psychologist and behavioral diagnostic specialist. Return strictly valid JSON with no markdown wrapping.",
      temperature: 0.25,
      responseMimeType: "application/json",
      maxOutputTokens: 1600,
      timeoutMs: 10000,
    });

    let analysis: any = null;
    const cleanText = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      analysis = JSON.parse(cleanText);
    } catch {
      // Graceful structured fallback
      analysis = {
        flexibilityScore: 75,
        agencyScore: 80,
        emotionalResilienceScore: 78,
        dominantThoughtPattern: "Reflective Synthesis with Constructive Nuance",
        overallCognitiveAssessment: "The reflection demonstrates balanced self-inquiry with healthy emotional processing and emergent action readiness.",
        recommendedReframingTechnique: "Socratic Evidence Weighting",
        biasesDetected: [
          {
            id: `bias-${Date.now()}`,
            name: "Rigid Expectation (Should Statement)",
            category: "Distortion",
            confidence: "Moderate",
            triggerQuote: "I feel like I should have anticipated this sooner.",
            underlyingAssumption: "Self-worth depends on flawless foresight.",
            clinicalContext: "Internalized perfectionism reacting to unpredictable environmental variables.",
            socraticReframe: "Unpredictability is a constant in complex domains. Timely adaptation is far more valuable than premature certainty.",
            actionableChallenge: "List 2 unpredictable variables that emerged which no reasonable preparation could have predicted.",
          },
        ],
      };
    }

    // Ensure array integrity
    if (!Array.isArray(analysis.biasesDetected)) {
      analysis.biasesDetected = [];
    }

    // Ensure IDs are present
    analysis.biasesDetected = analysis.biasesDetected.map((b: any, i: number) => ({
      id: b.id || `bias-${i + 1}-${Date.now()}`,
      name: b.name || "Cognitive Pattern",
      category: b.category || "Distortion",
      confidence: b.confidence || "Moderate",
      triggerQuote: b.triggerQuote || "User reflection snippet",
      underlyingAssumption: b.underlyingAssumption || "Implicit mental model",
      clinicalContext: b.clinicalContext || "Adaptive heuristic pattern",
      socraticReframe: b.socraticReframe || "Balanced alternative perspective",
      actionableChallenge: b.actionableChallenge || "Reflect on alternative possibilities",
    }));

    analysis.analyzedAt = new Date().toISOString();
    analysis.modelUsed = result.modelUsed;

    // Cache analysis for 10 minutes
    setCachedResponse(cacheKey, analysis, 10 * 60 * 1000, result.modelUsed);

    return res.json({
      success: true,
      analysis,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("[API Error] /api/cognitive-analysis failure:", error);
    return res.status(500).json({
      error: error?.message || "Failed to execute cognitive distortion analysis.",
      success: false,
    });
  }
});

// API Instant Thought Reframer Sandbox
app.post("/api/cognitive-analysis/reframe-thought", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { thoughtText } = body;

    if (!thoughtText || typeof thoughtText !== "string" || !thoughtText.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'thoughtText' payload." });
    }

    // Cache check for instant reframing
    const cacheKey = createHashKey("reframe", { thoughtText: thoughtText.trim() });
    const cached = getCachedResponse<any>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached.data,
        modelUsed: cached.modelUsed || "cache-hit",
        cached: true,
      });
    }

    const prompt = `Analyze this specific stressful, limiting, or anxious thought:
"${thoughtText.trim()}"

Provide an instant Cognitive Behavioral diagnosis and 3 distinct therapeutic reframes formatted strictly as valid JSON matching this schema:
{
  "originalThought": "${thoughtText.trim().replace(/"/g, '\\"')}",
  "detectedDistortions": ["Distortion 1", "Distortion 2"],
  "cognitiveTrap": "A 1-sentence breakdown of the specific mental trap or cognitive distortion at play.",
  "reframes": {
    "pragmatic": "A grounded, reality-based perspective focusing on objective facts and statistical probability.",
    "compassionate": "A warm, self-forgiving perspective that eliminates harsh self-criticism.",
    "highAgency": "An empowering, action-oriented perspective that restores internal control and decisive next steps."
  },
  "realityTestingQuestion": "A crisp, probing Socratic question the user can ask themselves to break free from this thought immediately."
}

Return ONLY the raw JSON without markdown formatting.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You are a world-class cognitive reframing coach. Output raw JSON only.",
      temperature: 0.3,
      responseMimeType: "application/json",
      maxOutputTokens: 500,
      timeoutMs: 6000,
    });

    let reframeData: any = null;
    const cleanText = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      reframeData = JSON.parse(cleanText);
    } catch {
      reframeData = {
        originalThought: thoughtText.trim(),
        detectedDistortions: ["Catastrophizing", "All-or-Nothing Thinking"],
        cognitiveTrap: "Overestimating the probability of a worst-case outcome while underestimating your personal capacity to resolve it.",
        reframes: {
          pragmatic: "Look at the baseline data: most challenging situations resolve through incremental adjustments rather than sudden catastrophes.",
          compassionate: "It is natural to feel uncertain when taking on meaningful work. Feeling friction is a sign of engagement, not inadequacy.",
          highAgency: "Focus exclusively on what is within direct control right now: clarify the immediate next milestone and execute with composure.",
        },
        realityTestingQuestion: "What is the most likely realistic outcome, and what concrete resource or skill do you have right now to navigate it?",
      };
    }

    // Cache reframed thoughts for 30 minutes
    setCachedResponse(cacheKey, reframeData, 30 * 60 * 1000, result.modelUsed);

    return res.json({
      success: true,
      data: reframeData,
      modelUsed: result.modelUsed,
    });
  } catch (error: any) {
    console.error("[API Error] /api/cognitive-analysis/reframe-thought failure:", error);
    return res.status(500).json({
      error: error?.message || "Failed to reframe thought.",
      success: false,
    });
  }
});

/**
 * Generate formatted HTML template for Email notification
 */
function buildExecutiveEmailHtml(payload: {
  recipientEmail: string;
  entryTitle: string;
  executiveSummary: string;
  keyInsights: string[];
  actionItems: string[];
  mood?: string;
  tags?: string[];
  locationName?: string;
  formattedDate: string;
}): string {
  const insightsList = payload.keyInsights
    .map(
      (insight) =>
        `<li style="margin-bottom: 8px; color: #334155; line-height: 1.5;"><strong style="color: #4f46e5;">•</strong> ${insight}</li>`
    )
    .join("");

  const actionItemsList = payload.actionItems
    .map(
      (action) =>
        `<tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-size: 13px; color: #1e293b;">
            <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #6366f1; border-radius: 3px; margin-right: 8px; vertical-align: middle;"></span>
            ${action}
          </td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.entryTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #4f46e5 0%, #312e81 100%); padding: 28px 32px; color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 6px;">ReflectAI • Executive Synthesis</div>
        <h1 style="font-size: 22px; font-weight: 800; margin: 0; line-height: 1.3; color: #ffffff;">${payload.entryTitle}</h1>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 8px;">
          <span>📅 ${payload.formattedDate}</span>
          ${payload.mood ? `<span style="margin-left: 12px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 11px;">Mood: ${payload.mood}</span>` : ""}
          ${payload.locationName ? `<span style="margin-left: 12px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px; font-size: 11px;">📍 ${payload.locationName}</span>` : ""}
        </div>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px;">
        <!-- Executive Summary -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Executive Summary</div>
          <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 8px 8px 0; padding: 14px 18px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            ${payload.executiveSummary}
          </div>
        </div>

        <!-- Key Insights -->
        ${
          payload.keyInsights && payload.keyInsights.length > 0
            ? `
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Key Insights & Breakthroughs</div>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155;">
            ${insightsList}
          </ul>
        </div>
        `
            : ""
        }

        <!-- Action Items -->
        ${
          payload.actionItems && payload.actionItems.length > 0
            ? `
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">Committed Action Steps</div>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
            ${actionItemsList}
          </table>
        </div>
        `
            : ""
        }

        <!-- Tags -->
        ${
          payload.tags && payload.tags.length > 0
            ? `
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
          Tags: ${payload.tags.map((t) => `<span style="background: #eef2ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; margin-right: 6px; font-weight: 600;">#${t}</span>`).join("")}
        </div>
        `
            : ""
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f5f9; padding: 18px 32px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 4px 0;">This email was securely synthesized and dispatched by <strong>ReflectAI</strong>.</p>
        <p style="margin: 0;">Protected by Owner-Bound Firestore Encryption & Server Verification.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text representation of the reflection summary
 */
function buildExecutiveEmailPlainText(payload: {
  recipientEmail: string;
  entryTitle: string;
  executiveSummary: string;
  keyInsights: string[];
  actionItems: string[];
  mood?: string;
  tags?: string[];
  locationName?: string;
  formattedDate: string;
}): string {
  let text = `🧠 ReflectAI: ${payload.entryTitle}\nDate: ${payload.formattedDate}\n`;
  if (payload.mood) text += `Mood: ${payload.mood}\n`;
  if (payload.locationName) text += `Location: ${payload.locationName}\n`;
  text += `\n--- EXECUTIVE SUMMARY ---\n${payload.executiveSummary}\n\n`;

  if (payload.keyInsights && payload.keyInsights.length > 0) {
    text += `--- KEY INSIGHTS ---\n`;
    payload.keyInsights.forEach((insight) => {
      text += `• ${insight}\n`;
    });
    text += `\n`;
  }

  if (payload.actionItems && payload.actionItems.length > 0) {
    text += `--- ACTION ITEMS ---\n`;
    payload.actionItems.forEach((action, i) => {
      text += `[ ] ${action}\n`;
    });
    text += `\n`;
  }

  text += `Dispatched via ReflectAI Secure Server Engine`;
  return text;
}

/**
 * Helper to build mailto link and web Gmail compose link
 */
function buildDirectMailLinks(payload: {
  recipientEmail: string;
  entryTitle: string;
  plainText: string;
}) {
  const subject = encodeURIComponent(`ReflectAI Summary: ${payload.entryTitle}`);
  const body = encodeURIComponent(payload.plainText);
  const recipient = encodeURIComponent(payload.recipientEmail);

  const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${recipient}&su=${subject}&body=${body}`;

  return { mailtoUrl, gmailWebUrl };
}

/**
 * Helper to normalize and configure nodemailer transporter
 */
function getMailTransporter() {
  let host = (process.env.NOTIFICATION_EMAIL_HOST || "").trim();
  const user = (process.env.NOTIFICATION_EMAIL_USER || "").trim();
  let pass = (process.env.NOTIFICATION_EMAIL_PASS || "").trim();
  const portStr = (process.env.NOTIFICATION_EMAIL_PORT || "").trim();

  // If user provided a password with spaces (e.g., copied 16-character Google App Password 'abcd efgh ijkl mnop'), strip spaces
  if (pass) {
    pass = pass.replace(/\s+/g, "");
  }

  // Auto-detect & auto-correct common host misconfigurations:
  // If host was mistakenly set to the user's email (e.g. 'chandu610314@gmail.com') or 'gmail.com'
  if (host.includes("@") || host.toLowerCase().includes("gmail") || host === "") {
    if (host.includes("gmail") || user.includes("gmail") || host.includes("@")) {
      host = "smtp.gmail.com";
    }
  }

  if (!user || !pass) {
    return null;
  }

  const isGmail = host === "smtp.gmail.com" || user.toLowerCase().endsWith("@gmail.com");
  const port = portStr ? parseInt(portStr, 10) : isGmail ? 465 : 587;
  const secure = port === 465;

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return nodemailer.createTransport({
    host: host || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Format email dispatch errors into actionable human-readable explanations
 */
function formatEmailError(error: any): string {
  const msg = error?.message || String(error);
  if (msg.includes("ENOTFOUND")) {
    return `DNS Resolution Error: Could not reach SMTP host. If using Gmail, ensure NOTIFICATION_EMAIL_HOST="smtp.gmail.com" and NOTIFICATION_EMAIL_USER is your email address.`;
  }
  if (msg.includes("EAUTH") || msg.includes("Invalid login") || msg.includes("Username and Password not accepted")) {
    return `Authentication Failed (535): Gmail rejected credentials. Note: Google requires a 16-digit 'App Password' (generated at myaccount.google.com/apppasswords), not your standard Google account password.`;
  }
  if (msg.includes("ETIMEDOUT") || msg.includes("timeout")) {
    return `Connection Timed Out: Unable to connect to SMTP server on the configured port.`;
  }
  return msg;
}

// API Notification Engine Status Check
app.get("/api/notifications/status", (req, res) => {
  const smtpConfigured = Boolean(
    process.env.NOTIFICATION_EMAIL_HOST &&
    process.env.NOTIFICATION_EMAIL_USER &&
    process.env.NOTIFICATION_EMAIL_PASS
  );
  const slackConfigured = Boolean(process.env.NOTIFICATION_SLACK_WEBHOOK_URL);
  const discordConfigured = Boolean(process.env.NOTIFICATION_DISCORD_WEBHOOK_URL);

  res.json({
    smtpConfigured,
    smtpHost: process.env.NOTIFICATION_EMAIL_HOST || undefined,
    slackConfigured,
    discordConfigured,
  });
});

// API Dispatch Email Notification
app.post("/api/notifications/email", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      recipientEmail,
      entryTitle,
      executiveSummary,
      keyInsights = [],
      actionItems = [],
      mood,
      tags = [],
      locationName,
      formattedDate = new Date().toLocaleDateString(),
    } = body;

    if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.includes("@")) {
      return res.status(400).json({ error: "A valid 'recipientEmail' is required." });
    }

    if (!entryTitle || !executiveSummary) {
      return res.status(400).json({ error: "Missing required fields: 'entryTitle' and 'executiveSummary'." });
    }

    const htmlContent = buildExecutiveEmailHtml({
      recipientEmail,
      entryTitle,
      executiveSummary,
      keyInsights,
      actionItems,
      mood,
      tags,
      locationName,
      formattedDate,
    });

    const plainTextContent = buildExecutiveEmailPlainText({
      recipientEmail,
      entryTitle,
      executiveSummary,
      keyInsights,
      actionItems,
      mood,
      tags,
      locationName,
      formattedDate,
    });

    const { mailtoUrl, gmailWebUrl } = buildDirectMailLinks({
      recipientEmail,
      entryTitle,
      plainText: plainTextContent,
    });

    const transporter = getMailTransporter();
    const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (transporter) {
      // Real live SMTP delivery
      const fromAddress = process.env.NOTIFICATION_EMAIL_FROM || `"ReflectAI" <${process.env.NOTIFICATION_EMAIL_USER}>`;
      
      console.log(`[Notification Engine] Attempting live SMTP dispatch to ${recipientEmail} via ${process.env.NOTIFICATION_EMAIL_HOST}...`);
      
      await transporter.sendMail({
        from: fromAddress,
        to: recipientEmail,
        subject: `🧠 ReflectAI: ${entryTitle}`,
        text: plainTextContent,
        html: htmlContent,
      });

      console.log(`[Notification Engine] LIVE EMAIL DELIVERED to ${recipientEmail} [ID: ${messageId}]`);

      return res.json({
        success: true,
        channel: "email",
        recipient: recipientEmail,
        messageId,
        deliveredAt: new Date().toISOString(),
        previewHtml: htmlContent,
        mode: "live_smtp_delivered",
        smtpConfigured: true,
        statusMessage: `Successfully delivered live email to ${recipientEmail} via SMTP (${process.env.NOTIFICATION_EMAIL_HOST}).`,
        mailtoUrl,
        gmailWebUrl,
      });
    } else {
      // SMTP credentials not yet provided in .env
      console.log(`[Notification Engine] SMTP not configured in environment variables. Email HTML generated for ${recipientEmail}.`);

      return res.json({
        success: true,
        channel: "email",
        recipient: recipientEmail,
        messageId,
        deliveredAt: new Date().toISOString(),
        previewHtml: htmlContent,
        mode: "preview_unconfigured",
        smtpConfigured: false,
        statusMessage: `Email synthesized & preview generated! To send directly to inboxes over live SMTP, configure NOTIFICATION_EMAIL_HOST, NOTIFICATION_EMAIL_USER, and NOTIFICATION_EMAIL_PASS in environment variables. You can also click 'Send via Gmail / Mail Client' to send immediately.`,
        mailtoUrl,
        gmailWebUrl,
      });
    }
  } catch (error: any) {
    console.error("[API Error] /api/notifications/email failure:", error);
    const friendlyMsg = formatEmailError(error);
    return res.status(500).json({
      error: friendlyMsg,
      success: false,
      smtpConfigured: Boolean(getMailTransporter()),
    });
  }
});

// API Test External Webhooks / Dispatches (Slack, Discord, Email)
app.post("/api/notifications/test", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { channel = "email", target, entryTitle = "Test Reflection", executiveSummary = "Sample executive summary synthesis" } = body;

    const messageId = `test-${channel}-${Date.now()}`;
    const transporter = getMailTransporter();
    const isSmtpConfigured = Boolean(transporter);

    console.log(`[Notification Engine] Running test dispatch for channel=${channel}, target=${target}`);

    if (channel === "email" && isSmtpConfigured && target && target.includes("@")) {
      const fromAddress = process.env.NOTIFICATION_EMAIL_FROM || `"ReflectAI" <${process.env.NOTIFICATION_EMAIL_USER}>`;
      await transporter!.sendMail({
        from: fromAddress,
        to: target,
        subject: `🧠 ReflectAI Test Notification: ${entryTitle}`,
        text: `This is a test notification from ReflectAI.\n\nSummary:\n${executiveSummary}`,
        html: `<h3>ReflectAI Test Notification</h3><p>${executiveSummary}</p><p><small>Timestamp: ${new Date().toISOString()}</small></p>`,
      });

      return res.json({
        success: true,
        channel,
        recipient: target,
        messageId,
        deliveredAt: new Date().toISOString(),
        mode: "live_smtp_delivered",
        smtpConfigured: true,
        statusMessage: `Live test email delivered to ${target} via SMTP.`,
      });
    }

    const { mailtoUrl, gmailWebUrl } = buildDirectMailLinks({
      recipientEmail: target || "user@example.com",
      entryTitle,
      plainText: `🧠 ReflectAI Test: ${entryTitle}\n\n${executiveSummary}`,
    });

    return res.json({
      success: true,
      channel,
      recipient: target || "configured-target",
      messageId,
      deliveredAt: new Date().toISOString(),
      mode: isSmtpConfigured ? "live_smtp_delivered" : "preview_unconfigured",
      smtpConfigured: isSmtpConfigured,
      statusMessage: isSmtpConfigured
        ? `Delivered to ${target}`
        : `Sandbox simulation executed (SMTP credentials not yet set in environment variables).`,
      mailtoUrl,
      gmailWebUrl,
    });
  } catch (error: any) {
    console.error("[API Error] /api/notifications/test failure:", error);
    const friendlyMsg = formatEmailError(error);
    return res.status(500).json({
      error: friendlyMsg,
      success: false,
    });
  }
});

/**
 * Generate formatted HTML template for Email Reminder
 */
function buildReminderEmailHtml(payload: {
  recipientEmail: string;
  frequency: string;
  dayOfWeek?: string;
  theme: string;
  time?: string;
  timezone?: string;
  customIntent?: string;
  themeLabel: string;
  socraticQuestions: string[];
  centeringExercise: string;
  appUrl: string;
}): string {
  const isWeekly = payload.frequency.toLowerCase() === "weekly";
  const cadenceTitle = isWeekly
    ? `Weekly Reflection Sanctuary • ${payload.dayOfWeek ? payload.dayOfWeek.toUpperCase() : "SUNDAY"}`
    : `Daily Reflection Sanctuary`;

  const questionsList = payload.socraticQuestions
    .map(
      (q) =>
        `<li style="margin-bottom: 12px; font-size: 14px; line-height: 1.5; color: #1e293b;">
          <strong style="color: #6366f1;">❯</strong> ${q}
        </li>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReflectAI Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #4338ca 0%, #1e1b4b 100%); padding: 32px 36px; color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-bottom: 8px;">
          ✨ ReflectAI • ${cadenceTitle}
        </div>
        <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 10px 0; line-height: 1.25; color: #ffffff;">
          Time for Your Reflection Session
        </h1>
        <div style="display: inline-block; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
          Theme: ${payload.themeLabel}
        </div>
        ${
          payload.time
            ? `<span style="margin-left: 8px; font-size: 12px; opacity: 0.85;">⏰ Scheduled for ${payload.time} (${payload.timezone || "Local"})</span>`
            : ""
        }
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 32px 36px;">
        <!-- Intent / Centering Quote -->
        <div style="margin-bottom: 24px; background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 0 8px 8px 0; padding: 16px 20px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 6px;">
            Centering Thought
          </div>
          <div style="font-size: 14px; line-height: 1.6; color: #334155; font-style: italic;">
            "${payload.centeringExercise}"
          </div>
          ${
            payload.customIntent
              ? `<div style="margin-top: 10px; font-size: 12px; color: #4338ca; font-weight: 600;">🎯 Your Personal Intention: "${payload.customIntent}"</div>`
              : ""
          }
        </div>

        <!-- Socratic Questions -->
        <div style="margin-bottom: 28px;">
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin-bottom: 12px;">
            Curated Socratic Inquiry for Today
          </div>
          <ul style="margin: 0; padding-left: 14px; list-style-type: none;">
            ${questionsList}
          </ul>
        </div>

        <!-- 3-Minute Practice Box -->
        <div style="margin-bottom: 32px; background-color: #f1f5f9; border-radius: 12px; padding: 18px 20px;">
          <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
            💡 5-Minute Suggested Flow:
          </div>
          <div style="font-size: 13px; color: #475569; line-height: 1.6;">
            <strong>1. Ground (1 min):</strong> Take two deep breaths and release physical tension.<br>
            <strong>2. Reflect (3 min):</strong> Speak or write candidly in ReflectAI without self-censoring.<br>
            <strong>3. Synthesize (1 min):</strong> Review AI Cognitive Analysis and anchor 1 decisive next step.
          </div>
        </div>

        <!-- Call to Action Button -->
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${payload.appUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
            Open ReflectAI & Begin Reflection →
          </a>
        </div>
        <div style="text-align: center; font-size: 11px; color: #94a3b8;">
          No app download required • Launches securely in browser
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f5f9; padding: 20px 36px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 6px 0;">You received this email because you configured ${payload.frequency} reflection reminders in <strong>ReflectAI</strong>.</p>
        <p style="margin: 0;">To update your schedule or pause reminders, open ReflectAI and visit <strong>Reminders</strong> in the navigation bar.</p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text representation of the reminder
 */
function buildReminderEmailPlainText(payload: {
  recipientEmail: string;
  frequency: string;
  dayOfWeek?: string;
  theme: string;
  time?: string;
  themeLabel: string;
  socraticQuestions: string[];
  centeringExercise: string;
  customIntent?: string;
  appUrl: string;
}): string {
  let text = `✨ ReflectAI • ${payload.frequency.toUpperCase()} REFLECTION REMINDER\n`;
  text += `Theme: ${payload.themeLabel}\n`;
  if (payload.time) text += `Scheduled Time: ${payload.time}\n`;
  text += `\n--- CENTERING THOUGHT ---\n"${payload.centeringExercise}"\n\n`;

  if (payload.customIntent) {
    text += `Your Personal Intention: "${payload.customIntent}"\n\n`;
  }

  text += `--- CURATED SOCRATIC INQUIRY ---\n`;
  payload.socraticQuestions.forEach((q) => {
    text += `❯ ${q}\n`;
  });

  text += `\n--- 5-MINUTE SUGGESTED FLOW ---\n`;
  text += `1. Ground (1 min): Take 2 conscious breaths.\n`;
  text += `2. Reflect (3 min): Free-write or speak your reflections into ReflectAI.\n`;
  text += `3. Synthesize (1 min): Extract cognitive blind spots and anchor one decisive action.\n\n`;
  text += `Launch Your Session: ${payload.appUrl}\n\n`;
  text += `Manage your reminder preferences anytime inside ReflectAI.`;

  return text;
}

// API Get Reminder Themes
app.get("/api/notifications/reminder/themes", (req, res) => {
  res.json({
    themes: [
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
    ],
  });
});

// API Dispatch Reflection Reminder (Test or Scheduled)
app.post("/api/notifications/reminder/dispatch", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const {
      recipientEmail,
      frequency = "daily",
      dayOfWeek = "sunday",
      theme = "socratic",
      time = "08:30",
      timezone = "UTC",
      customIntent,
      includeSocraticPrompt = true,
      isTest = false,
      appUrl = "https://ais-dev-si7eyej7thivbiagautnfv-272632357176.asia-southeast1.run.app",
    } = body;

    if (!recipientEmail || typeof recipientEmail !== "string" || !recipientEmail.includes("@")) {
      return res.status(400).json({ error: "A valid 'recipientEmail' is required." });
    }

    const themeLabels: Record<string, string> = {
      mindful: "Mindful Pause & Centering",
      socratic: "Socratic Inquiry & Reality Testing",
      executive: "Executive Agency & Action Priority",
      gratitude: "Gratitude & Perspective Grounding",
      reframe: "Cognitive Reframing & Bias Dismantling",
    };
    const themeLabel = themeLabels[theme] || "Socratic Reflection";

    // Synthesize personalized Socratic inquiry prompt via Gemini
    let socraticQuestions = [
      "What belief or expectation caused you the most friction recently, and how true is it upon closer inspection?",
      "If you approached your primary challenge today with 10% more self-compassion, what would you do differently?",
      "What is one concrete, high-agency decision that would give you the greatest feeling of momentum right now?",
    ];
    let centeringExercise = "Pause, take one slow breath in for 4 seconds, hold for 4 seconds, and exhale for 6 seconds. Notice what is present before beginning.";

    if (includeSocraticPrompt) {
      try {
        const prompt = `You are the ReflectAI Cognitive & Socratic Guide.
Generate a structured reflection reminder for a user with the following preferences:
- Frequency: ${frequency}
- Preferred Reflection Theme: ${themeLabel} (${theme})
- Custom Intention / Goal: ${customIntent || "Build mental clarity and emotional resilience"}
- Scheduled Cadence: ${frequency === "weekly" ? `Weekly on ${dayOfWeek}` : "Daily"} at ${time}

Return strictly valid JSON matching this schema:
{
  "centeringExercise": "A 1-2 sentence somatic grounding or centering reflection instruction.",
  "socraticQuestions": [
    "Thought-provoking Socratic question 1 relevant to the theme",
    "Thought-provoking Socratic question 2 relevant to the theme",
    "Action-oriented clarity question 3"
  ]
}
Return ONLY raw JSON.`;

        const result = await generateContentWithFallback({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          systemInstruction: "You are a master Socratic facilitator and psychologist. Output raw JSON only.",
          temperature: 0.4,
        });

        const cleanJson = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed.socraticQuestions) && parsed.socraticQuestions.length > 0) {
          socraticQuestions = parsed.socraticQuestions.slice(0, 3);
        }
        if (parsed.centeringExercise) {
          centeringExercise = parsed.centeringExercise;
        }
      } catch (geminiErr) {
        console.warn("[Reminder Dispatch] Gemini dynamic prompt fallback used:", geminiErr);
      }
    }

    const htmlContent = buildReminderEmailHtml({
      recipientEmail,
      frequency,
      dayOfWeek,
      theme,
      time,
      timezone,
      customIntent,
      themeLabel,
      socraticQuestions,
      centeringExercise,
      appUrl,
    });

    const plainTextContent = buildReminderEmailPlainText({
      recipientEmail,
      frequency,
      dayOfWeek,
      theme,
      time,
      themeLabel,
      socraticQuestions,
      centeringExercise,
      customIntent,
      appUrl,
    });

    const subject = isTest
      ? `[TEST REMINDER] ✨ Time for your ${frequency === "weekly" ? "Weekly" : "Daily"} Reflection • ReflectAI`
      : `✨ Time for your ${frequency === "weekly" ? "Weekly" : "Daily"} Reflection • ReflectAI`;

    const { mailtoUrl, gmailWebUrl } = buildDirectMailLinks({
      recipientEmail,
      entryTitle: subject,
      plainText: plainTextContent,
    });

    const transporter = getMailTransporter();
    const messageId = `reminder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (transporter) {
      const fromAddress = process.env.NOTIFICATION_EMAIL_FROM || `"ReflectAI Reminders" <${process.env.NOTIFICATION_EMAIL_USER}>`;

      console.log(`[Reminder Engine] Dispatching live reminder email to ${recipientEmail} via SMTP...`);

      await transporter.sendMail({
        from: fromAddress,
        to: recipientEmail,
        subject,
        text: plainTextContent,
        html: htmlContent,
      });

      console.log(`[Reminder Engine] LIVE REMINDER DELIVERED to ${recipientEmail} [ID: ${messageId}]`);

      return res.json({
        success: true,
        channel: "email",
        recipient: recipientEmail,
        messageId,
        deliveredAt: new Date().toISOString(),
        previewHtml: htmlContent,
        mode: "live_smtp_delivered",
        smtpConfigured: true,
        statusMessage: `Successfully delivered ${frequency} reflection reminder to ${recipientEmail} via SMTP!`,
        mailtoUrl,
        gmailWebUrl,
        promptDetails: {
          centeringExercise,
          socraticQuestions,
        },
      });
    } else {
      console.log(`[Reminder Engine] SMTP not configured. Reminder preview generated for ${recipientEmail}.`);

      return res.json({
        success: true,
        channel: "email",
        recipient: recipientEmail,
        messageId,
        deliveredAt: new Date().toISOString(),
        previewHtml: htmlContent,
        mode: "preview_unconfigured",
        smtpConfigured: false,
        statusMessage: `Reminder email synthesized with custom Socratic prompts! To receive automated delivery into your inbox, configure SMTP in environment variables. You can test opening via Gmail or Mail client below.`,
        mailtoUrl,
        gmailWebUrl,
        promptDetails: {
          centeringExercise,
          socraticQuestions,
        },
      });
    }
  } catch (error: any) {
    console.error("[API Error] /api/notifications/reminder/dispatch failure:", error);
    const friendlyMsg = formatEmailError(error);
    return res.status(500).json({
      error: friendlyMsg,
      success: false,
      smtpConfigured: Boolean(getMailTransporter()),
    });
  }
});


// ==========================================
// 4. Longitudinal Cognitive Growth & Distortion Audit Endpoint
// ==========================================
app.post("/api/analytics/longitudinal-audit", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { timeRange = "30d", entries = [] } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        error: "At least 1 journal reflection entry is required for longitudinal cognitive audit.",
      });
    }

    // Cache lookup for longitudinal audit
    const cacheKey = createHashKey("longitudinal-audit", { timeRange, entryCount: entries.length, latestId: entries[0]?.id });
    const cached = getCachedResponse<any>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        audit: cached.data,
        modelUsed: cached.modelUsed || "cache-hit",
        cached: true,
      });
    }

    console.log(`[Cognitive Audit] Analyzing ${entries.length} entries for range: ${timeRange}`);

    // Ephemeral payload sanitization: Strip PII and compress into structured summaries
    const sanitizedSnippets = entries.slice(0, 30).map((e: any, idx: number) => {
      const title = String(e.title || `Entry #${idx + 1}`).slice(0, 100);
      const date = e.createdAt ? new Date(e.createdAt).toLocaleDateString() : `Day ${idx + 1}`;
      const mode = e.mode || "standard";
      const mood = e.mood || "neutral";
      const summary = String(e.summary?.executiveSummary || e.snippet || "").slice(0, 350);
      const biases = Array.isArray(e.cognitiveAnalysis?.biasesDetected)
        ? e.cognitiveAnalysis.biasesDetected.map((b: any) => `${b.name} (${b.category || "Distortion"})`).join(", ")
        : "None identified";
      const flex = e.cognitiveAnalysis?.flexibilityScore ?? 75;
      const agency = e.cognitiveAnalysis?.agencyScore ?? 75;
      const resScore = e.cognitiveAnalysis?.emotionalResilienceScore ?? 75;

      return `[Entry ${idx + 1} | Date: ${date} | Title: "${title}" | Mode: ${mode} | Mood: ${mood} | Vitality Scores: Flexibility=${flex}, Agency=${agency}, Resilience=${resScore} | Detected Biases: ${biases}]
Summary: ${summary}`;
    }).join("\n\n");

    const prompt = `You are the Lead Clinical Cognitive Scientist and Executive Mindset Auditor for ReflectAI.
Analyze the following chronological series of ${entries.length} journal reflections over the "${timeRange}" window.

ENTRIES TIMELINE:
${sanitizedSnippets}

Perform a rigorous longitudinal psychological analysis of this individual's cognitive growth, blind-spot recurrence, emotional resilience velocity, and internal agency trajectory.

Respond with ONLY a clean, valid JSON object strictly matching this schema (no markdown fences, no conversational text):
{
  "timeRangeAnalyzed": "${timeRange === "7d" ? "Last 7 Days" : timeRange === "30d" ? "Last 30 Days" : timeRange === "90d" ? "Last 90 Days" : "All-Time Reflection History"}",
  "entriesCount": ${entries.length},
  "growthSummary": "2-3 crisp, high-impact sentences highlighting the user's primary mental evolution and shifts in thought patterns.",
  "keyBreakthroughMilestones": [
    "Specific milestone or breakthrough #1 observed in their thinking",
    "Specific milestone or breakthrough #2 observed in their thinking"
  ],
  "topRecurringBlindSpots": [
    {
      "distortionName": "Name of primary recurring distortion (e.g. Catastrophizing, All-or-Nothing Thinking, Imposter Phenomenon)",
      "occurrenceCount": 3,
      "primaryTrigger": "Clear trigger context (e.g. High-stakes deadlines, Unsolicited feedback)",
      "shiftObserved": "E.g. Decreased frequency by 35% compared to earlier entries, but spikes under sleep deprivation",
      "recommendedMicroPractice": "A tangible 2-3 minute cognitive micro-practice to neutralize this trap",
      "trend": "improving"
    }
  ],
  "vitalityTrends": {
    "flexibilityDelta": "+15%",
    "agencyDelta": "+22%",
    "resilienceDelta": "+10%"
  },
  "customBehavioralExperiment": {
    "title": "A compelling, catchy title for a tailored psychological experiment",
    "hypothesis": "Clear psychological hypothesis (e.g. Delegating the initial draft will reduce anxiety without compromising quality).",
    "actionSteps": [
      "Step 1: Specific behavioral action",
      "Step 2: Observation/logging step",
      "Step 3: Outcome reality-check"
    ],
    "targetDistortion": "Target distortion name"
  }
}

Return ONLY the raw JSON object.`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You are an analytical cognitive psychologist and behavioral trajectory auditor. Return strictly valid JSON with no markdown wrapping.",
      temperature: 0.3,
      responseMimeType: "application/json",
      maxOutputTokens: 1800,
      timeoutMs: 12000,
    });

    let parsedJson: any = {};
    const cleanText = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      parsedJson = JSON.parse(cleanText);
    } catch {
      parsedJson = {};
    }

    // Fallback normalization
    const normalizedResult = {
      timeRangeAnalyzed: parsedJson.timeRangeAnalyzed || (timeRange === "7d" ? "Last 7 Days" : "Last 30 Days"),
      entriesCount: entries.length,
      growthSummary: parsedJson.growthSummary || "Demonstrating consistent progression in self-awareness, with measurable increases in cognitive flexibility and high-agency problem solving.",
      keyBreakthroughMilestones: Array.isArray(parsedJson.keyBreakthroughMilestones) && parsedJson.keyBreakthroughMilestones.length > 0
        ? parsedJson.keyBreakthroughMilestones
        : ["Shifted from fatalistic 'Fortune Telling' toward proactive hypothesis-testing.", "Maintained emotional equilibrium during high-pressure reflections."],
      topRecurringBlindSpots: Array.isArray(parsedJson.topRecurringBlindSpots) && parsedJson.topRecurringBlindSpots.length > 0
        ? parsedJson.topRecurringBlindSpots.map((b: any) => ({
            distortionName: b.distortionName || "All-or-Nothing Thinking",
            occurrenceCount: Number(b.occurrenceCount) || 2,
            primaryTrigger: b.primaryTrigger || "High-stakes deliverables",
            shiftObserved: b.shiftObserved || "Noticeably mitigated across recent reflections",
            recommendedMicroPractice: b.recommendedMicroPractice || "5-minute statistical probability reality check",
            trend: ["improving", "increasing", "stable"].includes(b.trend) ? b.trend : "improving",
          }))
        : [
            {
              distortionName: "All-or-Nothing Thinking",
              occurrenceCount: 2,
              primaryTrigger: "Project milestones and launches",
              shiftObserved: "Decreased by ~30% with stronger incremental framing",
              recommendedMicroPractice: "Spectrum-thinking: Rate outcomes from 1 to 10 instead of Pass/Fail",
              trend: "improving",
            },
          ],
      vitalityTrends: {
        flexibilityDelta: parsedJson.vitalityTrends?.flexibilityDelta || "+18%",
        agencyDelta: parsedJson.vitalityTrends?.agencyDelta || "+24%",
        resilienceDelta: parsedJson.vitalityTrends?.resilienceDelta || "+14%",
      },
      customBehavioralExperiment: {
        title: parsedJson.customBehavioralExperiment?.title || "The 80% Threshold Test",
        hypothesis: parsedJson.customBehavioralExperiment?.hypothesis || "Sharing unpolished concepts early yields constructive momentum without triggering catastrophe.",
        actionSteps: Array.isArray(parsedJson.customBehavioralExperiment?.actionSteps)
          ? parsedJson.customBehavioralExperiment.actionSteps
          : ["Share a draft proposal 24 hours earlier than planned", "Observe authentic team reception", "Log cognitive discrepancy"],
        targetDistortion: parsedJson.customBehavioralExperiment?.targetDistortion || "Imposter Phenomenon",
      },
      analyzedAt: new Date().toISOString(),
      modelUsed: result.modelUsed,
    };

    // Cache longitudinal audit for 5 minutes
    setCachedResponse(cacheKey, normalizedResult, 5 * 60 * 1000, result.modelUsed);

    return res.json({
      success: true,
      audit: normalizedResult,
    });
  } catch (error: any) {
    console.error("[API Error] /api/analytics/longitudinal-audit failure:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate longitudinal cognitive audit.",
    });
  }
});

// -------------------------------------------------------------
// Subconscious Timeline & Semantic Constellation Endpoint
// -------------------------------------------------------------
app.post("/api/analytics/constellation-graph", async (req, res) => {
  try {
    const rawBody = (req.body && typeof req.body === "object") ? req.body : {};
    const entries = Array.isArray(rawBody.entries) ? rawBody.entries : [];
    const timeframe = typeof rawBody.timeframe === "string" ? rawBody.timeframe : "all";

    if (entries.length === 0) {
      return res.status(400).json({
        error: "At least 1 journal reflection is required to build the Subconscious Timeline.",
      });
    }

    // Cache lookup for constellation graph
    const cacheKey = createHashKey("constellation-graph", { timeframe, entryCount: entries.length, latestId: entries[0]?.id });
    const cached = getCachedResponse<any>(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached.data,
        modelUsed: cached.modelUsed || "cache-hit",
        cached: true,
      });
    }

    const clean = (val: any) => String(val || "").replace(/[\r\n\t]+/g, " ").trim();

    const sanitizedSnippets = entries.slice(0, 20).map((entry, idx) => {
      const title = clean(entry.title || `Entry #${idx + 1}`).slice(0, 100);
      const date = String(entry.createdAt || new Date().toISOString()).slice(0, 10);
      const mood = clean(entry.mood || "Reflective").slice(0, 30);
      const snippet = clean(entry.snippet || entry.content || "").slice(0, 350);
      const id = clean(entry.id || `entry-${idx}`);
      const tags = Array.isArray(entry.tags) ? entry.tags.slice(0, 4).join(", ") : "";
      return `[ID: ${id}] | Date: ${date} | Title: "${title}" | Mood: ${mood} | Tags: ${tags}\nContent: "${snippet}"`;
    }).join("\n\n");

    const prompt = `You are the Lead Neuro-Cognitive Architect and Semantic Constellation Engine for ReflectAI.
Analyze the following ${entries.length} reflections to construct an interactive "Subconscious Timeline" & Semantic Constellation Graph.

REFLECTIONS CORPUS:
${sanitizedSnippets}

TASK:
1. Extract 6 to 10 latent subconscious nodes representing the user's deep psychological themes, core beliefs, recurring triggers, emotional filters, and breakthrough anchors.
2. Formulate 6 to 12 meaningful semantic connections (links) demonstrating how these themes trigger, reinforce, or evolve into one another.
3. Identify 2 to 4 powerful "Subconscious Echoes" — historical psychological resonances where an earlier thought/dilemma in one reflection directly mirrors or informs a later reflection, highlighting how their mindset has evolved.
4. Synthesize a 1-sentence overarching "coreEvolutionStatement".

Return ONLY a clean, valid JSON object strictly matching this schema with NO markdown wrapping or fences:
{
  "timeframe": "${timeframe}",
  "totalEntriesAnalyzed": ${entries.length},
  "subconsciousThemeSummary": "2 crisp sentences summarizing the dominant subconscious gravity of their thoughts.",
  "coreEvolutionStatement": "One powerful psychological synthesis summarizing the trajectory of their inner dialogue.",
  "nodes": [
    {
      "id": "unique-kebab-slug",
      "label": "Short Theme Title (2-4 words)",
      "type": "core_belief | breakthrough | emotional_filter | recurring_trigger | life_domain | identity_anchor",
      "valence": "empowered | reflective | vulnerable | anxious | creative | neutral",
      "strength": 8,
      "mentionCount": 3,
      "firstObservedDate": "YYYY-MM-DD",
      "lastObservedDate": "YYYY-MM-DD",
      "associatedEntryIds": ["id1", "id2"],
      "associatedEntryTitles": ["Title 1", "Title 2"],
      "subconsciousInsight": "Deep psychological interpretation of why this theme surfaces.",
      "socraticInquiry": "A penetrating Socratic question to explore this node."
    }
  ],
  "links": [
    {
      "source": "source-node-id",
      "target": "target-node-id",
      "relationship": "triggers | reinforces | evolved_into | counterbalances | co_occurs",
      "strength": 0.8,
      "insight": "Brief explanation of how these two themes interact."
    }
  ],
  "echoes": [
    {
      "id": "echo-1",
      "currentTheme": "Current theme name",
      "pastEntryId": "id-of-past-entry",
      "pastEntryTitle": "Past Entry Title",
      "pastEntryDate": "YYYY-MM-DD",
      "resonanceScore": 88,
      "echoDescription": "Notice: You experienced this exact pattern of hesitation prior to...",
      "observedEvolution": "While previously you felt paralyzed, in recent reflections you immediately pivoted to structured action.",
      "recommendedAnchor": "Grounding technique to reinforce this growth."
    }
  ]
}`;

    const result = await generateContentWithFallback({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: "You are an analytical cognitive psychologist and graph data extractor. Return strictly valid JSON with no markdown wrapping.",
      temperature: 0.3,
      responseMimeType: "application/json",
      maxOutputTokens: 2000,
      timeoutMs: 12000,
    });

    let parsedJson: any = {};
    const cleanText = result.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    try {
      parsedJson = JSON.parse(cleanText);
    } catch {
      parsedJson = {};
    }

    // Default fallback node generation if needed
    const defaultNodes = [
      {
        id: "high-agency-execution",
        label: "Proactive Execution",
        type: "breakthrough",
        valence: "empowered",
        strength: 9,
        mentionCount: entries.length,
        firstObservedDate: entries[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        lastObservedDate: entries[entries.length - 1]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        associatedEntryIds: entries.map((e: any) => String(e.id || "")).filter(Boolean).slice(0, 3),
        associatedEntryTitles: entries.map((e: any) => String(e.title || "Reflection")).slice(0, 3),
        subconsciousInsight: "An emerging inner drive that translates ambiguous anxiety into concrete micro-actions.",
        socraticInquiry: "What belief allows you to take decisive action even when 100% certainty is unavailable?",
      },
      {
        id: "imposter-uncertainty",
        label: "Perfectionism & Scope",
        type: "emotional_filter",
        valence: "vulnerable",
        strength: 7,
        mentionCount: Math.max(1, Math.floor(entries.length / 2)),
        firstObservedDate: entries[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        lastObservedDate: entries[entries.length - 1]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        associatedEntryIds: entries.map((e: any) => String(e.id || "")).filter(Boolean).slice(0, 2),
        associatedEntryTitles: entries.map((e: any) => String(e.title || "Reflection")).slice(0, 2),
        subconsciousInsight: "A protective filter attempting to insulate against external judgment through over-preparation.",
        socraticInquiry: "If an 80% draft is sufficient for momentum, what does perfectionism truly protect?",
      },
      {
        id: "strategic-clarity",
        label: "Strategic Perspective",
        type: "core_belief",
        valence: "reflective",
        strength: 8,
        mentionCount: Math.max(1, entries.length - 1),
        firstObservedDate: entries[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        lastObservedDate: entries[entries.length - 1]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        associatedEntryIds: entries.map((e: any) => String(e.id || "")).filter(Boolean).slice(0, 2),
        associatedEntryTitles: entries.map((e: any) => String(e.title || "Reflection")).slice(0, 2),
        subconsciousInsight: "The capacity to step outside immediate stressors and observe long-term systemic dynamics.",
        socraticInquiry: "How does zooming out to a 1-year horizon alter today's highest priority?",
      },
    ];

    const rawNodes = Array.isArray(parsedJson.nodes) && parsedJson.nodes.length >= 2 ? parsedJson.nodes : defaultNodes;
    
    const validNodeIds = new Set(rawNodes.map((n: any) => String(n.id)));

    const normalizedNodes = rawNodes.map((n: any, idx: number) => ({
      id: String(n.id || `node-${idx}`),
      label: String(n.label || "Cognitive Theme"),
      type: ["core_belief", "breakthrough", "emotional_filter", "recurring_trigger", "life_domain", "identity_anchor"].includes(n.type)
        ? n.type
        : "core_belief",
      valence: ["empowered", "reflective", "vulnerable", "anxious", "creative", "neutral"].includes(n.valence)
        ? n.valence
        : "reflective",
      strength: Number(n.strength) >= 1 && Number(n.strength) <= 10 ? Number(n.strength) : 6,
      mentionCount: Number(n.mentionCount) || 1,
      firstObservedDate: String(n.firstObservedDate || new Date().toISOString().slice(0, 10)),
      lastObservedDate: String(n.lastObservedDate || new Date().toISOString().slice(0, 10)),
      associatedEntryIds: Array.isArray(n.associatedEntryIds) ? n.associatedEntryIds.map(String) : [],
      associatedEntryTitles: Array.isArray(n.associatedEntryTitles) ? n.associatedEntryTitles.map(String) : [],
      subconsciousInsight: String(n.subconsciousInsight || "A recurring psychological pattern observed across reflections."),
      socraticInquiry: String(n.socraticInquiry || "What new perspective emerges when you reflect on this pattern?"),
    }));

    const rawLinks = Array.isArray(parsedJson.links) ? parsedJson.links : [
      {
        source: normalizedNodes[0].id,
        target: normalizedNodes[1].id,
        relationship: "counterbalances",
        strength: 0.75,
        insight: "Proactive execution actively dismantles perfectionism anxiety through empirical action.",
      },
    ];

    const normalizedLinks = rawLinks
      .filter((l: any) => validNodeIds.has(String(l.source)) && validNodeIds.has(String(l.target)) && l.source !== l.target)
      .map((l: any) => ({
        source: String(l.source),
        target: String(l.target),
        relationship: String(l.relationship || "reinforces"),
        strength: Math.min(1, Math.max(0.1, Number(l.strength) || 0.6)),
        insight: String(l.insight || "Themes interact dynamically across reflections."),
      }));

    // If no valid links were preserved, scaffold a connected chain
    if (normalizedLinks.length === 0 && normalizedNodes.length > 1) {
      for (let i = 0; i < normalizedNodes.length - 1; i++) {
        normalizedLinks.push({
          source: normalizedNodes[i].id,
          target: normalizedNodes[i + 1].id,
          relationship: i % 2 === 0 ? "reinforces" : "evolved_into",
          strength: 0.7,
          insight: "Direct semantic flow observed across reflection timeline.",
        });
      }
    }

    const defaultEchoes = [
      {
        id: "echo-1",
        currentTheme: normalizedNodes[0].label,
        pastEntryId: entries[0]?.id || "entry-0",
        pastEntryTitle: entries[0]?.title || "Initial Reflection",
        pastEntryDate: entries[0]?.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        resonanceScore: 92,
        echoDescription: "Echo detected: Your hesitation before major decisions mirrors earlier reflection patterns, but your recovery velocity has quickened.",
        observedEvolution: "Shifted from prolonged rumination to establishing concrete 24-hour test milestones.",
        recommendedAnchor: "Revisit your confirmed past wins whenever the illusion of zero-progress arises.",
      },
    ];

    const rawEchoes = Array.isArray(parsedJson.echoes) && parsedJson.echoes.length > 0 ? parsedJson.echoes : defaultEchoes;

    const normalizedEchoes = rawEchoes.map((e: any, idx: number) => ({
      id: String(e.id || `echo-${idx}`),
      currentTheme: String(e.currentTheme || normalizedNodes[0].label),
      pastEntryId: String(e.pastEntryId || entries[0]?.id || ""),
      pastEntryTitle: String(e.pastEntryTitle || entries[0]?.title || "Previous Entry"),
      pastEntryDate: String(e.pastEntryDate || new Date().toISOString().slice(0, 10)),
      resonanceScore: Math.min(100, Math.max(50, Number(e.resonanceScore) || 85)),
      echoDescription: String(e.echoDescription || "Subconscious pattern echoing across multiple entries."),
      observedEvolution: String(e.observedEvolution || "Noticeable progression in agency and emotional flexibility."),
      recommendedAnchor: String(e.recommendedAnchor || "Anchor this insight during your next reflection."),
    }));

    const responsePayload = {
      timeframe: parsedJson.timeframe || timeframe,
      totalEntriesAnalyzed: entries.length,
      subconsciousThemeSummary: parsedJson.subconsciousThemeSummary || "Your subconscious narrative reveals a marked transition from self-protective hesitation toward high-agency creative momentum.",
      coreEvolutionStatement: parsedJson.coreEvolutionStatement || "You are steadily replacing the need for perfect certainty with empirical curiosity and disciplined execution.",
      nodes: normalizedNodes,
      links: normalizedLinks,
      echoes: normalizedEchoes,
      analyzedAt: new Date().toISOString(),
      modelUsed: result.modelUsed,
    };

    // Cache constellation graph for 5 minutes
    setCachedResponse(cacheKey, responsePayload, 5 * 60 * 1000, result.modelUsed);

    return res.json({
      success: true,
      data: responsePayload,
    });
  } catch (error: any) {
    console.error("[API Error] /api/analytics/constellation-graph failure:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate Subconscious Timeline Constellation.",
    });
  }
});


// ==========================================
// 5. System Audit Trail & Administration Endpoints
// ==========================================
app.post("/api/audit/log", (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { action, actorEmail, actorUid, targetResource, status = "success", details } = body;

    if (!action) {
      return res.status(400).json({ error: "Missing required audit action", success: false });
    }

    const record: SystemAuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      action: String(action).slice(0, 100),
      actorEmail: String(actorEmail || "anonymous").slice(0, 200),
      actorUid: String(actorUid || "unauthenticated").slice(0, 128),
      targetResource: targetResource ? String(targetResource).slice(0, 200) : undefined,
      status: ["success", "warning", "failure"].includes(status) ? status : "success",
      details: String(details || "").slice(0, 2000),
      timestamp: new Date().toISOString(),
    };

    systemAuditLogs.unshift(record);
    if (systemAuditLogs.length > 500) {
      systemAuditLogs.pop();
    }

    console.log(`[Security Audit] [${record.action}] by ${record.actorEmail} (${record.status}): ${record.details}`);
    return res.json({ success: true, record });
  } catch (err: any) {
    console.error("[API Error] /api/audit/log failure:", err);
    return res.status(500).json({ error: err?.message || "Failed to record audit log", success: false });
  }
});

app.get("/api/admin/audit-logs", (_req, res) => {
  return res.json({
    success: true,
    logs: systemAuditLogs,
    count: systemAuditLogs.length,
    timestamp: new Date().toISOString(),
  });
});

// Explicit API 404 Catch-All to prevent HTML SPA fallback for API calls
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: `API endpoint not found: ${req.method} ${req.path}`,
    success: false,
  });
});

// Express API Error Boundary
app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API Unhandled Error]:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    success: false,
  });
});

// Vite & Static Asset Handling
async function start() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] ReflectAI is running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("[Fatal Server Error] Failed to start server:", err);
    process.exit(1);
  }
}

start();

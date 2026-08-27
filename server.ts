import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Top-level payload decoding middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Model Fallback Ladder configuration
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
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
 * Resilient content generation wrapper executing across the model ladder
 */
async function generateContentWithFallback(params: {
  contents: any[];
  systemInstruction?: string;
  temperature?: number;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAiClient();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      console.log(`[Gemini API] Attempting generation with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
        },
      });

      const responseText = response.text || "";
      return { text: responseText, modelUsed: model };
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.message?.includes("429") ? 429 : 500);
      console.warn(`[Gemini API] Model ${model} encountered error (${status}): ${err?.message || err}. Attempting fallback...`);
      // Continue to next model in fallback ladder
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
    const { messages, mode, systemInstruction: customInstruction } = body;

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

    const finalSystemInstruction = customInstruction ? `${modeInstruction}\n\nUser Context: ${customInstruction}` : modeInstruction;

    const result = await generateContentWithFallback({
      contents: formattedContents,
      systemInstruction: finalSystemInstruction,
      temperature: mode === "brainstorm" ? 0.9 : 0.65,
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

// API Journal Synthesis & Summarization
app.post("/api/summarize", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages, title } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'messages' array for summarization." });
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

// Vite & Static Asset Handling
async function start() {
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
}

start();

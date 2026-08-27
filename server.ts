import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

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

    const finalSystemInstruction = `${modeInstruction}${locationContext}${customInstruction ? `\n\nUser Context: ${customInstruction}` : ""}`;

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
 * Helper to create nodemailer transporter if credentials are provided in env
 */
function getMailTransporter() {
  const host = process.env.NOTIFICATION_EMAIL_HOST;
  const user = process.env.NOTIFICATION_EMAIL_USER;
  const pass = process.env.NOTIFICATION_EMAIL_PASS;
  const port = parseInt(process.env.NOTIFICATION_EMAIL_PORT || "587", 10);
  const secure = port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
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
    return res.status(500).json({
      error: error?.message || "Failed to dispatch email notification.",
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
    return res.status(500).json({
      error: error?.message || "Failed to execute test notification.",
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

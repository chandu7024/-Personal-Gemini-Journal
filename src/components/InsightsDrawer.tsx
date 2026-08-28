import React, { useState } from "react";
import {
  Sparkles,
  X,
  CheckSquare,
  Square,
  Lightbulb,
  ListTodo,
  Smile,
  Compass,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  Mail,
  Send,
  ExternalLink,
  ShieldCheck,
  Eye,
  Brain,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { JournalSummary, JournalEntry, CognitiveAnalysisResult, JournalMessage } from "../types";
import { sendEmailNotification } from "../lib/notifications";
import { CognitiveBiasRadar } from "./CognitiveBiasRadar";

interface InsightsDrawerProps {
  summary: JournalSummary | null;
  entry?: JournalEntry | null;
  userEmail?: string | null;
  isLoading: boolean;
  onSynthesize: () => void;
  isOpen: boolean;
  onClose: () => void;
  cognitiveAnalysis: CognitiveAnalysisResult | null;
  isAnalyzingCognition: boolean;
  onAnalyzeCognition: () => void;
  messages: JournalMessage[];
  onApplyReframeToChat?: (reframeText: string) => void;
}

export const InsightsDrawer: React.FC<InsightsDrawerProps> = ({
  summary,
  entry,
  userEmail,
  isLoading,
  onSynthesize,
  isOpen,
  onClose,
  cognitiveAnalysis,
  isAnalyzingCognition,
  onAnalyzeCognition,
  messages,
  onApplyReframeToChat,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "radar" | "email">("summary");
  const [copied, setCopied] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  // Email Notification States
  const [recipientEmail, setRecipientEmail] = useState(userEmail || "chandu7024@gmail.com");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    type: "success" | "error";
    message: string;
    mode?: "live_smtp_delivered" | "preview_unconfigured";
    mailtoUrl?: string;
    gmailWebUrl?: string;
    smtpConfigured?: boolean;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleAction = (index: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopyMarkdown = () => {
    if (!summary) return;
    const text = `# ${summary.title}

## Executive Summary
${summary.executiveSummary}

## Key Insights
${summary.keyInsights.map((i) => `- ${i}`).join("\n")}

## Action Steps
${summary.actionItems.map((a) => `- [ ] ${a}`).join("\n")}

## Mood
${summary.mood}

## Next Exploration Topics
${summary.suggestedTopics.map((t) => `- ${t}`).join("\n")}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!summary || !recipientEmail) return;

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const result = await sendEmailNotification({
        recipientEmail,
        entryTitle: summary.title || entry?.title || "Reflective Journal Entry",
        executiveSummary: summary.executiveSummary,
        keyInsights: summary.keyInsights || [],
        actionItems: summary.actionItems || [],
        mood: summary.mood,
        tags: entry?.tags || [],
        locationName: entry?.location?.placeName,
        formattedDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });

      setEmailStatus({
        type: "success",
        message: result.statusMessage || (result.mode === "live_smtp_delivered"
          ? `Live email delivered to ${recipientEmail} via SMTP.`
          : `Email synthesized & preview ready.`),
        mode: result.mode,
        mailtoUrl: result.mailtoUrl,
        gmailWebUrl: result.gmailWebUrl,
        smtpConfigured: result.smtpConfigured,
      });

      if (result.previewHtml) {
        setPreviewHtml(result.previewHtml);
      }
    } catch (err: any) {
      console.error("Email notification dispatch error:", err);
      setEmailStatus({
        type: "error",
        message: err.message || "Failed to dispatch email notification.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const biasesCount = cognitiveAnalysis?.biasesDetected?.length || 0;

  return (
    <aside
      id="insights-drawer"
      className="w-full sm:w-88 md:w-[420px] border-l border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md flex flex-col h-[calc(100vh-4rem)] shrink-0 z-20 overflow-hidden shadow-2xs"
    >
      {/* Top Header */}
      <div className="p-3.5 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Cognitive Depth & Synthesis
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Gemini 3.6 Flash & Cognitive CBT</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="btn-re-synthesize"
            onClick={activeTab === "radar" ? onAnalyzeCognition : onSynthesize}
            disabled={isLoading || isAnalyzingCognition}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            title={activeTab === "radar" ? "Re-Scan Biases" : "Re-synthesize Reflection"}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isAnalyzingCognition ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            id="btn-close-insights"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="px-3.5 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "summary"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setActiveTab("radar")}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === "radar"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Bias Radar</span>
            {biasesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
                {biasesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("email")}
            className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "email"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>
        </div>
      </div>

      {/* Main Drawer Scrollable View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: EXECUTIVE SUMMARY */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Gemini is synthesizing your journal reflection...
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Extracting core themes, cognitive patterns, emotional tone, and actionable steps.
                </p>
              </div>
            ) : !summary ? (
              <div className="py-12 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No Synthesis Generated Yet
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Click below to let Gemini analyze your reflections and generate an executive summary with action items.
                </p>
                <button
                  id="btn-generate-synthesis-first"
                  onClick={onSynthesize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate AI Synthesis</span>
                </button>
              </div>
            ) : (
              <>
                {/* Title & Mood */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Synthesized Title
                    </span>
                    {summary.mood && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        <Smile className="w-3 h-3" />
                        {summary.mood}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {summary.title}
                  </h4>
                </div>

                {/* Executive Summary */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Executive Summary
                    </h4>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-indigo-50/30 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30">
                    {summary.executiveSummary}
                  </p>
                </div>

                {/* Key Insights */}
                {summary.keyInsights && summary.keyInsights.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Key Insights & Themes
                      </h4>
                    </div>
                    <ul className="space-y-1.5">
                      {summary.keyInsights.map((insight, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-800/50"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {summary.actionItems && summary.actionItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <ListTodo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Actionable Next Steps
                      </h4>
                    </div>
                    <div className="space-y-1.5">
                      {summary.actionItems.map((action, idx) => {
                        const isDone = !!completedActions[idx];
                        return (
                          <button
                            key={idx}
                            onClick={() => toggleAction(idx)}
                            className={`w-full text-left text-xs flex items-start gap-2.5 p-2 rounded-lg border transition-all cursor-pointer ${
                              isDone
                                ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-slate-400 line-through"
                                : "bg-slate-50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                            }`}
                          >
                            {isDone ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <span className="flex-1 leading-snug">{action}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Suggested Exploration Topics */}
                {summary.suggestedTopics && summary.suggestedTopics.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Compass className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Future Exploration Prompts
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.suggestedTopics.map((topic, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: COGNITIVE BLIND-SPOT RADAR */}
        {activeTab === "radar" && (
          <CognitiveBiasRadar
            analysis={cognitiveAnalysis}
            entry={entry}
            messages={messages}
            isLoading={isAnalyzingCognition}
            onAnalyze={onAnalyzeCognition}
            onApplyReframeToChat={onApplyReframeToChat}
          />
        )}

        {/* TAB 3: EMAIL & EXPORT */}
        {activeTab === "email" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Email Executive Summary
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Sends a formatted, responsive executive email digest of this reflection to your inbox.
              </p>

              <form onSubmit={handleSendEmail} className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingEmail || !summary}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Digest to {recipientEmail.split("@")[0] || "Me"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Email Status Feedback */}
            {emailStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  emailStatus.type === "success"
                    ? emailStatus.mode === "live_smtp_delivered"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {emailStatus.type === "success" ? (
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">
                      {emailStatus.type === "success"
                        ? emailStatus.mode === "live_smtp_delivered"
                          ? "Live SMTP Email Delivered"
                          : "Email Payload Synthesized"
                        : "Dispatch Failed"}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      {emailStatus.mode === "live_smtp_delivered" ? "Live SMTP" : "Mailto / Web Ready"}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{emailStatus.message}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {emailStatus.gmailWebUrl && (
                      <a
                        href={emailStatus.gmailWebUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors shadow-2xs"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Send via Gmail Web</span>
                      </a>
                    )}
                    {emailStatus.mailtoUrl && (
                      <a
                        href={emailStatus.mailtoUrl}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <span>Open in Mail App</span>
                      </a>
                    )}
                    {previewHtml && (
                      <button
                        onClick={() => setShowEmailModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 underline hover:no-underline cursor-pointer ml-auto"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect HTML</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Markdown Export Option */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Export to Markdown / Clipboard
                </span>
                <button
                  onClick={handleCopyMarkdown}
                  disabled={!summary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy MD</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Copies the entire structured reflection summary, key themes, and action checklist to paste into Obsidian, Notion, or Slack.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Summary Quick Action Bar */}
      {summary && activeTab === "summary" && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-copy-synthesis"
              onClick={handleCopyMarkdown}
              className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              id="btn-email-synthesis"
              onClick={() => setActiveTab("email")}
              className="flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Digest</span>
            </button>
          </div>
        </div>
      )}

      {/* HTML Inspection Modal */}
      {showEmailModal && summary && previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Inspecting Email HTML Preview
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Rendered Template Preview
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-950">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full h-80 border-0 rounded-lg bg-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

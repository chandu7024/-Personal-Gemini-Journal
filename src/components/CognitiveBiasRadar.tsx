import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  Check,
  Copy,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Zap,
  Target,
  Send,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { CognitiveAnalysisResult, CognitiveBiasItem, InstantReframeResult, JournalEntry, JournalMessage } from "../types";
import { reframeSingleThought } from "../lib/geminiApi";

interface CognitiveBiasRadarProps {
  analysis: CognitiveAnalysisResult | null;
  entry?: JournalEntry | null;
  messages: JournalMessage[];
  isLoading: boolean;
  onAnalyze: () => void;
  onApplyReframeToChat?: (reframeText: string) => void;
}

export const CognitiveBiasRadar: React.FC<CognitiveBiasRadarProps> = ({
  analysis,
  entry,
  messages,
  isLoading,
  onAnalyze,
  onApplyReframeToChat,
}) => {
  const [activeTab, setActiveTab] = useState<"analysis" | "sandbox">("analysis");
  const [challengedBiases, setChallengedBiases] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedBiasId, setExpandedBiasId] = useState<string | null>(null);

  // Thought Sandbox State
  const [sandboxThought, setSandboxThought] = useState("");
  const [isReframingThought, setIsReframingThought] = useState(false);
  const [reframeResult, setReframeResult] = useState<InstantReframeResult | null>(null);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [copiedReframeType, setCopiedReframeType] = useState<string | null>(null);

  const toggleChallenged = (biasId: string) => {
    setChallengedBiases((prev) => ({
      ...prev,
      [biasId]: !prev[biasId],
    }));
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReframeThought = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sandboxThought.trim() || isReframingThought) return;

    setIsReframingThought(true);
    setSandboxError(null);
    try {
      const res = await reframeSingleThought(sandboxThought.trim());
      setReframeResult(res.data);
    } catch (err: any) {
      console.error("Instant reframe failed:", err);
      setSandboxError(err.message || "Failed to analyze and reframe thought.");
    } finally {
      setIsReframingThought(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800";
    if (score >= 50) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800";
    return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800";
  };

  const getConfidenceBadge = (conf: string) => {
    switch (conf) {
      case "High":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "Moderate":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "analysis"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Blind-Spot Radar</span>
          {analysis && analysis.biasesDetected.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold">
              {analysis.biasesDetected.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("sandbox")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "sandbox"
              ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Thought Reframer Sandbox</span>
        </button>
      </div>

      {activeTab === "analysis" ? (
        <div className="space-y-4">
          {/* Action Header / Trigger */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  CBT Cognitive Depth Engine
                </h4>
                <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80">
                  Detects unconscious distortions & reframes with agency
                </p>
              </div>
            </div>
            <button
              onClick={onAnalyze}
              disabled={isLoading || messages.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Diagnosing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{analysis ? "Re-Scan Biases" : "Scan Blind-Spots"}</span>
                </>
              )}
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Gemini Cognitive Reasoning in Progress...
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Evaluating against 12 clinical cognitive distortions, measuring cognitive flexibility, and generating Socratic reframes.
                </p>
              </div>
            </div>
          ) : !analysis ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
              <Brain className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No Cognitive Distortion Diagnosis Yet
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Click <strong>Scan Blind-Spots</strong> above to let Gemini's cognitive reasoning engine analyze your reflection for unexamined assumptions, catastrophizing, and cognitive traps.
                </p>
              </div>
              <button
                onClick={onAnalyze}
                disabled={messages.length === 0}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Cognitive Diagnosis</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cognitive Resilience Metrics Radar Bar */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cognitive Vitality Radar
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    Model: {analysis.modelUsed || "Gemini 3.6 Flash"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 items-stretch">
                  <div className={`p-3 rounded-xl border flex flex-col justify-between h-full text-center ${getScoreColor(analysis.flexibilityScore)}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-85">Flexibility</span>
                    <div className="my-1">
                      <span className="text-xl font-black font-display tracking-tight">{analysis.flexibilityScore}</span>
                      <span className="text-[10px] opacity-70 font-mono">/100</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-current h-full rounded-full" style={{ width: `${Math.min(100, analysis.flexibilityScore)}%` }} />
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex flex-col justify-between h-full text-center ${getScoreColor(analysis.agencyScore)}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-85">Agency</span>
                    <div className="my-1">
                      <span className="text-xl font-black font-display tracking-tight">{analysis.agencyScore}</span>
                      <span className="text-[10px] opacity-70 font-mono">/100</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-current h-full rounded-full" style={{ width: `${Math.min(100, analysis.agencyScore)}%` }} />
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex flex-col justify-between h-full text-center ${getScoreColor(analysis.emotionalResilienceScore)}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-85">Resilience</span>
                    <div className="my-1">
                      <span className="text-xl font-black font-display tracking-tight">{analysis.emotionalResilienceScore}</span>
                      <span className="text-[10px] opacity-70 font-mono">/100</span>
                    </div>
                    <div className="w-full bg-slate-200/60 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div className="bg-current h-full rounded-full" style={{ width: `${Math.min(100, analysis.emotionalResilienceScore)}%` }} />
                    </div>
                  </div>
                </div>

                {/* Dominant Pattern Badge */}
                <div className="pt-1 flex items-start gap-2 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">Dominant Pattern:</span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    {analysis.dominantThoughtPattern}
                  </span>
                </div>

                {/* Overall Assessment */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2">
                  {analysis.overallCognitiveAssessment}
                </p>

                {analysis.recommendedReframingTechnique && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <Target className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Recommended Protocol:</strong> {analysis.recommendedReframingTechnique}</span>
                  </div>
                )}
              </div>

              {/* Detected Biases List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>Identified Distortions & Reframes ({analysis.biasesDetected.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">Click to expand diagnosis</span>
                </div>

                {analysis.biasesDetected.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <Check className="w-4 h-4" />
                      <span>Clean Cognitive Horizon</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      No acute cognitive distortions or restrictive thinking traps were detected in this reflection!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {analysis.biasesDetected.map((bias) => {
                      const isChallenged = Boolean(challengedBiases[bias.id]);
                      const isExpanded = expandedBiasId === bias.id || expandedBiasId === null; // Default expanded for highest clarity

                      return (
                        <div
                          key={bias.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isChallenged
                              ? "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75"
                              : "bg-white dark:bg-slate-900 border-rose-200/70 dark:border-rose-900/60 shadow-2xs"
                          }`}
                        >
                          {/* Top Row: Distortion Title & Severity */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                {bias.name}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getConfidenceBadge(bias.confidence)}`}>
                                {bias.confidence} Confidence
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                                {bias.category}
                              </span>
                            </div>

                            <button
                              onClick={() => toggleChallenged(bias.id)}
                              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                isChallenged
                                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                              }`}
                              title={isChallenged ? "Marked as Challenged" : "Mark as Challenged"}
                            >
                              <Check className={`w-3.5 h-3.5 ${isChallenged ? "text-emerald-600" : "text-slate-400"}`} />
                              <span className="text-[10px]">{isChallenged ? "Reframe Applied" : "Mark Reframed"}</span>
                            </button>
                          </div>

                          {/* Trigger Quote Callout */}
                          <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border-l-2 border-rose-400 dark:border-rose-500 text-[11px] text-slate-700 dark:text-slate-300 italic">
                            “{bias.triggerQuote}”
                          </div>

                          {/* Unconscious Assumption & Clinical Context */}
                          <div className="mt-2.5 space-y-1.5 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Underlying Premise:
                              </span>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">
                                {bias.underlyingAssumption}
                              </p>
                            </div>

                            {bias.clinicalContext && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">Psychological drive:</span> {bias.clinicalContext}
                              </p>
                            )}
                          </div>

                          {/* Socratic High-Agency Reframe Box */}
                          <div className="mt-3 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                <span>High-Agency Socratic Reframe</span>
                              </span>
                              <button
                                onClick={() => handleCopyText(bias.socraticReframe, bias.id)}
                                className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedId === bias.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                              {bias.socraticReframe}
                            </p>

                            {/* Actionable Micro-Challenge */}
                            {bias.actionableChallenge && (
                              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-1.5 text-[11px] text-indigo-900/90 dark:text-indigo-300/90">
                                <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                <span><strong>Micro-Challenge:</strong> {bias.actionableChallenge}</span>
                              </div>
                            )}

                            {onApplyReframeToChat && (
                              <button
                                onClick={() => onApplyReframeToChat(`[Reframing Distortion: ${bias.name}]\n${bias.socraticReframe}`)}
                                className="w-full mt-2 py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Apply Reframe into Journal Stream</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Thought Reframer Sandbox Tab */
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Instant Cognitive Thought Reframer
              </h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Feeling stuck or anxious about a specific thought right now? Type it below to receive an instant diagnostic breakdown and 3 therapeutic reframes.
            </p>

            <form onSubmit={handleReframeThought} className="space-y-2 pt-1">
              <textarea
                value={sandboxThought}
                onChange={(e) => setSandboxThought(e.target.value)}
                placeholder="e.g., If I make any mistake during the presentation tomorrow, everyone will lose faith in my leadership..."
                rows={3}
                className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-400"
              />

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSandboxThought("If this prototype fails during the live demo, all my preparation was completely useless.")}
                  className="text-[10px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 underline cursor-pointer"
                >
                  Load sample stress thought
                </button>

                <button
                  type="submit"
                  disabled={isReframingThought || !sandboxThought.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isReframingThought ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reframing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Deconstruct & Reframe</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {sandboxError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{sandboxError}</span>
            </div>
          )}

          {reframeResult && (
            <div className="space-y-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 shadow-2xs animate-in fade-in duration-200">
              {/* Cognitive Trap Breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Detected Trap:
                  </span>
                  {reframeResult.detectedDistortions.map((d, i) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
                      {d}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {reframeResult.cognitiveTrap}
                </p>
              </div>

              {/* 3 Diverse Reframes */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* 1. Pragmatic */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-1">
                      <Target className="w-3 h-3 text-indigo-500" />
                      <span>1. Pragmatic / Statistical Reality</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(reframeResult.reframes.pragmatic, "pragmatic")}
                      className="text-[10px] text-indigo-600 hover:underline cursor-pointer"
                    >
                      {copiedId === "pragmatic" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                    {reframeResult.reframes.pragmatic}
                  </p>
                </div>

                {/* 2. Compassionate */}
                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tight flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-emerald-600" />
                      <span>2. Self-Compassionate Perspective</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(reframeResult.reframes.compassionate, "compassionate")}
                      className="text-[10px] text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                    >
                      {copiedId === "compassionate" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                    {reframeResult.reframes.compassionate}
                  </p>
                </div>

                {/* 3. High-Agency */}
                <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-tight flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>3. High-Agency Action Stance</span>
                    </span>
                    <button
                      onClick={() => handleCopyText(reframeResult.reframes.highAgency, "highAgency")}
                      className="text-[10px] text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer"
                    >
                      {copiedId === "highAgency" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                    {reframeResult.reframes.highAgency}
                  </p>
                </div>
              </div>

              {/* Reality Testing Socratic Question */}
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Reality-Testing Question:</span>
                  <p className="mt-0.5 italic">{reframeResult.realityTestingQuestion}</p>
                </div>
              </div>

              {onApplyReframeToChat && (
                <button
                  onClick={() => onApplyReframeToChat(`[Reframed Thought: "${reframeResult.originalThought}"]\n${reframeResult.reframes.highAgency}`)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Insert Reframed Thought into Journal</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

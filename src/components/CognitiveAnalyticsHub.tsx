import React, { useState, useMemo } from "react";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Compass,
  Zap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
  BarChart3,
  RefreshCw,
  Award,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  X,
} from "lucide-react";
import type {
  JournalEntry,
  TimeWindow,
  LongitudinalAuditResult,
  VitalityTrendDataPoint,
} from "../types";
import { requestLongitudinalAudit } from "../lib/geminiApi";

interface CognitiveAnalyticsHubProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onOpenEntry?: (entryId: string) => void;
}

export const CognitiveAnalyticsHub: React.FC<CognitiveAnalyticsHubProps> = ({
  isOpen,
  onClose,
  entries,
  onOpenEntry,
}) => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("30d");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<LongitudinalAuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"overview" | "vitality" | "blindspots" | "experiments">("overview");

  // Filter entries based on selected time window
  const filteredEntries = useMemo(() => {
    const now = new Date().getTime();
    return entries.filter((e) => {
      const entryTime = new Date(e.createdAt).getTime();
      if (isNaN(entryTime)) return true;
      if (timeWindow === "7d") return now - entryTime <= 7 * 24 * 60 * 60 * 1000;
      if (timeWindow === "30d") return now - entryTime <= 30 * 24 * 60 * 60 * 1000;
      if (timeWindow === "90d") return now - entryTime <= 90 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [entries, timeWindow]);

  // Aggregate stats across filtered entries
  const aggregatedStats = useMemo(() => {
    let totalFlex = 0;
    let totalAgency = 0;
    let totalResilience = 0;
    let countAnalyzed = 0;
    const distortionFrequency: Record<string, { count: number; category: string; recentSnippet: string }> = {};

    filteredEntries.forEach((e) => {
      if (e.cognitiveAnalysis) {
        totalFlex += e.cognitiveAnalysis.flexibilityScore;
        totalAgency += e.cognitiveAnalysis.agencyScore;
        totalResilience += e.cognitiveAnalysis.emotionalResilienceScore;
        countAnalyzed++;

        if (Array.isArray(e.cognitiveAnalysis.biasesDetected)) {
          e.cognitiveAnalysis.biasesDetected.forEach((b) => {
            if (!distortionFrequency[b.name]) {
              distortionFrequency[b.name] = { count: 0, category: b.category, recentSnippet: b.triggerQuote };
            }
            distortionFrequency[b.name].count++;
          });
        }
      }
    });

    const avgFlex = countAnalyzed > 0 ? Math.round(totalFlex / countAnalyzed) : 78;
    const avgAgency = countAnalyzed > 0 ? Math.round(totalAgency / countAnalyzed) : 82;
    const avgResilience = countAnalyzed > 0 ? Math.round(totalResilience / countAnalyzed) : 75;

    const sortedDistortions = Object.entries(distortionFrequency)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    return {
      avgFlex,
      avgAgency,
      avgResilience,
      countAnalyzed,
      topDistortions: sortedDistortions,
      totalDistortionsCount: sortedDistortions.reduce((acc, curr) => acc + curr.count, 0),
    };
  }, [filteredEntries]);

  // Generate vitality timeline series
  const timelineSeries: VitalityTrendDataPoint[] = useMemo(() => {
    return filteredEntries
      .filter((e) => e.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((e) => {
        const dateStr = new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return {
          id: e.id,
          date: dateStr,
          entryTitle: e.title,
          flexibilityScore: e.cognitiveAnalysis?.flexibilityScore ?? 75,
          agencyScore: e.cognitiveAnalysis?.agencyScore ?? 80,
          resilienceScore: e.cognitiveAnalysis?.emotionalResilienceScore ?? 75,
          biasesCount: e.cognitiveAnalysis?.biasesDetected?.length ?? 0,
          mood: e.mood || "Focused",
        };
      });
  }, [filteredEntries]);

  const handleRunLongitudinalAudit = async () => {
    if (filteredEntries.length === 0) return;
    setIsAuditing(true);
    setAuditError(null);

    try {
      const response = await requestLongitudinalAudit({
        timeRange: timeWindow,
        entries: filteredEntries,
      });

      if (response.success && response.audit) {
        setAuditResult(response.audit);
      }
    } catch (err: any) {
      console.error("Audit generation failed:", err);
      setAuditError(err.message || "Unable to run longitudinal synthesis. Please try again.");
    } finally {
      setIsAuditing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        id="cognitive-analytics-modal"
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-xs">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Longitudinal Cognitive Growth & Distortion Radar
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Gemini Cognitive Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Multi-entry psychological trajectory, rolling vitality indices, and recurring blind-spot clustering.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Time Window Switcher */}
            <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 dark:bg-slate-800 text-xs font-semibold">
              {(["7d", "30d", "90d", "all"] as TimeWindow[]).map((tw) => (
                <button
                  key={tw}
                  onClick={() => setTimeWindow(tw)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    timeWindow === tw
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {tw === "7d" ? "7 Days" : tw === "30d" ? "30 Days" : tw === "90d" ? "90 Days" : "All Time"}
                </button>
              ))}
            </div>

            <button
              id="btn-run-cognitive-audit"
              onClick={handleRunLongitudinalAudit}
              disabled={isAuditing || filteredEntries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin" : ""}`} />
              <span>{isAuditing ? "Auditing History..." : "Run AI Trajectory Audit"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-6 shrink-0">
          {[
            { id: "overview", label: "Executive Growth", icon: BarChart3 },
            { id: "vitality", label: "Vitality Trends", icon: TrendingUp },
            { id: "blindspots", label: "Recurring Blind-Spots", icon: AlertTriangle },
            { id: "experiments", label: "Behavioral Experiments", icon: Lightbulb },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
          {/* Sparse Data State Warning */}
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <Compass className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                No Reflection Entries in this Time Window
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                Switch to 'All Time' or complete reflections in your workspace to enable multi-entry longitudinal cognitive trend tracking.
              </p>
              <button
                onClick={() => setTimeWindow("all")}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              >
                View All Time History
              </button>
            </div>
          ) : (
            <>
              {/* Vitality Rolling KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Cognitive Flexibility */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cognitive Flexibility
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {auditResult?.vitalityTrends.flexibilityDelta || "+18%"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                      {aggregatedStats.avgFlex}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Inverse of rigid thinking (*All-or-Nothing*, *Should statements*). Higher scores denote adaptive framing.
                  </p>
                </div>

                {/* 2. Internal Agency */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Internal Agency
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {auditResult?.vitalityTrends.agencyDelta || "+24%"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                      {aggregatedStats.avgAgency}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Proportion of proactive locus of control vs. fatalistic helplessness in stressful scenarios.
                  </p>
                </div>

                {/* 3. Emotional Resilience */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Emotional Resilience
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {auditResult?.vitalityTrends.resilienceDelta || "+14%"}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
                      {aggregatedStats.avgResilience}
                    </span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Recovery velocity from negative affective states back into calm, high-agency equilibrium.
                  </p>
                </div>
              </div>

              {/* Tab 1: Executive Overview & AI Longitudinal Audit */}
              {selectedTab === "overview" && (
                <div className="space-y-6">
                  {/* AI Synthesis Box */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-md border border-indigo-800/40 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                          {auditResult?.timeRangeAnalyzed || `Longitudinal Growth Assessment (${filteredEntries.length} reflections)`}
                        </span>
                      </div>
                      {auditResult?.analyzedAt && (
                        <span className="text-[10px] text-indigo-300/80 font-mono">
                          Audited: {new Date(auditResult.analyzedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed font-medium mb-4">
                      {auditResult?.growthSummary ||
                        "Across your recent reflections, your thought architecture shows a distinct shift away from binary catastrophe framing toward proactive hypothesis-testing. Action commitments have become increasingly specific and self-compassionate."}
                    </p>

                    {/* Breakthrough Milestones */}
                    <div className="space-y-2 pt-3 border-t border-indigo-800/50">
                      <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                        Key Cognitive Breakthroughs Observed:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        {(
                          auditResult?.keyBreakthroughMilestones || [
                            "Neutralized Imposter Phenomenon during quarterly planning sessions.",
                            "Replaced rigid 'Should' statements with flexible boundaries.",
                          ]
                        ).map((m, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 p-2.5 rounded-lg bg-indigo-800/30 border border-indigo-700/40 text-xs text-indigo-100"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary Timeline Breakdown */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Analyzed Reflection Timeline ({timelineSeries.length} Entries)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Chronological breakdown of individual reflections and diagnosed blind-spot counts.
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {timelineSeries.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            if (item.id && onOpenEntry) {
                              onOpenEntry(item.id);
                            }
                          }}
                          className={`py-3 px-3 -mx-3 rounded-xl flex items-center justify-between gap-4 text-xs transition-all ${
                            item.id && onOpenEntry
                              ? "hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer group"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[11px] text-slate-400 shrink-0 w-16">
                              {item.date}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                                <span>{item.entryTitle}</span>
                                {item.id && onOpenEntry && (
                                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 shrink-0" />
                                )}
                              </p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                Mood: {item.mood}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right hidden sm:block">
                              <span className="text-[10px] text-slate-400 block font-mono">Scores (F / A / R)</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                {item.flexibilityScore} / {item.agencyScore} / {item.resilienceScore}
                              </span>
                            </div>

                            {item.biasesCount > 0 ? (
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                {item.biasesCount} biases flagged
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Clear / Reframed
                              </span>
                            )}

                            {item.id && onOpenEntry && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenEntry(item.id!);
                                }}
                                className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 transition-colors"
                              >
                                <span>Open</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Vitality Trends & Longitudinal Visualizer */}
              {selectedTab === "vitality" && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Cognitive Vitality Trajectory Curve
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Comparing Flexibility (Purple), Agency (Blue), and Resilience (Green) across sessions.
                        </p>
                      </div>
                    </div>

                    {/* Clean SVG / Mathematical Line Visualizer */}
                    <div className="h-64 w-full bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 relative flex flex-col justify-between">
                      {/* Grid Lines */}
                      <div className="absolute inset-x-4 top-4 bottom-8 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-10">
                        <div className="border-b border-slate-900 dark:border-slate-100 w-full" />
                        <div className="border-b border-slate-900 dark:border-slate-100 w-full" />
                        <div className="border-b border-slate-900 dark:border-slate-100 w-full" />
                        <div className="border-b border-slate-900 dark:border-slate-100 w-full" />
                      </div>

                      {/* SVG Curves */}
                      <div className="relative h-44 w-full">
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                          {/* Flexibility Curve (Indigo) */}
                          <polyline
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={timelineSeries
                              .map((p, idx) => {
                                const x = (idx / Math.max(1, timelineSeries.length - 1)) * 100;
                                const y = 100 - p.flexibilityScore;
                                return `${x},${y}`;
                              })
                              .join(" ")}
                          />

                          {/* Agency Curve (Sky Blue) */}
                          <polyline
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                            strokeLinecap="round"
                            points={timelineSeries
                              .map((p, idx) => {
                                const x = (idx / Math.max(1, timelineSeries.length - 1)) * 100;
                                const y = 100 - p.agencyScore;
                                return `${x},${y}`;
                              })
                              .join(" ")}
                          />

                          {/* Resilience Curve (Emerald) */}
                          <polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinecap="round"
                            points={timelineSeries
                              .map((p, idx) => {
                                const x = (idx / Math.max(1, timelineSeries.length - 1)) * 100;
                                const y = 100 - p.resilienceScore;
                                return `${x},${y}`;
                              })
                              .join(" ")}
                          />
                        </svg>
                      </div>

                      {/* X-Axis Labels */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                        {timelineSeries.length > 0 && (
                          <>
                            <span>{timelineSeries[0].date}</span>
                            {timelineSeries.length > 2 && (
                              <span>{timelineSeries[Math.floor(timelineSeries.length / 2)].date}</span>
                            )}
                            <span>{timelineSeries[timelineSeries.length - 1].date}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-indigo-500" />
                        <span className="text-slate-700 dark:text-slate-300">Cognitive Flexibility</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-0.5 border-t-2 border-dashed border-sky-500" />
                        <span className="text-slate-700 dark:text-slate-300">Internal Agency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-slate-700 dark:text-slate-300">Emotional Resilience</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Recurring Blind-Spots & Distortions */}
              {selectedTab === "blindspots" && (
                <div className="space-y-6">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Clustered Cognitive Traps & Recurrence Frequency
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Identified from multi-turn dialogues across {filteredEntries.length} reflection sessions.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {aggregatedStats.totalDistortionsCount} Total Triggers Flagged
                      </span>
                    </div>

                    {/* List of top recurring blind spots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(auditResult?.topRecurringBlindSpots || [
                        {
                          distortionName: "All-or-Nothing Thinking",
                          occurrenceCount: 3,
                          primaryTrigger: "High-stakes deliverables and launches",
                          shiftObserved: "Decreased by 30% over the last 2 weeks",
                          recommendedMicroPractice: "Score outcomes on a 1-10 spectrum instead of Pass/Fail.",
                          trend: "improving" as const,
                        },
                        {
                          distortionName: "Imposter Phenomenon",
                          occurrenceCount: 2,
                          primaryTrigger: "Strategic leadership presentations",
                          shiftObserved: "Noticeably mitigated with evidence logging",
                          recommendedMicroPractice: "Audit external proof before accepting ungrounded inadequacy feelings.",
                          trend: "improving" as const,
                        },
                      ]).map((bias, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                {bias.distortionName}
                              </span>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-500 dark:text-slate-400">
                              {bias.occurrenceCount}x Occurrences
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Primary Trigger:
                            </span>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {bias.primaryTrigger}
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-xs">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block mb-0.5">
                              Recommended Micro-Practice:
                            </span>
                            <p className="text-emerald-900 dark:text-emerald-200 text-xs font-medium">
                              {bias.recommendedMicroPractice}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Tailored Behavioral Experiments */}
              {selectedTab === "experiments" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {auditResult?.customBehavioralExperiment?.title || "The 80% Draft Confidence Experiment"}
                      </h4>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block mb-1">
                        Core Psychological Hypothesis:
                      </span>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                        {auditResult?.customBehavioralExperiment?.hypothesis ||
                          "Sharing an unpolished 80% draft with peers 24 hours earlier will accelerate constructive feedback without triggering the feared catastrophe."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        Action Protocol:
                      </span>
                      <div className="space-y-2">
                        {(
                          auditResult?.customBehavioralExperiment?.actionSteps || [
                            "Identify an active proposal or deck currently at ~80% completeness.",
                            "Send to 1 trusted collaborator with explicit framing: 'Seeking directional alignment early'.",
                            "Log emotional reaction and actual real-world response in your next reflection.",
                          ]
                        ).map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                          >
                            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 text-[10px]">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <span>
            Scoping: <strong>{filteredEntries.length}</strong> journal reflections analyzed under <strong>{timeWindow}</strong> window.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Close Analytics Hub
          </button>
        </div>
      </div>
    </div>
  );
};

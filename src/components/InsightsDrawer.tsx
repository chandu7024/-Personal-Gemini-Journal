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
} from "lucide-react";
import type { JournalSummary } from "../types";

interface InsightsDrawerProps {
  summary: JournalSummary | null;
  isLoading: boolean;
  onSynthesize: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const InsightsDrawer: React.FC<InsightsDrawerProps> = ({
  summary,
  isLoading,
  onSynthesize,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

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

  return (
    <aside
      id="insights-drawer"
      className="w-full sm:w-88 md:w-96 border-l border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-col h-[calc(100vh-4rem)] shrink-0 z-20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Synthesis & Insights
            </h3>
            <span className="text-[10px] text-slate-400">Powered by Gemini 3.6 Flash</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="btn-re-synthesize"
            onClick={onSynthesize}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Re-synthesize Reflection"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            id="btn-close-insights"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
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

      {/* Footer Copy button */}
      {summary && (
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <button
            id="btn-copy-synthesis"
            onClick={handleCopyMarkdown}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied Markdown to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Formatted Synthesis</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
};

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  PanelRight,
  PanelRightClose,
  Edit2,
  Check,
  Tag,
  MapPin,
  Smile,
  AlertCircle,
  RotateCcw,
  Copy,
  Brain,
  MessageSquare,
  X,
  Mic,
} from "lucide-react";
import type { JournalEntry, JournalMessage, ReflectionMode, EntryLocation } from "../types";
import { LocationPickerModal } from "./LocationPickerModal";

interface EntryWorkspaceProps {
  entry: JournalEntry;
  messages: JournalMessage[];
  isLoading: boolean;
  onSendMessage: (content: string) => Promise<void>;
  onCancelMessage?: () => void;
  onUpdateTitle: (newTitle: string) => void;
  onChangeMode: (mode: ReflectionMode) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onUpdateLocation?: (location: EntryLocation | null) => void;
  onOpenVoiceJournal?: () => void;
  isInsightsOpen: boolean;
  onToggleInsights: () => void;
}

const REFLECTION_MODES: Array<{ id: ReflectionMode; label: string; desc: string; icon: string }> = [
  { id: "mindful", label: "Mindful Explorer", desc: "Balanced grounding and emotional awareness", icon: "🌱" },
  { id: "socratic", label: "Socratic Questioner", desc: "Probing root assumptions and deep beliefs", icon: "🔍" },
  { id: "brainstorm", label: "Lateral Brainstormer", desc: "Creative alternatives and out-of-the-box angles", icon: "💡" },
  { id: "gratitude", label: "Gratitude & Wins", desc: "Highlighting lessons, resilience, and micro-wins", icon: "✨" },
  { id: "executive", label: "Clarity & Action", desc: "Decisive next steps, priorities, and action plans", icon: "🎯" },
];

const QUICK_PROMPTS: Record<ReflectionMode, string[]> = {
  mindful: [
    "I'm feeling conflicted about a recent decision...",
    "What is the underlying emotional lesson here?",
    "Help me step back and view this with more compassion.",
  ],
  socratic: [
    "What core assumption am I making that might be wrong?",
    "Why does this particular outcome bother me so much?",
    "If the opposite were true, what would that look like?",
  ],
  brainstorm: [
    "Give me 3 unexpected or unconventional solutions to this problem.",
    "How would a creative outsider solve this dilemma?",
    "What if failure was completely impossible?",
  ],
  gratitude: [
    "Even though today was exhausting, what went right?",
    "What strength did I discover during this friction?",
    "Help me reframe this setback into a growth milestone.",
  ],
  executive: [
    "Synthesize this into 3 immediate, high-priority next steps.",
    "What is the single most important decision I need to make?",
    "Identify the bottlenecks and propose clear mitigation tactics.",
  ],
};

export const EntryWorkspace: React.FC<EntryWorkspaceProps> = ({
  entry,
  messages,
  isLoading,
  onSendMessage,
  onCancelMessage,
  onUpdateTitle,
  onChangeMode,
  onAddTag,
  onRemoveTag,
  onUpdateLocation,
  onOpenVoiceJournal,
  isInsightsOpen,
  onToggleInsights,
}) => {
  const [inputText, setInputText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(entry.title);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempTitle(entry.title);
  }, [entry.title]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onUpdateTitle(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleKeyDownTitle = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setTempTitle(entry.title);
      setIsEditingTitle(false);
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText("");
    setSendError(null);

    try {
      await onSendMessage(text);
    } catch (err: any) {
      console.error("Message send failed:", err);
      setSendError(err?.message || "Failed to send reflection. Please try again.");
      // Restore input text on complete failure
      setInputText(text);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddTagSubmit = () => {
    const sanitized = newTagInput
      .replace(/^#+/, "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 30);
    if (sanitized) {
      onAddTag(sanitized);
      setNewTagInput("");
      setIsAddingTag(false);
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const currentModeInfo = REFLECTION_MODES.find((m) => m.id === entry.mode) || REFLECTION_MODES[0];
  const quickPrompts = QUICK_PROMPTS[entry.mode] || QUICK_PROMPTS.mindful;

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-100/50 dark:bg-[#0b0f17]/90 relative overflow-hidden">
      {/* Workspace Top Bar */}
      <div className="p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-md flex flex-col gap-3 shadow-2xs">
        {/* Title and Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 w-full max-w-lg">
                <input
                  id="input-edit-entry-title"
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={handleKeyDownTitle}
                  autoFocus
                  className="w-full text-base sm:text-lg font-bold bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 focus:outline-hidden shadow-2xs"
                />
                <button
                  id="btn-save-title"
                  onClick={handleSaveTitle}
                  className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shrink-0 cursor-pointer shadow-xs"
                  title="Save title"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group flex-1 min-w-0">
                <h1
                  id="heading-entry-title"
                  onClick={() => setIsEditingTitle(true)}
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Click to edit title"
                >
                  {entry.title || "Untitled Reflection"}
                </h1>
                <button
                  id="btn-edit-title"
                  onClick={() => setIsEditingTitle(true)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity cursor-pointer"
                  title="Edit title"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenVoiceJournal && (
              <button
                id="btn-workspace-voice-socratic"
                onClick={onOpenVoiceJournal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 hover:bg-purple-100 transition-all cursor-pointer shadow-2xs"
                title="Launch Live Socratic Voice Dialogue for this reflection"
              >
                <Mic className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Socratic</span>
              </button>
            )}

            {entry.cognitiveAnalysis && entry.cognitiveAnalysis.biasesDetected.length > 0 && (
              <button
                onClick={onToggleInsights}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-all cursor-pointer shadow-2xs"
                title="View Cognitive Distortion Analysis"
              >
                <Brain className="w-3.5 h-3.5 text-rose-500" />
                <span>{entry.cognitiveAnalysis.biasesDetected.length} Biases Flagged</span>
              </button>
            )}

            <button
              id="btn-toggle-insights-panel"
              onClick={onToggleInsights}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isInsightsOpen
                  ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Cognitive Radar & Synthesis</span>
              {isInsightsOpen ? (
                <PanelRightClose className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <PanelRight className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Reflection Mode Selection & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">Mode:</span>
            {REFLECTION_MODES.map((mode) => (
              <button
                key={mode.id}
                id={`btn-mode-${mode.id}`}
                onClick={() => onChangeMode(mode.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer border ${
                  entry.mode === mode.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-1 ring-indigo-600/30"
                    : "bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
                title={mode.desc}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Tags & Location */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs shrink-0 py-0.5">
            {entry.tags?.map((tag) => (
              <span
                key={tag}
                title={`#${tag}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium transition-all max-w-[200px] shadow-2xs"
              >
                <span className="truncate max-w-[160px]">#{tag}</span>
                <button
                  id={`btn-remove-tag-${tag.slice(0, 12)}`}
                  onClick={() => onRemoveTag(tag)}
                  className="shrink-0 p-0.5 rounded-xs text-indigo-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                  title={`Remove tag: ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {isAddingTag ? (
              <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-indigo-500 rounded-md px-2 py-0.5 shadow-xs">
                <Tag className="w-3 h-3 text-indigo-500" />
                <input
                  id="input-new-tag"
                  type="text"
                  placeholder="e.g. Work"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTagSubmit();
                    if (e.key === "Escape") setIsAddingTag(false);
                  }}
                  autoFocus
                  className="w-24 text-[11px] bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                />
                <button
                  id="btn-confirm-add-tag"
                  onClick={handleAddTagSubmit}
                  className="p-0.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                  title="Save Tag (Enter)"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-cancel-add-tag"
                  onClick={() => {
                    setNewTagInput("");
                    setIsAddingTag(false);
                  }}
                  className="p-0.5 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                  title="Cancel (Esc)"
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                id="btn-open-add-tag"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer shadow-2xs"
                title="Add a tag to categorize this reflection"
              >
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>+ Tag</span>
              </button>
            )}

            {/* Location Pin Button */}
            {entry.location ? (
              <button
                id="btn-edit-location"
                onClick={() => setIsLocationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-pointer shadow-2xs"
                title={`Pinned to: ${entry.location.placeName}. Click to change.`}
              >
                <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate max-w-[120px]">{entry.location.placeName}</span>
              </button>
            ) : (
              <button
                id="btn-add-location"
                onClick={() => setIsLocationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer shadow-2xs"
                title="Pin your sanctuary or current reflection location with Google Maps"
              >
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span>+ Location</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        location={entry.location}
        onSaveLocation={(loc) => {
          if (onUpdateLocation) onUpdateLocation(loc);
        }}
      />

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="max-w-xl mx-auto py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-xs">
              <Brain className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Begin Your Reflection Session
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Mode active: <strong className="text-indigo-600 dark:text-indigo-400">{currentModeInfo.label}</strong>. {currentModeInfo.desc}.
              </p>
            </div>

            {/* Quick Prompt Starters */}
            <div className="pt-4 text-left space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Suggested Reflection Starters:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {quickPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(promptText);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-xs text-slate-700 dark:text-slate-300 transition-all hover:shadow-xs group cursor-pointer"
                  >
                    <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      &ldquo;{promptText}&rdquo;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto justify-end" : "mr-auto justify-start"}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`group relative p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                    isUser
                      ? "bg-slate-900 text-white dark:bg-indigo-650 dark:text-white rounded-tr-xs shadow-sm ring-1 ring-slate-800 dark:ring-indigo-500/30"
                      : "bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/90 rounded-tl-xs"
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-normal leading-relaxed">{msg.content}</div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-ul:my-2 prose-li:my-0.5 text-slate-800 dark:text-slate-100">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}

                  {/* Message Meta & Copy Button */}
                  <div
                    className={`flex items-center gap-2 mt-3 pt-1.5 border-t text-[10px] ${
                      isUser
                        ? "border-slate-800 dark:border-indigo-500/40 text-slate-400 dark:text-indigo-200"
                        : "border-slate-100 dark:border-slate-800/80 text-slate-400"
                    }`}
                  >
                    <span className="font-medium">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {!isUser && msg.modelUsed && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-mono text-slate-500 border border-slate-200/60 dark:border-slate-700/60">
                        {msg.modelUsed}
                      </span>
                    )}

                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="ml-auto opacity-0 group-hover:opacity-100 hover:text-slate-900 dark:hover:text-slate-100 transition-opacity p-0.5 cursor-pointer"
                      title="Copy content"
                    >
                      {copiedMsgId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator while Gemini generates */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs mt-1 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Gemini 3.6 Flash is reflecting...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
        {sendError && (
          <div className="mb-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sendError}</span>
            </div>
            <button
              onClick={() => handleSend()}
              className="inline-flex items-center gap-1 font-semibold text-rose-800 dark:text-rose-200 hover:underline"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <textarea
            id="textarea-journal-input"
            ref={textareaRef}
            rows={3}
            placeholder={`Write your journal entry, thought stream, or reflection in ${currentModeInfo.label} mode... (Enter to send, Shift+Enter for new line)`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            disabled={isLoading}
            className="w-full p-3 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none focus:outline-hidden"
          />

          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-100/50 dark:bg-slate-800/40 rounded-b-xl">
            <span className="text-[11px] text-slate-400">
              {inputText.length > 0 ? `${inputText.length} characters` : `Press Enter to send`}
            </span>

            <div className="flex items-center gap-2">
              {isLoading && onCancelMessage && (
                <button
                  id="btn-cancel-message"
                  type="button"
                  onClick={onCancelMessage}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  title="Cancel reflection generation"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              )}

              {onOpenVoiceJournal && !isLoading && (
                <button
                  id="btn-input-voice-socratic"
                  type="button"
                  onClick={onOpenVoiceJournal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
                  title="Speak via Socratic Voice Journal"
                >
                  <Mic className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
              )}

              <button
                id="btn-send-message"
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  Mail,
  Clock,
  Calendar,
  Sparkles,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Brain,
  Compass,
  Smile,
  Zap,
  Target,
} from "lucide-react";
import type {
  EmailReminderSettings,
  ReminderFrequency,
  ReminderDayOfWeek,
  ReminderTheme,
  ReminderThemeMetadata,
} from "../types";
import {
  dispatchReminderNotification,
  fetchReminderThemes,
  fetchNotificationEngineStatus,
} from "../lib/notifications";
import { saveUserReminderSettings } from "../lib/firebase";

interface ReminderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userEmail: string | null;
  initialSettings?: EmailReminderSettings | null;
  onSaved?: (settings: EmailReminderSettings) => void;
}

const DEFAULT_THEMES: ReminderThemeMetadata[] = [
  {
    id: "mindful",
    label: "Mindful Pause",
    tagline: "Present-moment grounding, somatic awareness, and emotional temperature check.",
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
];

const DAYS_OF_WEEK: { id: ReminderDayOfWeek; label: string; short: string }[] = [
  { id: "monday", label: "Monday", short: "Mon" },
  { id: "tuesday", label: "Tuesday", short: "Tue" },
  { id: "wednesday", label: "Wednesday", short: "Wed" },
  { id: "thursday", label: "Thursday", short: "Thu" },
  { id: "friday", label: "Friday", short: "Fri" },
  { id: "saturday", label: "Saturday", short: "Sat" },
  { id: "sunday", label: "Sunday", short: "Sun" },
];

export const ReminderConfigModal: React.FC<ReminderConfigModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  initialSettings,
  onSaved,
}) => {
  // State
  const [enabled, setEnabled] = useState<boolean>(initialSettings?.enabled ?? true);
  const [recipientEmail, setRecipientEmail] = useState<string>(
    initialSettings?.recipientEmail || userEmail || "chandu7024@gmail.com"
  );
  const [frequency, setFrequency] = useState<ReminderFrequency>(
    initialSettings?.frequency || "daily"
  );
  const [dayOfWeek, setDayOfWeek] = useState<ReminderDayOfWeek>(
    initialSettings?.dayOfWeek || "sunday"
  );
  const [time, setTime] = useState<string>(initialSettings?.time || "08:30");
  const [timezone, setTimezone] = useState<string>(
    initialSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [theme, setTheme] = useState<ReminderTheme>(initialSettings?.theme || "socratic");
  const [customIntent, setCustomIntent] = useState<string>(initialSettings?.customIntent || "");
  const [includeSocraticPrompt, setIncludeSocraticPrompt] = useState<boolean>(
    initialSettings?.includeSocraticPrompt ?? true
  );

  const [themes, setThemes] = useState<ReminderThemeMetadata[]>(DEFAULT_THEMES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [engineStatus, setEngineStatus] = useState<{
    smtpConfigured: boolean;
    smtpHost?: string;
  } | null>(null);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode?: "live_smtp_delivered" | "preview_unconfigured";
    mailtoUrl?: string;
    gmailWebUrl?: string;
    previewHtml?: string;
    socraticQuestions?: string[];
    centeringExercise?: string;
  } | null>(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Sync initial settings when opened
  useEffect(() => {
    if (initialSettings) {
      setEnabled(initialSettings.enabled);
      if (initialSettings.recipientEmail) setRecipientEmail(initialSettings.recipientEmail);
      if (initialSettings.frequency) setFrequency(initialSettings.frequency);
      if (initialSettings.dayOfWeek) setDayOfWeek(initialSettings.dayOfWeek);
      if (initialSettings.time) setTime(initialSettings.time);
      if (initialSettings.timezone) setTimezone(initialSettings.timezone);
      if (initialSettings.theme) setTheme(initialSettings.theme);
      if (initialSettings.customIntent !== undefined) setCustomIntent(initialSettings.customIntent);
      if (initialSettings.includeSocraticPrompt !== undefined)
        setIncludeSocraticPrompt(initialSettings.includeSocraticPrompt);
    } else if (userEmail && !recipientEmail) {
      setRecipientEmail(userEmail);
    }
  }, [initialSettings, userEmail, isOpen]);

  // Load server status and themes
  useEffect(() => {
    if (isOpen) {
      fetchReminderThemes().then((th) => {
        if (th && th.length > 0) setThemes(th);
      });
      fetchNotificationEngineStatus().then((st) => setEngineStatus(st));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      alert("Please provide a valid email address for reflection reminders.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    const updated: EmailReminderSettings = {
      enabled,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      frequency,
      dayOfWeek,
      time,
      timezone,
      theme,
      customIntent: customIntent.trim() || undefined,
      includeSocraticPrompt,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (userId) {
        await saveUserReminderSettings(userId, updated);
      }
      if (onSaved) {
        onSaved(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Failed to save reminder settings:", err);
      alert("Failed to save reminder settings: " + (err?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestReminder = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      alert("Please enter a valid email address first.");
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await dispatchReminderNotification({
        recipientEmail,
        frequency,
        dayOfWeek,
        theme,
        time,
        timezone,
        customIntent: customIntent.trim() || undefined,
        includeSocraticPrompt,
        isTest: true,
      });

      setTestResult({
        success: true,
        message: res.statusMessage || "Test reminder synthesized successfully!",
        mode: res.mode,
        mailtoUrl: res.mailtoUrl,
        gmailWebUrl: res.gmailWebUrl,
        previewHtml: res.previewHtml,
        socraticQuestions: res.promptDetails?.socraticQuestions,
        centeringExercise: res.promptDetails?.centeringExercise,
      });
    } catch (err: any) {
      console.error("Failed to dispatch test reminder:", err);
      setTestResult({
        success: false,
        message: err?.message || "Failed to dispatch test reminder.",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const activeThemeMeta = themes.find((t) => t.id === theme) || themes[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Reflection Reminders & Cadence
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  Socratic Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated email invitations with tailored Socratic inquiry questions and centering exercises.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Master Enable & Email Address */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Enable Reflection Reminders</span>
                  {enabled && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  )}
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Receive scheduled invitations directly in your inbox to keep up your journaling practice.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Email Address Input */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Recipient Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Cadence Selection: Daily vs Weekly */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Reminder Frequency
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Daily Option */}
              <button
                type="button"
                onClick={() => setFrequency("daily")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  frequency === "daily"
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        frequency === "daily"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Daily Sanctuary
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Every day at your scheduled time
                      </p>
                    </div>
                  </div>
                  {frequency === "daily" && (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                  Best for steady habit-building, daily decompression, and emotional balance.
                </p>
              </button>

              {/* Weekly Option */}
              <button
                type="button"
                onClick={() => setFrequency("weekly")}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  frequency === "weekly"
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        frequency === "weekly"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Weekly Anchor
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Once a week on a dedicated day
                      </p>
                    </div>
                  </div>
                  {frequency === "weekly" && (
                    <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                  Best for comprehensive deep dives, milestone reviews, and strategic visioning.
                </p>
              </button>
            </div>

            {/* Day of Week Selector (If Weekly) */}
            {frequency === "weekly" && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Day of the Week:
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDayOfWeek(d.id)}
                      className={`py-2 px-1 rounded-lg text-xs font-semibold text-center transition-all ${
                        dayOfWeek === d.id
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="block text-[10px] sm:hidden">{d.short}</span>
                      <span className="hidden sm:block text-xs">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Time & Timezone Setting */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Timing & Timezone
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Scheduled Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: "07:30 Morning", val: "07:30" },
                    { label: "12:00 Midday", val: "12:00" },
                    { label: "18:30 Evening", val: "18:30" },
                    { label: "21:00 Night", val: "21:00" },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setTime(p.val)}
                      className={`px-2 py-0.5 text-[10px] rounded-md border transition-colors ${
                        time === p.val
                          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Timezone
                </label>
                <div className="relative">
                  <Compass className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. America/New_York or UTC"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Auto-detected from browser: <span className="font-mono">{timezone}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Socratic Reflection Theme Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Reflection Theme & Prompt Style
              </label>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                Active: {activeThemeMeta.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {themes.map((th) => {
                const isSelected = theme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 shadow-xs ring-1 ring-indigo-500"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {th.id === "mindful" && <Smile className="w-3.5 h-3.5 text-emerald-500" />}
                        {th.id === "socratic" && <Brain className="w-3.5 h-3.5 text-amber-500" />}
                        {th.id === "executive" && <Target className="w-3.5 h-3.5 text-blue-500" />}
                        {th.id === "gratitude" && <Sparkles className="w-3.5 h-3.5 text-rose-500" />}
                        {th.id === "reframe" && <Zap className="w-3.5 h-3.5 text-purple-500" />}
                        {th.label}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {th.tagline}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected Theme Sample Prompt Preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sample Prompt for {activeThemeMeta.label}:</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                "{activeThemeMeta.samplePrompt}"
              </p>
            </div>
          </div>

          {/* Custom Intention & Socratic Dynamic Generation Toggle */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              4. Personal Focus & AI Options
            </label>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Personal Intention or Current Goal (Optional)
              </label>
              <input
                type="text"
                value={customIntent}
                onChange={(e) => setCustomIntent(e.target.value)}
                placeholder="e.g. Grounding during launch, practicing executive prioritization, overcoming imposter doubts"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400">
                Gemini will weave your custom intention into the reminder's Socratic questions.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Dynamic Gemini Socratic Prompts
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Generate fresh, non-repetitive inquiry questions for every reminder email.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeSocraticPrompt}
                onClick={() => setIncludeSocraticPrompt(!includeSocraticPrompt)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  includeSocraticPrompt ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    includeSocraticPrompt ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Test Dispatch Result Feedback */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                testResult.success
                  ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80"
                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <h5
                    className={`text-xs font-bold ${
                      testResult.success
                        ? "text-emerald-900 dark:text-emerald-200"
                        : "text-rose-900 dark:text-rose-200"
                    }`}
                  >
                    {testResult.success ? "Test Reminder Generated Successfully!" : "Test Dispatch Error"}
                  </h5>
                  <p
                    className={`text-xs ${
                      testResult.success
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              </div>

              {/* Generated Socratic Prompts Preview */}
              {testResult.socraticQuestions && testResult.socraticQuestions.length > 0 && (
                <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                    Synthesized Socratic Inquiry:
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 pl-3">
                    {testResult.socraticQuestions.map((q, idx) => (
                      <li key={idx} className="list-disc">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Direct Mail Client Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {testResult.previewHtml && (
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
                  >
                    View Rendered HTML Email
                  </button>
                )}
                {testResult.gmailWebUrl && (
                  <a
                    href={testResult.gmailWebUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Gmail</span>
                  </a>
                )}
                {testResult.mailtoUrl && (
                  <a
                    href={testResult.mailtoUrl}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open in Mail Client</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Engine Status Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className={`w-4 h-4 ${
                  engineStatus?.smtpConfigured
                    ? "text-emerald-500"
                    : "text-amber-500"
                }`}
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Notification Infrastructure:{" "}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {engineStatus?.smtpConfigured
                    ? `Live SMTP Active (${engineStatus.smtpHost || "smtp.gmail.com"})`
                    : "Preview Mode Active (Configure SMTP for inbox delivery)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSendTestReminder}
            disabled={isSendingTest}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
          >
            {isSendingTest ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Synthesizing Test...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Reminder</span>
              </>
            )}
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-4 h-4" /> Preferences Saved!
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Reminder Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Rendered HTML Email Preview Modal */}
      {showPreviewModal && testResult?.previewHtml && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                Live Rendered Reminder Email Preview
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <iframe
                title="Email Preview"
                srcDoc={testResult.previewHtml}
                className="w-full h-[540px] border-0 rounded-xl bg-white shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

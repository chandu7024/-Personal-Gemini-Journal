import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  LogOut,
  ShieldCheck,
  Plus,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  Brain,
  TrendingUp,
  Mic,
  Radio,
  Compass,
  Bell,
  LayoutGrid,
  ChevronDown,
} from "lucide-react";
import type { User } from "firebase/auth";
import type { UserRole, EmailReminderSettings, UserProfile, AppTheme } from "../types";
import { ThemeSelector } from "./ThemeSelector";

interface NavbarProps {
  user: User | null;
  userProfile?: UserProfile | null;
  userRole?: UserRole;
  currentTheme?: AppTheme;
  onThemeSelect?: (theme: AppTheme) => void;
  reminderSettings?: EmailReminderSettings | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  onOpenProfile?: () => void;
  onOpenVoiceJournal?: () => void;
  onOpenConstellation?: () => void;
  onOpenReminders?: () => void;
  onOpenThreatModel: () => void;
  onOpenAdminConsole?: () => void;
  onOpenAnalytics?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  userProfile,
  userRole = "user",
  currentTheme = "light",
  onThemeSelect,
  reminderSettings,
  onSignOut,
  onNewEntry,
  onOpenProfile,
  onOpenVoiceJournal,
  onOpenConstellation,
  onOpenReminders,
  onOpenThreatModel,
  onOpenAdminConsole,
  onOpenAnalytics,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === "admin" || userRole === "super_admin";
  const isReminderActive = reminderSettings?.enabled;

  const displayName =
    userProfile?.displayName ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "Executive User");

  // Close tools dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    }
    if (isToolsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isToolsOpen]);

  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 flex items-center justify-between px-2.5 sm:px-4 h-14 sm:h-16 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors shrink-0 w-full"
    >
      {/* Left section: App Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="h-8.5 w-8.5 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0"
          title={isSidebarOpen ? "Hide Entry History" : "Show Entry History"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <PanelLeftOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Executive Geometric Brand Mark */}
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-xs ring-1 ring-white/20 dark:ring-slate-700/50 shrink-0">
            <Sparkles className="w-4 h-4 text-indigo-100" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Reflect<span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs whitespace-nowrap leading-none">
                Gemini
              </span>
            </div>
            <span className="hidden 2xl:block text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
              Executive Journal & Cognitive Reflection
            </span>
          </div>
        </div>
      </div>

      {/* Right section: Actions & Anchored User Profile (Zero horizontal overflow) */}
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
        {/* Primary Action 1: New Reflection */}
        <button
          id="btn-new-reflection-nav"
          onClick={onNewEntry}
          className="h-8.5 sm:h-9 px-2 sm:px-3 inline-flex items-center justify-center gap-1 sm:gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-all cursor-pointer ring-1 ring-indigo-600/20 whitespace-nowrap shrink-0 active:scale-98"
          title="Start a New Reflection Entry"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="hidden sm:inline whitespace-nowrap">New Reflection</span>
          <span className="sm:hidden whitespace-nowrap">New</span>
        </button>

        {/* Primary Action 2: Voice Socratic Dialogue */}
        {onOpenVoiceJournal && (
          <button
            id="btn-voice-journal-nav"
            onClick={onOpenVoiceJournal}
            className="h-8.5 sm:h-9 px-2 sm:px-3 inline-flex items-center justify-center gap-1 sm:gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0 ring-1 ring-purple-500/20 active:scale-98"
            title="Launch Real-Time Socratic Voice Journaling"
          >
            <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-200 animate-pulse shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">Voice</span>
          </button>
        )}

        {/* Quick Icon Links for Very Wide Screens (>= 1280px) */}
        {onOpenAnalytics && (
          <button
            id="btn-cognitive-analytics-nav"
            onClick={onOpenAnalytics}
            className="hidden xl:inline-flex h-9 w-9 items-center justify-center text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
            title="Cognitive Growth & Distortion Radar"
          >
            <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>
        )}

        {onOpenConstellation && (
          <button
            id="btn-constellation-nav"
            onClick={onOpenConstellation}
            className="hidden xl:inline-flex h-9 w-9 items-center justify-center text-purple-700 dark:text-purple-300 bg-purple-50/90 dark:bg-purple-950/70 hover:bg-purple-100 dark:hover:bg-purple-900/80 border border-purple-200/70 dark:border-purple-800/60 rounded-xl transition-all cursor-pointer shadow-2xs shrink-0"
            title="Subconscious Timeline & Constellation Graph"
          >
            <Compass className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </button>
        )}

        {onOpenReminders && (
          <button
            id="btn-reminders-nav"
            onClick={onOpenReminders}
            className={`hidden xl:inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer border shrink-0 relative ${
              isReminderActive
                ? "bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 shadow-2xs"
                : "bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
            }`}
            title="Reflection Email Reminders"
          >
            <Bell className={`w-4 h-4 ${isReminderActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
            {isReminderActive && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>
        )}

        {/* Tools & Features Dropdown (Compact, Responsive, Accessible) */}
        <div className="relative inline-block text-left" ref={toolsMenuRef}>
          <button
            id="btn-tools-menu-trigger"
            type="button"
            onClick={() => setIsToolsOpen((prev) => !prev)}
            className="h-8.5 sm:h-9 px-2 sm:px-2.5 inline-flex items-center justify-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-98"
            title="Explore Tools: Cognitive Radar, Constellation, Reminders & Security"
            aria-haspopup="true"
            aria-expanded={isToolsOpen}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">Tools</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
            {(isReminderActive || isAdmin) && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
            )}
          </button>

          {isToolsOpen && (
            <div
              id="menu-tools-dropdown"
              className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              role="menu"
            >
              <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  ReflectAI Cognitive Suite
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                {onOpenAnalytics && (
                  <button
                    onClick={() => {
                      onOpenAnalytics();
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Cognitive Analytics
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Distortion radar & vitality trajectories
                      </div>
                    </div>
                  </button>
                )}

                {onOpenConstellation && (
                  <button
                    onClick={() => {
                      onOpenConstellation();
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Subconscious Timeline
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Echo clusters & semantic graph
                      </div>
                    </div>
                  </button>
                )}

                {onOpenReminders && (
                  <button
                    onClick={() => {
                      onOpenReminders();
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 relative">
                      <Bell className="w-4 h-4" />
                      {isReminderActive && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Email Reminders
                        </span>
                        {isReminderActive && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Daily & weekly scheduled reflections
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenThreatModel();
                    setIsToolsOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Security Threat Model
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      Firestore RBAC & encrypted isolation
                    </div>
                  </div>
                </button>

                {onOpenAdminConsole && (
                  <button
                    onClick={() => {
                      onOpenAdminConsole();
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 relative">
                      <ShieldAlert className="w-4 h-4" />
                      {isAdmin && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Admin Console
                        </span>
                        {isAdmin && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                            Authorized
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        Telemetry, access audit & role management
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Executive Theme Palette Quick Selector */}
        {onThemeSelect && (
          <ThemeSelector
            currentTheme={currentTheme}
            onThemeSelect={onThemeSelect}
          />
        )}

        {/* Dedicated User Profile & Sign Out - Strictly Anchored, NEVER Goes Off-Screen */}
        {user && (
          <div className="flex items-center gap-1 sm:gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
            <button
              id="btn-user-profile-nav"
              onClick={onOpenProfile}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-left group shrink-0"
              title="Click to view & edit your User Profile & Themes"
            >
              {user.photoURL ? (
                <img
                  id="user-avatar-img"
                  src={user.photoURL}
                  alt={displayName}
                  className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-2xs shrink-0 ring-1 ring-indigo-500/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  id="user-avatar-placeholder"
                  className="flex items-center justify-center w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-indigo-600 to-slate-800 text-white text-xs font-bold shrink-0 shadow-2xs ring-1 ring-indigo-500/20"
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col text-left shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[65px] sm:max-w-[95px] md:max-w-[120px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {displayName}
                  </span>
                  <span
                    className={`hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isAdmin
                        ? "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
                <span className="hidden xl:block text-[10px] text-slate-400 truncate max-w-[110px]">
                  {user.email || "Authenticated"}
                </span>
              </div>
            </button>

            <button
              id="btn-sign-out"
              onClick={onSignOut}
              className="h-8.5 w-8.5 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};


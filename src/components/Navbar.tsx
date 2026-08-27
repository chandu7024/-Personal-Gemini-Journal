import React from "react";
import {
  Sparkles,
  LogOut,
  ShieldCheck,
  Plus,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { User } from "firebase/auth";

interface NavbarProps {
  user: User | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  onOpenThreatModel: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  onOpenThreatModel,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors"
    >
      {/* Left section: App Brand & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isSidebarOpen ? "Hide Entry History" : "Show Entry History"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
                ReflectAI
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                Gemini 3.6 Flash
              </span>
            </div>
            <span className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400">
              Isolated Firestore Reflections
            </span>
          </div>
        </div>
      </div>

      {/* Right section: Action Buttons & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          id="btn-new-reflection-nav"
          onClick={onNewEntry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Reflection</span>
        </button>

        <button
          id="btn-threat-model"
          onClick={onOpenThreatModel}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          title="Inspect Security Threat Model"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Threat Model</span>
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            {user.photoURL ? (
              <img
                id="user-avatar-img"
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                id="user-avatar-placeholder"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
              </div>
            )}

            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                {user.displayName || "Authenticated User"}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {user.email || "Google Account"}
              </span>
            </div>

            <button
              id="btn-sign-out"
              onClick={onSignOut}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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

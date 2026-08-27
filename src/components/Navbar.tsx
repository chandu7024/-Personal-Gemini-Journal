import React from "react";
import {
  Sparkles,
  LogOut,
  ShieldCheck,
  Plus,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from "lucide-react";
import type { User } from "firebase/auth";
import type { UserRole } from "../types";

interface NavbarProps {
  user: User | null;
  userRole?: UserRole;
  onSignOut: () => void;
  onNewEntry: () => void;
  onOpenThreatModel: () => void;
  onOpenAdminConsole?: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  userRole = "user",
  onSignOut,
  onNewEntry,
  onOpenThreatModel,
  onOpenAdminConsole,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const isAdmin = userRole === "admin" || userRole === "super_admin";
  return (
    <header
      id="main-navbar"
      className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 h-16 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors"
    >
      {/* Left section: App Brand & Sidebar Toggle */}
      <div className="flex items-center gap-3">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
          title={isSidebarOpen ? "Hide Entry History" : "Show Entry History"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-3">
          {/* Executive Geometric Brand Mark */}
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white shadow-xs ring-1 ring-white/20 dark:ring-slate-700/50">
            <Sparkles className="w-4.5 h-4.5 text-indigo-100" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100">
                Reflect<span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs">
                Gemini 3.6 Flash
              </span>
            </div>
            <span className="hidden md:block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Executive Journal & Cognitive Reflection
            </span>
          </div>
        </div>
      </div>

      {/* Right section: Action Buttons & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          id="btn-new-reflection-nav"
          onClick={onNewEntry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-all cursor-pointer ring-1 ring-indigo-600/20 hover:shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Reflection</span>
        </button>

        <button
          id="btn-threat-model"
          onClick={onOpenThreatModel}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 rounded-lg transition-colors cursor-pointer"
          title="Inspect Security Threat Model"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden md:inline">Threat Model</span>
        </button>

        {onOpenAdminConsole && (
          <button
            id="btn-admin-console"
            onClick={onOpenAdminConsole}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium rounded-lg transition-all cursor-pointer border ${
              isAdmin
                ? "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-2xs"
                : "bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300"
            }`}
            title="Open Executive Admin Dashboard (RBAC)"
          >
            <ShieldAlert className={`w-4 h-4 ${isAdmin ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`} />
            <span className="hidden md:inline">Admin Console</span>
            {isAdmin && (
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            )}
          </button>
        )}

        {user && (
          <div className="flex items-center gap-2 pl-2.5 border-l border-slate-200 dark:border-slate-800">
            {user.photoURL ? (
              <img
                id="user-avatar-img"
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-2xs"
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
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[130px]">
                {user.displayName || "Executive User"}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                {user.email || "Authenticated"}
              </span>
            </div>

            <button
              id="btn-sign-out"
              onClick={onSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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

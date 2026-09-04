import React, { useState } from "react";
import type { User } from "firebase/auth";
import type { UserProfile, UserRole, AppTheme } from "../types";
import { updateUserProfileDisplayName } from "../lib/firebase";
import { AVAILABLE_THEMES } from "../lib/theme";
import {
  User as UserIcon,
  X,
  Check,
  Edit3,
  Shield,
  ShieldCheck,
  Mail,
  Fingerprint,
  Calendar,
  Sparkles,
  BookOpen,
  Loader2,
  Palette,
} from "lucide-react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  userProfile: UserProfile | null;
  userRole: UserRole;
  totalEntriesCount: number;
  currentTheme?: AppTheme;
  onThemeSelect?: (theme: AppTheme) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  userProfile,
  userRole,
  totalEntriesCount,
  currentTheme = "light",
  onThemeSelect,
}) => {
  const currentDisplayName =
    userProfile?.displayName ||
    user.displayName ||
    (user.email ? user.email.split("@")[0] : "ReflectAI User");

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentDisplayName);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setErrorMsg("Display name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateUserProfileDisplayName(user.uid, trimmed);
      setSuccessMsg("Display name updated successfully!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error("Failed to update profile name:", err);
      setErrorMsg(err?.message || "Failed to update name. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isAdmin = userRole === "admin" || userRole === "super_admin";

  return (
    <div
      id="modal-user-profile-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs antialiased animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="modal-user-profile"
        className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                User Profile & Identity
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Manage your authenticated identity & display name
              </p>
            </div>
          </div>

          <button
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Success / Error Feedback */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* User Identity Hero Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={currentDisplayName}
                className="w-14 h-14 rounded-full border-2 border-indigo-500/30 object-cover shadow-xs shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600 to-slate-800 text-white text-xl font-bold shrink-0 shadow-xs">
                {currentDisplayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentDisplayName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? "bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
                      : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {userRole}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                <span>{user.email || "Authenticated Account"}</span>
              </p>
            </div>
          </div>

          {/* Display Name Edit Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="input-profile-display-name"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Displayed Name
              </label>
              {!isEditing && (
                <button
                  id="btn-edit-profile-name"
                  onClick={() => {
                    setNameInput(currentDisplayName);
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Change Name</span>
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    id="input-profile-display-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName();
                      if (e.key === "Escape") setIsEditing(false);
                    }}
                    placeholder="Enter your name..."
                    autoFocus
                    maxLength={40}
                    className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-indigo-500 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                  />
                  <button
                    id="btn-save-profile-name"
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Save</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-2.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  This name will be displayed in greetings, headers, reflections, and export logs.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200">
                {currentDisplayName}
              </div>
            )}
          </div>

          {/* Visual Appearance & Theme Palette */}
          {onThemeSelect && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Visual Canvas Theme</span>
                </label>
                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Live Preview
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_THEMES.map((theme) => {
                  const isSelected = theme.id === currentTheme;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => onThemeSelect(theme.id)}
                      className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/40"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg border border-slate-300/80 dark:border-slate-700 shadow-2xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: theme.previewBg }}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.previewAccent }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {theme.name}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                          {theme.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account Metadata Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Reflections Stored</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {totalEntriesCount} Entries
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Security Isolation</span>
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                Active &bull; Firestore
              </div>
            </div>
          </div>

          {/* User UID & ID details */}
          <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Fingerprint className="w-3 h-3" /> User Identifier:
              </span>
              <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                {user.uid}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

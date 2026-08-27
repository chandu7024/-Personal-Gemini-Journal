import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { EntryWorkspace } from "./EntryWorkspace";
import { InsightsDrawer } from "./InsightsDrawer";
import { ThreatModelModal } from "./ThreatModelModal";
import { AdminDashboardModal } from "./AdminDashboardModal";
import {
  subscribeToUserEntries,
  subscribeToEntryMessages,
  subscribeToUserProfile,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  saveJournalMessage,
  saveEntrySummary,
} from "../lib/firebase";
import { sendChatMessage, summarizeJournalEntry } from "../lib/geminiApi";
import type { JournalEntry, JournalMessage, ReflectionMode, EntryLocation, UserRole } from "../types";
import { Loader2, Plus, Sparkles, BookOpen } from "lucide-react";

interface DashboardProps {
  user: User;
  onSignOut: () => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSignOut }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [userRole, setUserRole] = useState<UserRole>(user.email === "chandu7024@gmail.com" ? "admin" : "user");
  
  const [isEntriesLoading, setIsEntriesLoading] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isThreatModalOpen, setIsThreatModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // Subscribe to user profile to monitor role in real-time
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribeProfile = subscribeToUserProfile(user.uid, (profile) => {
      if (profile && profile.role) {
        setUserRole(profile.role);
      }
    });
    return () => unsubscribeProfile();
  }, [user.uid]);

  // 1. Subscribe to User's Journal Entries (Isolated by user.uid in Firestore)
  useEffect(() => {
    if (!user.uid) return;

    setIsEntriesLoading(true);
    const unsubscribe = subscribeToUserEntries(
      user.uid,
      (userEntries) => {
        setEntries(userEntries);
        setIsEntriesLoading(false);

        // Auto-sanitize any accidental markdown summary tags from entries in Firestore
        userEntries.forEach((entry) => {
          if (entry.tags && Array.isArray(entry.tags)) {
            const hasInvalidTags = entry.tags.some(
              (t) =>
                typeof t !== "string" ||
                t.includes("\n") ||
                t.includes("Executive Summary") ||
                t.includes("Navigating Priorities") ||
                t.length > 40
            );
            if (hasInvalidTags) {
              const cleanedTags = entry.tags.filter(
                (t) =>
                  typeof t === "string" &&
                  !t.includes("\n") &&
                  !t.includes("Executive Summary") &&
                  !t.includes("Navigating Priorities") &&
                  t.length <= 40
              );
              updateJournalEntry(user.uid, entry.id, { tags: cleanedTags }).catch((err) => {
                console.warn("[Firestore] Auto-cleaned invalid tag:", err);
              });
            }
          }
        });

        // Auto-select first entry if none is active or active was deleted
        if (userEntries.length > 0) {
          setActiveEntryId((prev) => {
            if (!prev || !userEntries.some((e) => e.id === prev)) {
              return userEntries[0].id;
            }
            return prev;
          });
        } else {
          setActiveEntryId(null);
        }
      },
      (error) => {
        console.error("Firestore user entries error:", error);
        setIsEntriesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // 2. Subscribe to Active Entry's Messages
  useEffect(() => {
    if (!user.uid || !activeEntryId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToEntryMessages(
      user.uid,
      activeEntryId,
      (entryMessages) => {
        setMessages(entryMessages);
      },
      (error) => {
        console.error("Firestore messages error:", error);
      }
    );

    return () => unsubscribe();
  }, [user.uid, activeEntryId]);

  const activeEntry = entries.find((e) => e.id === activeEntryId) || null;

  // Handler: Create New Entry
  const handleNewEntry = async () => {
    try {
      const newEntryId = await createJournalEntry(user.uid, "New Reflection", "mindful");
      setActiveEntryId(newEntryId);
      // Auto-open sidebar if closed on mobile
      if (window.innerWidth < 640) {
        setIsSidebarOpen(false);
      }
    } catch (error) {
      console.error("Failed to create journal entry:", error);
    }
  };

  // Handler: Delete Entry
  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteJournalEntry(user.uid, entryId);
      if (activeEntryId === entryId) {
        const remaining = entries.filter((e) => e.id !== entryId);
        setActiveEntryId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };

  // Handler: Toggle Pin
  const handleTogglePin = async (entryId: string, currentPin: boolean) => {
    try {
      await updateJournalEntry(user.uid, entryId, { pinned: currentPin });
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  // Handler: Update Title
  const handleUpdateTitle = async (newTitle: string) => {
    if (!activeEntryId) return;
    try {
      await updateJournalEntry(user.uid, activeEntryId, { title: newTitle });
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  // Handler: Change Reflection Mode
  const handleChangeMode = async (mode: ReflectionMode) => {
    if (!activeEntryId) return;
    try {
      await updateJournalEntry(user.uid, activeEntryId, { mode });
    } catch (error) {
      console.error("Failed to change reflection mode:", error);
    }
  };

  // Handler: Add Tag
  const handleAddTag = async (rawTag: string) => {
    if (!activeEntry || !activeEntryId) return;
    const sanitizedTag = rawTag
      .replace(/^#+/, "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 30);
    if (!sanitizedTag) return;

    const currentTags = activeEntry.tags || [];
    if (!currentTags.includes(sanitizedTag)) {
      const updated = [...currentTags, sanitizedTag];
      await updateJournalEntry(user.uid, activeEntryId, { tags: updated });
    }
  };

  // Handler: Remove Tag
  const handleRemoveTag = async (tag: string) => {
    if (!activeEntry || !activeEntryId) return;
    const currentTags = activeEntry.tags || [];
    const updated = currentTags.filter((t) => t !== tag);
    await updateJournalEntry(user.uid, activeEntryId, { tags: updated });
  };

  // Handler: Update Pinned Location
  const handleUpdateLocation = async (location: EntryLocation | null) => {
    if (!activeEntryId) return;
    try {
      await updateJournalEntry(user.uid, activeEntryId, { location });
    } catch (error) {
      console.error("Failed to update entry location:", error);
    }
  };

  // Handler: Send Message & Get Gemini Reflection
  const handleSendMessage = async (userContent: string) => {
    if (!activeEntryId || !activeEntry) return;

    // 1. Save User Message to Firestore
    await saveJournalMessage(user.uid, activeEntryId, {
      role: "user",
      content: userContent,
    });

    // 2. Prepare context for Gemini Chat
    const conversationPayload = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    setIsAiGenerating(true);

    try {
      // 3. Call backend Gemini Chat API with fallback ladder & location context
      const response = await sendChatMessage({
        messages: conversationPayload,
        mode: activeEntry.mode,
        location: activeEntry.location ? {
          lat: activeEntry.location.lat,
          lng: activeEntry.location.lng,
          placeName: activeEntry.location.placeName,
        } : null,
      });

      if (response.success && response.text) {
        // 4. Save Gemini Reflection to Firestore
        await saveJournalMessage(user.uid, activeEntryId, {
          role: "assistant",
          content: response.text,
          modelUsed: response.modelUsed,
        });

        // 5. If this was the first user message and title is default, generate a smart title
        if (messages.length === 0 && activeEntry.title === "New Reflection") {
          const autoTitle = userContent.slice(0, 30).trim() + "...";
          await updateJournalEntry(user.uid, activeEntryId, { title: autoTitle });
        }
      }
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
      throw error;
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Handler: Trigger Synthesis
  const handleSynthesize = async () => {
    if (!activeEntryId || !activeEntry || messages.length === 0) return;

    setIsSynthesizing(true);
    setIsInsightsOpen(true);

    try {
      const response = await summarizeJournalEntry({
        messages,
        title: activeEntry.title,
      });

      if (response.success && response.summary) {
        await saveEntrySummary(user.uid, activeEntryId, response.summary);
      }
    } catch (error) {
      console.error("Failed to synthesize journal entry:", error);
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/75 dark:bg-[#0b0f17] flex flex-col antialiased">
      {/* Top Navigation */}
      <Navbar
        user={user}
        userRole={userRole}
        onSignOut={onSignOut}
        onNewEntry={handleNewEntry}
        onOpenThreatModel={() => setIsThreatModalOpen(true)}
        onOpenAdminConsole={() => setIsAdminModalOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Entries History */}
        <Sidebar
          entries={entries}
          activeEntryId={activeEntryId}
          onSelectEntry={(id) => setActiveEntryId(id)}
          onNewEntry={handleNewEntry}
          onDeleteEntry={handleDeleteEntry}
          onTogglePin={handleTogglePin}
          isOpen={isSidebarOpen}
        />

        {/* Center Workspace */}
        {isEntriesLoading ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Loading isolated reflections from Firestore...
              </p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
              <BookOpen className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Your Private Journal is Ready
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
              Create your first journal entry to start a multi-turn reflective dialogue with Gemini. All reflections are strictly encrypted and isolated in Firestore.
            </p>
            <button
              id="btn-create-first-reflection"
              onClick={handleNewEntry}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Reflection</span>
            </button>
          </div>
        ) : activeEntry ? (
          <EntryWorkspace
            entry={activeEntry}
            messages={messages}
            isLoading={isAiGenerating}
            onSendMessage={handleSendMessage}
            onUpdateTitle={handleUpdateTitle}
            onChangeMode={handleChangeMode}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onUpdateLocation={handleUpdateLocation}
            isInsightsOpen={isInsightsOpen}
            onToggleInsights={() => setIsInsightsOpen((prev) => !prev)}
          />
        ) : null}

        {/* Right Drawer: AI Insights & Synthesis */}
        {activeEntry && (
          <InsightsDrawer
            summary={activeEntry.summary || null}
            entry={activeEntry}
            userEmail={user.email}
            isLoading={isSynthesizing}
            onSynthesize={handleSynthesize}
            isOpen={isInsightsOpen}
            onClose={() => setIsInsightsOpen(false)}
          />
        )}
      </div>

      {/* Threat Model Modal */}
      <ThreatModelModal
        isOpen={isThreatModalOpen}
        onClose={() => setIsThreatModalOpen(false)}
      />

      {/* Admin Dashboard Modal */}
      <AdminDashboardModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUser={{
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }}
        currentRole={userRole}
      />
    </div>
  );
};

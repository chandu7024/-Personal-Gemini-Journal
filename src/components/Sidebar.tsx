import React, { useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Pin,
  Calendar,
  Sparkles,
  Tag,
  MapPin,
  Smile,
  BookOpen,
  Filter,
  Check,
  Mic,
} from "lucide-react";
import type { JournalEntry, ReflectionMode } from "../types";

interface SidebarProps {
  entries: JournalEntry[];
  activeEntryId: string | null;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
  onOpenVoiceJournal?: () => void;
  onDeleteEntry: (entryId: string) => void;
  onTogglePin: (entryId: string, currentPin: boolean) => void;
  isOpen: boolean;
}

const MODE_LABELS: Record<ReflectionMode, { label: string; color: string }> = {
  mindful: { label: "Mindful", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300" },
  socratic: { label: "Socratic", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300" },
  brainstorm: { label: "Brainstorm", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300" },
  gratitude: { label: "Gratitude", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300" },
  executive: { label: "Action", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300" },
};

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  activeEntryId,
  onSelectEntry,
  onNewEntry,
  onOpenVoiceJournal,
  onDeleteEntry,
  onTogglePin,
  isOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags || [])));

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.snippet && entry.snippet.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag ? entry.tags && entry.tags.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  // Sort pinned entries to top
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recent";
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      id="sidebar-journal-history"
      className="w-full sm:w-80 md:w-88 border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0f172a]/90 flex flex-col h-[calc(100vh-4rem)] shrink-0 z-20 transition-all backdrop-blur-xs"
    >
      {/* Sidebar Header & New Button */}
      <div className="p-4 border-b border-slate-200/70 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Reflections Log
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {entries.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenVoiceJournal && (
              <button
                id="btn-sidebar-voice-entry"
                onClick={onOpenVoiceJournal}
                className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 transition-colors cursor-pointer border border-purple-200/60 dark:border-purple-800/60 shadow-2xs"
                title="Launch Socratic Voice Journal"
              >
                <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </button>
            )}

            <button
              id="btn-sidebar-new-entry"
              onClick={onNewEntry}
              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60 shadow-2xs"
              title="Start New Reflection"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="input-search-entries"
            type="text"
            placeholder="Search reflections & keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-900 dark:text-slate-100 placeholder-slate-400 shadow-2xs"
          />
        </div>

        {/* Tag Filters if available */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 cursor-pointer ${
                selectedTag === null
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                title={`#${tag}`}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all shrink-0 max-w-[140px] truncate cursor-pointer ${
                  selectedTag === tag
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {sortedEntries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <p className="text-xs">No reflection entries found.</p>
            <button
              onClick={onNewEntry}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-block"
            >
              Create your first entry &rarr;
            </button>
          </div>
        ) : (
          sortedEntries.map((entry) => {
            const isActive = entry.id === activeEntryId;
            const modeMeta = MODE_LABELS[entry.mode] || MODE_LABELS.mindful;

            return (
              <div
                key={entry.id}
                id={`entry-item-${entry.id}`}
                onClick={() => onSelectEntry(entry.id)}
                className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? "bg-white dark:bg-slate-850 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-500/10"
                    : "bg-white/80 hover:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-850 border-slate-200/60 hover:border-slate-300 dark:border-slate-800 hover:shadow-2xs"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-600 dark:bg-indigo-500 rounded-r-full" />
                )}

                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {entry.pinned && (
                      <Pin className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0 fill-indigo-600 dark:fill-indigo-400" />
                    )}
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isActive
                          ? "text-indigo-950 dark:text-indigo-100"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {entry.title || "Untitled Reflection"}
                    </h3>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                    {formatDate(entry.updatedAt)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2.5 leading-relaxed">
                  {entry.snippet || "Empty reflection session..."}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded-sm font-semibold ${modeMeta.color}`}>
                      {modeMeta.label}
                    </span>
                    {entry.location && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                        <MapPin className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[80px]">{entry.location.placeName}</span>
                      </span>
                    )}
                    {entry.mood && (
                      <span className="px-1.5 py-0.5 rounded-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {entry.mood}
                      </span>
                    )}
                  </div>

                  {/* Actions on hover/active */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(entry.id, !entry.pinned);
                      }}
                      className={`p-1 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                        entry.pinned ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                      }`}
                      title={entry.pinned ? "Unpin entry" : "Pin entry to top"}
                    >
                      <Pin className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEntryToDelete(entry.id);
                      }}
                      className="p-1 rounded-sm text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {entryToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => setEntryToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Delete Reflection Entry?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will permanently remove this journal reflection and all multi-turn dialogue with Gemini from your Firestore store.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteEntry(entryToDelete);
                  setEntryToDelete(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

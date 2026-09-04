import React, { useState, useRef, useEffect } from "react";
import { Palette, Check, Sun, Moon, Sparkles, Feather } from "lucide-react";
import type { AppTheme } from "../types";
import { AVAILABLE_THEMES } from "../lib/theme";

interface ThemeSelectorProps {
  currentTheme: AppTheme;
  onThemeSelect: (theme: AppTheme) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeThemeMeta = AVAILABLE_THEMES.find((t) => t.id === currentTheme) || AVAILABLE_THEMES[0];

  const getThemeIcon = (themeId: AppTheme) => {
    switch (themeId) {
      case "dark":
        return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      case "warm-linen":
        return <Feather className="w-3.5 h-3.5 text-amber-600" />;
      case "nordic-sage":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-600" />;
      case "executive-ice":
        return <Sparkles className="w-3.5 h-3.5 text-sky-600" />;
      case "light":
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        id="btn-theme-selector-trigger"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-9 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 active:scale-98"
        title={`Current Theme: ${activeThemeMeta.name}. Click to switch theme.`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="flex items-center justify-center">{getThemeIcon(currentTheme)}</span>
        <span className="hidden lg:inline text-slate-800 dark:text-slate-200 font-medium">
          {activeThemeMeta.name}
        </span>
        <span
          className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/20 shrink-0"
          style={{ backgroundColor: activeThemeMeta.previewAccent }}
        />
      </button>

      {isOpen && (
        <div
          id="menu-theme-options-dropdown"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200/90 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="menu"
        >
          {/* Header */}
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Visual Canvas Themes
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Select your preferred reading & reflection palette
            </p>
          </div>

          {/* Theme List */}
          <div className="p-1.5 space-y-1 max-h-[380px] overflow-y-auto">
            {AVAILABLE_THEMES.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  id={`btn-select-theme-${theme.id}`}
                  onClick={() => {
                    onThemeSelect(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start gap-3 border ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-2xs"
                      : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                  role="menuitem"
                >
                  {/* Swatch Preview */}
                  <div
                    className="w-10 h-10 rounded-xl border border-slate-300/80 dark:border-slate-700 shadow-2xs relative flex items-center justify-center shrink-0 overflow-hidden"
                    style={{ backgroundColor: theme.previewBg }}
                  >
                    {/* Inner Card Layer */}
                    <div
                      className="w-6 h-6 rounded-md shadow-2xs border border-black/5 flex items-center justify-center"
                      style={{ backgroundColor: theme.previewCard }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: theme.previewAccent }}
                      />
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {theme.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-sm uppercase tracking-wider ${
                          theme.category === "Professional Light"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            : theme.category === "Standard Dark"
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {theme.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-tight">
                      {theme.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

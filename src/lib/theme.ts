import type { AppTheme, ThemeMetadata } from "../types";

export const THEME_STORAGE_KEY = "reflectai-theme";

export const AVAILABLE_THEMES: ThemeMetadata[] = [
  {
    id: "light",
    name: "Clinical Slate",
    category: "Standard Light",
    description: "Crisp, balanced light mode with clean slate borders and indigo focus anchors.",
    previewBg: "#f8fafc",
    previewCard: "#ffffff",
    previewAccent: "#4f46e5",
    previewText: "#0f172a",
  },
  {
    id: "dark",
    name: "Obsidian Night",
    category: "Standard Dark",
    description: "Deep obsidian dark mode engineered for nighttime introspection and eye comfort.",
    previewBg: "#0b0f17",
    previewCard: "#0f172a",
    previewAccent: "#6366f1",
    previewText: "#f8fafc",
  },
  {
    id: "warm-linen",
    name: "Warm Sand & Linen",
    category: "Professional Light",
    description: "Soft almond parchment and warm stone tones that reduce blue light strain.",
    previewBg: "#faf7f2",
    previewCard: "#fffdf9",
    previewAccent: "#c2410c",
    previewText: "#292524",
  },
  {
    id: "nordic-sage",
    name: "Nordic Mindful Sage",
    category: "Professional Light",
    description: "Serene Scandinavian botanical mist with muted eucalyptus borders and calming teal.",
    previewBg: "#f4f7f5",
    previewCard: "#ffffff",
    previewAccent: "#0d9488",
    previewText: "#192e22",
  },
  {
    id: "executive-ice",
    name: "Executive Arctic Ice",
    category: "Professional Light",
    description: "Crisp corporate glacier slate providing high-clarity focus and clean structure.",
    previewBg: "#f0f4f8",
    previewCard: "#ffffff",
    previewAccent: "#0284c7",
    previewText: "#0f172a",
  },
];

/**
 * Retrieve the saved theme from localStorage, or return default 'light'.
 */
export function getSavedAppTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
    if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.warn("Could not read theme from localStorage:", e);
  }
  return "light";
}

/**
 * Apply the theme to document.documentElement and persist to localStorage.
 */
export function applyAppTheme(theme: AppTheme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.setAttribute("data-theme", theme);

  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    console.warn("Could not persist theme to localStorage:", e);
  }
}

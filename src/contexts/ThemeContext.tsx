import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEMES = [
  { name: "default-dark", dark: true },
  { name: "light", dark: false },
  { name: "cerulean-sand", dark: true },
  { name: "ember-violet", dark: true },
  { name: "lagoon-royal", dark: true },
  { name: "crimson-noir", dark: true },
  { name: "mosswood", dark: true },
  { name: "ultramarine-pop", dark: true },
  { name: "rose-plum", dark: true },
  { name: "pastel-garden", dark: false },
  { name: "sunburst-red", dark: true },
] as const;

export type ThemeName = (typeof THEMES)[number]["name"];

const allThemes = new Set<string>(THEMES.map((t) => t.name));
const darkThemes = new Set<string>(
  THEMES.filter((t) => t.dark).map((t) => t.name),
);

const STORAGE_KEY = "seasons-past-theme";

function loadTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && allThemes.has(stored)) {
      return stored as ThemeName;
    }
  } catch {}
  return "default-dark";
}

// Apply theme at module scope so the first React render already has correct DOM state.
// The blocking <script> in index.html handles the very first paint; this covers
// cases where the module loads after the initial HTML parse (e.g. code-split routes).
const initialTheme = loadTheme();
function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", darkThemes.has(theme));
}
applyTheme(initialTheme);

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}

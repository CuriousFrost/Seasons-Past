import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemeName =
  | "default-dark"
  | "midnight"
  | "forest"
  | "blood-moon"
  | "azorius"
  | "dimir"
  | "selesnya";

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const allThemes = new Set<ThemeName>([
  "default-dark",
  "midnight",
  "forest",
  "blood-moon",
  "azorius",
  "dimir",
  "selesnya",
]);

const darkThemes = new Set<ThemeName>([
  "default-dark",
  "midnight",
  "forest",
  "blood-moon",
  "dimir",
]);

const STORAGE_KEY = "seasons-past-theme";

function loadTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && allThemes.has(stored as ThemeName)) {
      return stored as ThemeName;
    }
  } catch {}
  return "default-dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(loadTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", darkThemes.has(theme));
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
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

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_APP_THEME, type AppTheme, applyAppTheme, readCachedAppTheme } from "@/lib/app-theme";

export type Theme = AppTheme;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updatePreferences } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => readCachedAppTheme());
  const activeTheme = useRef(theme);
  const themeChangeRevision = useRef(0);
  const userId = user?.id;
  const userTheme = user?.theme;

  useEffect(() => {
    applyAppTheme(theme);
    try {
      window.localStorage.setItem("continuum.app-theme", theme);
    } catch (error) {
      console.warn("Failed to cache app theme", error);
    }
  }, [theme]);

  useEffect(() => {
    if (userId) {
      const nextTheme = userTheme ?? DEFAULT_APP_THEME;
      activeTheme.current = nextTheme;
      setThemeState(nextTheme);
    }
  }, [userId, userTheme]);

  const setTheme = async (nextTheme: Theme) => {
    const previousTheme = activeTheme.current;
    const revision = ++themeChangeRevision.current;
    activeTheme.current = nextTheme;
    setThemeState(nextTheme);
    applyAppTheme(nextTheme);
    try {
      if (user) await updatePreferences({ theme: nextTheme });
      else window.localStorage.setItem("continuum.app-theme", nextTheme);
    } catch (error) {
      if (themeChangeRevision.current === revision) {
        activeTheme.current = previousTheme;
        setThemeState(previousTheme);
        applyAppTheme(previousTheme);
      }
      throw error;
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
    if (userId) setThemeState(userTheme ?? DEFAULT_APP_THEME);
  }, [userId, userTheme]);

  const setTheme = async (nextTheme: Theme) => {
    const previousTheme = theme;
    setThemeState(nextTheme);
    try {
      if (user) await updatePreferences({ theme: nextTheme });
      else window.localStorage.setItem("continuum.app-theme", nextTheme);
    } catch (error) {
      setThemeState(previousTheme);
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

export const DEFAULT_APP_THEME = "CLASSIC" as const;
export const APP_THEMES = ["CLASSIC", "CHARCOAL"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "CLASSIC" || value === "CHARCOAL";
}

export function readCachedAppTheme(): AppTheme {
  if (typeof window === "undefined") return DEFAULT_APP_THEME;
  try {
    const cached = localStorage.getItem("auth_user");
    if (cached) {
      const user: unknown = JSON.parse(cached);
      if (typeof user === "object" && user !== null && "theme" in user) {
        if (user.theme === "AMOLED") return "CLASSIC";
        if (isAppTheme(user.theme)) return user.theme;
      }
    }
    const stored = localStorage.getItem("continuum.app-theme");
    if (stored === "AMOLED") return "CLASSIC";
    return isAppTheme(stored) ? stored : DEFAULT_APP_THEME;
  } catch {
    return DEFAULT_APP_THEME;
  }
}

export function applyAppTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light");
  root.classList.add("dark");
  root.classList.toggle("theme-charcoal", theme === "CHARCOAL");
  root.style.colorScheme = "dark";
}

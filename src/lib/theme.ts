export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "support-platform-theme";

export const DEFAULT_THEME: Theme = "dark";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode errors
  }
}

export function getInitialTheme(): Theme {
  return readStoredTheme() ?? DEFAULT_THEME;
}

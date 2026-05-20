export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "support-platform-theme";

export const DEFAULT_THEME: Theme = "dark";

/** Always used on the sign-in screen (does not overwrite saved preference). */
export const LOGIN_THEME: Theme = "light";

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

export function applyTheme(theme: Theme, options?: { persist?: boolean }) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  if (options?.persist !== false) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore quota / private mode errors
    }
  }

  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute(
    "content",
    theme === "dark" ? "#0a0a0c" : "#f8f9fb",
  );
}

export function applyLoginTheme() {
  applyTheme(LOGIN_THEME, { persist: false });
}

export function getInitialTheme(): Theme {
  return readStoredTheme() ?? DEFAULT_THEME;
}

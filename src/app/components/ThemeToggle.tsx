"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "./ThemeProvider";
import type { Theme } from "../../lib/theme";

const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectTheme(next: Theme) {
    setTheme(next);
    setOpen(false);
  }

  const activeLabel =
    OPTIONS.find((option) => option.value === theme)?.label ?? "Dark";

  return (
    <div className="theme-toggle" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="secondary-button compact-session-button theme-toggle-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        Theme: {activeLabel}
      </button>
      {open ? (
        <div
          className="theme-toggle-menu"
          id={menuId}
          role="menu"
          aria-label="Choose theme"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`theme-toggle-option${
                option.value === theme ? " is-active" : ""
              }`}
              onClick={() => selectTheme(option.value)}
              role="menuitemradio"
              aria-checked={option.value === theme}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { THEME_COLORS, THEME_KEY } from "@/lib/theme";

type Theme = "dark" | "light";

const EVENT = "vf-theme";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

function apply(theme: Theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  // Browser/status bar color follows the theme.
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still switches, just isn't remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Small round sun/moon button fixed to the bottom-right corner. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => apply(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 grid size-11 place-items-center rounded-full border border-line bg-surface text-muted shadow-lg transition hover:text-foreground active:scale-90"
    >
      {theme === "dark" ? (
        // Sun: tap for light
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon: tap for dark
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}

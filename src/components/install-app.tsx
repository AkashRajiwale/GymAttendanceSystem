"use client";

import { useState, useSyncExternalStore } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

declare global {
  interface Window {
    /** Saved by the inline script in layout.tsx when Chrome says the app can be installed. */
    __vfInstall?: InstallPromptEvent | null;
  }
}

type Mode = "hidden" | "prompt" | "ios";

function subscribe(onChange: () => void) {
  window.addEventListener("vf-install", onChange);
  return () => window.removeEventListener("vf-install", onChange);
}

function getMode(): Mode {
  const installed =
    matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (installed) return "hidden";
  if (window.__vfInstall) return "prompt";
  // iPhone/iPad Safari has no install prompt; we can only explain the Share-menu steps.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "hidden";
}

/**
 * Small "Install app" button. Android Chrome: opens the system install dialog in one tap.
 * iPhone: shows the two Safari steps. Hidden when already installed or not supported.
 */
export function InstallApp() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "hidden" as Mode);
  const [iosHelp, setIosHelp] = useState(false);

  if (mode === "hidden") return null;

  async function install() {
    if (mode === "ios") return setIosHelp((v) => !v);
    const prompt = window.__vfInstall;
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    // The saved event can only be used once.
    window.__vfInstall = null;
    window.dispatchEvent(new Event("vf-install"));
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={install}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
        </svg>
        Install app
      </button>
      {iosHelp && (
        <p className="max-w-xs rounded-xl bg-surface-2 px-4 py-3 text-center text-sm text-muted">
          In Safari, tap the <span className="font-semibold text-foreground">Share</span> button{" "}
          <span aria-hidden>⎋</span>, then <span className="font-semibold text-foreground">Add to Home Screen</span>.
        </p>
      )}
    </div>
  );
}

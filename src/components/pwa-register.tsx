"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for basic installability / offline shell.
 * Lean custom SW — no heavy PWA framework in Milestone 1.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failures are non-fatal in local HTTP / unsupported browsers.
    });
  }, []);

  return null;
}

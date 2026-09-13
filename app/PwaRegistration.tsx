"use client";

import { useEffect } from "react";

export default function PwaRegistration() {
  useEffect(() => {
    // Keep Next's development/HMR responses out of persistent caches.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(error => console.warn("TutorFlow: service worker registration failed", error)); };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}

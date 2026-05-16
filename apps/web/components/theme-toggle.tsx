"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "crm.theme";

type Theme = "light" | "dark";

/**
 * Toggle between light and dark mode by flipping the `dark` class on <html>.
 * Persists the choice in localStorage. We apply the saved value inside a
 * useEffect after hydration to avoid SSR/CSR mismatches — server always
 * renders with no `dark` class.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (window.localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "light";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private mode etc — ignore
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      className="px-2 py-1 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
      aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"}
      title={theme === "light" ? "Modo oscuro" : "Modo claro"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

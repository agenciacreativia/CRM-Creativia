import type { Config } from "tailwindcss";

/**
 * Turistea brand palette (locked 2026-05-16):
 *   #95DE00  brand-green     — accent / CTAs / success
 *   #272255  brand-primary   — main brand color / dark-mode surface
 *   #FF793E  brand-orange    — warm accent / warnings
 *   #000417  brand-ink       — dark-mode body background
 *   #1F3243  brand-slate     — dark-mode subtle surfaces
 *   #85C2F6  brand-sky       — info / dark-mode muted text
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#272255",
          green: "#95DE00",
          orange: "#FF793E",
          ink: "#000417",
          slate: "#1F3243",
          sky: "#85C2F6",
          secondary: "#FF793E",
        },
        status: {
          ok: "#95DE00",
          warn: "#FF793E",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

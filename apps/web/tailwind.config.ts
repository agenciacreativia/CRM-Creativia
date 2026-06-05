import type { Config } from "tailwindcss";

/**
 * Horizon Voyager design system (Stitch 2026-06-05).
 *
 * Primary  (Navy):  #272255  — sidebar / branding / authority.
 * Lime    (Green):  #aaf52b  — CTAs / success / "active" status.
 * Tertiary(Orange): #ea6a30  — urgent alerts, "New Lead" highlights.
 * Ink     (Dark):   #000417  — sidebar background (high-contrast utility).
 * Slate:            #1f3243  — secondary text / outlines.
 * Sky:              #85c2f6  — info / soft accents.
 *
 * Backwards-compatible: existing classes (brand-primary, brand-green,
 * brand-orange, status-ok/warn/danger) keep working.
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
        // ---- Brand (Stitch tokens) ----
        brand: {
          primary: "#272255",           // primary-container in Stitch (used as primary)
          "primary-dark": "#120b40",    // Stitch primary (darker)
          "primary-soft": "#8f8ac4",    // on-primary-container
          green: "#aaf52b",             // secondary-container (CTA / success)
          "green-dark": "#446900",      // secondary
          orange: "#ea6a30",            // on-tertiary-container (urgent)
          "orange-soft": "#ffb598",     // tertiary-fixed-dim
          ink: "#000417",               // darkest sidebar background
          slate: "#1f3243",             // inverse-surface
          sky: "#85c2f6",               // soft info accent
          secondary: "#ea6a30",         // alias for legacy code
          // Aliases para clases que ya usaba la UI (brand-navy / brand-navy-deep)
          navy: "#272255",
          "navy-deep": "#120b40",
        },
        // ---- Surfaces (Horizon Voyager tonal layering) ----
        surface: {
          DEFAULT: "#f7f9ff",
          dim: "#c8dcf2",
          bright: "#f7f9ff",
          lowest: "#ffffff",
          low: "#edf4ff",
          base: "#e2efff",
          high: "#d8eaff",
          highest: "#d1e5fb",
        },
        // ---- On-surface / text ----
        ink: {
          DEFAULT: "#081d2d",
          variant: "#47464f",
          inverse: "#e8f2ff",
        },
        outline: {
          DEFAULT: "#787680",
          variant: "#c9c5d0",
        },
        // ---- Status ----
        status: {
          ok: "#aaf52b",
          "ok-dark": "#446900",
          warn: "#ea6a30",
          danger: "#ba1a1a",
          "danger-container": "#ffdad6",
        },
      },
      fontFamily: {
        // Poppins everywhere (Stitch). Fallbacks keep system stable if not loaded.
        sans: ["Poppins", "Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Stitch typography scale.
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "500" }],
        "label-lg": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "42px", fontWeight: "600" }],
        "headline-xl": ["40px", { lineHeight: "52px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "data-numeric": ["16px", { lineHeight: "24px", fontWeight: "600" }],
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        // Stitch: soft ambient shadows, no heavy drop-shadows.
        card: "0 1px 0 rgba(31, 50, 67, 0.04)",
        elevated: "0 8px 24px rgba(31, 50, 67, 0.12)",
        lift: "0 4px 12px rgba(31, 50, 67, 0.08)",
      },
      spacing: {
        // 8px base scale aliases.
        gutter: "24px",
      },
    },
  },
  plugins: [],
};

export default config;

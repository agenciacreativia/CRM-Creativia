/** Tag colors — client-safe (no server imports). */

export const ETIQUETA_COLORS = ["gray", "blue", "green", "amber", "red", "purple", "pink", "teal"] as const;
export type EtiquetaColor = (typeof ETIQUETA_COLORS)[number];

const MAP: Record<string, string> = {
  gray: "bg-gray-100 text-gray-700 border-gray-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  green: "bg-green-100 text-green-700 border-green-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-700 border-red-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
};

export function etiquetaClasses(color: string): string {
  return MAP[color] ?? MAP.gray;
}

/** Solid dot color for swatches. */
export function etiquetaDot(color: string): string {
  const dots: Record<string, string> = {
    gray: "bg-gray-400", blue: "bg-blue-500", green: "bg-green-500", amber: "bg-amber-500",
    red: "bg-red-500", purple: "bg-purple-500", pink: "bg-pink-500", teal: "bg-teal-500",
  };
  return dots[color] ?? dots.gray;
}

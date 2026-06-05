"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 print:hidden"
    >
      <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
    </button>
  );
}

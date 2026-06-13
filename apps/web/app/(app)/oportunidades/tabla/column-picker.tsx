"use client";

import { ColumnPicker as GenericColumnPicker } from "@/components/tabla/column-picker";
import { OPP_COLUMNS } from "./columns";

/** Selector de columnas de oportunidades — usa el picker genérico compartido. */
export function ColumnPicker({ visibleCols }: { visibleCols: string[] }) {
  return (
    <GenericColumnPicker
      columns={OPP_COLUMNS.map((c) => ({ key: c.key, label: c.label, fixed: c.fixed }))}
      visibleCols={visibleCols}
    />
  );
}

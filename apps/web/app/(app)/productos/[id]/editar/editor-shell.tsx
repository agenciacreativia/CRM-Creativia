"use client";

import { useEffect, useRef } from "react";
import { ProductosManager } from "../../productos-manager";
import type { Producto } from "@/lib/db/productos";

/**
 * Re-utiliza ProductosManager pero arranca con el formulario de edición abierto
 * sobre el producto indicado. Para evitar tocar la API del manager, inyectamos
 * un click programático en la fila del producto al montar.
 */
export function ProductosManagerEditor({ initial, editingId }: { initial: Producto[]; editingId: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const btn = wrapperRef.current?.querySelector<HTMLButtonElement>(`[data-edit-id="${editingId}"]`);
      btn?.click();
    }, 30);
    return () => clearTimeout(t);
  }, [editingId]);
  return (
    <div ref={wrapperRef}>
      <ProductosManager initial={initial} />
    </div>
  );
}

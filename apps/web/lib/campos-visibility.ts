// Client-safe helper (no "server-only") so client components can import it.
import type { CampoPersonalizado } from "@/lib/db/campos";

/**
 * A custom field shows in the create/edit popup when it's required OR an admin
 * explicitly enabled `mostrar_en_form`. (`import type` above is erased at build,
 * so this file never pulls in the server-only campos module.)
 */
export function campoVisibleEnForm(c: CampoPersonalizado): boolean {
  return c.requerido === true || c.mostrar_en_form === true;
}

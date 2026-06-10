import "server-only";

/**
 * Escapa un término de búsqueda del usuario para usarlo dentro de un filtro
 * PostgREST `.or("col.ilike.<term>")`.
 *
 * SEGURIDAD: dentro de `.or()`, los caracteres `,` `(` `)` son sintaxis de
 * filtro. Un input como `foo,id.gt.0` rompe el filtro e inyecta condiciones
 * arbitrarias. RLS contiene el daño al tenant, pero igual saltea los filtros
 * lógicos de la app. Neutralizamos esos metacaracteres y los comodines LIKE.
 *
 * Devuelve el término ya envuelto en comodines `%term%`, listo para interpolar
 * en `col.ilike.${escapeLike(input)}`.
 */
export function escapeLike(input: string): string {
  const limpio = input
    .replace(/[,()]/g, " ")     // metacaracteres de filtro PostgREST
    .replace(/\\/g, "")          // backslash
    .replace(/[%_]/g, "")        // comodines LIKE (evita ilike.%%%)
    .trim()
    .slice(0, 100);              // cota de longitud defensiva
  return `%${limpio}%`;
}

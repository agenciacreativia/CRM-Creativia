import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { escapeLike } from "@/lib/db/filtros";

export type SearchHit = {
  type: "empresa" | "contacto" | "oportunidad";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

const PER_TYPE_LIMIT = 5;

export async function globalSearch(q: string): Promise<SearchHit[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  const supabase = await createServerSupabase();
  const like = escapeLike(term);

  const [empresas, contactos, oportunidades] = await Promise.all([
    supabase
      .from("empresa")
      .select("id, nombre, ciudad, pais")
      .or(`nombre.ilike.${like},email.ilike.${like},ciudad.ilike.${like}`)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("contacto")
      // Embed explícito via FK principal (mig 0042 introdujo ambigüedad).
      .select("id, nombre, email, cargo, empresa:empresa!contacto_empresa_id_fkey(nombre)")
      .or(`nombre.ilike.${like},email.ilike.${like},cargo.ilike.${like}`)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("oportunidad")
      .select("id, nombre, empresa(nombre), estado")
      .ilike("nombre", like)
      .limit(PER_TYPE_LIMIT),
  ]);

  const hits: SearchHit[] = [];
  for (const e of empresas.data ?? []) {
    hits.push({
      type: "empresa",
      id: e.id,
      title: e.nombre,
      subtitle: [e.ciudad, e.pais].filter(Boolean).join(", ") || null,
      href: `/empresas/${e.id}`,
    });
  }
  type RawContacto = { id: string; nombre: string; email: string; cargo: string | null; empresa: { nombre: string } | { nombre: string }[] | null };
  for (const c of (contactos.data ?? []) as RawContacto[]) {
    const empresa = Array.isArray(c.empresa) ? c.empresa[0] : c.empresa;
    hits.push({
      type: "contacto",
      id: c.id,
      title: c.nombre,
      subtitle: [c.cargo, empresa?.nombre, c.email].filter(Boolean).join(" · ") || null,
      href: `/contactos/${c.id}`,
    });
  }
  type RawOpp = { id: string; nombre: string; estado: string; empresa: { nombre: string } | { nombre: string }[] | null };
  for (const o of (oportunidades.data ?? []) as RawOpp[]) {
    const empresa = Array.isArray(o.empresa) ? o.empresa[0] : o.empresa;
    hits.push({
      type: "oportunidad",
      id: o.id,
      title: o.nombre,
      subtitle: [empresa?.nombre, o.estado].filter(Boolean).join(" · ") || null,
      href: `/oportunidades/${o.id}`,
    });
  }

  return hits;
}

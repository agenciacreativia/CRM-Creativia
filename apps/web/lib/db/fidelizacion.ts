import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";

export type CumpleItem = { id: string; nombre: string; email: string | null; fecha: string; dias: number; cumple: number };
export type VencimientoItem = {
  pasajero_id: string;
  nombre: string;
  oportunidad_id: string | null;
  oportunidad_nombre: string | null;
  doc_vencimiento: string;
  dias: number;
};

function diasAlProximoCumple(iso: string): { dias: number; cumple: number } {
  // Parse YYYY-MM-DD como UTC para que el cálculo sea idéntico en cualquier TZ del server.
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return { dias: 9999, cumple: 0 };
  const hoy = new Date();
  const hoyUtc = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  let proxUtc = Date.UTC(hoy.getUTCFullYear(), m - 1, d);
  if (proxUtc < hoyUtc) proxUtc = Date.UTC(hoy.getUTCFullYear() + 1, m - 1, d);
  const dias = Math.round((proxUtc - hoyUtc) / 86_400_000);
  return { dias, cumple: new Date(proxUtc).getUTCFullYear() - y };
}

export type Fidelizacion = { cumpleanos: CumpleItem[]; vencimientos: VencimientoItem[] };

export async function getFidelizacion(opts: { diasCumple?: number; diasDoc?: number } = {}): Promise<Fidelizacion> {
  const supabase = await createServerSupabase();
  const diasCumple = opts.diasCumple ?? 30;
  const diasDoc = opts.diasDoc ?? 90;

  // Cumpleaños próximos.
  const { data: contactos } = await supabase
    .from("contacto")
    .select("id, nombre, email, fecha_nacimiento")
    .not("fecha_nacimiento", "is", null)
    .limit(1000);
  const cumpleanos: CumpleItem[] = (contactos ?? [])
    .map((c) => {
      const { dias, cumple } = diasAlProximoCumple(c.fecha_nacimiento as string);
      return { id: c.id as string, nombre: c.nombre as string, email: (c.email as string) ?? null, fecha: c.fecha_nacimiento as string, dias, cumple };
    })
    .filter((c) => c.dias <= diasCumple)
    .sort((a, b) => a.dias - b.dias);

  // Documentos por vencer.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy.getTime() + diasDoc * 86_400_000).toISOString().slice(0, 10);
  const { data: pasajeros } = await supabase
    .from("pasajero")
    .select("id, nombre, oportunidad_id, doc_vencimiento, oportunidad:oportunidad_id(nombre)")
    .not("doc_vencimiento", "is", null)
    .lte("doc_vencimiento", limite)
    .order("doc_vencimiento", { ascending: true });
  const vencimientos: VencimientoItem[] = ((pasajeros ?? []) as unknown as Record<string, unknown>[]).map((p) => {
    const opp = (Array.isArray(p.oportunidad) ? p.oportunidad[0] : p.oportunidad) as { nombre: string } | null;
    const venc = p.doc_vencimiento as string;
    const dias = Math.round((new Date(venc + "T00:00:00").getTime() - hoy.getTime()) / 86_400_000);
    return {
      pasajero_id: p.id as string,
      nombre: p.nombre as string,
      oportunidad_id: (p.oportunidad_id as string | null) ?? null,
      oportunidad_nombre: opp?.nombre ?? null,
      doc_vencimiento: venc,
      dias,
    };
  });

  return { cumpleanos, vencimientos };
}
